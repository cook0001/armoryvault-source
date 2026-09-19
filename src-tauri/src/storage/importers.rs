#![allow(clippy::explicit_counter_loop)]

use super::module_db::ModuleDbManager;
use rusqlite::{params, Connection, Result};
use serde_json::Value;
use std::path::Path;

/// Normalizes a header or column name for resilient synonym matching across competitor schemas.
pub fn normalize_key(s: &str) -> String {
    s.to_lowercase()
        .chars()
        .map(|c| if c.is_alphanumeric() { c } else { ' ' })
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ")
}

/// Helper to search a JSON map for a string value matching any given synonyms.
pub fn find_val_by_synonyms(map: &serde_json::Map<String, Value>, synonyms: &[&str]) -> Option<String> {
    for syn in synonyms {
        let norm_syn = normalize_key(syn);
        for (k, v) in map {
            if normalize_key(k) == norm_syn {
                if let Some(s) = v.as_str() {
                    let st = s.trim();
                    if !st.is_empty() {
                        return Some(st.to_string());
                    }
                } else if let Some(n) = v.as_i64() {
                    return Some(n.to_string());
                } else if let Some(f) = v.as_f64() {
                    return Some(f.to_string());
                } else if let Some(b) = v.as_bool() {
                    return Some(b.to_string());
                }
            }
        }
    }
    None
}

/// Helper to parse currency or numeric strings/values into f64.
pub fn find_num_by_synonyms(map: &serde_json::Map<String, Value>, synonyms: &[&str]) -> Option<f64> {
    for syn in synonyms {
        let norm_syn = normalize_key(syn);
        for (k, v) in map {
            if normalize_key(k) == norm_syn {
                if let Some(f) = v.as_f64() {
                    return Some(f);
                } else if let Some(n) = v.as_i64() {
                    return Some(n as f64);
                } else if let Some(s) = v.as_str() {
                    let cleaned = s.replace(['$', ','], "").trim().to_string();
                    if let Ok(val) = cleaned.parse::<f64>() {
                        return Some(val);
                    }
                }
            }
        }
    }
    None
}

/// Helper to find a table in SQLite master case-insensitively across multiple candidate synonyms.
pub fn find_matching_table(conn: &Connection, candidates: &[&str]) -> Option<String> {
    let mut stmt = match conn.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'") {
        Ok(s) => s,
        Err(_) => return None,
    };
    let tables: Vec<String> = stmt
        .query_map([], |r| r.get(0))
        .ok()?
        .filter_map(|r| r.ok())
        .collect();

    for cand in candidates {
        if let Some(found) = tables.iter().find(|t| t.eq_ignore_ascii_case(cand)) {
            return Some(found.clone());
        }
    }
    None
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

/// Helper to find array in JSON root matching candidate keys (e.g. "firearms", "guns", "weapons")
fn get_json_array<'a>(root: &'a Value, keys: &[&str]) -> Option<&'a Vec<Value>> {
    for k in keys {
        if let Some(arr) = root.get(*k).and_then(|v| v.as_array()) {
            return Some(arr);
        }
    }
    None
}

// ─────────────────────────────────────────────────────────────────────────────
// SQLITE MIGRATION & IMPORT (MULTI-SOFTWARE COMPATIBILITY)
// ─────────────────────────────────────────────────────────────────────────────

