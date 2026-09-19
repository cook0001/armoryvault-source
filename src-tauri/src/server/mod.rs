use crate::commands::vault_commands::AppState;
use crate::storage::InventoryStore;
use axum::{
    extract::{Json, Query, State},
    http::{HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{delete, get, post},
    Router,
};
use serde::Deserialize;
use serde_json::{json, Value};
use std::collections::HashMap;
use std::net::SocketAddr;
use tauri::{Emitter, Manager};
use tower_http::cors::{Any, CorsLayer};

#[derive(Clone)]
pub struct ServerState {
    pub app_handle: tauri::AppHandle,
}

pub struct CompanionServer;

impl CompanionServer {
    pub async fn run(app_handle: tauri::AppHandle) {
        let state = ServerState { app_handle };

        let cors = CorsLayer::new()
            .allow_origin(Any)
            .allow_methods(Any)
            .allow_headers(Any);

        let app = Router::new()
            .route("/api/ping", get(handle_ping))
            .route("/api/pair", post(handle_pair).get(handle_pair_get))
            .route("/api/devices", get(handle_get_devices).delete(handle_unpair_all_devices))
            .route("/api/devices/:id", delete(handle_delete_device))
            .route("/api/vault/lock", post(handle_vault_lock))
            .route("/api/lock", post(handle_vault_lock))
            .route("/api/inventory/summary", get(handle_summary))
            .route("/api/inventory/cache", get(handle_cache))
            .route("/api/sync", post(handle_sync))
            .route("/api/sync/payloads", post(handle_sync_payloads))
            .route("/api/sync/rejected", get(handle_get_rejected_syncs))
            .route("/api/sync/rejected/confirm", post(handle_confirm_rejected_syncs))
            .route("/api/modules", get(handle_modules))
            .route("/api/storage-locations", get(handle_storage_locations))
            .route("/api/chrono", post(handle_chrono))
            .route("/api/target-analysis", post(handle_target_analysis))
            .route("/api/ballistic-profiles", get(handle_ballistic_profiles))
            .layer(cors)
            .with_state(state);

        // Primary standard port 3456 (ArmoryVault ecosystem standard)
        let app_primary = app.clone();
        tokio::spawn(async move {
            let addr_3456 = SocketAddr::from(([0, 0, 0, 0], 3456));
            println!("[CompanionServer] Listening on http://{}", addr_3456);
            if let Ok(listener) = tokio::net::TcpListener::bind(addr_3456).await {
                let _ = axum::serve(listener, app_primary).await;
            } else {
                eprintln!("[CompanionServer] Warning: Failed to bind to standard port 3456");
            }
        });

        // Legacy fallback port 5174 for previously paired companion devices
        let addr_5174 = SocketAddr::from(([0, 0, 0, 0], 5174));
        println!("[CompanionServer] Listening on legacy fallback http://{}", addr_5174);
        if let Ok(listener) = tokio::net::TcpListener::bind(addr_5174).await {
            let _ = axum::serve(listener, app).await;
        } else {
            eprintln!("[CompanionServer] Warning: Failed to bind to fallback port 5174");
        }
    }
}

fn get_installed_modules() -> Vec<String> {
    let mut modules = crate::storage::ModuleDbManager::list_existing_module_dbs();
    if modules.is_empty() {
        modules = vec![
            "reloading".to_string(),
            "ballistics".to_string(),
            "maintenance".to_string(),
            "optics".to_string(),
            "boundbook".to_string(),
            "nfa".to_string(),
            "labels".to_string(),
            "ranges".to_string(),
        ];
    }
    modules
}

fn get_hostname() -> String {
    std::env::var("COMPUTERNAME")
        .or_else(|_| std::env::var("HOSTNAME"))
        .unwrap_or_else(|_| "Desktop".to_string())
}

fn extract_device_name(headers: &HeaderMap, query: &HashMap<String, String>, body_device: Option<&str>) -> String {
    if let Some(dev) = body_device {
        if !dev.trim().is_empty() {
            return dev.to_string();
        }
    }
    if let Some(dev) = query.get("device").or_else(|| query.get("deviceName")) {
        if !dev.trim().is_empty() {
            return dev.clone();
        }
    }
    if let Some(ua) = headers.get("user-agent").and_then(|v| v.to_str().ok()) {
        if ua.contains("iPhone") {
            return "iPhone".to_string();
        } else if ua.contains("Android") {
            return "Android Device".to_string();
        }
    }
    "Mobile Companion".to_string()
}

fn extract_token(headers: &HeaderMap, query: &HashMap<String, String>, body_token: Option<&str>) -> Option<String> {
    if let Some(t) = body_token {
        if !t.trim().is_empty() {
            return Some(t.trim().to_string());
        }
    }
    if let Some(auth_header) = headers.get("authorization").and_then(|v| v.to_str().ok()) {
        if let Some(token) = auth_header.strip_prefix("Bearer ") {
            if !token.trim().is_empty() {
                return Some(token.trim().to_string());
            }
        }
    }
    if let Some(t) = query.get("token") {
        if !t.trim().is_empty() {
            return Some(t.trim().to_string());
        }
    }
    None
}

fn extract_client_ip(headers: &HeaderMap) -> String {
    if let Some(forwarded) = headers.get("x-forwarded-for").and_then(|v| v.to_str().ok()) {
        if let Some(first_ip) = forwarded.split(',').next() {
            let clean = first_ip.trim();
            if !clean.is_empty() {
                return clean.to_string();
            }
        }
    }
    if let Some(real_ip) = headers.get("x-real-ip").and_then(|v| v.to_str().ok()) {
        if !real_ip.trim().is_empty() {
            return real_ip.trim().to_string();
        }
    }
    "Wi-Fi LAN".to_string()
}

fn infer_device_type(headers: &HeaderMap, device_name: &str) -> String {
    let lower_name = device_name.to_lowercase();
    if lower_name.contains("iphone") || lower_name.contains("ipad") || lower_name.contains("ios") {
        return "ios".to_string();
    }
    if lower_name.contains("android") || lower_name.contains("pixel") || lower_name.contains("samsung") {
        return "android".to_string();
    }
    if let Some(ua) = headers.get("user-agent").and_then(|v| v.to_str().ok()) {
        let lower_ua = ua.to_lowercase();
        if lower_ua.contains("iphone") || lower_ua.contains("ipad") || lower_ua.contains("darwin") {
            return "ios".to_string();
        }
        if lower_ua.contains("android") {
            return "android".to_string();
        }
    }
    "mobile".to_string()
}

fn get_or_create_device_id(device_name: &str, device_type: &str) -> String {
    use sha2::Digest;
    let mut hasher = sha2::Sha256::new();
    hasher.update(device_name.as_bytes());
    hasher.update(b"::");
    hasher.update(device_type.as_bytes());
    let hash = hex::encode(hasher.finalize());
    format!("device-{}", &hash[..16])
}

fn maybe_encrypt_response(
    val: Value,
    headers: &HeaderMap,
    app_state: &AppState,
    client_token: Option<&str>,
) -> Value {
    let want_encrypted = headers
        .get("x-encrypted-transport")
        .and_then(|v| v.to_str().ok())
        .map(|v| v.eq_ignore_ascii_case("true") || v == "1")
        .unwrap_or(false);

    if !want_encrypted {
        return val;
    }

    let server_token = {
        let pt_guard = app_state.pairing_token.lock().unwrap();
        pt_guard.clone()
    };

    let token_for_encryption = client_token.map(|s| s.to_string()).or(server_token);
    if let Some(tok) = token_for_encryption {
        match crate::crypto::vault::encrypt_with_token(&val.to_string(), &tok) {
            Ok(enc) => enc,
            Err(e) => {
                eprintln!("[CompanionServer] Transport encryption failed: {}", e);
                val
            }
        }
    } else {
        val
    }
}

fn maybe_decrypt_request_payload(
    payload: Value,
    headers: &HeaderMap,
    query: &HashMap<String, String>,
    app_state: &AppState,
) -> Result<Value, (StatusCode, Json<Value>)> {
    if payload.get("format").and_then(|v| v.as_str()) != Some("armoryvault_encrypted_payload") {
        return Ok(payload);
    }

    let client_token = extract_token(headers, query, payload.get("token").and_then(|v| v.as_str()));
    let server_token = {
        let mut pt_guard = app_state.pairing_token.lock().unwrap();
        if pt_guard.is_none() {
            let token_from_db = app_state
                .with_db(|conn| crate::storage::InventoryStore::get_or_create_vault_token(conn).map_err(|e| e.to_string()))
                .ok();
            if let Some(t) = token_from_db {
                *pt_guard = Some(t);
            }
        }
        pt_guard.clone()
    };

    let mut candidate_keys: Vec<String> = Vec::new();
    if let Some(ref ct) = client_token {
        candidate_keys.push(ct.clone());
    }
    if let Some(ref st) = server_token {
        if !candidate_keys.contains(st) {
            candidate_keys.push(st.clone());
        }
    }
    // Also load all paired device keys from SQLite
    if let Ok(dev_keys) = app_state.with_db(|conn| crate::storage::InventoryStore::get_paired_device_keys(conn).map_err(|e| e.to_string())) {
        for dk in dev_keys {
            if !candidate_keys.contains(&dk) {
                candidate_keys.push(dk);
            }
        }
    }

    if candidate_keys.is_empty() {
        return Err((
            StatusCode::UNAUTHORIZED,
            Json(json!({
                "success": false,
                "error": "Encrypted transport payload received but no pairing token or device keys found."
            })),
        ));
    }

    for key in &candidate_keys {
        if let Ok(decrypted_json_str) = crate::crypto::vault::decrypt_with_token(&payload, key) {
            if let Ok(val) = serde_json::from_str::<Value>(&decrypted_json_str) {
                return Ok(val);
            }
        }
    }

    Err((
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "success": false,
            "error": "Decryption failed with all available pairing and companion keys."
        })),
    ))
}

