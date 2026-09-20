use crate::commands::vault_commands::AppState;
use crate::storage::InventoryStore;
use serde_json::Value;
use tauri::{AppHandle, Emitter, State};

// ─── Firearms ────────────────────────────────────────────────────────────
#[tauri::command]
pub fn get_firearms(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_firearms(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_firearm(firearm: Value, state: State<AppState>) -> Result<i64, String> {
    let id = state.with_db(|conn| InventoryStore::insert_firearm(conn, firearm).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(id)
}

#[tauri::command]
pub fn update_firearm(id: i64, firearm: Value, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::update_firearm(conn, id, firearm).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn delete_firearm(id: i64, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::delete_firearm(conn, id).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

// ─── Ammunition ──────────────────────────────────────────────────────────
#[tauri::command]
pub fn get_ammo(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_ammo(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_ammo(ammo: Value, state: State<AppState>) -> Result<i64, String> {
    let id = state.with_db(|conn| InventoryStore::insert_ammo(conn, ammo).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(id)
}

#[tauri::command]
pub fn update_ammo(id: i64, ammo: Value, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::update_ammo(conn, id, ammo).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn delete_ammo(id: i64, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::delete_ammo(conn, id).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

// ─── Accessories ─────────────────────────────────────────────────────────
#[tauri::command]
pub fn get_accessories(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_accessories(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_accessory(accessory: Value, state: State<AppState>) -> Result<i64, String> {
    let id = state.with_db(|conn| InventoryStore::insert_accessory(conn, accessory).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(id)
}

#[tauri::command]
pub fn update_accessory(id: i64, accessory: Value, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::update_accessory(conn, id, accessory).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn delete_accessory(id: i64, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::delete_accessory(conn, id).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

// ─── Components ──────────────────────────────────────────────────────────
#[tauri::command]
pub fn get_components(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_components(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_component(component: Value, state: State<AppState>) -> Result<i64, String> {
    let id = state.with_db(|conn| InventoryStore::insert_component(conn, component).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(id)
}

#[tauri::command]
pub fn update_component(id: i64, component: Value, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::update_component(conn, id, component).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn delete_component(id: i64, state: State<AppState>) -> Result<i64, String> {
    let res = state.with_db(|conn| InventoryStore::delete_component(conn, id).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

// ─── Custom SKUs ─────────────────────────────────────────────────────────
#[tauri::command]
pub fn get_skus(state: State<AppState>) -> Result<serde_json::Map<String, Value>, String> {
    state.with_db(|conn| InventoryStore::get_skus(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn save_skus(skus: serde_json::Map<String, Value>, state: State<AppState>) -> Result<bool, String> {
    state.with_db(|conn| InventoryStore::save_skus(conn, skus).map_err(|e| e.to_string()))?;
    state.flush_skus()?;
    Ok(true)
}

#[tauri::command]
pub fn delete_sku(sku_id: String, state: State<AppState>) -> Result<String, String> {
    let res = state.with_db(|conn| InventoryStore::delete_sku(conn, &sku_id).map_err(|e| e.to_string()))?;
    state.flush_skus()?;
    Ok(res)
}

#[tauri::command]
pub fn export_skus_catalog(state: State<AppState>) -> Result<Value, String> {
    let skus = state.with_db(|conn| InventoryStore::get_skus(conn).map_err(|e| e.to_string()))?;
    Ok(serde_json::json!({
        "format": "armoryvault_sku_catalog",
        "version": 1,
        "exportedAt": chrono::Utc::now().to_rfc3339(),
        "itemCount": skus.len(),
        "skus": skus
    }))
}

#[tauri::command]
pub fn import_skus_catalog(catalog_data: Value, mode: Option<String>, state: State<AppState>) -> Result<Value, String> {
    let raw_skus = if let Some(map) = catalog_data.get("skus").and_then(|v| v.as_object()) {
        map.clone()
    } else if let Some(map) = catalog_data.as_object() {
        map.clone()
    } else {
        return Err("Invalid catalog format: expected object or { skus: {...} }".to_string());
    };

    let imported_count = raw_skus.len();
    let replace_mode = mode.as_deref() == Some("replace");

    state.with_db_mut(|conn| {
        if replace_mode {
            let _ = conn.execute("DELETE FROM skus", []);
        }
        InventoryStore::save_skus(conn, raw_skus).map_err(|e| e.to_string())
    })?;

    state.flush_skus()?;

    Ok(serde_json::json!({
        "success": true,
        "importedCount": imported_count,
        "mode": if replace_mode { "replace" } else { "merge" }
    }))
}

// ─── Storage Locations ───────────────────────────────────────────────────
#[tauri::command]
pub fn get_storage_locations(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_storage_locations(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_storage_location(location: Value, state: State<AppState>) -> Result<Value, String> {
    let res = state.with_db(|conn| InventoryStore::save_storage_location(conn, location).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn update_storage_location(id: String, location: Value, state: State<AppState>) -> Result<Value, String> {
    let res = state.with_db(|conn| InventoryStore::update_storage_location(conn, &id, location).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn delete_storage_location(id: String, state: State<AppState>) -> Result<String, String> {
    let res = state.with_db(|conn| InventoryStore::delete_storage_location(conn, &id).map_err(|e| e.to_string()))?;
    state.flush_vault()?;
    Ok(res)
}

// ─── Activity Log ────────────────────────────────────────────────────────
#[tauri::command]
pub fn get_activity_log(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_activity_log(conn).map_err(|e| e.to_string()))
}

// ─── Maintenance & Range Telemetry ────────────────────────────────────────
#[tauri::command]
pub fn complete_maintenance_task(
    firearm_id: i64,
    task_id: String,
    log_data: Value,
    state: State<AppState>,
) -> Result<bool, String> {
    let res = state.with_db(|conn| {
        InventoryStore::complete_maintenance_task(conn, firearm_id, &task_id, log_data)
            .map_err(|e| e.to_string())
    })?;
    state.flush_vault()?;
    state.flush_activity_log()?;
    Ok(res)
}

#[tauri::command]
pub fn log_range_session(session_data: Value, state: State<AppState>) -> Result<Value, String> {
    let res = state.with_db(|conn| {
        InventoryStore::log_range_session(conn, session_data).map_err(|e| e.to_string())
    })?;
    state.flush_vault()?;
    state.flush_activity_log()?;
    Ok(res)
}

// ─── Batch Imports ────────────────────────────────────────────────────────
#[tauri::command]
pub fn import_firearms_batch(
    firearms_list: Vec<Value>,
    updates_list: Option<Vec<Value>>,
    state: State<AppState>,
) -> Result<Value, String> {
    let res = state.with_db(|conn| {
        InventoryStore::import_firearms_batch(conn, firearms_list, updates_list)
            .map_err(|e| e.to_string())
    })?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn import_ammo_batch(
    ammo_list: Vec<Value>,
    updates_list: Option<Vec<Value>>,
    state: State<AppState>,
) -> Result<Value, String> {
    let res = state.with_db(|conn| {
        InventoryStore::import_ammo_batch(conn, ammo_list, updates_list)
            .map_err(|e| e.to_string())
    })?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn import_accessories_batch(accessories_list: Vec<Value>, state: State<AppState>) -> Result<Value, String> {
    let res = state.with_db(|conn| {
        InventoryStore::import_accessories_batch(conn, accessories_list).map_err(|e| e.to_string())
    })?;
    state.flush_vault()?;
    Ok(res)
}

#[tauri::command]
pub fn import_components_batch(components_list: Vec<Value>, state: State<AppState>) -> Result<Value, String> {
    let res = state.with_db(|conn| {
        InventoryStore::import_components_batch(conn, components_list).map_err(|e| e.to_string())
    })?;
    state.flush_vault()?;
    Ok(res)
}

// ─── Key-Value Config (Modules & Settings) ────────────────────────────────
#[tauri::command]
pub fn get_config(key: String, state: State<AppState>) -> Result<Option<Value>, String> {
    state.with_db(|conn| InventoryStore::get_config(conn, &key).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn set_config(key: String, value: Value, state: State<AppState>) -> Result<bool, String> {
    state.with_db(|conn| InventoryStore::set_config(conn, &key, &value).map_err(|e| e.to_string()))?;
    Ok(true)
}

// ─── Custom Schedule Presets ──────────────────────────────────────────────
#[tauri::command]
pub fn get_custom_schedule_presets(state: State<AppState>) -> Result<Value, String> {
    state.with_db(InventoryStore::get_custom_schedule_presets)
}

#[tauri::command]
pub fn save_custom_schedule_presets(presets: Value, state: State<AppState>) -> Result<bool, String> {
    state.with_db(|conn| InventoryStore::save_custom_schedule_presets(conn, presets))
}

// ─── Ballistic Profiles ───────────────────────────────────────────────────
#[tauri::command]
pub fn get_ballistic_profiles(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_ballistic_profiles(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_ballistic_profile(profile: Value, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::save_ballistic_profile(conn, profile).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn update_ballistic_profile(id: String, profile: Value, state: State<AppState>) -> Result<String, String> {
    let mut obj = profile;
    if let Some(m) = obj.as_object_mut() {
        m.insert("id".to_string(), Value::String(id));
    }
    state.with_db(|conn| InventoryStore::save_ballistic_profile(conn, obj).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn delete_ballistic_profile(id: String, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::delete_ballistic_profile(conn, &id).map_err(|e| e.to_string()))
}

// ─── Load Ladder Tests ────────────────────────────────────────────────────
#[tauri::command]
pub fn get_load_ladder_tests(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_load_ladder_tests(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_load_ladder_test(test: Value, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::save_load_ladder_test(conn, test).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn update_load_ladder_test(id: String, test: Value, state: State<AppState>) -> Result<String, String> {
    let mut obj = test;
    if let Some(m) = obj.as_object_mut() {
        m.insert("id".to_string(), Value::String(id));
    }
    state.with_db(|conn| InventoryStore::save_load_ladder_test(conn, obj).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn delete_load_ladder_test(id: String, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::delete_load_ladder_test(conn, &id).map_err(|e| e.to_string()))
}

// ─── Handload Manufacturing Batch ─────────────────────────────────────────
#[tauri::command]
pub fn manufacture_handload_batch(
    ammo_id: i64,
    quantity: i64,
    deductions: Vec<Value>,
    state: State<AppState>,
) -> Result<Value, String> {
    let res = state.with_db(|conn| {
        InventoryStore::manufacture_handload_batch(conn, ammo_id, quantity, deductions)
            .map_err(|e| e.to_string())
    })?;
    state.flush_vault()?;
    state.flush_activity_log()?;
    Ok(res)
}

// ─── Sync Queue (Mobile Companion App) ────────────────────────────────────
#[tauri::command]
pub fn get_sync_queue(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_sync_queue(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn remove_sync_item(id: String, state: State<AppState>, app_handle: AppHandle) -> Result<String, String> {
    let res = state.with_db(|conn| InventoryStore::remove_sync_item(conn, &id).map_err(|e| e.to_string()))?;
    let _ = state.flush_vault();
    let _ = app_handle.emit("sync-queue-changed", serde_json::json!({ "action": "removed", "id": &id }));
    Ok(res)
}

#[tauri::command]
pub fn reject_sync_item(id: String, delete_from_mobile: Option<bool>, state: State<AppState>, app_handle: AppHandle) -> Result<(), String> {
    state.with_db(|conn| InventoryStore::reject_sync_item(conn, &id, delete_from_mobile.unwrap_or(true)).map_err(|e| e.to_string()))?;
    let _ = state.flush_vault();
    let _ = app_handle.emit("sync-queue-changed", serde_json::json!({ "action": "rejected", "id": &id }));
    Ok(())
}

#[tauri::command]
pub fn get_rejected_syncs(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_rejected_syncs(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn confirm_rejected_syncs(ids: Vec<String>, state: State<AppState>) -> Result<(), String> {
    state.with_db(|conn| InventoryStore::confirm_rejected_syncs(conn, &ids).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn clear_sync_queue(state: State<AppState>, app_handle: AppHandle) -> Result<(), String> {
    state.with_db(|conn| InventoryStore::clear_sync_queue(conn).map_err(|e| e.to_string()))?;
    let _ = state.flush_vault();
    let _ = app_handle.emit("sync-queue-changed", serde_json::json!({ "action": "cleared" }));
    Ok(())
}

#[tauri::command]
pub fn get_paired_device_keys(state: State<AppState>) -> Result<Vec<String>, String> {
    state.with_db(|conn| InventoryStore::get_paired_device_keys(conn).map_err(|e| e.to_string()))
}

// ─── Chronograph Strings & Target Analyses (Reloading Module) ─────────────
#[tauri::command]
pub fn get_chrono_strings(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_chrono_strings(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_chrono_string(chrono_string: Value, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::save_chrono_string(conn, chrono_string).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn delete_chrono_string(id: String, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::delete_chrono_string(conn, &id).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn get_target_analyses(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_target_analyses(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn add_target_analysis(target_analysis: Value, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::save_target_analysis(conn, target_analysis).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn delete_target_analysis(id: String, state: State<AppState>) -> Result<String, String> {
    state.with_db(|conn| InventoryStore::delete_target_analysis(conn, &id).map_err(|e| e.to_string()))
}

// ─── Module Data Direct Commands ──────────────────────────────────────────
#[tauri::command]
pub fn get_module_data(module_id: String, key: String) -> Result<Option<Value>, String> {
    crate::storage::ModuleDbManager::get_module_kv(&module_id, &key)
}

#[tauri::command]
pub fn set_module_data(module_id: String, key: String, value: Value) -> Result<bool, String> {
    crate::storage::ModuleDbManager::set_module_kv(&module_id, &key, &value)?;
    Ok(true)
}

// ─── Paired Companion Devices ─────────────────────────────────────────────
#[tauri::command]
pub fn get_paired_devices(state: State<AppState>) -> Result<Vec<Value>, String> {
    state.with_db(|conn| InventoryStore::get_paired_devices(conn).map_err(|e| e.to_string()))
}

#[tauri::command]
pub fn remove_paired_device(state: State<AppState>, id: String) -> Result<bool, String> {
    let res = state.with_db(|conn| InventoryStore::remove_paired_device(conn, &id).map_err(|e| e.to_string()))?;
    let _ = state.flush_vault();
    Ok(res)
}

#[tauri::command]
pub fn unpair_all_devices(state: State<AppState>) -> Result<bool, String> {
    let res = state.with_db(|conn| InventoryStore::unpair_all_devices(conn).map_err(|e| e.to_string()))?;
    let _ = state.flush_vault();
    Ok(res)
}