/// Imports any external SQLite database into the active connection,
/// translating table names and column schemas from competitor software (MyGunDB, GunSafe, GunLog, Gun Tracker, etc.)
pub fn import_sqlite(dest_conn: &mut Connection, source_path: &Path) -> Result<usize, String> {
    if !source_path.exists() {
        return Err(format!("Source database file not found: {}", source_path.display()));
    }

    let src_conn = Connection::open(source_path)
        .map_err(|e| format!("Failed to open source SQLite database: {}", e))?;

    let mut total_imported = 0;
    let tx = dest_conn.transaction().map_err(|e| e.to_string())?;

    // 1. Firearms Table Detection & Migration
    let firearm_cands = &["firearms", "guns", "weapons", "firearm", "gun_inventory", "inventory", "armory", "arms"];
    if let Some(table_name) = find_matching_table(&src_conn, firearm_cands) {
        let mut cur_max_id: i64 = tx
            .query_row("SELECT COALESCE(MAX(id), 0) FROM firearms", [], |r| r.get(0))
            .unwrap_or(0);

        let query = format!("SELECT * FROM \"{}\"", table_name);
        let mut stmt = src_conn.prepare(&query).map_err(|e| e.to_string())?;
        let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
        let data_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("data"));

        let mut rows_to_insert = Vec::new();

        let mut cursor = stmt.query([]).map_err(|e| e.to_string())?;
        while let Some(row) = cursor.next().map_err(|e| e.to_string())? {
            // Check if native ArmoryVault JSON 'data' column exists and is valid
            if let Some(idx) = data_idx {
                if let Ok(raw_str) = row.get::<_, String>(idx) {
                    if let Ok(parsed_obj) = serde_json::from_str::<Value>(&raw_str) {
                        if parsed_obj.is_object() {
                            let orig_id = parsed_obj.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                            let make = parsed_obj.get("make").and_then(|v| v.as_str()).map(|s| s.to_string());
                            let model = parsed_obj.get("model").and_then(|v| v.as_str()).map(|s| s.to_string());
                            let serial = parsed_obj.get("serial_number").and_then(|v| v.as_str()).map(|s| s.to_string());
                            let caliber = parsed_obj.get("caliber").and_then(|v| v.as_str()).map(|s| s.to_string());
                            cur_max_id += 1;
                            let id = if orig_id > 0 { orig_id } else { cur_max_id };
                            rows_to_insert.push((id, make, model, serial, caliber, raw_str));
                            continue;
                        }
                    }
                }
            }

            // Competitor table: extract every column into a JSON map
            let mut map = serde_json::Map::new();
            let mut row_id: i64 = 0;
            for (i, name) in col_names.iter().enumerate() {
                if let Ok(val) = row.get_ref(i) {
                    let jval = match val.data_type() {
                        rusqlite::types::Type::Null => Value::Null,
                        rusqlite::types::Type::Integer => {
                            let n: i64 = row.get(i).unwrap_or(0);
                            if name.eq_ignore_ascii_case("id") || name.eq_ignore_ascii_case("gun_id") || name.eq_ignore_ascii_case("firearm_id") {
                                row_id = n;
                            }
                            Value::Number(n.into())
                        }
                        rusqlite::types::Type::Real => {
                            let f: f64 = row.get(i).unwrap_or(0.0);
                            serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null)
                        }
                        rusqlite::types::Type::Text => {
                            let s: String = row.get(i).unwrap_or_default();
                            Value::String(s)
                        }
                        rusqlite::types::Type::Blob => Value::Null,
                    };
                    map.insert(name.clone(), jval);
                }
            }

            // Map competitor synonyms to canonical fields
            let make = find_val_by_synonyms(&map, &[
                "make", "manufacturer", "mfg", "brand", "builder", "maker",
                "manufacturer and/or importer", "importer", "gun manufacturer"
            ]);
            let model = find_val_by_synonyms(&map, &[
                "model", "model name", "firearm model", "gun model", "name",
                "item", "firearm name", "gun name", "item name", "firearm"
            ]);
            let serial = find_val_by_synonyms(&map, &[
                "serial number", "serial", "serial no", "serial no.", "serial #",
                "sn", "s n", "serialno", "serialnum", "serial_no", "ser no", "ser no.", "ser#"
            ]);
            let caliber = find_val_by_synonyms(&map, &[
                "caliber", "cal", "gauge", "chambering", "bore", "caliber / gauge",
                "caliber/gauge", "cal / gauge", "cal/gauge", "caliber or gauge"
            ]);
            let firearm_type = find_val_by_synonyms(&map, &["firearm type", "type", "category", "classification", "kind", "gun type", "weapon type"]);
            let action_type = find_val_by_synonyms(&map, &["action type", "action", "mechanism", "operating system"]);
            let barrel_length = find_val_by_synonyms(&map, &["barrel length", "barrel", "bbl", "barrel len", "length"]);
            let condition = find_val_by_synonyms(&map, &["condition", "grade", "state", "quality", "grading"]);
            let finish = find_val_by_synonyms(&map, &["finish", "color", "coating", "metal finish"]);
            let purchase_date = find_val_by_synonyms(&map, &["purchase date", "acquisition date", "acquired date", "date acquired", "date purchased", "buy date", "date of acquisition", "acquired on"]);
            let purchase_price = find_num_by_synonyms(&map, &["purchase price", "cost", "price", "acquisition cost", "amount paid", "purchase cost", "acquisition price", "acquired cost"]);
            let purchased_from = find_val_by_synonyms(&map, &["purchased from", "acquired from", "seller", "dealer", "vendor", "store", "shop", "ffl", "source", "name and address of person from whom acquired"]);
            let round_count = find_num_by_synonyms(&map, &["round count", "rounds fired", "rounds", "shot count", "total rounds", "shots fired"]).map(|f| f as i64);
            let notes = find_val_by_synonyms(&map, &["notes", "comments", "description", "remarks", "memo", "details"]);
            let is_sold = find_val_by_synonyms(&map, &["is sold", "sold", "disposed", "status"]).map(|s| s.to_lowercase() == "sold" || s.to_lowercase() == "true" || s == "1");
            let sold_date = find_val_by_synonyms(&map, &["sold date", "disposition date", "date sold", "date of disposition"]);
            let sold_price = find_num_by_synonyms(&map, &["sold price", "disposition price", "sale price", "amount received", "disposition amount", "transfer price"]);
            let sold_to_name = find_val_by_synonyms(&map, &["sold to name", "sold to", "buyer", "disposition to", "purchaser", "transferee", "name and address of person to whom transferred"]);

            cur_max_id += 1;
            let id = if row_id > 0 { row_id } else { cur_max_id };

            // Inject canonical attributes into map
            map.insert("id".to_string(), Value::Number(id.into()));
            if let Some(ref m) = make { map.insert("make".to_string(), Value::String(m.clone())); }
            if let Some(ref m) = model { map.insert("model".to_string(), Value::String(m.clone())); }
            if let Some(ref s) = serial { map.insert("serial_number".to_string(), Value::String(s.clone())); }
            if let Some(ref c) = caliber { map.insert("caliber".to_string(), Value::String(c.clone())); }
            if let Some(ref t) = firearm_type { map.insert("firearm_type".to_string(), Value::String(t.clone())); }
            if let Some(ref a) = action_type { map.insert("action_type".to_string(), Value::String(a.clone())); }
            if let Some(ref b) = barrel_length { map.insert("barrel_length".to_string(), Value::String(b.clone())); }
            if let Some(ref c) = condition { map.insert("condition".to_string(), Value::String(c.clone())); }
            if let Some(ref f) = finish { map.insert("finish".to_string(), Value::String(f.clone())); }
            if let Some(ref p) = purchase_date { map.insert("purchase_date".to_string(), Value::String(p.clone())); }
            if let Some(p) = purchase_price { map.insert("purchase_price".to_string(), serde_json::Number::from_f64(p).map(Value::Number).unwrap_or(Value::Null)); }
            if let Some(ref p) = purchased_from { map.insert("purchased_from".to_string(), Value::String(p.clone())); }
            if let Some(r) = round_count { map.insert("round_count".to_string(), Value::Number(r.into())); }
            if let Some(ref n) = notes { map.insert("notes".to_string(), Value::String(n.clone())); }
            if let Some(s) = is_sold { map.insert("is_sold".to_string(), Value::Bool(s)); }
            if let Some(ref d) = sold_date { map.insert("sold_date".to_string(), Value::String(d.clone())); }
            if let Some(p) = sold_price { map.insert("sold_price".to_string(), serde_json::Number::from_f64(p).map(Value::Number).unwrap_or(Value::Null)); }
            if let Some(ref b) = sold_to_name { map.insert("sold_to_name".to_string(), Value::String(b.clone())); }

            let data_str = serde_json::to_string(&Value::Object(map)).unwrap_or_default();
            rows_to_insert.push((id, make, model, serial, caliber, data_str));
        }

        for (id, make, model, serial, cal, data) in rows_to_insert {
            let _ = tx.execute(
                "INSERT OR REPLACE INTO firearms (id, make, model, serial_number, caliber, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, make, model, serial, cal, data],
            );
            total_imported += 1;
        }
    }

    // 2. Ammo Table Detection & Migration
    let ammo_cands = &["ammo", "ammunition", "ammo_inventory", "cartridges", "ammos", "ammunitions"];
    if let Some(table_name) = find_matching_table(&src_conn, ammo_cands) {
        let mut cur_max_id: i64 = tx
            .query_row("SELECT COALESCE(MAX(id), 0) FROM ammo", [], |r| r.get(0))
            .unwrap_or(0);

        let query = format!("SELECT * FROM \"{}\"", table_name);
        let mut stmt = src_conn.prepare(&query).map_err(|e| e.to_string())?;
        let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
        let data_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("data"));

        let mut rows_to_insert = Vec::new();
        let mut cursor = stmt.query([]).map_err(|e| e.to_string())?;
        while let Some(row) = cursor.next().map_err(|e| e.to_string())? {
            if let Some(idx) = data_idx {
                if let Ok(raw_str) = row.get::<_, String>(idx) {
                    if let Ok(parsed_obj) = serde_json::from_str::<Value>(&raw_str) {
                        if parsed_obj.is_object() {
                            let orig_id = parsed_obj.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                            let cal = parsed_obj.get("caliber").and_then(|v| v.as_str()).map(|s| s.to_string());
                            let brand = parsed_obj.get("brand").or_else(|| parsed_obj.get("manufacturer")).and_then(|v| v.as_str()).map(|s| s.to_string());
                            let btype = parsed_obj.get("bullet_type").or_else(|| parsed_obj.get("bulletType")).and_then(|v| v.as_str()).map(|s| s.to_string());
                            cur_max_id += 1;
                            let id = if orig_id > 0 { orig_id } else { cur_max_id };
                            rows_to_insert.push((id, cal, brand, btype, raw_str));
                            continue;
                        }
                    }
                }
            }

            let mut map = serde_json::Map::new();
            let mut row_id: i64 = 0;
            for (i, name) in col_names.iter().enumerate() {
                if let Ok(val) = row.get_ref(i) {
                    let jval = match val.data_type() {
                        rusqlite::types::Type::Null => Value::Null,
                        rusqlite::types::Type::Integer => {
                            let n: i64 = row.get(i).unwrap_or(0);
                            if name.eq_ignore_ascii_case("id") { row_id = n; }
                            Value::Number(n.into())
                        }
                        rusqlite::types::Type::Real => {
                            let f: f64 = row.get(i).unwrap_or(0.0);
                            serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null)
                        }
                        rusqlite::types::Type::Text => Value::String(row.get(i).unwrap_or_default()),
                        rusqlite::types::Type::Blob => Value::Null,
                    };
                    map.insert(name.clone(), jval);
                }
            }

            let caliber = find_val_by_synonyms(&map, &["caliber", "cal", "gauge", "cartridge", "chambering", "caliber / gauge"]);
            let brand = find_val_by_synonyms(&map, &["brand", "manufacturer", "mfg", "make", "brand name", "ammo manufacturer"]);
            let bullet_type = find_val_by_synonyms(&map, &["bullet type", "bullet_type", "bulletType", "bullet style", "bullet design", "type"]);
            let round_count = find_num_by_synonyms(&map, &["quantity", "round count", "rounds", "count", "current stock", "inventory", "in stock rounds"]).map(|f| f as i64);

            cur_max_id += 1;
            let id = if row_id > 0 { row_id } else { cur_max_id };

            map.insert("id".to_string(), Value::Number(id.into()));
            if let Some(ref c) = caliber { map.insert("caliber".to_string(), Value::String(c.clone())); }
            if let Some(ref b) = brand { map.insert("brand".to_string(), Value::String(b.clone())); }
            if let Some(ref bt) = bullet_type {
                map.insert("bulletType".to_string(), Value::String(bt.clone()));
                map.insert("bullet_type".to_string(), Value::String(bt.clone()));
            }
            if let Some(rc) = round_count {
                map.insert("roundCount".to_string(), Value::Number(rc.into()));
                map.insert("round_count".to_string(), Value::Number(rc.into()));
                map.insert("quantity".to_string(), Value::Number(rc.into()));
            }

            let data_str = serde_json::to_string(&Value::Object(map)).unwrap_or_default();
            rows_to_insert.push((id, caliber, brand, bullet_type, data_str));
        }

        for (id, cal, brand, btype, data) in rows_to_insert {
            let _ = tx.execute(
                "INSERT OR REPLACE INTO ammo (id, caliber, brand, bullet_type, data) VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, cal, brand, btype, data],
            );
            total_imported += 1;
        }
    }

    // 3. Accessories Table Detection & Migration
    let acc_cands = &["accessories", "gear", "attachments", "optics", "accessory", "parts", "equipment"];
    if let Some(table_name) = find_matching_table(&src_conn, acc_cands) {
        let mut cur_max_id: i64 = tx
            .query_row("SELECT COALESCE(MAX(id), 0) FROM accessories", [], |r| r.get(0))
            .unwrap_or(0);

        let query = format!("SELECT * FROM \"{}\"", table_name);
        let mut stmt = src_conn.prepare(&query).map_err(|e| e.to_string())?;
        let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
        let data_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("data"));

        let mut rows_to_insert = Vec::new();
        let mut cursor = stmt.query([]).map_err(|e| e.to_string())?;
        while let Some(row) = cursor.next().map_err(|e| e.to_string())? {
            if let Some(idx) = data_idx {
                if let Ok(raw_str) = row.get::<_, String>(idx) {
                    if let Ok(parsed_obj) = serde_json::from_str::<Value>(&raw_str) {
                        if parsed_obj.is_object() {
                            let orig_id = parsed_obj.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                            let name = parsed_obj.get("name").and_then(|v| v.as_str()).map(|s| s.to_string());
                            let cat = parsed_obj.get("category").or_else(|| parsed_obj.get("type")).and_then(|v| v.as_str()).map(|s| s.to_string());
                            cur_max_id += 1;
                            let id = if orig_id > 0 { orig_id } else { cur_max_id };
                            rows_to_insert.push((id, name, cat, raw_str));
                            continue;
                        }
                    }
                }
            }

            let mut map = serde_json::Map::new();
            let mut row_id: i64 = 0;
            for (i, name) in col_names.iter().enumerate() {
                if let Ok(val) = row.get_ref(i) {
                    let jval = match val.data_type() {
                        rusqlite::types::Type::Null => Value::Null,
                        rusqlite::types::Type::Integer => {
                            let n: i64 = row.get(i).unwrap_or(0);
                            if name.eq_ignore_ascii_case("id") { row_id = n; }
                            Value::Number(n.into())
                        }
                        rusqlite::types::Type::Real => {
                            let f: f64 = row.get(i).unwrap_or(0.0);
                            serde_json::Number::from_f64(f).map(Value::Number).unwrap_or(Value::Null)
                        }
                        rusqlite::types::Type::Text => Value::String(row.get(i).unwrap_or_default()),
                        rusqlite::types::Type::Blob => Value::Null,
                    };
                    map.insert(name.clone(), jval);
                }
            }

            let name = find_val_by_synonyms(&map, &["name", "item name", "title", "description", "accessory name", "model"]);
            let cat = find_val_by_synonyms(&map, &["category", "type", "cat", "kind", "accessory type", "equipment type"]);

            cur_max_id += 1;
            let id = if row_id > 0 { row_id } else { cur_max_id };

            map.insert("id".to_string(), Value::Number(id.into()));
            if let Some(ref n) = name { map.insert("name".to_string(), Value::String(n.clone())); }
            if let Some(ref c) = cat { map.insert("category".to_string(), Value::String(c.clone())); }

            let data_str = serde_json::to_string(&Value::Object(map)).unwrap_or_default();
            rows_to_insert.push((id, name, cat, data_str));
        }

        for (id, name, cat, data) in rows_to_insert {
            let _ = tx.execute(
                "INSERT OR REPLACE INTO accessories (id, name, category, data) VALUES (?1, ?2, ?3, ?4)",
                params![id, name, cat, data],
            );
            total_imported += 1;
        }
    }

    // 4. Storage Locations Table Detection & Migration
    let loc_cands = &["storage_locations", "locations", "safes", "storage", "vaults", "lockers"];
    if let Some(table_name) = find_matching_table(&src_conn, loc_cands) {
        let query = format!("SELECT * FROM \"{}\"", table_name);
        let mut stmt = src_conn.prepare(&query).map_err(|e| e.to_string())?;
        let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
        let data_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("data"));

        let mut rows_to_insert = Vec::new();
        let mut cursor = stmt.query([]).map_err(|e| e.to_string())?;
        let mut fallback_idx = 0;
        while let Some(row) = cursor.next().map_err(|e| e.to_string())? {
            fallback_idx += 1;
            let id = if let Ok(s) = row.get::<_, String>(0) {
                s
            } else if let Ok(n) = row.get::<_, i64>(0) {
                n.to_string()
            } else {
                format!("loc_{}", fallback_idx)
            };

            let name: String = col_names.iter().position(|c| c.eq_ignore_ascii_case("name"))
                .and_then(|i| row.get(i).ok())
                .unwrap_or_else(|| "Storage Space".to_string());

            let data: String = if let Some(idx) = data_idx {
                row.get(idx).unwrap_or_default()
            } else {
                serde_json::json!({ "id": id, "name": name }).to_string()
            };

            rows_to_insert.push((id, name, data));
        }

        for (id, name, data) in rows_to_insert {
            let _ = tx.execute(
                "INSERT OR REPLACE INTO storage_locations (id, name, data) VALUES (?1, ?2, ?3)",
                params![id, name, data],
            );
            total_imported += 1;
        }
    }

    // 5. Reloading Components Table Detection & Migration
    let comp_cands = &["components", "reloading", "reloading_components", "reloading_supplies", "supplies", "reload_components"];
    if let Some(table_name) = find_matching_table(&src_conn, comp_cands) {
        let mut cur_max_id: i64 = tx
            .query_row("SELECT COALESCE(MAX(id), 0) FROM components", [], |r| r.get(0))
            .unwrap_or(0);

        let query = format!("SELECT * FROM \"{}\"", table_name);
        let mut stmt = src_conn.prepare(&query).map_err(|e| e.to_string())?;
        let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
        let data_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("data"));

        let mut rows_to_insert = Vec::new();
        let mut cursor = stmt.query([]).map_err(|e| e.to_string())?;
        while let Some(row) = cursor.next().map_err(|e| e.to_string())? {
            let id: i64 = row.get(0).unwrap_or_else(|_| {
                cur_max_id += 1;
                cur_max_id
            });
            let ctype: Option<String> = col_names.iter().position(|c| c.eq_ignore_ascii_case("type")).and_then(|i| row.get(i).ok());
            let caliber: Option<String> = col_names.iter().position(|c| c.eq_ignore_ascii_case("caliber")).and_then(|i| row.get(i).ok());
            let data: String = if let Some(idx) = data_idx {
                row.get(idx).unwrap_or_default()
            } else {
                serde_json::json!({ "id": id, "type": ctype, "caliber": caliber }).to_string()
            };
            rows_to_insert.push((id, ctype, caliber, data));
        }

        for (id, ctype, cal, data) in rows_to_insert {
            let _ = tx.execute(
                "INSERT OR REPLACE INTO components (id, type, caliber, data) VALUES (?1, ?2, ?3, ?4)",
                params![id, ctype, cal, data],
            );
            total_imported += 1;
        }
    }

    // 6. Custom SKUs
    let sku_cands = &["skus", "barcodes", "custom_skus", "upcs"];
    if let Some(table_name) = find_matching_table(&src_conn, sku_cands) {
        let query = format!("SELECT * FROM \"{}\"", table_name);
        if let Ok(mut stmt) = src_conn.prepare(&query) {
            let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
            if col_names.len() >= 2 {
                if let Ok(rows) = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))) {
                    for r in rows.flatten() {
                        let (id, data) = r;
                        let _ = tx.execute("INSERT OR REPLACE INTO skus (id, data) VALUES (?1, ?2)", params![id, data]);
                        total_imported += 1;
                    }
                }
            }
        }
    }

    // 7. Activity Log
    let log_cands = &["activity_log", "activity", "logs", "maintenance", "history", "audit_log"];
    if let Some(table_name) = find_matching_table(&src_conn, log_cands) {
        let query = format!("SELECT * FROM \"{}\"", table_name);
        if let Ok(mut stmt) = src_conn.prepare(&query) {
            let col_names: Vec<String> = stmt.column_names().into_iter().map(|s| s.to_string()).collect();
            let data_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("data"));
            let ts_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("timestamp"));
            let act_idx = col_names.iter().position(|c| c.eq_ignore_ascii_case("action"));

            if let Ok(rows) = stmt.query_map([], |row| {
                let ts: String = ts_idx.and_then(|i| row.get(i).ok()).unwrap_or_default();
                let act: String = act_idx.and_then(|i| row.get(i).ok()).unwrap_or_else(|| "LOG".to_string());
                let data: String = data_idx.and_then(|i| row.get(i).ok()).unwrap_or_default();
                Ok((ts, act, data))
            }) {
                for r in rows.flatten() {
                    let (ts, act, data) = r;
                    let _ = tx.execute(
                        "INSERT INTO activity_log (timestamp, action, data) VALUES (?1, ?2, ?3)",
                        params![ts, act, data],
                    );
                    total_imported += 1;
                }
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(total_imported)
}

