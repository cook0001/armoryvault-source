use crate::commands::vault_commands::AppState;
use crate::storage::db::Database;
use crate::storage::paths::AppPaths;
use crate::storage::MediaManager;
use serde_json::{json, Value};
use std::io::Write;
use std::path::{Path, PathBuf};
use tauri::State;
use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

#[tauri::command]
pub fn get_local_ip() -> String {
    local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string())
}

#[tauri::command]
pub fn get_all_local_ips() -> Vec<String> {
    local_ip_address::list_afinet_netifas()
        .map(|list| list.into_iter().map(|(_, ip)| ip.to_string()).collect())
        .unwrap_or_else(|_| vec!["127.0.0.1".to_string()])
}

#[tauri::command]
pub fn save_base64_photo(base64_data: String, filename: String) -> Result<String, String> {
    MediaManager::save_base64_photo(&base64_data, &filename)
}

#[tauri::command]
pub fn save_base64_document(base64_data: String, filename: String) -> Result<String, String> {
    MediaManager::save_base64_document(&base64_data, &filename)
}

#[tauri::command]
pub fn save_photo(source_path: String, filename: String) -> Result<String, String> {
    let photos_dir = AppPaths::get_photos_dir();
    let _ = std::fs::create_dir_all(&photos_dir);
    let target_path = photos_dir.join(&filename);

    std::fs::copy(&source_path, &target_path).map_err(|e| e.to_string())?;

    // Thumbnail generation
    if let Ok(data) = std::fs::read(&target_path) {
        if let Ok(img) = image::load_from_memory(&data) {
            let thumb = img.thumbnail(200, 200);
            let thumb_path = photos_dir.join(format!("thumb_{}", filename));
            let _ = thumb.save(thumb_path);
        }
    }

    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn save_document(source_path: String, filename: String) -> Result<String, String> {
    let docs_dir = AppPaths::get_documents_dir();
    let _ = std::fs::create_dir_all(&docs_dir);
    let target_path = docs_dir.join(&filename);

    std::fs::copy(&source_path, &target_path).map_err(|e| e.to_string())?;
    Ok(target_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_backup_folder() -> Option<String> {
    let config_path = AppPaths::get_app_data_dir().join("config.json");
    if let Ok(content) = std::fs::read_to_string(config_path) {
        if let Ok(val) = serde_json::from_str::<Value>(&content) {
            return val
                .get("backup_folder")
                .or_else(|| val.get("backupPath"))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());
        }
    }
    None
}

#[tauri::command]
pub fn select_backup_folder() -> Option<String> {
    let picked = rfd::FileDialog::new()
        .set_title("Select Backup Folder")
        .pick_folder();

    if let Some(path) = picked {
        let folder_str = path.to_string_lossy().to_string();
        let config_path = AppPaths::get_app_data_dir().join("config.json");
        let mut cfg = if let Ok(c) = std::fs::read_to_string(&config_path) {
            serde_json::from_str::<Value>(&c).unwrap_or(json!({}))
        } else {
            json!({})
        };
        cfg["backup_folder"] = json!(folder_str.clone());
        cfg["backupPath"] = json!(folder_str.clone());
        let _ = std::fs::write(config_path, serde_json::to_string_pretty(&cfg).unwrap_or_default());
        let _ = perform_auto_backup();
        Some(folder_str)
    } else {
        None
    }
}

/// Automatically copies active encrypted stores to the configured backup folder with date-stamping
/// and rotates the directory to retain only the 5 most recent date-stamped backups.
pub fn perform_auto_backup() -> Result<(), String> {
    let backup_dir = match get_backup_folder() {
        Some(d) if !d.trim().is_empty() => PathBuf::from(d),
        _ => return Ok(()),
    };

    if !backup_dir.exists() || !backup_dir.is_dir() {
        return Ok(());
    }

    let app_data = AppPaths::get_app_data_dir();
    let date_str = chrono::Utc::now().format("%Y-%m-%d").to_string();

    // 1. Copy active encrypted stores with date-stamped filenames
    let vault_enc = app_data.join("firearms_inventory.enc");
    if vault_enc.exists() {
        let dest = backup_dir.join(format!("ArmoryVault_Backup_{}.enc", date_str));
        let _ = std::fs::copy(&vault_enc, dest);
    }

    let skus_enc = app_data.join("skus_database.enc");
    if skus_enc.exists() {
        let dest = backup_dir.join(format!("ArmoryVault_Skus_Backup_{}.enc", date_str));
        let _ = std::fs::copy(&skus_enc, dest);
    }

    let act_enc = app_data.join("activity_log.enc");
    if act_enc.exists() {
        let dest = backup_dir.join(format!("ArmoryVault_ActivityLog_Backup_{}.enc", date_str));
        let _ = std::fs::copy(&act_enc, dest);
    }

    // 2. Rotate: Keep only the 5 most recent date-stamped backups
    const MAX_BACKUPS: usize = 5;
    if let Ok(entries) = std::fs::read_dir(&backup_dir) {
        let mut backup_files: Vec<PathBuf> = Vec::new();
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("ArmoryVault_Backup_") && name.ends_with(".enc") {
                    backup_files.push(path);
                }
            }
        }

        backup_files.sort_by(|a, b| b.file_name().cmp(&a.file_name()));

        if backup_files.len() > MAX_BACKUPS {
            for old_file in &backup_files[MAX_BACKUPS..] {
                if let Some(name) = old_file.file_name().and_then(|n| n.to_str()) {
                    let date_part = name
                        .strip_prefix("ArmoryVault_Backup_")
                        .and_then(|s| s.strip_suffix(".enc"));
                    let _ = std::fs::remove_file(old_file);
                    if let Some(date) = date_part {
                        let old_skus = backup_dir.join(format!("ArmoryVault_Skus_Backup_{}.enc", date));
                        let _ = std::fs::remove_file(old_skus);
                        let old_act = backup_dir.join(format!("ArmoryVault_ActivityLog_Backup_{}.enc", date));
                        let _ = std::fs::remove_file(old_act);
                    }
                }
            }
        }
    }

    Ok(())
}

