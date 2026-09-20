use rusqlite::{params, Connection, Result};
use serde_json::{json, Value};

pub struct InventoryStore;

impl InventoryStore {
    // ─── Firearms ────────────────────────────────────────────────────────
    pub fn get_firearms(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM firearms ORDER BY id ASC")?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(0)?;
            Ok(serde_json::from_str(&data_str).unwrap_or(Value::Null))
        })?;

        let mut list = Vec::new();
        for val in rows.flatten() {
            if !val.is_null() {
                list.push(val);
            }
        }
        Ok(list)
    }

    pub fn insert_firearm(conn: &Connection, mut firearm: Value) -> Result<i64> {
        let next_id = match firearm.get("id").and_then(|v| v.as_i64()) {
            Some(id) if id > 0 => id,
            _ => {
                let max_id: Option<i64> = conn.query_row("SELECT MAX(id) FROM firearms", [], |r| r.get(0)).unwrap_or(None);
                max_id.unwrap_or(0) + 1
            }
        };

        if let Some(obj) = firearm.as_object_mut() {
            obj.insert("id".to_string(), Value::Number(next_id.into()));
        }

        let make = firearm.get("make").and_then(|v| v.as_str());
        let model = firearm.get("model").and_then(|v| v.as_str());
        let serial = firearm.get("serial_number").and_then(|v| v.as_str());
        let caliber = firearm.get("caliber").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&firearm).unwrap_or_default();

        conn.execute(
            "INSERT INTO firearms (id, make, model, serial_number, caliber, data)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            params![next_id, make, model, serial, caliber, data_str],
        )?;

        Ok(next_id)
    }

    pub fn update_firearm(conn: &Connection, id: i64, firearm: Value) -> Result<i64> {
        let make = firearm.get("make").and_then(|v| v.as_str());
        let model = firearm.get("model").and_then(|v| v.as_str());
        let serial = firearm.get("serial_number").and_then(|v| v.as_str());
        let caliber = firearm.get("caliber").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&firearm).unwrap_or_default();

        conn.execute(
            "UPDATE firearms SET make = ?2, model = ?3, serial_number = ?4, caliber = ?5, data = ?6
             WHERE id = ?1",
            params![id, make, model, serial, caliber, data_str],
        )?;

        Ok(id)
    }

    pub fn delete_firearm(conn: &Connection, id: i64) -> Result<i64> {
        conn.execute("DELETE FROM firearms WHERE id = ?1", params![id])?;
        super::module_db::ModuleDbManager::cleanup_firearm_references(id);
        Ok(id)
    }

    // ─── Ammunition ──────────────────────────────────────────────────────
    pub fn get_ammo(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM ammo ORDER BY id ASC")?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(0)?;
            Ok(serde_json::from_str(&data_str).unwrap_or(Value::Null))
        })?;

        let mut list = Vec::new();
        for val in rows.flatten() {
            if !val.is_null() {
                list.push(val);
            }
        }
        Ok(list)
    }

    pub fn insert_ammo(conn: &Connection, mut ammo: Value) -> Result<i64> {
        let next_id = match ammo.get("id").and_then(|v| v.as_i64()) {
            Some(id) if id > 0 => id,
            _ => {
                let max_id: Option<i64> = conn.query_row("SELECT MAX(id) FROM ammo", [], |r| r.get(0)).unwrap_or(None);
                max_id.unwrap_or(0) + 1
            }
        };

        if let Some(obj) = ammo.as_object_mut() {
            obj.insert("id".to_string(), Value::Number(next_id.into()));
        }

        let caliber = ammo.get("caliber").and_then(|v| v.as_str());
        let brand = ammo.get("brand").and_then(|v| v.as_str());
        let b_type = ammo.get("bulletType").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&ammo).unwrap_or_default();

        conn.execute(
            "INSERT INTO ammo (id, caliber, brand, bullet_type, data)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![next_id, caliber, brand, b_type, data_str],
        )?;

        Ok(next_id)
    }

    pub fn update_ammo(conn: &Connection, id: i64, ammo: Value) -> Result<i64> {
        let caliber = ammo.get("caliber").and_then(|v| v.as_str());
        let brand = ammo.get("brand").and_then(|v| v.as_str());
        let b_type = ammo.get("bulletType").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&ammo).unwrap_or_default();

        conn.execute(
            "UPDATE ammo SET caliber = ?2, brand = ?3, bullet_type = ?4, data = ?5
             WHERE id = ?1",
            params![id, caliber, brand, b_type, data_str],
        )?;

        Ok(id)
    }

    pub fn delete_ammo(conn: &Connection, id: i64) -> Result<i64> {
        conn.execute("DELETE FROM ammo WHERE id = ?1", params![id])?;
        Ok(id)
    }

    // ─── Accessories ─────────────────────────────────────────────────────
    pub fn get_accessories(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM accessories ORDER BY id ASC")?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(0)?;
            Ok(serde_json::from_str(&data_str).unwrap_or(Value::Null))
        })?;

        let mut list = Vec::new();
        for val in rows.flatten() {
            if !val.is_null() {
                list.push(val);
            }
        }
        Ok(list)
    }

    pub fn insert_accessory(conn: &Connection, mut acc: Value) -> Result<i64> {
        let next_id = match acc.get("id").and_then(|v| v.as_i64()) {
            Some(id) if id > 0 => id,
            _ => {
                let max_id: Option<i64> = conn.query_row("SELECT MAX(id) FROM accessories", [], |r| r.get(0)).unwrap_or(None);
                max_id.unwrap_or(0) + 1
            }
        };

        if let Some(obj) = acc.as_object_mut() {
            obj.insert("id".to_string(), Value::Number(next_id.into()));
        }

        let name = acc.get("name").and_then(|v| v.as_str());
        let cat = acc.get("category").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&acc).unwrap_or_default();

        conn.execute(
            "INSERT INTO accessories (id, name, category, data)
             VALUES (?1, ?2, ?3, ?4)",
            params![next_id, name, cat, data_str],
        )?;

        Ok(next_id)
    }

    pub fn update_accessory(conn: &Connection, id: i64, acc: Value) -> Result<i64> {
        let name = acc.get("name").and_then(|v| v.as_str());
        let cat = acc.get("category").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&acc).unwrap_or_default();

        conn.execute(
            "UPDATE accessories SET name = ?2, category = ?3, data = ?4
             WHERE id = ?1",
            params![id, name, cat, data_str],
        )?;

        Ok(id)
    }

    pub fn delete_accessory(conn: &Connection, id: i64) -> Result<i64> {
        conn.execute("DELETE FROM accessories WHERE id = ?1", params![id])?;
        Ok(id)
    }

    // ─── Components ──────────────────────────────────────────────────────
    pub fn get_components(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM components ORDER BY id ASC")?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(0)?;
            Ok(serde_json::from_str(&data_str).unwrap_or(Value::Null))
        })?;

        let mut list = Vec::new();
        for val in rows.flatten() {
            if !val.is_null() {
                list.push(val);
            }
        }
        Ok(list)
    }

    pub fn insert_component(conn: &Connection, mut comp: Value) -> Result<i64> {
        let next_id = match comp.get("id").and_then(|v| v.as_i64()) {
            Some(id) if id > 0 => id,
            _ => {
                let max_id: Option<i64> = conn.query_row("SELECT MAX(id) FROM components", [], |r| r.get(0)).unwrap_or(None);
                max_id.unwrap_or(0) + 1
            }
        };

        if let Some(obj) = comp.as_object_mut() {
            obj.insert("id".to_string(), Value::Number(next_id.into()));
        }

        let c_type = comp.get("type").and_then(|v| v.as_str());
        let caliber = comp.get("caliber").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&comp).unwrap_or_default();

        conn.execute(
            "INSERT INTO components (id, type, caliber, data)
             VALUES (?1, ?2, ?3, ?4)",
            params![next_id, c_type, caliber, data_str],
        )?;

        Ok(next_id)
    }

    pub fn update_component(conn: &Connection, id: i64, comp: Value) -> Result<i64> {
        let c_type = comp.get("type").and_then(|v| v.as_str());
        let caliber = comp.get("caliber").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&comp).unwrap_or_default();

        conn.execute(
            "UPDATE components SET type = ?2, caliber = ?3, data = ?4
             WHERE id = ?1",
            params![id, c_type, caliber, data_str],
        )?;

        Ok(id)
    }

    pub fn delete_component(conn: &Connection, id: i64) -> Result<i64> {
        conn.execute("DELETE FROM components WHERE id = ?1", params![id])?;
        Ok(id)
    }

    // ─── Custom SKUs ─────────────────────────────────────────────────────
    pub fn get_skus(conn: &Connection) -> Result<serde_json::Map<String, Value>> {
        let mut stmt = conn.prepare("SELECT id, data FROM skus")?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let data_str: String = row.get(1)?;
            Ok((id, serde_json::from_str(&data_str).unwrap_or(Value::Null)))
        })?;

        let mut map = serde_json::Map::new();
        for (id, val) in rows.flatten() {
            map.insert(id, val);
        }
        Ok(map)
    }

    pub fn save_skus(conn: &Connection, skus: serde_json::Map<String, Value>) -> Result<bool> {
        let tx = conn.unchecked_transaction()?;
        for (id, val) in skus {
            let data_str = serde_json::to_string(&val).unwrap_or_default();
            tx.execute("INSERT OR REPLACE INTO skus (id, data) VALUES (?1, ?2)", params![id, data_str])?;
        }
        tx.commit()?;
        Ok(true)
    }

    pub fn delete_sku(conn: &Connection, sku_id: &str) -> Result<String> {
        conn.execute("DELETE FROM skus WHERE id = ?1", params![sku_id])?;
        Ok(sku_id.to_string())
    }

    // ─── Storage Locations ───────────────────────────────────────────────
    pub fn get_storage_locations(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM storage_locations ORDER BY name ASC")?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(0)?;
            Ok(serde_json::from_str(&data_str).unwrap_or(Value::Null))
        })?;

        let mut list = Vec::new();
        for val in rows.flatten() {
            if !val.is_null() {
                list.push(val);
            }
        }
        Ok(list)
    }

    pub fn save_storage_location(conn: &Connection, mut loc: Value) -> Result<Value> {
        let next_id: i64 = conn.query_row(
            "SELECT COALESCE(MAX(CAST(id AS INTEGER)), 0) + 1 FROM storage_locations",
            [],
            |r| r.get(0),
        ).unwrap_or(1);

        let id_num = if let Some(n) = loc.get("id").and_then(|v| v.as_i64()) {
            n
        } else if let Some(s) = loc.get("id").and_then(|v| v.as_str()) {
            s.parse::<i64>().unwrap_or(next_id)
        } else {
            next_id
        };

        if let Some(obj) = loc.as_object_mut() {
            obj.insert("id".to_string(), Value::Number(serde_json::Number::from(id_num)));
        }

        let id_str = id_num.to_string();
        let name = loc.get("name").and_then(|v| v.as_str()).unwrap_or("Storage Space");
        let data_str = serde_json::to_string(&loc).unwrap_or_default();

        conn.execute(
            "INSERT OR REPLACE INTO storage_locations (id, name, data) VALUES (?1, ?2, ?3)",
            params![id_str, name, data_str],
        )?;

        Ok(loc)
    }

    pub fn update_storage_location(conn: &Connection, id: &str, mut loc: Value) -> Result<Value> {
        if let Some(obj) = loc.as_object_mut() {
            if let Ok(num) = id.parse::<i64>() {
                obj.insert("id".to_string(), Value::Number(serde_json::Number::from(num)));
            } else {
                obj.insert("id".to_string(), Value::String(id.to_string()));
            }
        }
        let name = loc.get("name").and_then(|v| v.as_str()).unwrap_or("Storage Space");
        let data_str = serde_json::to_string(&loc).unwrap_or_default();

        conn.execute(
            "INSERT OR REPLACE INTO storage_locations (id, name, data) VALUES (?1, ?2, ?3)",
            params![id, name, data_str],
        )?;

        Ok(loc)
    }

    pub fn delete_storage_location(conn: &Connection, id: &str) -> Result<String> {
        conn.execute("DELETE FROM storage_locations WHERE id = ?1", params![id])?;
        Ok(id.to_string())
    }

    // ─── Activity Audit Log ──────────────────────────────────────────────
    pub fn get_activity_log(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM activity_log ORDER BY id DESC LIMIT 500")?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(0)?;
            Ok(serde_json::from_str(&data_str).unwrap_or(Value::Null))
        })?;

        let mut list = Vec::new();
        for val in rows.flatten() {
            if !val.is_null() {
                list.push(val);
            }
        }
        Ok(list)
    }

    pub fn insert_activity_log(conn: &Connection, log: Value) -> Result<i64> {
        let ts = log.get("timestamp").and_then(|v| v.as_str());
        let action = log.get("action").and_then(|v| v.as_str());
        let data_str = serde_json::to_string(&log).unwrap_or_default();

        conn.execute(
            "INSERT INTO activity_log (timestamp, action, data) VALUES (?1, ?2, ?3)",
            params![ts, action, data_str],
        )?;

        Ok(conn.last_insert_rowid())
    }

    // ─── Sync Queue (Mobile Companion App) ────────────────────────────────
    pub fn get_sync_queue(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT id, payload, created_at FROM sync_queue ORDER BY created_at DESC")?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let payload_str: String = row.get(1)?;
            let created_at: i64 = row.get(2)?;
            let mut val = serde_json::from_str::<Value>(&payload_str).unwrap_or(Value::Null);
            if let Some(obj) = val.as_object_mut() {
                obj.insert("syncId".to_string(), Value::String(id.clone()));
                obj.insert("id".to_string(), Value::String(id));
                obj.insert("createdAt".to_string(), Value::Number(created_at.into()));
            }
            Ok(val)
        })?;

        let mut list = Vec::new();
        for val in rows.flatten() {
            if !val.is_null() {
                list.push(val);
            }
        }
        Ok(list)
    }

    pub fn remove_sync_item(conn: &Connection, id: &str) -> Result<String> {
        conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![id])?;
        Ok(id.to_string())
    }

    pub fn reject_sync_item(conn: &Connection, id: &str, delete_from_mobile: bool) -> Result<()> {
        if delete_from_mobile {
            let mut stmt = conn.prepare("SELECT payload FROM sync_queue WHERE id = ?1")?;
            let payload_str: Option<String> = stmt.query_row(params![id], |r| r.get(0)).ok();
            if let Some(p_str) = payload_str {
                let parsed: Value = serde_json::from_str(&p_str).unwrap_or(Value::Null);
                let item_type = parsed.get("type").and_then(|v| v.as_str()).unwrap_or("unknown");
                let filename = parsed
                    .get("custom_payload_filename")
                    .or_else(|| parsed.get("filename"))
                    .and_then(|v| v.as_str())
                    .unwrap_or("");
                let item_identifier = parsed
                    .get("firearmId")
                    .or_else(|| parsed.get("id"))
                    .or_else(|| parsed.get("upcOrId"))
                    .or_else(|| parsed.get("sessionId"))
                    .map(|v| v.to_string())
                    .or_else(|| {
                        parsed.get("data").and_then(|d| {
                            d.get("serial_number")
                                .or_else(|| d.get("id"))
                                .or_else(|| d.get("firearmId"))
                                .map(|v| v.to_string())
                        })
                    })
                    .unwrap_or_default();

                let tombstone_id = hex::encode(rand::random::<[u8; 8]>());
                let now = chrono::Utc::now().timestamp_millis();
                conn.execute(
                    "INSERT INTO rejected_syncs (id, sync_id, item_type, filename, item_identifier, payload, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
                    params![tombstone_id, id, item_type, filename, item_identifier, p_str, now],
                )?;
            }
        }
        conn.execute("DELETE FROM sync_queue WHERE id = ?1", params![id])?;
        Ok(())
    }

    pub fn get_rejected_syncs(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare(
            "SELECT id, sync_id, item_type, filename, item_identifier, created_at FROM rejected_syncs ORDER BY created_at ASC"
        )?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let sync_id: String = row.get(1)?;
            let item_type: String = row.get(2)?;
            let filename: String = row.get(3)?;
            let item_identifier: String = row.get(4)?;
            let created_at: i64 = row.get(5)?;
            Ok(json!({
                "id": id,
                "syncId": sync_id,
                "itemType": item_type,
                "filename": filename,
                "itemIdentifier": item_identifier,
                "createdAt": created_at
            }))
        })?;
        let mut list = Vec::new();
        for r in rows.flatten() {
            list.push(r);
        }
        Ok(list)
    }

    pub fn confirm_rejected_syncs(conn: &Connection, ids: &[String]) -> Result<()> {
        for id in ids {
            conn.execute("DELETE FROM rejected_syncs WHERE id = ?1", params![id])?;
        }
        Ok(())
    }

    pub fn clear_sync_queue(conn: &Connection) -> Result<()> {
        conn.execute("DELETE FROM sync_queue", [])?;
        Ok(())
    }

    // ─── Paired Companion Devices ─────────────────────────────────────────
    pub fn upsert_paired_device(
        conn: &Connection,
        id: &str,
        device_name: &str,
        device_type: &str,
        ip_address: &str,
        device_token: Option<&str>,
        device_key: Option<&str>,
    ) -> Result<bool> {
        let is_already_paired: bool = conn
            .query_row(
                "SELECT 1 FROM paired_devices WHERE id = ?1 AND is_active = 1",
                params![id],
                |_| Ok(true),
            )
            .unwrap_or(false);

        let device_token = device_token.filter(|s| !s.trim().is_empty());
        let device_key = device_key.filter(|s| !s.trim().is_empty());

        let now = chrono::Utc::now().to_rfc3339();
        conn.execute(
            "INSERT INTO paired_devices (id, device_name, device_type, ip_address, paired_at, last_active_at, is_active, device_token, device_key)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1, ?7, ?8)
             ON CONFLICT(id) DO UPDATE SET
                device_name = excluded.device_name,
                device_type = excluded.device_type,
                ip_address = excluded.ip_address,
                last_active_at = excluded.last_active_at,
                is_active = 1,
                device_token = COALESCE(NULLIF(excluded.device_token, ''), paired_devices.device_token),
                device_key = COALESCE(NULLIF(excluded.device_key, ''), paired_devices.device_key)",
            params![id, device_name, device_type, ip_address, now, now, device_token, device_key],
        )?;
        Ok(!is_already_paired)
    }

    pub fn update_paired_device_activity(
        conn: &Connection,
        id: &str,
        ip_address: Option<&str>,
    ) -> Result<()> {
        let now = chrono::Utc::now().to_rfc3339();
        if let Some(ip) = ip_address {
            conn.execute(
                "UPDATE paired_devices SET last_active_at = ?1, ip_address = ?2 WHERE id = ?3",
                params![now, ip, id],
            )?;
        } else {
            conn.execute(
                "UPDATE paired_devices SET last_active_at = ?1 WHERE id = ?2",
                params![now, id],
            )?;
        }
        Ok(())
    }

    pub fn get_paired_devices(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare(
            "SELECT id, device_name, device_type, ip_address, paired_at, last_active_at, is_active, device_token, device_key
             FROM paired_devices WHERE is_active = 1 ORDER BY last_active_at DESC"
        )?;
        let rows = stmt.query_map([], |row| {
            let id: String = row.get(0)?;
            let device_name: String = row.get(1)?;
            let device_type: String = row.get(2)?;
            let ip_address: Option<String> = row.get(3)?;
            let paired_at: String = row.get(4)?;
            let last_active_at: String = row.get(5)?;
            let is_active: i64 = row.get(6)?;
            let device_token: Option<String> = row.get(7)?;
            let device_key: Option<String> = row.get(8)?;
            Ok(json!({
                "id": id,
                "deviceName": device_name,
                "deviceType": device_type,
                "ipAddress": ip_address.unwrap_or_default(),
                "pairedAt": paired_at,
                "lastActiveAt": last_active_at,
                "isActive": is_active == 1,
                "deviceToken": device_token.unwrap_or_default(),
                "deviceKey": device_key.unwrap_or_default(),
            }))
        })?;
        let mut list = Vec::new();
        for r in rows.flatten() {
            list.push(r);
        }
        Ok(list)
    }

    pub fn get_paired_device_keys(conn: &Connection) -> Result<Vec<String>> {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT device_key FROM paired_devices WHERE is_active = 1 AND device_key IS NOT NULL AND device_key != ''"
        )?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut keys = Vec::new();
        for k in rows.flatten() {
            if !k.trim().is_empty() {
                keys.push(k);
            }
        }
        Ok(keys)
    }

    pub fn get_all_paired_decryption_keys(conn: &Connection) -> Result<Vec<String>> {
        let mut stmt = conn.prepare(
            "SELECT DISTINCT device_token FROM paired_devices WHERE is_active = 1 AND device_token IS NOT NULL AND device_token != ''
             UNION
             SELECT DISTINCT device_key FROM paired_devices WHERE is_active = 1 AND device_key IS NOT NULL AND device_key != ''"
        )?;
        let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
        let mut keys = Vec::new();
        for k in rows.flatten() {
            let trimmed = k.trim().to_string();
            if !trimmed.is_empty() && !keys.contains(&trimmed) {
                keys.push(trimmed);
            }
        }
        Ok(keys)
    }

    pub fn get_kv_meta_map(conn: &Connection) -> Result<serde_json::Map<String, Value>> {
        let mut stmt = conn.prepare("SELECT key, value FROM kv_meta")?;
        let rows = stmt.query_map([], |row| {
            let k: String = row.get(0)?;
            let v: String = row.get(1)?;
            Ok((k, v))
        })?;
        let mut map = serde_json::Map::new();
        for r in rows.flatten() {
            map.insert(r.0, Value::String(r.1));
        }
        Ok(map)
    }

    pub fn get_or_create_vault_token(conn: &Connection) -> Result<String> {
        let existing: Option<String> = conn
            .query_row(
                "SELECT value FROM kv_meta WHERE key = 'vault_pairing_token'",
                [],
                |r| r.get(0),
            )
            .ok();

        if let Some(t) = existing {
            if !t.trim().is_empty() {
                return Ok(t);
            }
        }

        let new_token = hex::encode(rand::random::<[u8; 16]>());
        conn.execute(
            "INSERT OR REPLACE INTO kv_meta (key, value) VALUES ('vault_pairing_token', ?1)",
            params![new_token],
        )?;
        Ok(new_token)
    }

    pub fn set_vault_pairing_token(conn: &Connection, token: &str) -> Result<()> {
        conn.execute(
            "INSERT OR REPLACE INTO kv_meta (key, value) VALUES ('vault_pairing_token', ?1)",
            params![token],
        )?;
        Ok(())
    }

    pub fn remove_paired_device(conn: &Connection, id: &str) -> Result<bool> {
        let count = conn.execute("DELETE FROM paired_devices WHERE id = ?1", params![id])?;
        Ok(count > 0)
    }

    pub fn unpair_all_devices(conn: &Connection) -> Result<bool> {
        conn.execute("DELETE FROM paired_devices", [])?;
        Ok(true)
    }

    // ─── Maintenance & Range Telemetry ────────────────────────────────────
    pub fn complete_maintenance_task(
        conn: &Connection,
        firearm_id: i64,
        task_id: &str,
        log_data: Value,
    ) -> Result<bool> {
        let firearm_json_res: Result<String, _> = conn.query_row(
            "SELECT data FROM firearms WHERE id = ?1",
            params![firearm_id],
            |r| r.get(0),
        );

        let firearm_json = match firearm_json_res {
            Ok(json) => json,
            Err(_) => return Ok(false),
        };

        let mut firearm: Value = serde_json::from_str(&firearm_json).unwrap_or(Value::Null);
        let obj = match firearm.as_object_mut() {
            Some(o) => o,
            None => return Ok(false),
        };

        // 1. Calculate current total rounds from Range logs
        let current_rounds = obj
            .get("logs")
            .and_then(|v| v.as_array())
            .map(|logs| {
                logs.iter()
                    .filter(|l| l.get("type").and_then(|t| t.as_str()) == Some("Range"))
                    .map(|l| l.get("rounds_fired").and_then(|r| r.as_i64()).unwrap_or(0))
                    .sum::<i64>()
            })
            .unwrap_or(0);

        // 2. Next log ID
        let next_log_id = obj
            .get("logs")
            .and_then(|v| v.as_array())
            .map(|logs| {
                logs.iter()
                    .filter_map(|l| l.get("id").and_then(|id| id.as_i64()))
                    .max()
                    .unwrap_or(0)
                    + 1
            })
            .unwrap_or(1);

        let date_str = log_data
            .get("date")
            .and_then(|d| d.as_str())
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.to_string())
            .unwrap_or_else(current_date_string);

        let service_type = log_data
            .get("type")
            .or_else(|| log_data.get("service_type"))
            .and_then(|t| t.as_str())
            .unwrap_or("Repair");

        let action = log_data
            .get("action_performed")
            .and_then(|s| s.as_str())
            .unwrap_or("");

        let part_details = log_data
            .get("part_details")
            .and_then(|s| s.as_str())
            .filter(|s| !s.trim().is_empty())
            .unwrap_or(action);

        let cost = log_data
            .get("cost")
            .and_then(|c| c.as_f64())
            .unwrap_or(0.0);

        let notes = log_data
            .get("notes")
            .and_then(|n| n.as_str())
            .unwrap_or("");

        let new_log = serde_json::json!({
            "id": next_log_id,
            "date": date_str,
            "type": service_type,
            "installed_part_details": part_details,
            "repaired_part": action,
            "cost": cost,
            "notes": notes,
        });

        // Append to logs
        if let Some(logs) = obj.get_mut("logs").and_then(|l| l.as_array_mut()) {
            logs.push(new_log);
        } else {
            obj.insert("logs".to_string(), Value::Array(vec![new_log]));
        }

        // 3. Update maintenance schedule item if task_id provided
        if !task_id.trim().is_empty() {
            if let Some(schedules) = obj.get_mut("maintenance_schedules").and_then(|s| s.as_array_mut()) {
                for task in schedules.iter_mut() {
                    if task.get("id").and_then(|id| id.as_str()) == Some(task_id) {
                        if let Some(task_obj) = task.as_object_mut() {
                            task_obj.insert("last_performed_rounds".to_string(), serde_json::json!(current_rounds));
                            task_obj.insert("last_performed_date".to_string(), serde_json::json!(date_str));
                        }
                        break;
                    }
                }
            }
        }

        // Save back
        Self::update_firearm(conn, firearm_id, firearm)?;

        // Audit log
        let _ = Self::insert_activity_log(
            conn,
            serde_json::json!({
                "timestamp": current_iso_timestamp(),
                "action": "complete_maintenance_task",
                "entityType": "firearm",
                "entityId": firearm_id,
                "detail": format!("Completed task: {}", if !action.is_empty() { action } else { task_id }),
                "source": "desktop"
            }),
        );

        Ok(true)
    }

    pub fn log_range_session(conn: &Connection, session_data: Value) -> Result<Value> {
        let firearm_id = session_data.get("firearm_id").and_then(|v| v.as_i64()).unwrap_or(0);
        let ammo_id = session_data.get("ammo_id").and_then(|v| v.as_i64());
        let rounds = session_data.get("rounds_fired").and_then(|v| v.as_i64()).unwrap_or(0);

        if rounds <= 0 {
            return Ok(serde_json::json!({
                "success": false,
                "error": "Rounds fired must be greater than 0"
            }));
        }

        let date_str = session_data
            .get("date")
            .and_then(|d| d.as_str())
            .filter(|s| !s.trim().is_empty())
            .map(|s| s.to_string())
            .unwrap_or_else(current_date_string);

        let notes = session_data.get("notes").and_then(|s| s.as_str()).unwrap_or("");
        let location = session_data.get("location").and_then(|s| s.as_str()).unwrap_or("");
        let cost = session_data.get("cost").and_then(|c| c.as_f64()).unwrap_or(0.0);

        let mut firearm_rounds = 0;
        let mut ammo_remaining = None;
        let mut ammo_name = session_data.get("ammo_name").and_then(|s| s.as_str()).unwrap_or("").to_string();

        // 1. Deduct ammo if ammo_id provided
        if let Some(aid) = ammo_id {
            if aid > 0 {
                let ammo_json_res: Result<String, _> = conn.query_row(
                    "SELECT data FROM ammo WHERE id = ?1",
                    params![aid],
                    |r| r.get(0),
                );
                if let Ok(ajson) = ammo_json_res {
                    if let Ok(mut ammo_val) = serde_json::from_str::<Value>(&ajson) {
                        if let Some(aobj) = ammo_val.as_object_mut() {
                            if ammo_name.is_empty() {
                                let mfg = aobj.get("manufacturer").and_then(|v| v.as_str()).unwrap_or("");
                                let cal = aobj.get("caliber").and_then(|v| v.as_str()).unwrap_or("");
                                let gr = aobj.get("grain").and_then(|v| v.as_str()).map(|g| format!(" {}gr", g)).unwrap_or_default();
                                ammo_name = format!("{} {}{}", mfg, cal, gr).trim().to_string();
                            }
                            let count = aobj.get("count").and_then(|v| v.as_i64()).unwrap_or(0);
                            let new_count = (count - rounds).max(0);
                            aobj.insert("count".to_string(), serde_json::json!(new_count));
                            ammo_remaining = Some(new_count);
                            let _ = Self::update_ammo(conn, aid, ammo_val);
                        }
                    }
                }
            }
        }

        // 2. Append Range log to firearm
        if firearm_id > 0 {
            let firearm_json_res: Result<String, _> = conn.query_row(
                "SELECT data FROM firearms WHERE id = ?1",
                params![firearm_id],
                |r| r.get(0),
            );
            if let Ok(fjson) = firearm_json_res {
                if let Ok(mut firearm_val) = serde_json::from_str::<Value>(&fjson) {
                    if let Some(fobj) = firearm_val.as_object_mut() {
                        let next_log_id = fobj
                            .get("logs")
                            .and_then(|v| v.as_array())
                            .map(|logs| {
                                logs.iter()
                                    .filter_map(|l| l.get("id").and_then(|id| id.as_i64()))
                                    .max()
                                    .unwrap_or(0)
                                    + 1
                            })
                            .unwrap_or(1);

                        let notes_combined = [
                            if !location.is_empty() { format!("Location: {}", location) } else { String::new() },
                            notes.to_string(),
                        ]
                        .into_iter()
                        .filter(|s| !s.is_empty())
                        .collect::<Vec<_>>()
                        .join(" - ");

                        let new_log = serde_json::json!({
                            "id": next_log_id,
                            "date": date_str,
                            "type": "Range",
                            "rounds_fired": rounds,
                            "ammo_used": ammo_name,
                            "cost": cost,
                            "notes": notes_combined,
                        });

                        if let Some(logs) = fobj.get_mut("logs").and_then(|l| l.as_array_mut()) {
                            logs.push(new_log);
                        } else {
                            fobj.insert("logs".to_string(), Value::Array(vec![new_log]));
                        }

                        firearm_rounds = fobj
                            .get("logs")
                            .and_then(|v| v.as_array())
                            .map(|logs| {
                                logs.iter()
                                    .filter(|l| l.get("type").and_then(|t| t.as_str()) == Some("Range"))
                                    .map(|l| l.get("rounds_fired").and_then(|r| r.as_i64()).unwrap_or(0))
                                    .sum::<i64>()
                            })
                            .unwrap_or(0);

                        let _ = Self::update_firearm(conn, firearm_id, firearm_val);
                    }
                }
            }
        }

        // 3. Increment round_count on all accessories mounted to this firearm
        if firearm_id > 0 {
            if let Ok(accessories) = Self::get_accessories(conn) {
                for mut acc in accessories {
                    let mut updated = false;
                    if let Some(acc_obj) = acc.as_object_mut() {
                        let is_mounted = acc_obj
                            .get("mounts")
                            .and_then(|m| m.as_array())
                            .map(|mounts| {
                                mounts.iter().any(|m| {
                                    m.get("firearmId").and_then(|id| id.as_i64()) == Some(firearm_id)
                                        || m.get("firearm_id").and_then(|id| id.as_i64()) == Some(firearm_id)
                                })
                            })
                            .unwrap_or(false);

                        if is_mounted {
                            let current_acc_rounds = acc_obj.get("round_count").and_then(|r| r.as_i64()).unwrap_or(0);
                            acc_obj.insert("round_count".to_string(), serde_json::json!(current_acc_rounds + rounds));
                            updated = true;
                        }
                    }
                    if updated {
                        if let Some(acc_id) = acc.get("id").and_then(|id| id.as_i64()) {
                            let _ = Self::update_accessory(conn, acc_id, acc);
                        }
                    }
                }
            }
        }

        // 4. Activity Log
        let _ = Self::insert_activity_log(
            conn,
            serde_json::json!({
                "timestamp": current_iso_timestamp(),
                "action": "range_session",
                "entityType": "firearm",
                "entityId": firearm_id,
                "detail": format!("{} rounds fired", rounds),
                "source": "desktop"
            }),
        );

        Ok(serde_json::json!({
            "success": true,
            "firearm_rounds": firearm_rounds,
            "ammo_remaining": ammo_remaining
        }))
    }

    // ─── Batch Imports ───────────────────────────────────────────────────
    pub fn import_firearms_batch(
        conn: &Connection,
        firearms_list: Vec<Value>,
        updates_list: Option<Vec<Value>>,
    ) -> Result<Value> {
        let mut updated_count = 0;
        if let Some(updates) = updates_list {
            for item in updates {
                if let Some(existing_id) = item.get("existingId").and_then(|id| id.as_i64()) {
                    let updated_val = item.get("updatedItem").cloned().unwrap_or(item);
                    let _ = Self::update_firearm(conn, existing_id, updated_val);
                    updated_count += 1;
                }
            }
        }

        let mut inserted_count = 0;
        for firearm in firearms_list {
            if Self::insert_firearm(conn, firearm).is_ok() {
                inserted_count += 1;
            }
        }

        Ok(serde_json::json!({
            "insertedCount": inserted_count,
            "updatedCount": updated_count
        }))
    }

    pub fn import_ammo_batch(
        conn: &Connection,
        ammo_list: Vec<Value>,
        updates_list: Option<Vec<Value>>,
    ) -> Result<Value> {
        let mut updated_count = 0;
        if let Some(updates) = updates_list {
            for item in updates {
                if let Some(existing_id) = item.get("existingId").and_then(|id| id.as_i64()) {
                    let updated_val = item.get("updatedItem").cloned().unwrap_or(item);
                    let _ = Self::update_ammo(conn, existing_id, updated_val);
                    updated_count += 1;
                }
            }
        }

        let mut inserted_count = 0;
        for ammo in ammo_list {
            if Self::insert_ammo(conn, ammo).is_ok() {
                inserted_count += 1;
            }
        }

        Ok(serde_json::json!({
            "insertedCount": inserted_count,
            "updatedCount": updated_count
        }))
    }

    pub fn import_accessories_batch(conn: &Connection, accessories_list: Vec<Value>) -> Result<Value> {
        let mut inserted_count = 0;
        for acc in accessories_list {
            if Self::insert_accessory(conn, acc).is_ok() {
                inserted_count += 1;
            }
        }
        Ok(serde_json::json!({ "insertedCount": inserted_count }))
    }

    pub fn import_components_batch(conn: &Connection, components_list: Vec<Value>) -> Result<Value> {
        let mut inserted_count = 0;
        for comp in components_list {
            if Self::insert_component(conn, comp).is_ok() {
                inserted_count += 1;
            }
        }
        Ok(serde_json::json!({ "insertedCount": inserted_count }))
    }

    fn map_key_to_module(key: &str) -> Option<&'static str> {
        match key {
            "optics_vault_inventory" => Some("optics"),
            "saved_ranges" => Some("ranges"),
            "saved_label_templates" => Some("labels"),
            "custom_schedule_presets" => Some("maintenance"),
            "bound_book_entries" => Some("boundbook"),
            "nfa_items" => Some("nfa"),
            "load_recipes" | "reloading_recipes" => Some("reloading"),
            _ => None,
        }
    }

    // ─── Key-Value Config (Modules & Settings) ────────────────────────────────
    pub fn get_config(conn: &Connection, key: &str) -> Result<Option<Value>> {
        if let Some(module) = Self::map_key_to_module(key) {
            if let Ok(Some(val)) = super::module_db::ModuleDbManager::get_module_kv(module, key) {
                return Ok(Some(val));
            }
        }

        let mut stmt = conn.prepare("SELECT value FROM kv_meta WHERE key = ?1")?;
        let mut rows = stmt.query(params![key])?;
        if let Some(row) = rows.next()? {
            let val_str: String = row.get(0)?;
            let val: Value = serde_json::from_str(&val_str).unwrap_or(Value::Null);
            Ok(Some(val))
        } else {
            Ok(None)
        }
    }

    pub fn set_config(conn: &Connection, key: &str, value: &Value) -> Result<()> {
        if let Some(module) = Self::map_key_to_module(key) {
            let _ = super::module_db::ModuleDbManager::set_module_kv(module, key, value);
        }

        let val_str = serde_json::to_string(value).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO kv_meta (key, value) VALUES (?1, ?2)",
            params![key, val_str],
        )?;
        Ok(())
    }

    // ─── Ballistics Profiles ──────────────────────────────────────────────────
    pub fn get_ballistic_profiles(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM ballistic_profiles")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
        let mut list = Vec::new();
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) {
                list.push(v);
            }
        }
        Ok(list)
    }

    pub fn save_ballistic_profile(conn: &Connection, profile: Value) -> Result<String> {
        let id = profile
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                format!(
                    "bp_{}",
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                )
            });
        let mut prof_obj = profile;
        if let Some(obj) = prof_obj.as_object_mut() {
            obj.insert("id".to_string(), Value::String(id.clone()));
        }
        let data = serde_json::to_string(&prof_obj).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO ballistic_profiles (id, data) VALUES (?1, ?2)",
            params![id, data],
        )?;
        Ok(id)
    }

    pub fn delete_ballistic_profile(conn: &Connection, id: &str) -> Result<String> {
        conn.execute("DELETE FROM ballistic_profiles WHERE id = ?1", params![id])?;
        Ok(id.to_string())
    }

    // ─── Load Ladder Tests ────────────────────────────────────────────────────
    pub fn get_load_ladder_tests(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM load_ladder_tests")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
        let mut list = Vec::new();
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) {
                list.push(v);
            }
        }
        Ok(list)
    }

    pub fn save_load_ladder_test(conn: &Connection, test: Value) -> Result<String> {
        let id = test
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                format!(
                    "llt_{}",
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                )
            });
        let mut test_obj = test;
        if let Some(obj) = test_obj.as_object_mut() {
            obj.insert("id".to_string(), Value::String(id.clone()));
        }
        let data = serde_json::to_string(&test_obj).unwrap_or_default();
        conn.execute(
            "INSERT OR REPLACE INTO load_ladder_tests (id, data) VALUES (?1, ?2)",
            params![id, data],
        )?;
        Ok(id)
    }

    pub fn delete_load_ladder_test(conn: &Connection, id: &str) -> Result<String> {
        conn.execute("DELETE FROM load_ladder_tests WHERE id = ?1", params![id])?;
        Ok(id.to_string())
    }

    // ─── Chronograph Strings (Reloading Module) ──────────────────────────────
    pub fn get_chrono_strings(conn: &Connection) -> Result<Vec<Value>> {
        if let Ok(r_conn) = super::module_db::ModuleDbManager::get_connection("reloading") {
            let mut stmt = r_conn.prepare("SELECT data FROM chrono_strings")?;
            let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
            let mut list = Vec::new();
            for r in rows.flatten() {
                if let Ok(v) = serde_json::from_str::<Value>(&r) {
                    list.push(v);
                }
            }
            if !list.is_empty() {
                return Ok(list);
            }
        }
        let mut stmt = conn.prepare("SELECT data FROM chrono_strings")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
        let mut list = Vec::new();
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) {
                list.push(v);
            }
        }
        Ok(list)
    }

    pub fn save_chrono_string(conn: &Connection, cs: Value) -> Result<String> {
        let id = cs
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                format!(
                    "cs_{}",
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                )
            });
        let mut cs_obj = cs;
        if let Some(obj) = cs_obj.as_object_mut() {
            obj.insert("id".to_string(), Value::String(id.clone()));
        }
        let data = serde_json::to_string(&cs_obj).unwrap_or_default();

        if let Ok(r_conn) = super::module_db::ModuleDbManager::get_connection("reloading") {
            let _ = r_conn.execute(
                "INSERT OR REPLACE INTO chrono_strings (id, data) VALUES (?1, ?2)",
                params![id, data],
            );
        }
        conn.execute(
            "INSERT OR REPLACE INTO chrono_strings (id, data) VALUES (?1, ?2)",
            params![id, data],
        )?;
        Ok(id)
    }

    pub fn delete_chrono_string(conn: &Connection, id: &str) -> Result<String> {
        if let Ok(r_conn) = super::module_db::ModuleDbManager::get_connection("reloading") {
            let _ = r_conn.execute("DELETE FROM chrono_strings WHERE id = ?1", params![id]);
        }
        conn.execute("DELETE FROM chrono_strings WHERE id = ?1", params![id])?;
        Ok(id.to_string())
    }

    // ─── Target Analyses (Reloading Module) ──────────────────────────────────
    pub fn get_target_analyses(conn: &Connection) -> Result<Vec<Value>> {
        if let Ok(r_conn) = super::module_db::ModuleDbManager::get_connection("reloading") {
            let mut stmt = r_conn.prepare("SELECT data FROM target_analyses")?;
            let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
            let mut list = Vec::new();
            for r in rows.flatten() {
                if let Ok(v) = serde_json::from_str::<Value>(&r) {
                    list.push(v);
                }
            }
            if !list.is_empty() {
                return Ok(list);
            }
        }
        let mut stmt = conn.prepare("SELECT data FROM target_analyses")?;
        let rows = stmt.query_map([], |r| r.get::<_, String>(0))?;
        let mut list = Vec::new();
        for r in rows.flatten() {
            if let Ok(v) = serde_json::from_str::<Value>(&r) {
                list.push(v);
            }
        }
        Ok(list)
    }

    pub fn save_target_analysis(conn: &Connection, ta: Value) -> Result<String> {
        let id = ta
            .get("id")
            .and_then(|v| v.as_str())
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                format!(
                    "ta_{}",
                    std::time::SystemTime::now()
                        .duration_since(std::time::UNIX_EPOCH)
                        .unwrap_or_default()
                        .as_millis()
                )
            });
        let mut ta_obj = ta;
        if let Some(obj) = ta_obj.as_object_mut() {
            obj.insert("id".to_string(), Value::String(id.clone()));
        }
        let data = serde_json::to_string(&ta_obj).unwrap_or_default();

        if let Ok(r_conn) = super::module_db::ModuleDbManager::get_connection("reloading") {
            let _ = r_conn.execute(
                "INSERT OR REPLACE INTO target_analyses (id, data) VALUES (?1, ?2)",
                params![id, data],
            );
        }
        conn.execute(
            "INSERT OR REPLACE INTO target_analyses (id, data) VALUES (?1, ?2)",
            params![id, data],
        )?;
        Ok(id)
    }

    pub fn delete_target_analysis(conn: &Connection, id: &str) -> Result<String> {
        if let Ok(r_conn) = super::module_db::ModuleDbManager::get_connection("reloading") {
            let _ = r_conn.execute("DELETE FROM target_analyses WHERE id = ?1", params![id]);
        }
        conn.execute("DELETE FROM target_analyses WHERE id = ?1", params![id])?;
        Ok(id.to_string())
    }

    // ─── Handload Manufacturing Batch ─────────────────────────────────────────
    pub fn manufacture_handload_batch(
        conn: &Connection,
        ammo_id: i64,
        quantity: i64,
        deductions: Vec<Value>,
    ) -> Result<Value> {
        let mut new_ammo_count = 0;

        // 1. Update Ammo count
        let ammo_res: Result<String, _> = conn.query_row(
            "SELECT data FROM ammo WHERE id = ?1",
            params![ammo_id],
            |r| r.get(0),
        );
        if let Ok(ammo_str) = ammo_res {
            if let Ok(mut ammo_val) = serde_json::from_str::<Value>(&ammo_str) {
                if let Some(aobj) = ammo_val.as_object_mut() {
                    let current = aobj.get("count").and_then(|v| v.as_i64()).unwrap_or(0);
                    new_ammo_count = current + quantity;
                    aobj.insert("count".to_string(), serde_json::json!(new_ammo_count));
                    let _ = Self::update_ammo(conn, ammo_id, ammo_val);
                }
            }
        }

        // 2. Deduct components
        for d in deductions {
            let cid = d
                .get("componentId")
                .or_else(|| d.get("component_id"))
                .and_then(|v| v.as_i64())
                .unwrap_or(0);
            let qty_used = d
                .get("quantityUsed")
                .or_else(|| d.get("quantity_used"))
                .and_then(|v| v.as_f64())
                .unwrap_or(0.0);
            if cid > 0 && qty_used > 0.0 {
                let comp_res: Result<String, _> = conn.query_row(
                    "SELECT data FROM components WHERE id = ?1",
                    params![cid],
                    |r| r.get(0),
                );
                if let Ok(comp_str) = comp_res {
                    if let Ok(mut comp_val) = serde_json::from_str::<Value>(&comp_str) {
                        if let Some(cobj) = comp_val.as_object_mut() {
                            let current = cobj.get("count").and_then(|v| v.as_f64()).unwrap_or(0.0);
                            let new_comp_count = (current - qty_used).max(0.0);
                            cobj.insert("count".to_string(), serde_json::json!(new_comp_count));
                            let _ = Self::update_component(conn, cid, comp_val);
                        }
                    }
                }
            }
        }

        // 3. Log audit activity
        let iso_ts = current_iso_timestamp();
        let _ = conn.execute(
            "INSERT INTO activity_log (timestamp, action, data) VALUES (?1, ?2, ?3)",
            params![
                iso_ts,
                "MANUFACTURE_HANDLOAD_BATCH",
                serde_json::json!({
                    "ammo_id": ammo_id,
                    "quantity": quantity,
                    "new_ammo_count": new_ammo_count,
                })
                .to_string()
            ],
        );

        Ok(serde_json::json!({
            "success": true,
            "newAmmoCount": new_ammo_count,
        }))
    }

    // ─── Export & Serialization for Encrypted Rest Persistence ───────────
    pub fn export_vault_json(conn: &Connection) -> Result<String, String> {
        let firearms = Self::get_firearms(conn).map_err(|e| e.to_string())?;
        let ammo = Self::get_ammo(conn).map_err(|e| e.to_string())?;
        let accessories = Self::get_accessories(conn).map_err(|e| e.to_string())?;
        let storage_locations = Self::get_storage_locations(conn).map_err(|e| e.to_string())?;
        let components = Self::get_components(conn).map_err(|e| e.to_string())?;
        let kv_meta = Self::get_kv_meta_map(conn).unwrap_or_default();
        let paired_devices = Self::get_paired_devices(conn).unwrap_or_default();
        let sync_queue = Self::get_sync_queue(conn).unwrap_or_default();

        let root = serde_json::json!({
            "schemaVersion": 2,
            "_lastModified": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
            "firearms": firearms,
            "ammo": ammo,
            "accessories": accessories,
            "storage_locations": storage_locations,
            "components": components,
            "kv_meta": kv_meta,
            "paired_devices": paired_devices,
            "sync_queue": sync_queue,
        });

        serde_json::to_string_pretty(&root).map_err(|e| e.to_string())
    }

    pub fn get_all_activity_logs_for_export(conn: &Connection) -> Result<Vec<Value>> {
        let mut stmt = conn.prepare("SELECT data FROM activity_log ORDER BY id ASC LIMIT 1000")?;
        let rows = stmt.query_map([], |row| {
            let data_str: String = row.get(0)?;
            Ok(serde_json::from_str(&data_str).unwrap_or(Value::Null))
        })?;

        let mut list = Vec::new();
        for r in rows.flatten() {
            if !r.is_null() {
                list.push(r);
            }
        }
        Ok(list)
    }

    pub fn export_activity_log_json(conn: &Connection) -> Result<String, String> {
        let logs = Self::get_all_activity_logs_for_export(conn).map_err(|e| e.to_string())?;
        let root = serde_json::json!({
            "schemaVersion": 1,
            "activity_log": logs,
            "lastModified": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
        });
        serde_json::to_string_pretty(&root).map_err(|e| e.to_string())
    }

    pub fn export_skus_json(conn: &Connection) -> Result<String, String> {
        let skus = Self::get_skus(conn).map_err(|e| e.to_string())?;
        let root = serde_json::json!({
            "schemaVersion": 1,
            "skus": skus,
            "lastModified": std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap_or_default()
                .as_millis(),
        });
        serde_json::to_string_pretty(&root).map_err(|e| e.to_string())
    }

    pub fn get_custom_schedule_presets(conn: &Connection) -> Result<Value, String> {
        if let Ok(m_conn) = super::module_db::ModuleDbManager::get_connection("maintenance") {
            let res: Result<String, _> = m_conn.query_row(
                "SELECT data FROM custom_schedule_presets WHERE id = 'default'",
                [],
                |r| r.get(0),
            );
            if let Ok(data_str) = res {
                if let Ok(val) = serde_json::from_str::<Value>(&data_str) {
                    return Ok(val);
                }
            }
        }
        // Fallback from kv_meta
        if let Ok(Some(val)) = Self::get_config(conn, "custom_schedule_presets") {
            return Ok(val);
        }
        Ok(serde_json::json!([]))
    }

    pub fn save_custom_schedule_presets(conn: &Connection, presets: Value) -> Result<bool, String> {
        let data_str = serde_json::to_string(&presets).unwrap_or_default();
        if let Ok(m_conn) = super::module_db::ModuleDbManager::get_connection("maintenance") {
            let _ = m_conn.execute(
                "INSERT OR REPLACE INTO custom_schedule_presets (id, data) VALUES ('default', ?1)",
                rusqlite::params![data_str],
            );
        }
        let _ = Self::set_config(conn, "custom_schedule_presets", &presets);
        Ok(true)
    }
}