// ─────────────────────────────────────────────────────────────────────────────
// SPREADSHEET & CSV INGESTION PIPELINE (RFC 4180 + DYNAMIC DELIMITERS)
// ─────────────────────────────────────────────────────────────────────────────

/// Auto-detects delimiter from the first line of CSV/TSV content.
pub fn detect_delimiter(first_line: &str) -> char {
    let commas = first_line.chars().filter(|&c| c == ',').count();
    let tabs = first_line.chars().filter(|&c| c == '\t').count();
    let semis = first_line.chars().filter(|&c| c == ';').count();
    let pipes = first_line.chars().filter(|&c| c == '|').count();

    if tabs > commas && tabs > semis {
        '\t'
    } else if semis > commas && semis > tabs {
        ';'
    } else if pipes > commas && pipes > tabs {
        '|'
    } else {
        ','
    }
}

/// Tokenizes CSV/TSV text adhering to RFC 4180 with support for escaped quotes and multiline cells.
pub fn parse_csv_records(content: &str) -> (Vec<String>, Vec<Vec<String>>) {
    let clean = content.strip_prefix('\u{feff}').unwrap_or(content);

    let first_line = clean.lines().next().unwrap_or("");
    let delimiter = detect_delimiter(first_line);

    let mut rows: Vec<Vec<String>> = Vec::new();
    let mut current_row: Vec<String> = Vec::new();
    let mut current_field = String::new();
    let mut in_quotes = false;

    let chars: Vec<char> = clean.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        let ch = chars[i];
        let next_ch = if i + 1 < len { Some(chars[i + 1]) } else { None };

        if in_quotes {
            if ch == '"' {
                if next_ch == Some('"') {
                    current_field.push('"');
                    i += 2;
                    continue;
                } else {
                    in_quotes = false;
                    i += 1;
                    continue;
                }
            } else {
                current_field.push(ch);
                i += 1;
                continue;
            }
        } else {
            if ch == '"' {
                in_quotes = true;
                i += 1;
                continue;
            } else if ch == delimiter {
                current_row.push(current_field.trim().to_string());
                current_field.clear();
                i += 1;
                continue;
            } else if ch == '\r' || ch == '\n' {
                if ch == '\r' && next_ch == Some('\n') {
                    i += 1;
                }
                current_row.push(current_field.trim().to_string());
                current_field.clear();
                if current_row.iter().any(|field| !field.is_empty()) {
                    rows.push(current_row);
                }
                current_row = Vec::new();
                i += 1;
                continue;
            } else {
                current_field.push(ch);
                i += 1;
                continue;
            }
        }
    }

    if !current_field.is_empty() || !current_row.is_empty() {
        current_row.push(current_field.trim().to_string());
        if current_row.iter().any(|field| !field.is_empty()) {
            rows.push(current_row);
        }
    }

    if rows.is_empty() {
        return (Vec::new(), Vec::new());
    }

    let headers = rows.remove(0);
    (headers, rows)
}

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum CsvEntity {
    Firearms,
    Ammo,
    Components,
    Accessories,
}

