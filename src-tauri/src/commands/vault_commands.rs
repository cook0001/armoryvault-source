use crate::crypto::VaultCrypto;
use crate::storage::{AppPaths, Database, InventoryStore};
use rusqlite::Connection;
use std::sync::Mutex;
use tauri::State;

pub struct AppState {
    pub vault: Mutex<VaultCrypto>,
    pub db: Mutex<Option<Connection>>,
    pub pairing_token: Mutex<Option<String>>,
}

impl AppState {
    pub fn new(enc_path: std::path::PathBuf) -> Self {
        Self {
            vault: Mutex::new(VaultCrypto::new(enc_path)),
            db: Mutex::new(None),
            pairing_token: Mutex::new(None),
        }
    }

    pub fn with_db<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&Connection) -> Result<R, String>,
    {
        let db_guard = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db_guard
            .as_ref()
            .ok_or_else(|| "Vault is locked or uninitialized".to_string())?;
        f(conn)
    }

    pub fn with_db_mut<F, R>(&self, f: F) -> Result<R, String>
    where
        F: FnOnce(&mut Connection) -> Result<R, String>,
    {
        let mut db_guard = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db_guard
            .as_mut()
            .ok_or_else(|| "Vault is locked or uninitialized".to_string())?;
        f(conn)
    }

    pub fn flush_vault(&self) -> Result<(), String> {
        let db_guard = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db_guard.as_ref().ok_or_else(|| "Vault is locked".to_string())?;
        let json_str = InventoryStore::export_vault_json(conn)?;
        let vault = self.vault.lock().map_err(|e| e.to_string())?;
        vault.encrypt_vault(&json_str)?;
        let _ = crate::commands::system_commands::perform_auto_backup();
        Ok(())
    }

    pub fn flush_activity_log(&self) -> Result<(), String> {
        let db_guard = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db_guard.as_ref().ok_or_else(|| "Vault is locked".to_string())?;
        let json_str = InventoryStore::export_activity_log_json(conn)?;
        let vault = self.vault.lock().map_err(|e| e.to_string())?;
        vault.encrypt_activity_log(&json_str)?;
        let _ = crate::commands::system_commands::perform_auto_backup();
        Ok(())
    }

    pub fn flush_skus(&self) -> Result<(), String> {
        let db_guard = self.db.lock().map_err(|e| e.to_string())?;
        let conn = db_guard.as_ref().ok_or_else(|| "Vault is locked".to_string())?;
        let json_str = InventoryStore::export_skus_json(conn)?;
        let vault = self.vault.lock().map_err(|e| e.to_string())?;
        vault.encrypt_skus(&json_str)?;
        let _ = crate::commands::system_commands::perform_auto_backup();
        Ok(())
    }

    pub fn is_locked(&self) -> bool {
        let vault = self.vault.lock().unwrap();
        vault.is_locked()
    }
}