async fn handle_ping(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let device_name = extract_device_name(&headers, &query, None);

    let client_ip = extract_client_ip(&headers);
    let device_type = infer_device_type(&headers, &device_name);
    let device_id = get_or_create_device_id(&device_name, &device_type);
    let _ = app_state.with_db(|conn| {
        let _ = crate::storage::InventoryStore::update_paired_device_activity(conn, &device_id, Some(&client_ip));
        Ok::<(), String>(())
    });

    let hostname = get_hostname();
    let pt_guard = app_state.pairing_token.lock().unwrap();
    let requires_auth = pt_guard.is_some();
    drop(pt_guard);

    (
        StatusCode::OK,
        Json(json!({
            "status": "ok",
            "app": "ArmoryVault",
            "version": env!("CARGO_PKG_VERSION"),
            "backend": "Tauri-Axum",
            "device": hostname,
            "host": hostname,
            "isLocked": app_state.is_locked(),
            "requiresAuth": requires_auth,
            "installedModules": get_installed_modules()
        })),
    )
}

#[derive(Deserialize)]
struct PairRequest {
    #[allow(dead_code)]
    token: Option<String>,
    device_name: Option<String>,
    #[serde(rename = "deviceName")]
    device_name_camel: Option<String>,
    device: Option<String>,
    device_id: Option<String>,
    #[serde(rename = "deviceId")]
    device_id_camel: Option<String>,
    device_key: Option<String>,
    #[serde(rename = "deviceKey")]
    device_key_camel: Option<String>,
    device_token: Option<String>,
    #[serde(rename = "deviceToken")]
    device_token_camel: Option<String>,
    passphrase: Option<String>,
}