/// Detects the target inventory entity from header columns across all competitor formats.
pub fn detect_csv_entity(headers: &[String]) -> CsvEntity {
    let norm_headers: Vec<String> = headers.iter().map(|h| normalize_key(h)).collect();

    let mut firearm_score = 0;
    let mut ammo_score = 0;
    let mut comp_score = 0;
    let mut acc_score = 0;

    for h in &norm_headers {
        if h.contains("serial") || h.contains("barrel") || h.contains("action") || h == "model" || h == "model name" || h.contains("firearm") || h.contains("gun") || h.contains("disposition") || h.contains("importer") || h == "make" || h.contains("weapon") {
            firearm_score += 4;
        }

        if h.contains("bullet") || h.contains("round") || h.contains("powder") || h.contains("primer") || h.contains("brass") || h.contains("ammo") || h.contains("cartridge") || h.contains("grain") || h.contains("cpr") || h == "inventory" || h == "current stock" || h == "in stock rounds" {
            ammo_score += 4;
        }

        if h.contains("component") || h.contains("reloading") || h.contains("powder weight") || h.contains("primer size") {
            comp_score += 5;
        }

        if h.contains("accessory") || h.contains("optic") || h.contains("scope") || h.contains("holster") || h.contains("suppressor") || h.contains("mount") {
            acc_score += 5;
        }
    }

    if ammo_score > firearm_score && ammo_score >= comp_score && ammo_score >= acc_score {
        CsvEntity::Ammo
    } else if firearm_score >= ammo_score && firearm_score >= comp_score && firearm_score >= acc_score && firearm_score > 0 {
        CsvEntity::Firearms
    } else if comp_score > firearm_score && comp_score > ammo_score && comp_score > acc_score {
        CsvEntity::Components
    } else if acc_score > firearm_score && acc_score > ammo_score && acc_score > comp_score {
        CsvEntity::Accessories
    } else {
        CsvEntity::Firearms
    }
}