fn add_dir_to_zip<W: Write + std::io::Seek>(
    zip: &mut zip::ZipWriter<W>,
    base_dir: &Path,
    current_dir: &Path,
    options: SimpleFileOptions,
) -> Result<(), String> {
    if !current_dir.exists() {
        return Ok(());
    }
    for entry in std::fs::read_dir(current_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let rel_path = match path.strip_prefix(base_dir) {
            Ok(p) => p,
            Err(_) => continue,
        };
        let rel_str = rel_path.to_string_lossy().replace('\\', "/");

        if path.is_dir() {
            let _ = zip.add_directory(&rel_str, options);
            add_dir_to_zip(zip, base_dir, &path, options)?;
        } else if path.is_file() {
            zip.start_file(&rel_str, options).map_err(|e| e.to_string())?;
            let data = std::fs::read(&path).map_err(|e| e.to_string())?;
            zip.write_all(&data).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
pub fn create_zip_backup() -> Result<Value, String> {
    let default_date = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let default_filename = format!("ArmoryVault_Full_Backup_{}.zip", default_date);

    let picked = rfd::FileDialog::new()
        .set_title("Save Full Backup Archive (.zip)")
        .set_file_name(&default_filename)
        .add_filter("Zip Archives (*.zip)", &["zip"])
        .save_file();

    let zip_path = match picked {
        Some(p) => p,
        None => return Ok(json!({ "success": false, "canceled": true })),
    };

    let file = std::fs::File::create(&zip_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(CompressionMethod::Deflated);

    let app_data = AppPaths::get_app_data_dir();

    // Package root database & vault artifacts
    for filename in &[
        "firearms_inventory.enc",
        "activity_log.enc",
        "skus_database.enc",
        "config.json",
    ] {
        let f_path = app_data.join(filename);
        if f_path.exists() && f_path.is_file() {
            zip.start_file(*filename, options).map_err(|e| e.to_string())?;
            let data = std::fs::read(&f_path).map_err(|e| e.to_string())?;
            zip.write_all(&data).map_err(|e| e.to_string())?;
        }
    }

    // Package dedicated module databases (module_data/*.sqlite)
    let module_dir = app_data.join("module_data");
    if module_dir.exists() {
        add_dir_to_zip(&mut zip, &app_data, &module_dir, options)?;
    }

    // Package photos directory
    let photos_dir = AppPaths::get_photos_dir();
    if photos_dir.exists() {
        add_dir_to_zip(&mut zip, &app_data, &photos_dir, options)?;
    }

    // Package documents directory
    let docs_dir = AppPaths::get_documents_dir();
    if docs_dir.exists() {
        add_dir_to_zip(&mut zip, &app_data, &docs_dir, options)?;
    }

    zip.finish().map_err(|e| e.to_string())?;

    Ok(json!({
        "success": true,
        "filePath": zip_path.to_string_lossy().to_string()
    }))
}

#[tauri::command]
pub fn restore_backup(state: State<AppState>) -> Result<Value, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Select Database File to Restore or Import")
        .add_filter(
            "All Supported Databases (*.enc, *.zip, *.sqlite, *.db, *.json, *.csv, *.tsv, *.bak)",
            &["enc", "zip", "sqlite", "db", "sqlite3", "json", "csv", "tsv", "bak"],
        )
        .add_filter("Encrypted Vault (*.enc, *.bak)", &["enc", "bak"])
        .add_filter("Full Backup Archive (*.zip)", &["zip"])
        .add_filter("SQLite Database (*.sqlite, *.db, *.sqlite3)", &["sqlite", "db", "sqlite3"])
        .add_filter("JSON Database Export (*.json)", &["json"])
        .add_filter("Spreadsheets & CSV (*.csv, *.tsv)", &["csv", "tsv"])
        .add_filter("All Files (*.*)", &["*"])
        .pick_file();

    let backup_path = match picked {
        Some(p) => p,
        None => return Ok(json!({ "canceled": true })),
    };

    let ext = backup_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let app_data = AppPaths::get_app_data_dir();
    let timestamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();

    // 1. Create safety backup copies of current active encrypted stores
    let current_vault = app_data.join("firearms_inventory.enc");
    if current_vault.exists() {
        let _ = std::fs::copy(
            &current_vault,
            app_data.join(format!("firearms_inventory_pre_restore_{}.enc.bak", timestamp)),
        );
    }
    let current_act = app_data.join("activity_log.enc");
    if current_act.exists() {
        let _ = std::fs::copy(
            &current_act,
            app_data.join(format!("activity_log_pre_restore_{}.enc.bak", timestamp)),
        );
    }
    let current_skus = app_data.join("skus_database.enc");
    if current_skus.exists() {
        let _ = std::fs::copy(
            &current_skus,
            app_data.join(format!("skus_database_pre_restore_{}.enc.bak", timestamp)),
        );
    }

    if ext == "enc" || ext == "bak" {
        let file_stem = backup_path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or("")
            .to_lowercase();

        let dest_filename = if file_stem.contains("activity_log") || file_stem.contains("activitylog") {
            "activity_log.enc"
        } else if file_stem.contains("sku") {
            "skus_database.enc"
        } else {
            "firearms_inventory.enc"
        };

        let dest = app_data.join(dest_filename);
        std::fs::copy(&backup_path, &dest).map_err(|e| e.to_string())?;

        // If vault is currently unlocked, check if the current master key decrypts it
        let mut vault_guard = state.vault.lock().map_err(|e| e.to_string())?;
        if !vault_guard.is_locked() {
            if let Ok(decrypted_json) = vault_guard.decrypt_vault() {
                let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
                crate::commands::vault_commands::initialize_unlocked_state(&vault_guard, &mut db_guard, &decrypted_json)?;

                return Ok(json!({
                    "success": true,
                    "requiresRelogin": false,
                    "filePath": backup_path.to_string_lossy().to_string(),
                    "type": "enc"
                }));
            } else {
                // Cannot decrypt with current key -> must lock and relogin
                vault_guard.lock_vault();
                let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
                *db_guard = None;
                return Ok(json!({
                    "success": true,
                    "requiresRelogin": true,
                    "filePath": backup_path.to_string_lossy().to_string(),
                    "type": "enc"
                }));
            }
        }

        return Ok(json!({
            "success": true,
            "requiresRelogin": true,
            "filePath": backup_path.to_string_lossy().to_string(),
            "type": "enc"
        }));
    } else if ext == "zip" {
        let file = std::fs::File::open(&backup_path).map_err(|e| e.to_string())?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| e.to_string())?;

        let mut extracted_enc = false;
        let mut extracted_sqlite = None;
        let mut extracted_json = None;

        for i in 0..archive.len() {
            let mut item = archive.by_index(i).map_err(|e| e.to_string())?;
            let enclosed = match item.enclosed_name() {
                Some(n) => n.to_owned(),
                None => continue,
            };
            let outpath = app_data.join(&enclosed);
            if item.is_dir() {
                let _ = std::fs::create_dir_all(&outpath);
            } else {
                if let Some(p) = outpath.parent() {
                    let _ = std::fs::create_dir_all(p);
                }
                let mut outfile = std::fs::File::create(&outpath).map_err(|e| e.to_string())?;
                std::io::copy(&mut item, &mut outfile).map_err(|e| e.to_string())?;

                let filename = enclosed.to_string_lossy().to_lowercase();
                if filename.ends_with("firearms_inventory.enc") {
                    extracted_enc = true;
                } else if filename.ends_with(".enc") && !filename.contains("activity_log") && !filename.contains("activitylog") && !filename.contains("sku") {
                    let _ = std::fs::copy(&outpath, app_data.join("firearms_inventory.enc"));
                    extracted_enc = true;
                } else if filename.ends_with(".sqlite") || filename.ends_with(".db") || filename.ends_with(".sqlite3") {
                    extracted_sqlite = Some(outpath.clone());
                } else if filename.ends_with("firearms_inventory.json") || filename.ends_with(".json") {
                    extracted_json = Some(outpath.clone());
                }
            }
        }

        if extracted_enc {
            let mut vault_guard = state.vault.lock().map_err(|e| e.to_string())?;
            if !vault_guard.is_locked() {
                if let Ok(decrypted_json) = vault_guard.decrypt_vault() {
                    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
                    crate::commands::vault_commands::initialize_unlocked_state(&vault_guard, &mut db_guard, &decrypted_json)?;

                    return Ok(json!({
                        "success": true,
                        "requiresRelogin": false,
                        "filePath": backup_path.to_string_lossy().to_string(),
                        "type": "zip"
                    }));
                } else {
                    vault_guard.lock_vault();
                    let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
                    *db_guard = None;
                }
            }
            return Ok(json!({
                "success": true,
                "requiresRelogin": true,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "zip"
            }));
        } else if let Some(sqlite_file) = extracted_sqlite {
            let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
            if let Some(conn) = db_guard.as_mut() {
                Database::import_from_sqlite(conn, &sqlite_file)?;
                let _ = state.flush_vault();
                let _ = state.flush_activity_log();
                let _ = state.flush_skus();
                let _ = std::fs::remove_file(&sqlite_file);
                return Ok(json!({
                    "success": true,
                    "requiresRelogin": false,
                    "filePath": backup_path.to_string_lossy().to_string(),
                    "type": "zip"
                }));
            } else {
                let dest = app_data.join("armoryvault.sqlite");
                if sqlite_file != dest {
                    let _ = std::fs::copy(&sqlite_file, &dest);
                }
                return Ok(json!({
                    "success": true,
                    "requiresRelogin": true,
                    "filePath": backup_path.to_string_lossy().to_string(),
                    "type": "zip"
                }));
            }
        } else if let Some(json_file) = extracted_json {
            let content = std::fs::read_to_string(&json_file).map_err(|e| e.to_string())?;
            if let Ok(val) = serde_json::from_str::<Value>(&content) {
                let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
                if let Some(conn) = db_guard.as_mut() {
                    Database::import_legacy_json(conn, &val)?;
                    let _ = state.flush_vault();
                    let _ = state.flush_activity_log();
                    let _ = state.flush_skus();
                    let _ = std::fs::remove_file(&json_file);
                    return Ok(json!({
                        "success": true,
                        "requiresRelogin": false,
                        "filePath": backup_path.to_string_lossy().to_string(),
                        "type": "zip"
                    }));
                } else {
                    let dest = app_data.join("firearms_inventory.json");
                    if json_file != dest {
                        let _ = std::fs::copy(&json_file, &dest);
                    }
                    return Ok(json!({
                        "success": true,
                        "requiresRelogin": true,
                        "filePath": backup_path.to_string_lossy().to_string(),
                        "type": "zip"
                    }));
                }
            }
            return Ok(json!({
                "success": true,
                "requiresRelogin": true,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "zip"
            }));
        }

        return Ok(json!({
            "success": true,
            "requiresRelogin": true,
            "filePath": backup_path.to_string_lossy().to_string(),
            "type": "zip"
        }));
    } else if ext == "sqlite" || ext == "db" || ext == "sqlite3" {
        let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
        if let Some(conn) = db_guard.as_mut() {
            let count = Database::import_from_sqlite(conn, &backup_path)?;
            let _ = state.flush_vault();
            let _ = state.flush_activity_log();
            let _ = state.flush_skus();
            return Ok(json!({
                "success": true,
                "requiresRelogin": false,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "sqlite",
                "count": count,
                "message": format!("Imported {} records from SQLite database successfully!", count)
            }));
        } else {
            let dest = app_data.join("armoryvault.sqlite");
            std::fs::copy(&backup_path, &dest).map_err(|e| e.to_string())?;
            return Ok(json!({
                "success": true,
                "requiresRelogin": true,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "sqlite",
                "message": "SQLite database staged. Please unlock or set up your vault to complete import."
            }));
        }
    } else if ext == "json" {
        let content = std::fs::read_to_string(&backup_path).map_err(|e| e.to_string())?;
        let val: Value = serde_json::from_str(&content)
            .map_err(|e| format!("Invalid JSON database export: {}", e))?;

        let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
        if let Some(conn) = db_guard.as_mut() {
            Database::import_legacy_json(conn, &val)?;
            let _ = state.flush_vault();
            let _ = state.flush_activity_log();
            let _ = state.flush_skus();
            return Ok(json!({
                "success": true,
                "requiresRelogin": false,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "json",
                "message": "JSON database imported successfully into active vault!"
            }));
        } else {
            let dest = app_data.join("firearms_inventory.json");
            std::fs::copy(&backup_path, &dest).map_err(|e| e.to_string())?;
            return Ok(json!({
                "success": true,
                "requiresRelogin": true,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "json",
                "message": "JSON database staged. Please unlock or set up your vault to complete import."
            }));
        }
    } else if ext == "csv" || ext == "tsv" {
        let mut db_guard = state.db.lock().map_err(|e| e.to_string())?;
        if let Some(conn) = db_guard.as_mut() {
            let count = Database::import_csv(conn, &backup_path)?;
            let _ = state.flush_vault();
            let _ = state.flush_activity_log();
            let _ = state.flush_skus();
            return Ok(json!({
                "success": true,
                "requiresRelogin": false,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "csv",
                "count": count,
                "message": format!("Imported {} records from spreadsheet successfully into active vault!", count)
            }));
        } else {
            let dest = app_data.join(format!("imported_records.{}", ext));
            std::fs::copy(&backup_path, &dest).map_err(|e| e.to_string())?;
            return Ok(json!({
                "success": true,
                "requiresRelogin": true,
                "filePath": backup_path.to_string_lossy().to_string(),
                "type": "csv",
                "message": "Spreadsheet database staged. Please unlock or set up your vault to complete import."
            }));
        }
    }

    Err("Unsupported database format. Must be .enc, .zip, .sqlite, .db, .json, .csv, .tsv, or .bak".to_string())
}

#[tauri::command]
pub fn import_database(state: State<AppState>) -> Result<Value, String> {
    restore_backup(state)
}

#[tauri::command]
pub fn select_and_save_photo() -> Result<Option<Vec<String>>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Select Photo")
        .add_filter("Images", &["jpg", "jpeg", "png", "webp", "gif"])
        .pick_files();

    let files = match picked {
        Some(f) if !f.is_empty() => f,
        _ => return Ok(None),
    };

    let mut saved_paths = Vec::new();
    let photos_dir = AppPaths::get_photos_dir();
    let _ = std::fs::create_dir_all(&photos_dir);

    for src in files {
        let ext = src
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("jpg")
            .to_lowercase();
        let filename = format!(
            "photo_{}_{}.{}",
            chrono::Utc::now().timestamp_millis(),
            rand::random::<u32>(),
            ext
        );
        let dest = photos_dir.join(&filename);
        if std::fs::copy(&src, &dest).is_ok() {
            if let Ok(data) = std::fs::read(&dest) {
                if let Ok(img) = image::load_from_memory(&data) {
                    let thumb = img.thumbnail(200, 200);
                    let thumb_path = photos_dir.join(format!("thumb_{}", filename));
                    let _ = thumb.save(thumb_path);
                }
            }
            saved_paths.push(dest.to_string_lossy().to_string());
        }
    }

    if saved_paths.is_empty() {
        Ok(None)
    } else {
        Ok(Some(saved_paths))
    }
}

#[tauri::command]
pub fn select_and_save_document() -> Result<Option<Value>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Select Document")
        .add_filter("Documents", &["pdf", "jpg", "jpeg", "png"])
        .pick_file();

    let src = match picked {
        Some(f) => f,
        None => return Ok(None),
    };

    let ext = src
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("pdf")
        .to_lowercase();
    let filename = format!("doc_{}.{}", chrono::Utc::now().timestamp_millis(), ext);
    let docs_dir = AppPaths::get_documents_dir();
    let _ = std::fs::create_dir_all(&docs_dir);
    let dest = docs_dir.join(&filename);

    std::fs::copy(&src, &dest).map_err(|e| e.to_string())?;

    let orig_name = src
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("document")
        .to_string();

    Ok(Some(json!({
        "name": orig_name,
        "path": dest.to_string_lossy().to_string()
    })))
}