pub fn initialize_unlocked_state(
    vault: &VaultCrypto,
    db_guard: &mut Option<Connection>,
    decrypted_json: &str,
) -> Result<(), String> {
    let mut conn = Connection::open_in_memory()
        .map_err(|e| format!("Failed to create in-memory database: {}", e))?;
    Database::init(&conn).map_err(|e| format!("Failed to initialize database schema: {}", e))?;

    let root_val: serde_json::Value =
        serde_json::from_str(decrypted_json).map_err(|e| format!("Invalid vault JSON: {}", e))?;

    Database::import_legacy_json(&mut conn, &root_val)?;

    // 1. Decoupled Activity Log Check & Migration
    if let Ok(Some(act_json)) = vault.decrypt_activity_log() {
        if let Ok(act_val) = serde_json::from_str::<serde_json::Value>(&act_json) {
            let list = act_val
                .get("activity_log")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            for item in list {
                let ts = item.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");
                let act = item.get("action").and_then(|v| v.as_str()).unwrap_or("LOG");
                let data = serde_json::to_string(&item).unwrap_or_default();
                let _ = conn.execute(
                    "INSERT INTO activity_log (timestamp, action, data) VALUES (?1, ?2, ?3)",
                    rusqlite::params![ts, act, data],
                );
            }
        }
    } else if let Some(legacy_logs) = root_val.get("activity_log").and_then(|v| v.as_array()) {
        if !legacy_logs.is_empty() {
            let payload = serde_json::json!({
                "schemaVersion": 1,
                "activity_log": legacy_logs,
                "lastModified": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis()
            });
            let _ = vault.encrypt_activity_log(&serde_json::to_string_pretty(&payload).unwrap_or_default());
        }
    }

    // 2. Decoupled Custom SKUs Check & Migration
    if let Ok(Some(skus_json)) = vault.decrypt_skus() {
        if let Ok(skus_val) = serde_json::from_str::<serde_json::Value>(&skus_json) {
            if let Some(map) = skus_val.get("skus").and_then(|v| v.as_object()) {
                for (id, val) in map {
                    let data = serde_json::to_string(val).unwrap_or_default();
                    let _ = conn.execute(
                        "INSERT OR REPLACE INTO skus (id, data) VALUES (?1, ?2)",
                        rusqlite::params![id, data],
                    );
                }
            }
        }
    } else if let Some(legacy_skus) = root_val.get("skus").and_then(|v| v.as_object()) {
        if !legacy_skus.is_empty() {
            let payload = serde_json::json!({
                "schemaVersion": 1,
                "skus": legacy_skus,
                "lastModified": std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap_or_default()
                    .as_millis()
            });
            let _ = vault.encrypt_skus(&serde_json::to_string_pretty(&payload).unwrap_or_default());
        }
    }

    // 3. Import & Purge old plaintext SQLite databases from disk if present
    let app_data = AppPaths::get_app_data_dir();
    let sqlite_candidates = [
        app_data.join("armoryvault.sqlite"),
        app_data.join("armoryvault.db"),
        app_data.join("armoryvault.sqlite3"),
    ];

    let mut sqlite_imported = false;
    for candidate in &sqlite_candidates {
        if candidate.exists() {
            if let Ok(count) = Database::import_from_sqlite(&mut conn, candidate) {
                if count > 0 {
                    sqlite_imported = true;
                }
            }
            let _ = std::fs::remove_file(candidate);
        }
    }

    // 4. Import & Purge legacy plaintext JSON database if present
    let json_candidate = app_data.join("firearms_inventory.json");
    if json_candidate.exists() {
        if let Ok(content) = std::fs::read_to_string(&json_candidate) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if Database::import_legacy_json(&mut conn, &val).is_ok() {
                    sqlite_imported = true;
                }
            }
        }
        let _ = std::fs::remove_file(&json_candidate);
    }

    // 5. Import & Purge staged CSV/TSV spreadsheets if present
    let csv_candidates = [
        app_data.join("imported_records.csv"),
        app_data.join("imported_records.tsv"),
        app_data.join("imported_records.txt"),
    ];
    for candidate in &csv_candidates {
        if candidate.exists() {
            if let Ok(count) = Database::import_csv(&mut conn, candidate) {
                if count > 0 {
                    sqlite_imported = true;
                }
            }
            let _ = std::fs::remove_file(candidate);
        }
    }

    if sqlite_imported {
        if let Ok(json_str) = InventoryStore::export_vault_json(&conn) {
            let _ = vault.encrypt_vault(&json_str);
        }
        if let Ok(act_str) = InventoryStore::export_activity_log_json(&conn) {
            let _ = vault.encrypt_activity_log(&act_str);
        }
        if let Ok(skus_str) = InventoryStore::export_skus_json(&conn) {
            let _ = vault.encrypt_skus(&skus_str);
        }
    }

    let _ = std::fs::remove_file(app_data.join("armoryvault.sqlite-wal"));
    let _ = std::fs::remove_file(app_data.join("armoryvault.sqlite-shm"));

    *db_guard = Some(conn);
    Ok(())
}

#[tauri::command]
pub fn is_vault_setup(state: State<AppState>) -> bool {
    let vault = state.vault.lock().unwrap();
    vault.is_vault_setup()
}

#[tauri::command]
pub fn is_vault_locked(state: State<AppState>) -> bool {
    let vault = state.vault.lock().unwrap();
    vault.is_locked()
}