async fn handle_pair(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    Json(payload): Json<PairRequest>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let device_name = extract_device_name(
        &headers,
        &query,
        payload
            .device_name
            .as_deref()
            .or(payload.device_name_camel.as_deref())
            .or(payload.device.as_deref()),
    );

    let server_token = {
        let mut pt_guard = app_state.pairing_token.lock().unwrap();
        if pt_guard.is_none() {
            let token_from_db = app_state
                .with_db(|conn| crate::storage::InventoryStore::get_or_create_vault_token(conn).map_err(|e| e.to_string()))
                .ok();
            *pt_guard = token_from_db.or_else(|| Some(hex::encode(rand::random::<[u8; 16]>())));
        }
        pt_guard.clone().unwrap()
    };

    let client_ip = extract_client_ip(&headers);
    let device_type = infer_device_type(&headers, &device_name);
    let device_id = payload
        .device_id
        .or(payload.device_id_camel)
        .unwrap_or_else(|| get_or_create_device_id(&device_name, &device_type));

    let device_key = payload
        .device_key
        .as_deref()
        .or(payload.device_key_camel.as_deref())
        .or(payload.passphrase.as_deref());

    let device_token = payload
        .device_token
        .as_deref()
        .or(payload.device_token_camel.as_deref())
        .or(payload.token.as_deref());

    // Persist to paired_devices SQLite registry and determine if newly registered
    let is_new = app_state
        .with_db(|conn| {
            crate::storage::InventoryStore::upsert_paired_device(
                conn,
                &device_id,
                &device_name,
                &device_type,
                &client_ip,
                device_token.or(Some(&server_token)),
                device_key,
            )
            .map_err(|e| e.to_string())
        })
        .unwrap_or(false);

    let _ = state.app_handle.emit(
        "device-paired",
        json!({
            "id": device_id,
            "deviceName": device_name,
            "deviceType": device_type,
            "ipAddress": client_ip,
            "isNew": is_new,
            "timestamp": chrono_timestamp_millis()
        }),
    );

    let hostname = get_hostname();

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "status": "paired",
            "vaultName": "ArmoryVault",
            "device": device_name,
            "host": hostname,
            "isLocked": app_state.is_locked(),
            "token": server_token,
            "pairingToken": server_token,
            "installedModules": get_installed_modules()
        })),
    )
}