#[tauri::command]
pub fn select_csv_file() -> Result<Option<Value>, String> {
    let picked = rfd::FileDialog::new()
        .set_title("Select CSV / TSV File to Import")
        .add_filter("CSV & Spreadsheets (*.csv, *.tsv, *.txt)", &["csv", "tsv", "txt"])
        .add_filter(
            "All Supported Import Files (*.csv, *.tsv, *.txt, *.json, *.load, *.loadbench, *.ldb, *.avr)",
            &["csv", "tsv", "txt", "json", "load", "loadbench", "ldb", "avr"],
        )
        .add_filter("All Files (*.*)", &["*"])
        .pick_file();

    let path = match picked {
        Some(p) => p,
        None => return Ok(None),
    };

    let content = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("imported.csv")
        .to_string();

    Ok(Some(json!({
        "name": name,
        "path": path.to_string_lossy().to_string(),
        "content": content
    })))
}

#[tauri::command]
pub fn save_qr_image(item_name: String, qr_data_url: String) -> Result<bool, String> {
    let sanitized_name = item_name
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { '_' })
        .collect::<String>()
        .to_lowercase();
    let default_name = format!("QR_{}.png", sanitized_name);

    let picked = rfd::FileDialog::new()
        .set_title("Save QR Code")
        .set_file_name(&default_name)
        .add_filter("Images (*.png)", &["png"])
        .save_file();

    let output_path = match picked {
        Some(p) => p,
        None => return Ok(false),
    };

    let clean_base64 = if let Some(idx) = qr_data_url.find(',') {
        &qr_data_url[idx + 1..]
    } else {
        &qr_data_url
    };

    let decoded = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, clean_base64)
        .map_err(|e| e.to_string())?;

    std::fs::write(output_path, decoded).map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub fn open_external_file(file_path: String) -> Result<(), String> {
    let clean_path = if file_path.starts_with("file://") {
        file_path.replace("file://", "")
    } else {
        file_path
    };

    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&clean_path).spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd").args(&["/c", "start", "", &clean_path]).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&clean_path).spawn();
    }

    Ok(())
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        let _ = std::process::Command::new("open").arg(&url).spawn();
    }
    #[cfg(target_os = "windows")]
    {
        let _ = std::process::Command::new("cmd").args(&["/c", "start", "", &url]).spawn();
    }
    #[cfg(target_os = "linux")]
    {
        let _ = std::process::Command::new("xdg-open").arg(&url).spawn();
    }

    Ok(())
}