#[tauri::command]
pub fn setup_vault(password: String, state: State<AppState>) -> Result<String, String> {
    let app_data = AppPaths::get_app_data_dir();
    let sqlite_candidates = [
        app_data.join("armoryvault.sqlite"),
        app_data.join("armoryvault.db"),
        app_data.join("armoryvault.sqlite3"),
    ];

    let mut initial_vault_json = r#"{"schemaVersion":2,"firearms":[],"ammo":[],"accessories":[],"components":[],"storage_locations":[]}"#.to_string();
    let mut initial_act_log = r#"{"schemaVersion":1,"activity_log":[]}"#.to_string();
    let mut initial_skus = r#"{"schemaVersion":1,"skus":{}}"#.to_string();

    let mut conn = Connection::open_in_memory()
        .map_err(|e| format!("Failed to create in-memory database: {}", e))?;
    Database::init(&conn).map_err(|e| format!("Failed to initialize database schema: {}", e))?;

    let mut had_existing_data = false;

    for candidate in &sqlite_candidates {
        if candidate.exists() {
            if let Ok(count) = Database::import_from_sqlite(&mut conn, candidate) {
                if count > 0 {
                    had_existing_data = true;
                }
            }
            let _ = std::fs::remove_file(candidate);
        }
    }

    let json_candidate = app_data.join("firearms_inventory.json");
    if json_candidate.exists() {
        if let Ok(content) = std::fs::read_to_string(&json_candidate) {
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                if Database::import_legacy_json(&mut conn, &val).is_ok() {
                    had_existing_data = true;
                }
            }
        }
        let _ = std::fs::remove_file(&json_candidate);
    }

    let csv_candidates = [
        app_data.join("imported_records.csv"),
        app_data.join("imported_records.tsv"),
        app_data.join("imported_records.txt"),
    ];
    for candidate in &csv_candidates {
        if candidate.exists() {
            if let Ok(count) = Database::import_csv(&mut conn, candidate) {
                if count > 0 {
                    had_existing_data = true;
                }
            }
            let _ = std::fs::remove_file(candidate);
        }
    }

    if had_existing_data {
        if let Ok(vj) = InventoryStore::export_vault_json(&conn) {
            initial_vault_json = vj;
        }
        if let Ok(al) = InventoryStore::export_activity_log_json(&conn) {
            initial_act_log = al;
        }
        if let Ok(sk) = InventoryStore::export_skus_json(&conn) {
            initial_skus = sk;
        }
    }

    let mut vault = state.vault.lock().unwrap();
    let recovery_code = vault.setup_vault(&password, &initial_vault_json)?;

    let _ = vault.encrypt_activity_log(&initial_act_log);
    let _ = vault.encrypt_skus(&initial_skus);

    // Purge any plaintext sqlite leftovers
    let _ = std::fs::remove_file(app_data.join("armoryvault.sqlite-wal"));
    let _ = std::fs::remove_file(app_data.join("armoryvault.sqlite-shm"));

    let mut db_guard = state.db.lock().unwrap();
    *db_guard = Some(conn);
    Ok(recovery_code)
}

#[tauri::command]
pub fn unlock_vault(password: String, state: State<AppState>) -> Result<bool, String> {
    let mut vault = state.vault.lock().unwrap();
    let decrypted_json = vault.unlock_vault(&password)?;

    let mut db_guard = state.db.lock().unwrap();
    initialize_unlocked_state(&vault, &mut db_guard, &decrypted_json)?;

    if let Some(ref conn) = *db_guard {
        if let Ok(tok) = InventoryStore::get_or_create_vault_token(conn) {
            *state.pairing_token.lock().unwrap() = Some(tok);
        }
    }

    Ok(true)
}

#[tauri::command]
pub fn unlock_with_recovery_code(code: String, state: State<AppState>) -> Result<bool, String> {
    let mut vault = state.vault.lock().unwrap();
    let decrypted_json = vault.unlock_with_recovery_code(&code)?;

    let mut db_guard = state.db.lock().unwrap();
    initialize_unlocked_state(&vault, &mut db_guard, &decrypted_json)?;

    if let Some(ref conn) = *db_guard {
        if let Ok(tok) = InventoryStore::get_or_create_vault_token(conn) {
            *state.pairing_token.lock().unwrap() = Some(tok);
        }
    }

    Ok(true)
}

#[tauri::command]
pub fn change_password(
    current_password: String,
    new_password: String,
    regenerate_recovery_key: Option<bool>,
    state: State<AppState>,
) -> Result<Option<String>, String> {
    let mut vault = state.vault.lock().unwrap();
    let res = vault.change_password(
        &current_password,
        &new_password,
        regenerate_recovery_key.unwrap_or(false),
    )?;

    // Re-encrypt decoupled stores with new active master key
    drop(vault);
    let _ = state.flush_activity_log();
    let _ = state.flush_skus();

    Ok(res)
}

#[tauri::command]
pub fn regenerate_recovery_key(current_password: String, state: State<AppState>) -> Result<String, String> {
    let mut vault = state.vault.lock().unwrap();
    vault.regenerate_recovery_key(&current_password)
}

#[tauri::command]
pub fn lock_vault(state: State<AppState>) -> Result<(), String> {
    // Flush all in-memory database tables (including paired_devices, sync_queue, kv_meta)
    // to firearms_inventory.enc BEFORE dropping in-memory database!
    if let Err(e) = state.flush_vault() {
        eprintln!("[Vault] Warning: Failed to flush vault before locking: {}", e);
    }

    // Drop in-memory database connection and pairing token immediately to zero memory
    if let Ok(mut db_guard) = state.db.lock() {
        *db_guard = None;
    }
    if let Ok(mut pt_guard) = state.pairing_token.lock() {
        *pt_guard = None;
    }
    let mut vault = state.vault.lock().unwrap();
    vault.lock();
    Ok(())
}