async fn handle_pair_get(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let device_name = extract_device_name(&headers, &query, None);

    let server_token = {
        let mut pt_guard = app_state.pairing_token.lock().unwrap();
        if pt_guard.is_none() {
            let token_from_db = app_state
                .with_db(|conn| crate::storage::InventoryStore::get_or_create_vault_token(conn).map_err(|e| e.to_string()))
                .ok();
            *pt_guard = token_from_db.or_else(|| Some(hex::encode(rand::random::<[u8; 16]>())));
        }
        pt_guard.clone().unwrap()
    };

    let client_ip = extract_client_ip(&headers);
    let device_type = infer_device_type(&headers, &device_name);
    let device_id = get_or_create_device_id(&device_name, &device_type);

    let _ = app_state.with_db(|conn| {
        crate::storage::InventoryStore::upsert_paired_device(
            conn,
            &device_id,
            &device_name,
            &device_type,
            &client_ip,
            Some(&server_token),
            None,
        )
        .map_err(|e| e.to_string())
    });

    // NOTE: Do not emit "device-paired" on GET /api/pair. GET is an idempotent status check.

    let hostname = get_hostname();

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "status": "paired",
            "vaultName": "ArmoryVault",
            "device": device_name,
            "host": hostname,
            "isLocked": app_state.is_locked(),
            "token": server_token,
            "pairingToken": server_token,
            "installedModules": get_installed_modules()
        })),
    )
}

async fn handle_get_devices(
    State(state): State<ServerState>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    match app_state.with_db(|conn| crate::storage::InventoryStore::get_paired_devices(conn).map_err(|e| e.to_string())) {
        Ok(devices) => (StatusCode::OK, Json(json!({ "success": true, "devices": devices }))),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn handle_delete_device(
    State(state): State<ServerState>,
    axum::extract::Path(id): axum::extract::Path<String>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    match app_state.with_db(|conn| crate::storage::InventoryStore::remove_paired_device(conn, &id).map_err(|e| e.to_string())) {
        Ok(removed) => {
            let _ = state.app_handle.emit("device-unpaired", json!({ "id": id }));
            (StatusCode::OK, Json(json!({ "success": true, "removed": removed })))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn handle_unpair_all_devices(
    State(state): State<ServerState>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    match app_state.with_db(|conn| crate::storage::InventoryStore::unpair_all_devices(conn).map_err(|e| e.to_string())) {
        Ok(cleared) => {
            let _ = state.app_handle.emit("device-unpaired-all", json!({}));
            (StatusCode::OK, Json(json!({ "success": true, "cleared": cleared })))
        }
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e.to_string() })),
        ),
    }
}

async fn handle_vault_lock(State(state): State<ServerState>) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    if let Ok(mut db_guard) = app_state.db.lock() {
        *db_guard = None;
    }
    if let Ok(mut pt_guard) = app_state.pairing_token.lock() {
        *pt_guard = None;
    }
    if let Ok(mut vault) = app_state.vault.lock() {
        vault.lock();
    }

    let _ = state.app_handle.emit("vault-locked", json!({ "locked": true }));

    (
        StatusCode::OK,
        Json(json!({ "success": true, "isLocked": true })),
    )
}