/// Imports CSV or TSV file content directly into destination SQLite connection.
pub fn import_csv(dest_conn: &mut Connection, csv_path: &Path) -> Result<usize, String> {
    if !csv_path.exists() {
        return Err(format!("File not found: {}", csv_path.display()));
    }
    let content = std::fs::read_to_string(csv_path)
        .map_err(|e| format!("Failed to read CSV/spreadsheet: {}", e))?;
    import_csv_content(dest_conn, &content)
}

/// Ingests CSV, TSV, or spreadsheet text content directly into the destination SQLite connection.
pub fn import_csv_content(dest_conn: &mut Connection, content: &str) -> Result<usize, String> {
    let trimmed = content.trim();
    if trimmed.is_empty() {
        return Ok(0);
    }

    // Support direct ingestion of JSON database or array passed through CSV pipeline
    if trimmed.starts_with('{') || trimmed.starts_with('[') {
        if let Ok(val) = serde_json::from_str::<Value>(trimmed) {
            import_json(dest_conn, &val)?;
            let count: usize = dest_conn.query_row("SELECT COUNT(*) FROM firearms", [], |r| r.get(0)).unwrap_or(0);
            return Ok(count);
        }
    }

    let (headers, rows) = parse_csv_records(trimmed);
    if headers.is_empty() || rows.is_empty() {
        return Ok(0);
    }

    let entity = detect_csv_entity(&headers);
    let tx = dest_conn.transaction().map_err(|e| e.to_string())?;
    let mut imported = 0;

    match entity {
        CsvEntity::Firearms => {
            let mut cur_max_id: i64 = tx
                .query_row("SELECT COALESCE(MAX(id), 0) FROM firearms", [], |r| r.get(0))
                .unwrap_or(0);

            for row in rows {
                let mut map = serde_json::Map::new();
                for (idx, header) in headers.iter().enumerate() {
                    let val = row.get(idx).map(|s| s.as_str()).unwrap_or("");
                    map.insert(header.clone(), Value::String(val.to_string()));
                }

                let make = find_val_by_synonyms(&map, &[
                    "make", "manufacturer", "mfg", "brand", "builder", "maker",
                    "manufacturer and/or importer", "importer", "gun manufacturer"
                ]);
                let model = find_val_by_synonyms(&map, &[
                    "model", "model name", "firearm model", "gun model", "name",
                    "item", "firearm name", "gun name", "item name", "firearm"
                ]);

                // Require at least a make or model to prevent importing blank trailing lines
                if make.is_none() && model.is_none() {
                    continue;
                }

                let serial = find_val_by_synonyms(&map, &[
                    "serial number", "serial", "serial no", "serial no.", "serial #",
                    "sn", "s n", "serialno", "serialnum", "serial_no", "ser no", "ser no.", "ser#"
                ]);
                let caliber = find_val_by_synonyms(&map, &[
                    "caliber", "cal", "gauge", "chambering", "bore", "caliber / gauge",
                    "caliber/gauge", "cal / gauge", "cal/gauge", "caliber or gauge"
                ]);
                let firearm_type = find_val_by_synonyms(&map, &["firearm type", "type", "category", "classification", "kind", "gun type", "weapon type"]);
                let action_type = find_val_by_synonyms(&map, &["action type", "action", "mechanism", "operating system"]);
                let barrel_length = find_val_by_synonyms(&map, &["barrel length", "barrel", "bbl", "barrel len", "length"]);
                let condition = find_val_by_synonyms(&map, &["condition", "grade", "state", "quality", "grading"]);
                let finish = find_val_by_synonyms(&map, &["finish", "color", "coating", "metal finish"]);
                let purchase_date = find_val_by_synonyms(&map, &["purchase date", "acquisition date", "acquired date", "date acquired", "date purchased", "buy date", "date of acquisition", "acquired on"]);
                let purchase_price = find_num_by_synonyms(&map, &["purchase price", "cost", "price", "acquisition cost", "amount paid", "purchase cost", "acquisition price", "acquired cost"]);
                let purchased_from = find_val_by_synonyms(&map, &["purchased from", "acquired from", "seller", "dealer", "vendor", "store", "shop", "ffl", "source", "name and address of person from whom acquired"]);
                let round_count = find_num_by_synonyms(&map, &["round count", "rounds fired", "rounds", "shot count", "total rounds", "shots fired"]).map(|f| f as i64);
                let notes = find_val_by_synonyms(&map, &["notes", "comments", "description", "remarks", "memo", "details"]);
                let is_sold = find_val_by_synonyms(&map, &["is sold", "sold", "disposed", "status"]).map(|s| s.to_lowercase() == "sold" || s.to_lowercase() == "true" || s == "1");
                let sold_date = find_val_by_synonyms(&map, &["sold date", "disposition date", "date sold", "date of disposition"]);
                let sold_price = find_num_by_synonyms(&map, &["sold price", "disposition price", "sale price", "amount received", "disposition amount", "transfer price"]);
                let sold_to_name = find_val_by_synonyms(&map, &["sold to name", "sold to", "buyer", "disposition to", "purchaser", "transferee", "name and address of person to whom transferred"]);

                cur_max_id += 1;
                let id = cur_max_id;

                map.insert("id".to_string(), Value::Number(id.into()));
                if let Some(ref m) = make { map.insert("make".to_string(), Value::String(m.clone())); }
                if let Some(ref m) = model { map.insert("model".to_string(), Value::String(m.clone())); }
                if let Some(ref s) = serial { map.insert("serial_number".to_string(), Value::String(s.clone())); }
                if let Some(ref c) = caliber { map.insert("caliber".to_string(), Value::String(c.clone())); }
                if let Some(ref t) = firearm_type { map.insert("firearm_type".to_string(), Value::String(t.clone())); }
                if let Some(ref a) = action_type { map.insert("action_type".to_string(), Value::String(a.clone())); }
                if let Some(ref b) = barrel_length { map.insert("barrel_length".to_string(), Value::String(b.clone())); }
                if let Some(ref c) = condition { map.insert("condition".to_string(), Value::String(c.clone())); }
                if let Some(ref f) = finish { map.insert("finish".to_string(), Value::String(f.clone())); }
                if let Some(ref p) = purchase_date { map.insert("purchase_date".to_string(), Value::String(p.clone())); }
                if let Some(p) = purchase_price { map.insert("purchase_price".to_string(), serde_json::Number::from_f64(p).map(Value::Number).unwrap_or(Value::Null)); }
                if let Some(ref p) = purchased_from { map.insert("purchased_from".to_string(), Value::String(p.clone())); }
                if let Some(r) = round_count { map.insert("round_count".to_string(), Value::Number(r.into())); }
                if let Some(ref n) = notes { map.insert("notes".to_string(), Value::String(n.clone())); }
                if let Some(s) = is_sold { map.insert("is_sold".to_string(), Value::Bool(s)); }
                if let Some(ref d) = sold_date { map.insert("sold_date".to_string(), Value::String(d.clone())); }
                if let Some(p) = sold_price { map.insert("sold_price".to_string(), serde_json::Number::from_f64(p).map(Value::Number).unwrap_or(Value::Null)); }
                if let Some(ref b) = sold_to_name { map.insert("sold_to_name".to_string(), Value::String(b.clone())); }

                let data_str = serde_json::to_string(&Value::Object(map)).unwrap_or_default();
                let _ = tx.execute(
                    "INSERT INTO firearms (id, make, model, serial_number, caliber, data) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                    params![id, make, model, serial, caliber, data_str],
                );
                imported += 1;
            }
        }
        CsvEntity::Ammo => {
            let mut cur_max_id: i64 = tx
                .query_row("SELECT COALESCE(MAX(id), 0) FROM ammo", [], |r| r.get(0))
                .unwrap_or(0);

            for row in rows {
                let mut map = serde_json::Map::new();
                for (idx, header) in headers.iter().enumerate() {
                    let val = row.get(idx).map(|s| s.as_str()).unwrap_or("");
                    map.insert(header.clone(), Value::String(val.to_string()));
                }

                let caliber = find_val_by_synonyms(&map, &["caliber", "cal", "gauge", "cartridge", "chambering", "caliber / gauge"]);
                let brand = find_val_by_synonyms(&map, &["brand", "manufacturer", "mfg", "make", "brand name", "ammo manufacturer"]);
                let bullet_type = find_val_by_synonyms(&map, &["bullet type", "bullet_type", "bulletType", "bullet style", "bullet design", "type"]);
                let round_count = find_num_by_synonyms(&map, &["quantity", "round count", "rounds", "count", "current stock", "inventory", "in stock rounds"]).map(|f| f as i64);

                if caliber.is_none() && brand.is_none() {
                    continue;
                }

                cur_max_id += 1;
                let id = cur_max_id;

                map.insert("id".to_string(), Value::Number(id.into()));
                if let Some(ref c) = caliber { map.insert("caliber".to_string(), Value::String(c.clone())); }
                if let Some(ref b) = brand { map.insert("brand".to_string(), Value::String(b.clone())); }
                if let Some(ref bt) = bullet_type {
                    map.insert("bulletType".to_string(), Value::String(bt.clone()));
                    map.insert("bullet_type".to_string(), Value::String(bt.clone()));
                }
                if let Some(rc) = round_count {
                    map.insert("roundCount".to_string(), Value::Number(rc.into()));
                    map.insert("round_count".to_string(), Value::Number(rc.into()));
                    map.insert("quantity".to_string(), Value::Number(rc.into()));
                }

                let data_str = serde_json::to_string(&Value::Object(map)).unwrap_or_default();
                let _ = tx.execute(
                    "INSERT INTO ammo (id, caliber, brand, bullet_type, data) VALUES (?1, ?2, ?3, ?4, ?5)",
                    params![id, caliber, brand, bullet_type, data_str],
                );
                imported += 1;
            }
        }
        CsvEntity::Components => {
            let mut cur_max_id: i64 = tx
                .query_row("SELECT COALESCE(MAX(id), 0) FROM components", [], |r| r.get(0))
                .unwrap_or(0);

            for row in rows {
                let mut map = serde_json::Map::new();
                for (idx, header) in headers.iter().enumerate() {
                    let val = row.get(idx).map(|s| s.as_str()).unwrap_or("");
                    map.insert(header.clone(), Value::String(val.to_string()));
                }

                let ctype = find_val_by_synonyms(&map, &["type", "component type", "comp type", "category"]);
                let caliber = find_val_by_synonyms(&map, &["caliber", "cal", "size"]);

                cur_max_id += 1;
                let id = cur_max_id;
                map.insert("id".to_string(), Value::Number(id.into()));

                let data_str = serde_json::to_string(&Value::Object(map)).unwrap_or_default();
                let _ = tx.execute(
                    "INSERT INTO components (id, type, caliber, data) VALUES (?1, ?2, ?3, ?4)",
                    params![id, ctype, caliber, data_str],
                );
                imported += 1;
            }
        }
        CsvEntity::Accessories => {
            let mut cur_max_id: i64 = tx
                .query_row("SELECT COALESCE(MAX(id), 0) FROM accessories", [], |r| r.get(0))
                .unwrap_or(0);

            for row in rows {
                let mut map = serde_json::Map::new();
                for (idx, header) in headers.iter().enumerate() {
                    let val = row.get(idx).map(|s| s.as_str()).unwrap_or("");
                    map.insert(header.clone(), Value::String(val.to_string()));
                }

                let name = find_val_by_synonyms(&map, &["name", "item name", "title", "description", "accessory name", "model"]);
                let category = find_val_by_synonyms(&map, &["category", "type", "cat", "kind", "accessory type", "equipment type"]);

                if name.is_none() {
                    continue;
                }

                cur_max_id += 1;
                let id = cur_max_id;
                map.insert("id".to_string(), Value::Number(id.into()));

                let data_str = serde_json::to_string(&Value::Object(map)).unwrap_or_default();
                let _ = tx.execute(
                    "INSERT INTO accessories (id, name, category, data) VALUES (?1, ?2, ?3, ?4)",
                    params![id, name, category, data_str],
                );
                imported += 1;
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;
    Ok(imported)
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON MIGRATION & TRANSLATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/// Seeds Core and Module databases from decrypted JSON schema or third-party JSON exports.
pub fn import_json(conn: &mut Connection, root_json: &Value) -> Result<(), String> {
    // Handle raw JSON arrays directly
    if let Some(arr) = root_json.as_array() {
        if let Some(first) = arr.first() {
            if first.get("make").is_some() || first.get("model").is_some() || first.get("serial_number").is_some() || first.get("manufacturer").is_some() {
                let wrapped = serde_json::json!({ "firearms": arr });
                return import_json(conn, &wrapped);
            } else if first.get("bulletType").is_some() || first.get("bullet_type").is_some() || (first.get("caliber").is_some() && (first.get("roundCount").is_some() || first.get("quantity").is_some())) {
                let wrapped = serde_json::json!({ "ammo": arr });
                return import_json(conn, &wrapped);
            } else if (first.get("category").is_some() || first.get("type").is_some()) && first.get("name").is_some() {
                let wrapped = serde_json::json!({ "accessories": arr });
                return import_json(conn, &wrapped);
            } else if first.get("type").is_some() && (first.get("count").is_some() || first.get("quantity").is_some()) {
                let wrapped = serde_json::json!({ "components": arr });
                return import_json(conn, &wrapped);
            }
        }
    }

    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // 1. Firearms (Core)
    let firearm_keys = &["firearms", "guns", "weapons", "gun_inventory", "inventory", "armory", "arms"];
    if let Some(list) = get_json_array(root_json, firearm_keys) {
        let mut cur_max_id: i64 = tx
            .query_row("SELECT COALESCE(MAX(id), 0) FROM firearms", [], |r| r.get(0))
            .unwrap_or(0);

        for item in list {
            let orig_id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            cur_max_id += 1;
            let id = if orig_id > 0 { orig_id } else { cur_max_id };

            let make = item.get("make")
                .or_else(|| item.get("manufacturer"))
                .or_else(|| item.get("mfg"))
                .or_else(|| item.get("brand"))
                .and_then(|v| v.as_str());

            let model = item.get("model")
                .or_else(|| item.get("model_name"))
                .or_else(|| item.get("name"))
                .and_then(|v| v.as_str());

            let serial = item.get("serial_number")
                .or_else(|| item.get("serial"))
                .or_else(|| item.get("serialNumber"))
                .or_else(|| item.get("sn"))
                .and_then(|v| v.as_str());

            let caliber = item.get("caliber")
                .or_else(|| item.get("cal"))
                .or_else(|| item.get("gauge"))
                .and_then(|v| v.as_str());

            let mut item_clone = item.clone();
            if let Some(obj) = item_clone.as_object_mut() {
                obj.insert("id".to_string(), Value::Number(id.into()));
                if let Some(m) = make { if !obj.contains_key("make") { obj.insert("make".to_string(), Value::String(m.to_string())); } }
                if let Some(m) = model { if !obj.contains_key("model") { obj.insert("model".to_string(), Value::String(m.to_string())); } }
                if let Some(s) = serial { if !obj.contains_key("serial_number") { obj.insert("serial_number".to_string(), Value::String(s.to_string())); } }
                if let Some(c) = caliber { if !obj.contains_key("caliber") { obj.insert("caliber".to_string(), Value::String(c.to_string())); } }
            }

            let data = serde_json::to_string(&item_clone).unwrap_or_default();

            tx.execute(
                "INSERT OR REPLACE INTO firearms (id, make, model, serial_number, caliber, data)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![id, make, model, serial, caliber, data],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 2. Ammo (Core)
    let ammo_keys = &["ammo", "ammunition", "cartridges", "ammo_inventory"];
    if let Some(list) = get_json_array(root_json, ammo_keys) {
        let mut cur_max_id: i64 = tx
            .query_row("SELECT COALESCE(MAX(id), 0) FROM ammo", [], |r| r.get(0))
            .unwrap_or(0);

        for item in list {
            let orig_id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            cur_max_id += 1;
            let id = if orig_id > 0 { orig_id } else { cur_max_id };

            let caliber = item.get("caliber").or_else(|| item.get("cal")).and_then(|v| v.as_str());
            let brand = item.get("brand").or_else(|| item.get("manufacturer")).and_then(|v| v.as_str());
            let b_type = item.get("bulletType").or_else(|| item.get("bullet_type")).and_then(|v| v.as_str());

            let mut item_clone = item.clone();
            if let Some(obj) = item_clone.as_object_mut() {
                obj.insert("id".to_string(), Value::Number(id.into()));
            }
            let data = serde_json::to_string(&item_clone).unwrap_or_default();

            tx.execute(
                "INSERT OR REPLACE INTO ammo (id, caliber, brand, bullet_type, data)
                 VALUES (?1, ?2, ?3, ?4, ?5)",
                params![id, caliber, brand, b_type, data],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 3. Accessories (Core, with mountedOnFirearmId -> mounts migration)
    let acc_keys = &["accessories", "gear", "attachments", "optics"];
    if let Some(list) = get_json_array(root_json, acc_keys) {
        let mut cur_max_id: i64 = tx
            .query_row("SELECT COALESCE(MAX(id), 0) FROM accessories", [], |r| r.get(0))
            .unwrap_or(0);

        for item in list {
            let orig_id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
            cur_max_id += 1;
            let id = if orig_id > 0 { orig_id } else { cur_max_id };

            let mut acc = item.clone();
            if let Some(obj) = acc.as_object_mut() {
                obj.insert("id".to_string(), Value::Number(id.into()));
                if let Some(fid) = obj.get("mountedOnFirearmId").and_then(|v| v.as_i64()) {
                    if !obj.contains_key("mounts") {
                        let qty = obj.get("quantity").and_then(|v| v.as_i64()).unwrap_or(1);
                        obj.insert("mounts".to_string(), serde_json::json!([{ "firearmId": fid, "quantity": qty }]));
                    }
                    obj.remove("mountedOnFirearmId");
                }
            }
            let name = acc.get("name").or_else(|| acc.get("item_name")).and_then(|v| v.as_str());
            let cat = acc.get("category").or_else(|| acc.get("type")).and_then(|v| v.as_str());
            let data = serde_json::to_string(&acc).unwrap_or_default();

            tx.execute(
                "INSERT OR REPLACE INTO accessories (id, name, category, data)
                 VALUES (?1, ?2, ?3, ?4)",
                params![id, name, cat, data],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 4. Storage Locations (Core)
    let loc_keys = &["storage_locations", "locations", "safes", "storage"];
    if let Some(list) = get_json_array(root_json, loc_keys) {
        for (idx, item) in list.iter().enumerate() {
            let id_str = get_id_str(item, idx + 1);
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

            tx.execute(
                "INSERT OR REPLACE INTO storage_locations (id, name, data) VALUES (?1, ?2, ?3)",
                params![id_str, name, data],
            ).map_err(|e| e.to_string())?;
        }
    }

    // 5. Custom SKUs (Core)
    let sku_keys = &["skus", "barcodes", "custom_skus"];
    for k in sku_keys {
        if let Some(skus_map) = root_json.get(*k).and_then(|v| v.as_object()) {
            for (id, val) in skus_map {
                let data = serde_json::to_string(val).unwrap_or_default();
                let _ = tx.execute(
                    "INSERT OR REPLACE INTO skus (id, data) VALUES (?1, ?2)",
                    params![id, data],
                );
            }
        }
    }

    // 6. Activity Log (Core)
    let act_keys = &["activity_log", "activity", "logs", "history"];
    if let Some(list) = get_json_array(root_json, act_keys) {
        for item in list {
            let timestamp = item.get("timestamp").and_then(|v| v.as_str()).unwrap_or("");
            let action = item.get("action").and_then(|v| v.as_str()).unwrap_or("LOG");
            let data = serde_json::to_string(item).unwrap_or_default();
            let _ = tx.execute(
                "INSERT INTO activity_log (timestamp, action, data) VALUES (?1, ?2, ?3)",
                params![timestamp, action, data],
            );
        }
    }

    // 7. KV Meta (Core & Pairing Token)
    let kv_keys = &["kv_meta", "meta", "metadata"];
    for k in kv_keys {
        if let Some(meta_map) = root_json.get(*k).and_then(|v| v.as_object()) {
            for (key, val) in meta_map {
                let val_str = if let Some(s) = val.as_str() {
                    s.to_string()
                } else {
                    val.to_string()
                };
                let _ = tx.execute(
                    "INSERT OR REPLACE INTO kv_meta (key, value) VALUES (?1, ?2)",
                    params![key, val_str],
                );
            }
        }
    }

    // 8. Paired Devices (Companion devices & keys)
    let device_keys = &["paired_devices", "devices"];
    if let Some(list) = get_json_array(root_json, device_keys) {
        for dev in list {
            if let Some(id) = dev.get("id").and_then(|v| v.as_str()) {
                let name = dev.get("deviceName").or_else(|| dev.get("device_name")).and_then(|v| v.as_str()).unwrap_or("Companion");
                let dev_type = dev.get("deviceType").or_else(|| dev.get("device_type")).and_then(|v| v.as_str()).unwrap_or("mobile");
                let ip = dev.get("ipAddress").or_else(|| dev.get("ip_address")).and_then(|v| v.as_str());
                let paired_at = dev.get("pairedAt").or_else(|| dev.get("paired_at")).and_then(|v| v.as_str()).unwrap_or("");
                let last_active = dev.get("lastActiveAt").or_else(|| dev.get("last_active_at")).and_then(|v| v.as_str()).unwrap_or("");
                let is_active = dev.get("isActive").or_else(|| dev.get("is_active")).and_then(|v| v.as_i64()).unwrap_or(1);
                let device_token = dev.get("deviceToken").or_else(|| dev.get("device_token")).and_then(|v| v.as_str());
                let device_key = dev.get("deviceKey").or_else(|| dev.get("device_key")).and_then(|v| v.as_str());

                let _ = tx.execute(
                    "INSERT OR REPLACE INTO paired_devices (id, device_name, device_type, ip_address, paired_at, last_active_at, is_active, device_token, device_key)
                     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
                    params![id, name, dev_type, ip, paired_at, last_active, is_active, device_token, device_key],
                );
            }
        }
    }

    // 9. Sync Queue (Staged items pending review)
    let sync_keys = &["sync_queue", "syncQueue"];
    if let Some(list) = get_json_array(root_json, sync_keys) {
        for item in list {
            let id = item.get("id").or_else(|| item.get("syncId")).and_then(|v| v.as_str());
            let created_at = item.get("createdAt").or_else(|| item.get("created_at")).and_then(|v| v.as_i64()).unwrap_or(0);
            if let Some(id_str) = id {
                let payload_str = serde_json::to_string(item).unwrap_or_default();
                let _ = tx.execute(
                    "INSERT OR REPLACE INTO sync_queue (id, payload, created_at) VALUES (?1, ?2, ?3)",
                    params![id_str, payload_str, created_at],
                );
            }
        }
    }

    tx.commit().map_err(|e| e.to_string())?;

    // Migrate module collections into their dedicated SQLite files in module_data/
    migrate_module_collections(root_json)?;

    Ok(())
}

/// Migrates module-specific collections into their dedicated SQLite database files in module_data/
pub fn migrate_module_collections(root_json: &Value) -> Result<(), String> {
    // A. Reloading Module Database: `module_data/reloading.sqlite`
    if let Ok(mut r_conn) = ModuleDbManager::get_connection("reloading") {
        if let Ok(r_tx) = r_conn.transaction() {
            let comp_keys = &["components", "reloading", "reloading_components", "reloading_supplies"];
            if let Some(list) = get_json_array(root_json, comp_keys) {
                for (idx, item) in list.iter().enumerate() {
                    let orig_id = item.get("id").and_then(|v| v.as_i64()).unwrap_or(0);
                    let id = if orig_id > 0 { orig_id } else { (idx + 1) as i64 };
                    let c_type = item.get("type").and_then(|v| v.as_str());
                    let caliber = item.get("caliber").and_then(|v| v.as_str());
                    let data = serde_json::to_string(item).unwrap_or_default();
                    let _ = r_tx.execute(
                        "INSERT OR REPLACE INTO components (id, type, caliber, data) VALUES (?1, ?2, ?3, ?4)",
                        params![id, c_type, caliber, data],
                    );
                }
            }

            // Load Recipes
            if let Some(list) = root_json.get("load_recipes").or_else(|| root_json.get("reloading_recipes")).and_then(|v| v.as_array()) {
                for (idx, item) in list.iter().enumerate() {
                    let id_str = get_id_str(item, idx + 1);
                    let caliber = item.get("caliber").and_then(|v| v.as_str());
                    let data = serde_json::to_string(item).unwrap_or_default();
                    let _ = r_tx.execute(
                        "INSERT OR REPLACE INTO load_recipes (id, caliber, data) VALUES (?1, ?2, ?3)",
                        params![id_str, caliber, data],
                    );
                }
            }

            // Load Ladder Tests
            if let Some(list) = root_json.get("load_ladder_tests").and_then(|v| v.as_array()) {
                for (idx, item) in list.iter().enumerate() {
                    let id_str = get_id_str(item, idx + 1);
                    let data = serde_json::to_string(item).unwrap_or_default();
                    let _ = r_tx.execute(
                        "INSERT OR REPLACE INTO load_ladder_tests (id, data) VALUES (?1, ?2)",
                        params![id_str, data],
                    );
                }
            }

            // Chrono Strings
            if let Some(list) = root_json.get("chrono_strings").and_then(|v| v.as_array()) {
                for (idx, item) in list.iter().enumerate() {
                    let id_str = get_id_str(item, idx + 1);
                    let data = serde_json::to_string(item).unwrap_or_default();
                    let _ = r_tx.execute(
                        "INSERT OR REPLACE INTO chrono_strings (id, data) VALUES (?1, ?2)",
                        params![id_str, data],
                    );
                }
            }

            // Target Analyses
            if let Some(list) = root_json.get("target_analyses").and_then(|v| v.as_array()) {
                for (idx, item) in list.iter().enumerate() {
                    let id_str = get_id_str(item, idx + 1);
                    let data = serde_json::to_string(item).unwrap_or_default();
                    let _ = r_tx.execute(
                        "INSERT OR REPLACE INTO target_analyses (id, data) VALUES (?1, ?2)",
                        params![id_str, data],
                    );
                }
            }

            let _ = r_tx.commit();
        }
    }

    // B. Ballistics Module Database: `module_data/ballistics.sqlite`
    if let Ok(mut b_conn) = ModuleDbManager::get_connection("ballistics") {
        if let Ok(b_tx) = b_conn.transaction() {
            if let Some(list) = root_json.get("ballistic_profiles").and_then(|v| v.as_array()) {
                for (idx, item) in list.iter().enumerate() {
                    let id_str = get_id_str(item, idx + 1);
                    let name = item.get("name").and_then(|v| v.as_str());
                    let caliber = item.get("caliber").and_then(|v| v.as_str());
                    let data = serde_json::to_string(item).unwrap_or_default();
                    let _ = b_tx.execute(
                        "INSERT OR REPLACE INTO ballistic_profiles (id, name, caliber, data) VALUES (?1, ?2, ?3, ?4)",
                        params![id_str, name, caliber, data],
                    );
                }
            }
            let _ = b_tx.commit();
        }
    }

    // C. Maintenance Module Database: `module_data/maintenance.sqlite`
    if let Ok(m_conn) = ModuleDbManager::get_connection("maintenance") {
        if let Some(presets) = root_json.get("custom_schedule_presets") {
            let data = serde_json::to_string(presets).unwrap_or_default();
            let _ = m_conn.execute(
                "INSERT OR REPLACE INTO custom_schedule_presets (id, data) VALUES ('default', ?1)",
                params![data],
            );
        }
    }

    // D. Optics Module Database: `module_data/optics.sqlite`
    if let Ok(o_conn) = ModuleDbManager::get_connection("optics") {
        if let Some(list) = root_json.get("optics_vault_inventory").and_then(|v| v.as_array()) {
            for (idx, item) in list.iter().enumerate() {
                let id_str = get_id_str(item, idx + 1);
                let sn = item.get("serial_number").and_then(|v| v.as_str());
                let fid = item.get("firearm_id").and_then(|v| v.as_i64());
                let data = serde_json::to_string(item).unwrap_or_default();
                let _ = o_conn.execute(
                    "INSERT OR REPLACE INTO optics_inventory (id, serial_number, firearm_id, data) VALUES (?1, ?2, ?3, ?4)",
                    params![id_str, sn, fid, data],
                );
            }
        }
    }

    Ok(())
}