#[tauri::command]
pub fn get_recovery_code(state: State<AppState>) -> Option<String> {
    let vault = state.vault.lock().unwrap();
    vault.get_recovery_code()
}

#[tauri::command]
pub fn get_pairing_token(state: State<AppState>) -> String {
    let mut pt = state.pairing_token.lock().unwrap();
    if pt.is_none() {
        let token_from_db = state
            .with_db(|conn| crate::storage::InventoryStore::get_or_create_vault_token(conn).map_err(|e| e.to_string()))
            .ok();
        *pt = token_from_db.or_else(|| Some(hex::encode(rand::random::<[u8; 16]>())));
    }
    pt.clone().unwrap()
}

#[tauri::command]
pub fn revoke_pairing_token(state: State<AppState>) -> bool {
    let new_token = hex::encode(rand::random::<[u8; 16]>());
    let _ = state.with_db(|conn| crate::storage::InventoryStore::set_vault_pairing_token(conn, &new_token).map_err(|e| e.to_string()));
    let _ = state.flush_vault();
    let mut pt = state.pairing_token.lock().unwrap();
    *pt = Some(new_token);
    true
}

#[tauri::command]
pub fn get_pairing_info(state: State<AppState>) -> serde_json::Value {
    let mut candidates: Vec<serde_json::Value> = Vec::new();

    if let Ok(netifas) = local_ip_address::list_afinet_netifas() {
        for (name, ip) in netifas {
            if let std::net::IpAddr::V4(ipv4) = ip {
                if !ipv4.is_loopback() {
                    let addr = ipv4.to_string();
                    let lower_name = name.to_lowercase();
                    let is_virtual = lower_name.starts_with("utun")
                        || lower_name.starts_with("tun")
                        || lower_name.starts_with("tap")
                        || lower_name.starts_with("awdl")
                        || lower_name.starts_with("llw")
                        || lower_name.starts_with("bridge")
                        || lower_name.starts_with("docker")
                        || lower_name.starts_with("veth")
                        || lower_name.starts_with("tailscale")
                        || lower_name.starts_with("virbr")
                        || lower_name.starts_with("vmnet")
                        || lower_name.starts_with("vboxnet");

                    let mut score: i32 = 0;
                    if addr.starts_with("192.168.") {
                        score += 100;
                    } else if addr.starts_with("10.") {
                        score += 80;
                    } else if addr.starts_with("172.") {
                        score += 70;
                    } else {
                        score += 10;
                    }

                    if lower_name.starts_with("en")
                        || lower_name.starts_with("eth")
                        || lower_name.starts_with("wlan")
                        || lower_name.starts_with("wi-fi")
                        || lower_name.starts_with("ethernet")
                    {
                        score += 50;
                    }

                    if is_virtual {
                        score -= 200;
                    }

                    candidates.push(serde_json::json!({
                        "name": name,
                        "address": addr,
                        "score": score,
                        "isVirtual": is_virtual
                    }));
                }
            }
        }
    }

    candidates.sort_by(|a, b| {
        let score_b = b["score"].as_i64().unwrap_or(0);
        let score_a = a["score"].as_i64().unwrap_or(0);
        score_b.cmp(&score_a)
    });

    let primary_ip = candidates
        .iter()
        .find(|c| !c["isVirtual"].as_bool().unwrap_or(false))
        .and_then(|c| c["address"].as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            local_ip_address::local_ip()
                .map(|ip| ip.to_string())
                .ok()
        })
        .unwrap_or_else(|| "127.0.0.1".to_string());

    let fallback_ips: Vec<String> = candidates
        .iter()
        .filter(|c| {
            !c["isVirtual"].as_bool().unwrap_or(false)
                && c["address"].as_str() != Some(&primary_ip)
        })
        .filter_map(|c| c["address"].as_str().map(|s| s.to_string()))
        .collect();

    let token = {
        let mut pt = state.pairing_token.lock().unwrap();
        if pt.is_none() {
            *pt = Some(hex::encode(rand::random::<[u8; 16]>()));
        }
        pt.clone().unwrap()
    };

    let hostname = std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Desktop".to_string());

    let port = 3456;
    let token_param = format!("&token={}", token);
    let fallbacks_param = if !fallback_ips.is_empty() {
        format!("&fallbacks={}", fallback_ips.join(","))
    } else {
        String::new()
    };
    let host_param = format!("&host={}", hostname);

    let qr_data = format!(
        "armoryvault://sync?ip={}&port={}{}{}{}",
        primary_ip, port, token_param, fallbacks_param, host_param
    );

    serde_json::json!({
        "primaryIp": primary_ip,
        "fallbackIps": fallback_ips,
        "hostname": hostname,
        "port": port,
        "token": token,
        "qrData": qr_data,
        "interfaces": candidates
    })
}