async fn handle_summary(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let client_token = extract_token(&headers, &query, None);
    let device_name = extract_device_name(&headers, &query, None);

    let client_ip = extract_client_ip(&headers);
    let device_type = infer_device_type(&headers, &device_name);
    let device_id = get_or_create_device_id(&device_name, &device_type);
    let _ = app_state.with_db(|conn| {
        let _ = crate::storage::InventoryStore::update_paired_device_activity(conn, &device_id, Some(&client_ip));
        Ok::<(), String>(())
    });

    if app_state.is_locked() {
        let val = json!({
            "success": false,
            "isLocked": true,
            "firearms": 0,
            "ammo": 0,
            "components": 0,
            "error": "Vault is locked"
        });
        return (
            StatusCode::OK,
            Json(maybe_encrypt_response(val, &headers, &app_state, client_token.as_deref())),
        );
    }

    let summary_res = app_state.with_db(|conn| {
        let firearms_count: i64 = conn.query_row("SELECT COUNT(*) FROM firearms", [], |r| r.get(0)).unwrap_or(0);
        let ammo_rows = InventoryStore::get_ammo(conn).unwrap_or_default();
        let ammo_count: i64 = ammo_rows
            .iter()
            .map(|a| a.get("count").and_then(|v| v.as_i64()).unwrap_or(0))
            .sum();
        let comp_count: i64 = conn.query_row("SELECT COUNT(*) FROM components", [], |r| r.get(0)).unwrap_or(0);
        let acc_count: i64 = conn.query_row("SELECT COUNT(*) FROM accessories", [], |r| r.get(0)).unwrap_or(0);
        let rejected_count: i64 = conn.query_row("SELECT COUNT(*) FROM rejected_syncs", [], |r| r.get(0)).unwrap_or(0);

        Ok(json!({
            "success": true,
            "isLocked": false,
            "firearms": firearms_count,
            "ammo": ammo_count,
            "components": comp_count,
            "accessories": acc_count,
            "pendingRejections": rejected_count,
            "installedModules": get_installed_modules(),
            "syncVerification": {
                "firearmsCount": firearms_count,
                "ammoCount": ammo_count,
                "componentsCount": comp_count,
                "accessoriesCount": acc_count,
                "syncTimestamp": chrono_timestamp_millis()
            }
        }))
    });

    match summary_res {
        Ok(val) => (
            StatusCode::OK,
            Json(maybe_encrypt_response(val, &headers, &app_state, client_token.as_deref())),
        ),
        Err(_) => (
            StatusCode::OK,
            Json(maybe_encrypt_response(
                json!({
                    "success": false,
                    "isLocked": true,
                    "firearms": 0,
                    "ammo": 0,
                    "components": 0,
                    "installedModules": get_installed_modules()
                }),
                &headers,
                &app_state,
                client_token.as_deref(),
            )),
        ),
    }
}