#[tauri::command]
pub fn read_file_base64(file_path: String) -> Result<Option<String>, String> {
    let clean_path = if file_path.starts_with("file://") {
        file_path.replace("file://", "")
    } else {
        file_path
    };
    let bytes = std::fs::read(&clean_path).map_err(|e| e.to_string())?;
    Ok(Some(base64::Engine::encode(&base64::engine::general_purpose::STANDARD, bytes)))
}

#[tauri::command]
pub fn read_file_buffer(file_path: String) -> Result<Option<Vec<u8>>, String> {
    let clean_path = if file_path.starts_with("file://") {
        file_path.replace("file://", "")
    } else {
        file_path
    };
    let bytes = std::fs::read(&clean_path).map_err(|e| e.to_string())?;
    Ok(Some(bytes))
}

#[tauri::command]
pub async fn lookup_upc(upc: String) -> Result<Option<Value>, String> {
    let clean_upc = upc.trim();
    if clean_upc.is_empty() {
        return Ok(None);
    }
    let url = format!("https://api.upcitemdb.com/prod/trial/lookup?upc={}", clean_upc);
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| e.to_string())?;

    let res = match client.get(&url).send().await {
        Ok(r) => r,
        Err(e) => {
            eprintln!("[UPC] Request failed: {}", e);
            return Ok(None);
        }
    };

    if !res.status().is_success() {
        return Ok(None);
    }

    match res.json::<Value>().await {
        Ok(v) => Ok(Some(v)),
        Err(e) => {
            eprintln!("[UPC] JSON parse failed: {}", e);
            Ok(None)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_auto_backup_rotation() {
        let temp_dir = std::env::temp_dir().join(format!(
            "av_test_backup_{}",
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_millis()
        ));
        let _ = std::fs::create_dir_all(&temp_dir);

        // Prepopulate with 7 date-stamped backup files
        for i in 1..=7 {
            let fname = format!("ArmoryVault_Backup_2026-08-{:02}.enc", i);
            let skus_fname = format!("ArmoryVault_Skus_Backup_2026-08-{:02}.enc", i);
            let act_fname = format!("ArmoryVault_ActivityLog_Backup_2026-08-{:02}.enc", i);
            let _ = std::fs::write(temp_dir.join(fname), b"vault-test");
            let _ = std::fs::write(temp_dir.join(skus_fname), b"skus-test");
            let _ = std::fs::write(temp_dir.join(act_fname), b"act-test");
        }

        let entries = std::fs::read_dir(&temp_dir).unwrap();
        let mut backup_files: Vec<PathBuf> = Vec::new();
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with("ArmoryVault_Backup_") && name.ends_with(".enc") {
                    backup_files.push(path);
                }
            }
        }
        backup_files.sort_by(|a, b| b.file_name().cmp(&a.file_name()));
        assert_eq!(backup_files.len(), 7);

        const MAX_BACKUPS: usize = 5;
        for old_file in &backup_files[MAX_BACKUPS..] {
            if let Some(name) = old_file.file_name().and_then(|n| n.to_str()) {
                let date_part = name
                    .strip_prefix("ArmoryVault_Backup_")
                    .and_then(|s| s.strip_suffix(".enc"));
                let _ = std::fs::remove_file(old_file);
                if let Some(date) = date_part {
                    let old_skus = temp_dir.join(format!("ArmoryVault_Skus_Backup_{}.enc", date));
                    let _ = std::fs::remove_file(old_skus);
                    let old_act = temp_dir.join(format!("ArmoryVault_ActivityLog_Backup_{}.enc", date));
                    let _ = std::fs::remove_file(old_act);
                }
            }
        }

        let remaining_entries: Vec<_> = std::fs::read_dir(&temp_dir).unwrap().flatten().collect();
        assert_eq!(remaining_entries.len(), 15);
        assert!(!temp_dir.join("ArmoryVault_Backup_2026-08-01.enc").exists());
        assert!(!temp_dir.join("ArmoryVault_Skus_Backup_2026-08-01.enc").exists());
        assert!(temp_dir.join("ArmoryVault_Backup_2026-08-07.enc").exists());

        let _ = std::fs::remove_dir_all(&temp_dir);
    }
}