fn current_date_string() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let days = secs / 86400;
    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1029 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}", y, m, d)
}

fn current_iso_timestamp() -> String {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs() as i64;
    let days = secs / 86400;
    let rem_secs = (secs % 86400) as u32;
    let hours = rem_secs / 3600;
    let minutes = (rem_secs % 3600) / 60;
    let seconds = rem_secs % 60;

    let z = days + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = (z - era * 146097) as u32;
    let yoe = (doe - doe / 1029 + doe / 36524 - doe / 146096) / 365;
    let y = yoe as i64 + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = doy - (153 * mp + 2) / 5 + 1;
    let m = if mp < 10 { mp + 3 } else { mp - 9 };
    let y = if m <= 2 { y + 1 } else { y };
    format!("{:04}-{:02}-{:02}T{:02}:{:02}:{:02}Z", y, m, d, hours, minutes, seconds)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::storage::Database;

    #[test]
    fn test_complete_maintenance_task_updates_schedule_and_adds_log() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        let firearm = serde_json::json!({
            "id": 1,
            "make": "Glock",
            "model": "19 Gen 5",
            "serial_number": "ABC1234",
            "caliber": "9mm",
            "logs": [
                { "id": 1, "type": "Range", "rounds_fired": 250, "date": "2026-09-01" },
                { "id": 2, "type": "Range", "rounds_fired": 150, "date": "2026-09-10" }
            ],
            "maintenance_schedules": [
                {
                    "id": "task_recoil_spring",
                    "task_name": "Replace Recoil Spring",
                    "interval_rounds": 3000,
                    "last_performed_rounds": 0,
                    "last_performed_date": "2026-01-01"
                }
            ]
        });

        InventoryStore::insert_firearm(&conn, firearm).unwrap();

        let log_data = serde_json::json!({
            "action_performed": "Replaced recoil spring assembly",
            "part_details": "OEM Glock RSA",
            "cost": 18.50,
            "date": "2026-09-15",
            "notes": "Standard preventive maintenance"
        });

        let success = InventoryStore::complete_maintenance_task(&conn, 1, "task_recoil_spring", log_data).unwrap();
        assert!(success);

        let firearms = InventoryStore::get_firearms(&conn).unwrap();
        assert_eq!(firearms.len(), 1);
        let updated = &firearms[0];

        // Total rounds is 250 + 150 = 400
        let sched = &updated["maintenance_schedules"][0];
        assert_eq!(sched["last_performed_rounds"], 400);
        assert_eq!(sched["last_performed_date"], "2026-09-15");

        let logs = updated["logs"].as_array().unwrap();
        assert_eq!(logs.len(), 3);
        let new_log = &logs[2];
        assert_eq!(new_log["type"], "Repair");
        assert_eq!(new_log["cost"], 18.50);
        assert_eq!(new_log["installed_part_details"], "OEM Glock RSA");
    }

    #[test]
    fn test_log_range_session_updates_firearm_and_deducts_ammo() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        let ammo = serde_json::json!({
            "id": 10,
            "manufacturer": "Federal",
            "caliber": "9mm",
            "grain": "124",
            "count": 500
        });
        InventoryStore::insert_ammo(&conn, ammo).unwrap();

        let firearm = serde_json::json!({
            "id": 1,
            "make": "Sig Sauer",
            "model": "P320",
            "caliber": "9mm",
            "logs": []
        });
        InventoryStore::insert_firearm(&conn, firearm).unwrap();

        let session_data = serde_json::json!({
            "firearm_id": 1,
            "ammo_id": 10,
            "rounds_fired": 150,
            "date": "2026-09-15",
            "location": "Eagle Gun Range",
            "notes": "Target practice"
        });

        let res = InventoryStore::log_range_session(&conn, session_data).unwrap();
        assert_eq!(res["success"], true);
        assert_eq!(res["firearm_rounds"], 150);
        assert_eq!(res["ammo_remaining"], 350);

        let ammo_list = InventoryStore::get_ammo(&conn).unwrap();
        assert_eq!(ammo_list[0]["count"], 350);

        let firearms = InventoryStore::get_firearms(&conn).unwrap();
        let logs = firearms[0]["logs"].as_array().unwrap();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0]["rounds_fired"], 150);
        assert_eq!(logs[0]["ammo_used"], "Federal 9mm 124gr");
    }

    #[test]
    fn test_config_kv_storage() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        let test_val = serde_json::json!(["reloading", "maintenance", "ballistics"]);
        InventoryStore::set_config(&conn, "installed_modules", &test_val).unwrap();

        let retrieved = InventoryStore::get_config(&conn, "installed_modules").unwrap();
        assert_eq!(retrieved, Some(test_val));

        let non_existent = InventoryStore::get_config(&conn, "does_not_exist").unwrap();
        assert_eq!(non_existent, None);
    }

    #[test]
    fn test_ballistic_profiles_crud() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        let prof = serde_json::json!({
            "id": "bp_308_fgmm",
            "name": "Federal Gold Medal 175gr SMK",
            "caliber": ".308 Win",
            "bulletWeight": 175,
            "muzzleVelocity": 2600,
            "ballisticCoefficient": 0.505
        });

        let id = InventoryStore::save_ballistic_profile(&conn, prof).unwrap();
        assert_eq!(id, "bp_308_fgmm");

        let list = InventoryStore::get_ballistic_profiles(&conn).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0]["name"], "Federal Gold Medal 175gr SMK");

        InventoryStore::delete_ballistic_profile(&conn, "bp_308_fgmm").unwrap();
        let empty_list = InventoryStore::get_ballistic_profiles(&conn).unwrap();
        assert_eq!(empty_list.len(), 0);
    }

    #[test]
    fn test_load_ladder_tests_crud() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        let test_obj = serde_json::json!({
            "id": "ladder_65cm",
            "test_name": "Varget Ladder Test",
            "caliber": "6.5 Creedmoor",
            "bullet": "Hornady 140gr ELD-M"
        });

        let id = InventoryStore::save_load_ladder_test(&conn, test_obj).unwrap();
        assert_eq!(id, "ladder_65cm");

        let list = InventoryStore::get_load_ladder_tests(&conn).unwrap();
        assert_eq!(list.len(), 1);
        assert_eq!(list[0]["test_name"], "Varget Ladder Test");

        InventoryStore::delete_load_ladder_test(&conn, "ladder_65cm").unwrap();
        let empty_list = InventoryStore::get_load_ladder_tests(&conn).unwrap();
        assert_eq!(empty_list.len(), 0);
    }

    #[test]
    fn test_manufacture_handload_batch_updates_ammo_and_components() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        let ammo = serde_json::json!({
            "id": 5,
            "caliber": ".308 Win",
            "brand": "Handload",
            "count": 50
        });
        InventoryStore::insert_ammo(&conn, ammo).unwrap();

        let primer = serde_json::json!({
            "id": 20,
            "type": "Primer",
            "count": 500
        });
        InventoryStore::insert_component(&conn, primer).unwrap();

        let bullet = serde_json::json!({
            "id": 21,
            "type": "Bullet",
            "count": 250
        });
        InventoryStore::insert_component(&conn, bullet).unwrap();

        let deductions = vec![
            serde_json::json!({ "componentId": 20, "quantityUsed": 100 }),
            serde_json::json!({ "componentId": 21, "quantityUsed": 100 }),
        ];

        let res = InventoryStore::manufacture_handload_batch(&conn, 5, 100, deductions).unwrap();
        assert_eq!(res["success"], true);
        assert_eq!(res["newAmmoCount"], 150);

        let updated_ammo = InventoryStore::get_ammo(&conn).unwrap();
        assert_eq!(updated_ammo[0]["count"], 150);

        let comps = InventoryStore::get_components(&conn).unwrap();
        let p = comps.iter().find(|c| c["id"] == 20).unwrap();
        let b = comps.iter().find(|c| c["id"] == 21).unwrap();
        assert_eq!(p["count"], 400.0);
        assert_eq!(b["count"], 150.0);
    }

    #[test]
    fn test_export_vault_and_decoupled_stores_json() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        let firearm = serde_json::json!({
            "id": 1,
            "make": "Colt",
            "model": "Python",
            "caliber": ".357 Mag"
        });
        InventoryStore::insert_firearm(&conn, firearm).unwrap();

        let ammo = serde_json::json!({
            "id": 1,
            "brand": "Federal",
            "caliber": ".357 Mag",
            "count": 100
        });
        InventoryStore::insert_ammo(&conn, ammo).unwrap();

        let loc = serde_json::json!({
            "id": 1,
            "name": "Main Safe"
        });
        InventoryStore::save_storage_location(&conn, loc).unwrap();

        let vault_json = InventoryStore::export_vault_json(&conn).unwrap();
        let val: Value = serde_json::from_str(&vault_json).unwrap();
        assert_eq!(val["schemaVersion"], 2);
        assert_eq!(val["firearms"].as_array().unwrap().len(), 1);
        assert_eq!(val["ammo"].as_array().unwrap().len(), 1);
        assert_eq!(val["storage_locations"].as_array().unwrap().len(), 1);

        // Skus export test
        let mut skus = serde_json::Map::new();
        skus.insert("0123456789".to_string(), serde_json::json!({ "name": "Test SKU" }));
        InventoryStore::save_skus(&conn, skus).unwrap();

        let skus_json = InventoryStore::export_skus_json(&conn).unwrap();
        let skus_val: Value = serde_json::from_str(&skus_json).unwrap();
        assert_eq!(skus_val["schemaVersion"], 1);
        assert!(skus_val["skus"].get("0123456789").is_some());

        // Activity log export test
        InventoryStore::insert_activity_log(&conn, serde_json::json!({
            "timestamp": "2026-09-18T22:00:00Z",
            "action": "TEST"
        })).unwrap();

        let act_json = InventoryStore::export_activity_log_json(&conn).unwrap();
        let act_val: Value = serde_json::from_str(&act_json).unwrap();
        assert_eq!(act_val["schemaVersion"], 1);
        assert_eq!(act_val["activity_log"].as_array().unwrap().len(), 1);
    }

    #[test]
    fn test_import_all_databases_sqlite_and_json() {
        // 1. Create a dummy legacy SQLite file on disk with discrete schema
        let temp_dir = std::env::temp_dir();
        let temp_sqlite = temp_dir.join(format!("test_legacy_{}.sqlite", rand::random::<u32>()));
        {
            let src_conn = Connection::open(&temp_sqlite).unwrap();
            src_conn.execute_batch(
                "
                CREATE TABLE firearms (
                    id INTEGER PRIMARY KEY,
                    make TEXT,
                    model TEXT,
                    serial_number TEXT,
                    caliber TEXT
                );
                INSERT INTO firearms (id, make, model, serial_number, caliber)
                VALUES (101, 'Smith & Wesson', 'Model 29', 'SW12345', '.44 Mag');

                CREATE TABLE ammo (
                    id INTEGER PRIMARY KEY,
                    caliber TEXT,
                    brand TEXT,
                    bullet_type TEXT,
                    data TEXT
                );
                INSERT INTO ammo (id, caliber, brand, bullet_type, data)
                VALUES (201, '.44 Mag', 'Hornady', 'JHP', '{\"id\":201,\"caliber\":\".44 Mag\",\"brand\":\"Hornady\",\"roundCount\":50}');

                CREATE TABLE storage_locations (
                    id TEXT PRIMARY KEY,
                    name TEXT,
                    data TEXT
                );
                INSERT INTO storage_locations (id, name, data)
                VALUES ('safe-top', 'Top Shelf', '{\"id\":\"safe-top\",\"name\":\"Top Shelf\"}');

                CREATE TABLE skus (
                    id TEXT PRIMARY KEY,
                    data TEXT
                );
                INSERT INTO skus (id, data)
                VALUES ('SKU-999', '{\"name\":\"Universal Holster\",\"sku\":\"SKU-999\"}');
                "
            ).unwrap();
        }

        // 2. Open new memory DB and import legacy SQLite file
        let mut dest_conn = Connection::open_in_memory().unwrap();
        Database::init(&dest_conn).unwrap();

        let count = Database::import_from_sqlite(&mut dest_conn, &temp_sqlite).unwrap();
        assert!(count >= 4, "Expected at least 4 records imported, got {}", count);

        let firearms = InventoryStore::get_firearms(&dest_conn).unwrap();
        assert_eq!(firearms.len(), 1);
        assert_eq!(firearms[0]["make"], "Smith & Wesson");
        assert_eq!(firearms[0]["model"], "Model 29");

        let ammo_list = InventoryStore::get_ammo(&dest_conn).unwrap();
        assert_eq!(ammo_list.len(), 1);
        assert_eq!(ammo_list[0]["brand"], "Hornady");

        let locs = InventoryStore::get_storage_locations(&dest_conn).unwrap();
        assert_eq!(locs.len(), 1);
        assert_eq!(locs[0]["name"], "Top Shelf");

        let skus = InventoryStore::get_skus(&dest_conn).unwrap();
        assert!(skus.contains_key("SKU-999"));

        // Clean up temp sqlite file
        let _ = std::fs::remove_file(&temp_sqlite);

        // 3. Test raw JSON array import
        let raw_array_firearms = serde_json::json!([
            {
                "id": 102,
                "make": "Ruger",
                "model": "10/22",
                "caliber": ".22 LR"
            }
        ]);
        Database::import_legacy_json(&mut dest_conn, &raw_array_firearms).unwrap();

        let firearms_after = InventoryStore::get_firearms(&dest_conn).unwrap();
        assert_eq!(firearms_after.len(), 2);
        assert!(firearms_after.iter().any(|f| f["make"] == "Ruger"));
    }

    #[test]
    fn test_competitor_database_and_csv_import() {
        let mut conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        // 1. Competitor SQLite database (e.g. MyGunDB / GunSafe table and column names)
        let temp_dir = std::env::temp_dir();
        let competitor_sqlite = temp_dir.join(format!("test_competitor_{}.db", rand::random::<u32>()));
        {
            let src = Connection::open(&competitor_sqlite).unwrap();
            src.execute_batch(
                "
                CREATE TABLE guns (
                    gun_id INTEGER PRIMARY KEY,
                    manufacturer TEXT,
                    model_name TEXT,
                    serial_no TEXT,
                    cal TEXT,
                    amount_paid REAL,
                    notes TEXT
                );
                INSERT INTO guns (gun_id, manufacturer, model_name, serial_no, cal, amount_paid, notes)
                VALUES (501, 'Colt', 'Python', 'PY998877', '.357 Magnum', 1499.99, 'Competitor export');

                CREATE TABLE ammunition (
                    ammo_id INTEGER PRIMARY KEY,
                    brand_name TEXT,
                    cartridge TEXT,
                    bullet_style TEXT,
                    current_stock INTEGER
                );
                INSERT INTO ammunition (ammo_id, brand_name, cartridge, bullet_style, current_stock)
                VALUES (601, 'Winchester', '.357 Mag', 'JHP', 150);
                "
            ).unwrap();
        }

        let imported_count = Database::import_from_sqlite(&mut conn, &competitor_sqlite).unwrap();
        assert_eq!(imported_count, 2);

        let firearms = InventoryStore::get_firearms(&conn).unwrap();
        let colt = firearms.iter().find(|f| f["make"] == "Colt").expect("Colt Python should be imported");
        assert_eq!(colt["model"], "Python");
        assert_eq!(colt["serial_number"], "PY998877");
        assert_eq!(colt["caliber"], ".357 Magnum");
        assert_eq!(colt["purchase_price"], 1499.99);

        let ammo_list = InventoryStore::get_ammo(&conn).unwrap();
        let win = ammo_list.iter().find(|a| a["brand"] == "Winchester").expect("Winchester ammo should be imported");
        assert_eq!(win["caliber"], ".357 Mag");
        assert_eq!(win["bullet_type"], "JHP");
        assert_eq!(win["roundCount"], 150);

        let _ = std::fs::remove_file(&competitor_sqlite);

        // 2. Competitor CSV (FastBound / ATF Bound Book export)
        let fastbound_csv = "Manufacturer and/or Importer,Model,Serial #,Caliber / Gauge,Purchase Price\n\
                             Glock,19 Gen 5,BKWD123,9mm Luger,$549.99\n\
                             Sig Sauer,P365X,79A987654,9mm,$599.00";
        let csv_imported = Database::import_csv_content(&mut conn, fastbound_csv).unwrap();
        assert_eq!(csv_imported, 2);

        let firearms_after_csv = InventoryStore::get_firearms(&conn).unwrap();
        assert!(firearms_after_csv.iter().any(|f| f["make"] == "Glock" && f["model"] == "19 Gen 5"));
        assert!(firearms_after_csv.iter().any(|f| f["make"] == "Sig Sauer" && f["serial_number"] == "79A987654"));

        // 3. Competitor TSV (Tab-separated Ammunition export)
        let tsv_ammo = "Brand Name\tCaliber\tBullet Design\tInventory\n\
                        Federal\t.45 ACP\tHST\t250\n\
                        Speer\t9mm Luger\tGold Dot\t500";
        let tsv_imported = Database::import_csv_content(&mut conn, tsv_ammo).unwrap();
        assert_eq!(tsv_imported, 2);

        let ammo_after_tsv = InventoryStore::get_ammo(&conn).unwrap();
        assert!(ammo_after_tsv.iter().any(|a| a["brand"] == "Federal" && a["roundCount"] == 250));
        assert!(ammo_after_tsv.iter().any(|a| a["brand"] == "Speer" && a["bullet_type"] == "Gold Dot"));
    }

    #[test]
    fn test_reject_sync_item_lifecycle() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        // 1. Insert an item into sync_queue
        let item_payload = serde_json::json!({
            "type": "new_firearm",
            "data": {
                "make": "Heckler & Koch",
                "model": "VP9",
                "serial_number": "HK-TEST-7788",
                "id": 8801
            }
        });
        let item_id = "test-sync-hk-8801";
        let now = chrono::Utc::now().timestamp_millis();
        conn.execute(
            "INSERT INTO sync_queue (id, payload, created_at) VALUES (?1, ?2, ?3)",
            rusqlite::params![item_id, item_payload.to_string(), now],
        ).unwrap();

        let queue_before = InventoryStore::get_sync_queue(&conn).unwrap();
        assert_eq!(queue_before.len(), 1);

        // 2. Reject with delete_from_mobile = true
        InventoryStore::reject_sync_item(&conn, item_id, true).unwrap();

        // Queue must now be empty
        let queue_after = InventoryStore::get_sync_queue(&conn).unwrap();
        assert_eq!(queue_after.len(), 0);

        // Rejection tombstone must be recorded
        let rejections = InventoryStore::get_rejected_syncs(&conn).unwrap();
        assert_eq!(rejections.len(), 1);
        assert_eq!(rejections[0]["syncId"], item_id);
        assert_eq!(rejections[0]["itemType"], "new_firearm");

        // 3. Confirm rejections (as mobile would after purging)
        let tombstone_id = rejections[0]["id"].as_str().unwrap().to_string();
        InventoryStore::confirm_rejected_syncs(&conn, &[tombstone_id]).unwrap();

        let rejections_after = InventoryStore::get_rejected_syncs(&conn).unwrap();
        assert_eq!(rejections_after.len(), 0);
    }

    #[test]
    fn test_paired_devices_lifecycle() {
        let conn = Connection::open_in_memory().unwrap();
        Database::init(&conn).unwrap();

        // 1. Initial list must be empty
        let devices = InventoryStore::get_paired_devices(&conn).unwrap();
        assert_eq!(devices.len(), 0);

        // 2. Upsert first device (is_new = true)
        let is_new1 = InventoryStore::upsert_paired_device(
            &conn,
            "device-iphone-15",
            "Daniel's iPhone 15 Pro",
            "ios",
            "192.168.1.105",
            Some("tok-iphone-1"),
            Some("key-iphone-vault-1"),
        ).unwrap();
        assert!(is_new1);

        // Re-upserting same device (is_new = false)
        let is_new_again = InventoryStore::upsert_paired_device(
            &conn,
            "device-iphone-15",
            "Daniel's iPhone 15 Pro",
            "ios",
            "192.168.1.105",
            Some("tok-iphone-1"),
            Some("key-iphone-vault-1"),
        ).unwrap();
        assert!(!is_new_again);

        // 3. Upsert second device (is_new = true)
        let is_new2 = InventoryStore::upsert_paired_device(
            &conn,
            "device-pixel-8",
            "Range Tablet Pixel",
            "android",
            "192.168.1.112",
            Some("tok-pixel-2"),
            Some("key-pixel-vault-2"),
        ).unwrap();
        assert!(is_new2);

        let devices = InventoryStore::get_paired_devices(&conn).unwrap();
        assert_eq!(devices.len(), 2);
        assert!(devices.iter().any(|d| d["deviceName"] == "Daniel's iPhone 15 Pro"));
        assert!(devices.iter().any(|d| d["deviceName"] == "Range Tablet Pixel"));

        let keys = InventoryStore::get_paired_device_keys(&conn).unwrap();
        assert_eq!(keys.len(), 2);

        // 4. Update activity
        InventoryStore::update_paired_device_activity(&conn, "device-iphone-15", Some("192.168.1.106")).unwrap();
        let devices = InventoryStore::get_paired_devices(&conn).unwrap();
        let iphone = devices.iter().find(|d| d["id"] == "device-iphone-15").unwrap();
        assert_eq!(iphone["ipAddress"], "192.168.1.106");

        // 5. Remove single device
        let removed = InventoryStore::remove_paired_device(&conn, "device-pixel-8").unwrap();
        assert!(removed);
        let devices = InventoryStore::get_paired_devices(&conn).unwrap();
        assert_eq!(devices.len(), 1);
        assert_eq!(devices[0]["id"], "device-iphone-15");

        // 6. Unpair all
        let all_unpaired = InventoryStore::unpair_all_devices(&conn).unwrap();
        assert!(all_unpaired);
        let devices = InventoryStore::get_paired_devices(&conn).unwrap();
        assert_eq!(devices.len(), 0);
    }

    #[test]
    fn test_paired_device_vault_lock_unlock_persistence() {
        let conn1 = Connection::open_in_memory().unwrap();
        Database::init(&conn1).unwrap();

        // 1. Pair a device with a custom companion passphrase / key
        InventoryStore::upsert_paired_device(
            &conn1,
            "pixel-7-pro-id",
            "Google Pixel 7 Pro",
            "android",
            "172.18.105.38",
            Some("tok-session-12345"),
            Some("dBC@1997"),
        ).unwrap();

        // Verify device in conn1
        let devices_before = InventoryStore::get_paired_devices(&conn1).unwrap();
        assert_eq!(devices_before.len(), 1);
        assert_eq!(devices_before[0]["deviceKey"], "dBC@1997");
        assert_eq!(devices_before[0]["isActive"], true);

        // 2. Export to encrypted vault JSON payload (simulate flush_vault on lock)
        let exported_json_str = InventoryStore::export_vault_json(&conn1).unwrap();
        assert!(exported_json_str.contains("dBC@1997"));
        assert!(exported_json_str.contains("pixel-7-pro-id"));

        // Drop conn1 (simulate RAM drop on vault lock)
        drop(conn1);

        // 3. Brand-new connection (simulate vault unlock)
        let mut conn2 = Connection::open_in_memory().unwrap();
        Database::init(&conn2).unwrap();

        let root_val: Value = serde_json::from_str(&exported_json_str).unwrap();
        Database::import_legacy_json(&mut conn2, &root_val).unwrap();

        // 4. Verify paired device is fully restored with active status and custom passphrase
        let devices_after = InventoryStore::get_paired_devices(&conn2).unwrap();
        assert_eq!(devices_after.len(), 1);
        assert_eq!(devices_after[0]["id"], "pixel-7-pro-id");
        assert_eq!(devices_after[0]["deviceName"], "Google Pixel 7 Pro");
        assert_eq!(devices_after[0]["deviceKey"], "dBC@1997");
        assert_eq!(devices_after[0]["isActive"], true);

        let keys_after = InventoryStore::get_paired_device_keys(&conn2).unwrap();
        assert_eq!(keys_after, vec!["dBC@1997"]);
    }
}