async fn handle_cache(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let client_token = extract_token(&headers, &query, None);
    let device_name = extract_device_name(&headers, &query, None);

    let client_ip = extract_client_ip(&headers);
    let device_type = infer_device_type(&headers, &device_name);
    let device_id = get_or_create_device_id(&device_name, &device_type);
    let _ = app_state.with_db(|conn| {
        let _ = crate::storage::InventoryStore::update_paired_device_activity(conn, &device_id, Some(&client_ip));
        Ok::<(), String>(())
    });

    if app_state.is_locked() {
        let val = json!({
            "success": false,
            "isLocked": true,
            "firearms": [],
            "ammo": [],
            "components": [],
            "skus": {},
            "error": "Vault is locked"
        });
        return (
            StatusCode::OK,
            Json(maybe_encrypt_response(val, &headers, &app_state, client_token.as_deref())),
        );
    }

    let cache_res = app_state.with_db(|conn| {
        let firearms = InventoryStore::get_firearms(conn).unwrap_or_default();
        let ammo = InventoryStore::get_ammo(conn).unwrap_or_default();
        let components = InventoryStore::get_components(conn).unwrap_or_default();
        let accessories = InventoryStore::get_accessories(conn).unwrap_or_default();
        let storage_locations = InventoryStore::get_storage_locations(conn).unwrap_or_default();
        let skus = InventoryStore::get_skus(conn).unwrap_or_default();
        let custom_presets = InventoryStore::get_custom_schedule_presets(conn).unwrap_or(json!([]));
        let rejected_syncs = InventoryStore::get_rejected_syncs(conn).unwrap_or_default();

        let firearms_len = firearms.len();
        let ammo_len = ammo.len();
        let components_len = components.len();
        let accessories_len = accessories.len();
        let storage_locations_len = storage_locations.len();
        let sync_timestamp = chrono_timestamp_millis();

        // Optics inventory from optics module DB
        let optics = if let Ok(o_conn) = crate::storage::ModuleDbManager::get_connection("optics") {
            let mut stmt = o_conn.prepare("SELECT data FROM optics_inventory").ok();
            if let Some(ref mut s) = stmt {
                let rows = s.query_map([], |r| r.get::<_, String>(0)).ok();
                rows.map(|r_iter| {
                    r_iter.flatten().filter_map(|d| serde_json::from_str::<Value>(&d).ok()).collect::<Vec<_>>()
                }).unwrap_or_default()
            } else {
                vec![]
            }
        } else {
            vec![]
        };

        // Saved ranges from ranges module DB
        let saved_ranges = if let Ok(r_conn) = crate::storage::ModuleDbManager::get_connection("ranges") {
            let mut stmt = r_conn.prepare("SELECT data FROM saved_ranges").ok();
            if let Some(ref mut s) = stmt {
                let rows = s.query_map([], |r| r.get::<_, String>(0)).ok();
                rows.map(|r_iter| {
                    r_iter.flatten().filter_map(|d| serde_json::from_str::<Value>(&d).ok()).collect::<Vec<_>>()
                }).unwrap_or_default()
            } else {
                vec![]
            }
        } else {
            vec![]
        };

        // Reloading recipes from reloading module DB
        let reloading_recipes = if let Ok(rl_conn) = crate::storage::ModuleDbManager::get_connection("reloading") {
            let mut stmt = rl_conn.prepare("SELECT data FROM load_recipes").ok();
            if let Some(ref mut s) = stmt {
                let rows = s.query_map([], |r| r.get::<_, String>(0)).ok();
                rows.map(|r_iter| {
                    r_iter.flatten().filter_map(|d| serde_json::from_str::<Value>(&d).ok()).collect::<Vec<_>>()
                }).unwrap_or_default()
            } else {
                vec![]
            }
        } else {
            vec![]
        };

        Ok(json!({
            "success": true,
            "isLocked": false,
            "firearms": firearms,
            "ammo": ammo,
            "components": components,
            "accessories": accessories,
            "storageLocations": storage_locations,
            "skus": skus,
            "optics": optics,
            "installedModules": get_installed_modules(),
            "reloadingRecipes": reloading_recipes,
            "savedRanges": saved_ranges,
            "maintenanceSchedules": custom_presets,
            "rejectedSyncs": rejected_syncs,
            "syncVerification": {
                "firearmsCount": firearms_len,
                "ammoCount": ammo_len,
                "componentsCount": components_len,
                "accessoriesCount": accessories_len,
                "storageLocationsCount": storage_locations_len,
                "syncTimestamp": sync_timestamp,
                "vaultRevision": sync_timestamp
            }
        }))
    });

    match cache_res {
        Ok(val) => (
            StatusCode::OK,
            Json(maybe_encrypt_response(val, &headers, &app_state, client_token.as_deref())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e })),
        ),
    }
}

async fn handle_get_rejected_syncs(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let client_token = extract_token(&headers, &query, None);

    if app_state.is_locked() {
        return (
            StatusCode::OK,
            Json(maybe_encrypt_response(
                json!({ "success": false, "isLocked": true, "rejected": [] }),
                &headers,
                &app_state,
                client_token.as_deref(),
            )),
        );
    }

    let res = app_state.with_db(|conn| {
        let rejected = InventoryStore::get_rejected_syncs(conn).unwrap_or_default();
        Ok(json!({ "success": true, "rejected": rejected }))
    });

    match res {
        Ok(val) => (
            StatusCode::OK,
            Json(maybe_encrypt_response(val, &headers, &app_state, client_token.as_deref())),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e })),
        ),
    }
}

async fn handle_confirm_rejected_syncs(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let payload = match maybe_decrypt_request_payload(payload, &headers, &query, &app_state) {
        Ok(p) => p,
        Err(err_resp) => return err_resp,
    };

    let ids: Vec<String> = payload
        .get("ids")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|x| x.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default();

    let client_token = extract_token(&headers, &query, None);
    let res = app_state.with_db_mut(|conn| {
        InventoryStore::confirm_rejected_syncs(conn, &ids)
            .map_err(|e| e.to_string())
    });

    match res {
        Ok(deleted_count) => (
            StatusCode::OK,
            Json(maybe_encrypt_response(
                json!({ "success": true, "deletedCount": deleted_count }),
                &headers,
                &app_state,
                client_token.as_deref(),
            )),
        ),
        Err(e) => (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": e })),
        ),
    }
}

