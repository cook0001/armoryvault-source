use super::module_db::ModuleDbManager;
use rusqlite::{params, Connection, Result};
use serde_json::Value;
use std::path::Path;

pub struct Database;

impl Database {
    /// Initializes core SQLite database with high-concurrency WAL mode and indexes.
    pub fn init(conn: &Connection) -> Result<()> {
        conn.execute_batch(
            "PRAGMA journal_mode = WAL;
             PRAGMA synchronous = NORMAL;
             PRAGMA busy_timeout = 5000;
             PRAGMA foreign_keys = ON;

            CREATE TABLE IF NOT EXISTS kv_meta (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS firearms (
                id INTEGER PRIMARY KEY,
                make TEXT,
                model TEXT,
                serial_number TEXT,
                caliber TEXT,
                data TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_firearms_serial ON firearms(serial_number);
            CREATE INDEX IF NOT EXISTS idx_firearms_make_model ON firearms(make, model);

            CREATE TABLE IF NOT EXISTS ammo (
                id INTEGER PRIMARY KEY,
                caliber TEXT,
                brand TEXT,
                bullet_type TEXT,
                data TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS idx_ammo_caliber ON ammo(caliber);

            CREATE TABLE IF NOT EXISTS accessories (
                id INTEGER PRIMARY KEY,
                name TEXT,
                category TEXT,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS storage_locations (
                id TEXT PRIMARY KEY,
                name TEXT,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS skus (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS activity_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp TEXT,
                action TEXT,
                data TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS sync_queue (
                id TEXT PRIMARY KEY,
                payload TEXT NOT NULL,
                created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS rejected_syncs (
                id TEXT PRIMARY KEY,
                sync_id TEXT,
                item_type TEXT,
                filename TEXT,
                item_identifier TEXT,
                payload TEXT,
                created_at INTEGER
            );

            CREATE TABLE IF NOT EXISTS paired_devices (
                id TEXT PRIMARY KEY,
                device_name TEXT NOT NULL,
                device_type TEXT NOT NULL,
                ip_address TEXT,
                paired_at TEXT NOT NULL,
                last_active_at TEXT NOT NULL,
                is_active INTEGER DEFAULT 1,
                device_token TEXT,
                device_key TEXT
            );

            -- Backwards-compatibility tables in core (read fallback)
            CREATE TABLE IF NOT EXISTS components (
                id INTEGER PRIMARY KEY,
                type TEXT,
                caliber TEXT,
                data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS chrono_strings (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS target_analyses (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS load_ladder_tests (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS ballistic_profiles (
                id TEXT PRIMARY KEY,
                data TEXT NOT NULL
            );
            "
        )?;

        // Safe column migrations for paired_devices
        let _ = conn.execute("ALTER TABLE paired_devices ADD COLUMN device_token TEXT", []);
        let _ = conn.execute("ALTER TABLE paired_devices ADD COLUMN device_key TEXT", []);

        Ok(())
    }

    /// Flexible ID parser handling JSON numbers, numeric strings, UUID strings, or fallback index
    pub fn get_id_str(item: &Value, fallback_idx: usize) -> String {
        if let Some(s) = item.get("id").and_then(|v| v.as_str()) {
            if !s.is_empty() {
                return s.to_string();
            }
        }
        if let Some(n) = item.get("id").and_then(|v| v.as_i64()) {
            return n.to_string();
        }
        fallback_idx.to_string()
    }

    /// Seeds Core and Module databases from legacy decrypted JSON schema or external JSON
    pub fn import_legacy_json(conn: &mut Connection, root_json: &Value) -> Result<(), String> {
        super::importers::import_json(conn, root_json)
    }

    /// Migrates module-specific collections into their dedicated SQLite database files in module_data/
    pub fn migrate_module_collections(root_json: &Value) -> Result<(), String> {
        super::importers::migrate_module_collections(root_json)
    }

    /// Granular catch-up check executed on every vault unlock.
    /// If any core table or module database is missing records while the decrypted legacy JSON
    /// contains them, it safely and idempotently restores them without touching already populated tables.
    pub fn catch_up_missing_collections(conn: &mut Connection, root_json: &Value) -> Result<(), String> {
        // 1. Storage Locations catch-up
        let storage_count: i64 = conn.query_row("SELECT COUNT(*) FROM storage_locations", [], |r| r.get(0)).unwrap_or(0);
        if storage_count == 0 {
            if let Some(list) = root_json.get("storage_locations").and_then(|v| v.as_array()) {
                if !list.is_empty() {
                    for (idx, item) in list.iter().enumerate() {
                        let id_str = Self::get_id_str(item, idx + 1);
                        let name = item.get("name").and_then(|v| v.as_str()).unwrap_or("Storage Space");
                        let mut loc_clone = item.clone();
                        if let Some(obj) = loc_clone.as_object_mut() {
                            if let Ok(num) = id_str.parse::<i64>() {
                                obj.insert("id".to_string(), Value::Number(serde_json::Number::from(num)));
                            } else {
                                obj.insert("id".to_string(), Value::String(id_str.clone()));
                            }
                        }
                        let data = serde_json::to_string(&loc_clone).unwrap_or_default();
                        let _ = conn.execute(
                            "INSERT OR REPLACE INTO storage_locations (id, name, data) VALUES (?1, ?2, ?3)",
                            params![id_str, name, data],
                        );
                    }
                }
            }
        }

        // 2. Firearms catch-up
        let firearms_count: i64 = conn.query_row("SELECT COUNT(*) FROM firearms", [], |r| r.get(0)).unwrap_or(0);
        if firearms_count == 0 {
            let _ = Self::import_legacy_json(conn, root_json);
            return Ok(());
        }

        // 3. Module collections catch-up
        // Reloading components catch-up
        if let Ok(r_conn) = ModuleDbManager::get_connection("reloading") {
            let comp_count: i64 = r_conn.query_row("SELECT COUNT(*) FROM components", [], |r| r.get(0)).unwrap_or(0);
            if comp_count == 0 {
                let _ = Self::migrate_module_collections(root_json);
            }
        }

        // Ballistics catch-up
        if let Ok(b_conn) = ModuleDbManager::get_connection("ballistics") {
            let bal_count: i64 = b_conn.query_row("SELECT COUNT(*) FROM ballistic_profiles", [], |r| r.get(0)).unwrap_or(0);
            if bal_count == 0 {
                if let Some(list) = root_json.get("ballistic_profiles").and_then(|v| v.as_array()) {
                    for (idx, item) in list.iter().enumerate() {
                        let id_str = Self::get_id_str(item, idx + 1);
                        let name = item.get("name").and_then(|v| v.as_str());
                        let caliber = item.get("caliber").and_then(|v| v.as_str());
                        let data = serde_json::to_string(item).unwrap_or_default();
                        let _ = b_conn.execute(
                            "INSERT OR REPLACE INTO ballistic_profiles (id, name, caliber, data) VALUES (?1, ?2, ?3, ?4)",
                            params![id_str, name, caliber, data],
                        );
                    }
                }
            }
        }

        Ok(())
    }

    /// Imports any legacy or external SQLite database into the active connection
    pub fn import_from_sqlite(dest_conn: &mut Connection, source_path: &Path) -> Result<usize, String> {
        super::importers::import_sqlite(dest_conn, source_path)
    }

    /// Imports CSV or TSV spreadsheet from file into the active connection
    pub fn import_csv(dest_conn: &mut Connection, csv_path: &Path) -> Result<usize, String> {
        super::importers::import_csv(dest_conn, csv_path)
    }

    /// Imports CSV, TSV, or spreadsheet string content directly into the active connection
    pub fn import_csv_content(dest_conn: &mut Connection, content: &str) -> Result<usize, String> {
        super::importers::import_csv_content(dest_conn, content)
    }
}