async fn handle_sync(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let payload = match maybe_decrypt_request_payload(payload, &headers, &query, &app_state) {
        Ok(p) => p,
        Err(err_resp) => return err_resp,
    };

    let device_name = extract_device_name(
        &headers,
        &query,
        payload.get("device").and_then(|v| v.as_str()),
    );
    let client_ip = extract_client_ip(&headers);
    let device_type = infer_device_type(&headers, &device_name);
    let device_id = get_or_create_device_id(&device_name, &device_type);
    let _ = app_state.with_db(|conn| {
        let _ = crate::storage::InventoryStore::update_paired_device_activity(conn, &device_id, Some(&client_ip));
        Ok::<(), String>(())
    });

    let items = match payload.get("items").and_then(|v| v.as_array()) {
        Some(arr) => arr,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "success": false, "error": "Invalid payload: items must be an array." })),
            );
        }
    };

    let mut processed = 0;
    let mut skipped = 0;

    let sync_res = app_state.with_db_mut(|conn| {
        let now = chrono_timestamp_millis();
        for item in items {
            let id = hex::encode(rand::random::<[u8; 8]>());
            let payload_str = serde_json::to_string(item).unwrap_or_default();
            let insert_res = conn.execute(
                "INSERT INTO sync_queue (id, payload, created_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![id, payload_str, now],
            );
            if insert_res.is_ok() {
                processed += 1;
            } else {
                skipped += 1;
            }
        }
        Ok(())
    });

    if sync_res.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": "Failed writing to sync queue (vault locked?)" })),
        );
    }

    // Emit live event to UI
    let _ = state.app_handle.emit("sync-received", json!({ "processed": processed, "skipped": skipped }));
    let _ = state.app_handle.emit("sync-queue-changed", json!({ "action": "received", "processed": processed }));

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "processed": processed,
            "skipped": skipped
        })),
    )
}

async fn handle_sync_payloads(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let payload = match maybe_decrypt_request_payload(payload, &headers, &query, &app_state) {
        Ok(p) => p,
        Err(err_resp) => return err_resp,
    };

    let device_name = extract_device_name(
        &headers,
        &query,
        payload.get("device").and_then(|v| v.as_str()),
    );

    let client_ip = extract_client_ip(&headers);
    let device_type = infer_device_type(&headers, &device_name);
    let device_id = get_or_create_device_id(&device_name, &device_type);
    let _ = app_state.with_db(|conn| {
        let _ = crate::storage::InventoryStore::update_paired_device_activity(conn, &device_id, Some(&client_ip));
        Ok::<(), String>(())
    });

    let payloads = match payload.get("payloads").and_then(|v| v.as_array()) {
        Some(arr) => arr,
        None => {
            return (
                StatusCode::BAD_REQUEST,
                Json(json!({ "success": false, "error": "Invalid payload: 'payloads' must be an array." })),
            );
        }
    };

    let mut processed = 0;
    let mut skipped = 0;
    let mut processed_filenames = Vec::new();

    let sync_res = app_state.with_db_mut(|conn| {
        let now = chrono_timestamp_millis();

        for item in payloads {
            let filename = item.get("filename").and_then(|v| v.as_str()).unwrap_or("unnamed_payload.avbundle");
            let extension = item.get("extension").and_then(|v| v.as_str()).unwrap_or("avbundle");
            let envelope = item.get("envelope").cloned().unwrap_or(Value::Null);

            let id = hex::encode(rand::random::<[u8; 8]>());
            let item_wrapper = json!({
                "type": "custom_payload",
                "custom_payload_filename": filename,
                "custom_payload_extension": extension,
                "custom_payload_envelope": envelope,
                "device": device_name.clone(),
                "received_at": now
            });
            let payload_str = serde_json::to_string(&item_wrapper).unwrap_or_default();
            let insert_res = conn.execute(
                "INSERT INTO sync_queue (id, payload, created_at) VALUES (?1, ?2, ?3)",
                rusqlite::params![id, payload_str, now],
            );

            if insert_res.is_ok() {
                processed += 1;
                processed_filenames.push(filename.to_string());
                let _ = state.app_handle.emit(
                    "payload-received",
                    json!({
                        "id": id,
                        "filename": filename,
                        "extension": extension,
                        "envelope": envelope,
                        "device": device_name.clone()
                    }),
                );
            } else {
                skipped += 1;
            }
        }
        Ok(())
    });

    if sync_res.is_err() {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": "Failed writing custom payloads to sync queue (vault locked?)" })),
        );
    }

    let _ = state.app_handle.emit(
        "sync-received",
        json!({ "processed": processed, "skipped": skipped }),
    );
    let _ = state.app_handle.emit(
        "sync-queue-changed",
        json!({ "action": "received", "processed": processed }),
    );

    (
        StatusCode::OK,
        Json(json!({
            "success": true,
            "processed": processed,
            "skipped": skipped,
            "processedFilenames": processed_filenames
        })),
    )
}

async fn handle_modules() -> impl IntoResponse {
    (
        StatusCode::OK,
        Json(json!({
            "installedModules": get_installed_modules()
        })),
    )
}

async fn handle_storage_locations(
    State(state): State<ServerState>,
    headers: HeaderMap,
    Query(query): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let client_token = extract_token(&headers, &query, None);
    if app_state.is_locked() {
        let val = json!({ "success": false, "isLocked": true, "locations": [] });
        return (
            StatusCode::OK,
            Json(maybe_encrypt_response(val, &headers, &app_state, client_token.as_deref())),
        );
    }
    let locations = app_state.with_db(|conn| {
        InventoryStore::get_storage_locations(conn).map_err(|e| e.to_string())
    }).unwrap_or_default();

    let val = json!({ "success": true, "locations": locations });
    (
        StatusCode::OK,
        Json(maybe_encrypt_response(val, &headers, &app_state, client_token.as_deref())),
    )
}

async fn handle_chrono(
    State(state): State<ServerState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let sync_res = app_state.with_db_mut(|conn| {
        let id = hex::encode(rand::random::<[u8; 8]>());
        let item_obj = json!({
            "action": "chrono",
            "data": payload,
            "timestamp": chrono_timestamp_millis()
        });
        let payload_str = serde_json::to_string(&item_obj).unwrap_or_default();
        let now = chrono_timestamp_millis();
        let _ = conn.execute(
            "INSERT INTO sync_queue (id, payload, created_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![id, payload_str, now],
        );
        Ok(())
    });

    if sync_res.is_ok() {
        let _ = state.app_handle.emit("sync-received", json!({ "processed": 1, "skipped": 0 }));
        (StatusCode::OK, Json(json!({ "success": true })))
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": "Failed writing chrono data to sync queue" })),
        )
    }
}

async fn handle_target_analysis(
    State(state): State<ServerState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    let sync_res = app_state.with_db_mut(|conn| {
        let id = hex::encode(rand::random::<[u8; 8]>());
        let item_obj = json!({
            "action": "target_analysis",
            "data": payload,
            "timestamp": chrono_timestamp_millis()
        });
        let payload_str = serde_json::to_string(&item_obj).unwrap_or_default();
        let now = chrono_timestamp_millis();
        let _ = conn.execute(
            "INSERT INTO sync_queue (id, payload, created_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![id, payload_str, now],
        );
        Ok(())
    });

    if sync_res.is_ok() {
        let _ = state.app_handle.emit("sync-received", json!({ "processed": 1, "skipped": 0 }));
        (StatusCode::OK, Json(json!({ "success": true })))
    } else {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            Json(json!({ "success": false, "error": "Failed writing target analysis to sync queue" })),
        )
    }
}

async fn handle_ballistic_profiles(
    State(state): State<ServerState>,
) -> impl IntoResponse {
    let app_state = state.app_handle.state::<AppState>();
    if app_state.is_locked() {
        return (
            StatusCode::OK,
            Json(json!({ "success": false, "isLocked": true, "profiles": [] })),
        );
    }

    let profiles = if let Ok(b_conn) = crate::storage::ModuleDbManager::get_connection("ballistics") {
        let mut stmt = b_conn.prepare("SELECT data FROM ballistic_profiles").ok();
        if let Some(ref mut s) = stmt {
            let rows = s.query_map([], |r| r.get::<_, String>(0)).ok();
            rows.map(|r_iter| {
                r_iter.flatten().filter_map(|d| serde_json::from_str::<Value>(&d).ok()).collect::<Vec<_>>()
            }).unwrap_or_default()
        } else {
            vec![]
        }
    } else {
        vec![]
    };

    (
        StatusCode::OK,
        Json(json!({ "success": true, "profiles": profiles })),
    )
}

fn chrono_timestamp_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
