use crate::bluetooth::{BleCentralManager, DiscoveredCompanion};
use crate::commands::vault_commands::AppState;
use crate::storage::InventoryStore;
use serde_json::{json, Value};
use tauri::{AppHandle, Emitter, State};

/// Check if Bluetooth hardware is available on the system
#[tauri::command]
pub async fn is_bluetooth_available() -> Result<bool, String> {
    BleCentralManager::is_available().await
}

/// Scan for nearby Bluetooth devices advertising ArmoryVault service
#[tauri::command]
pub async fn scan_ble_companions(timeout_secs: Option<u64>) -> Result<Vec<DiscoveredCompanion>, String> {
    BleCentralManager::scan_companions(timeout_secs.unwrap_or(5)).await
}

/// Connect to a discovered companion, verify the 6-digit PIN, and register pairing
#[tauri::command]
pub async fn pair_ble_companion(
    peripheral_id: String,
    pin: String,
    state: State<'_, AppState>,
    app_handle: AppHandle,
) -> Result<Value, String> {
    // 1. Gather desktop connection metadata
    let local_ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());
    let port = 3456;
    let token = crate::commands::vault_commands::get_pairing_token(state.clone());
    let hostname = std::env::var("HOSTNAME")
        .or_else(|_| std::env::var("HOST"))
        .unwrap_or_else(|_| "Desktop".to_string());

    let desktop_payload = json!({
        "ip": local_ip,
        "port": port,
        "token": token,
        "host": hostname,
        "fallbacks": [local_ip.clone(), "127.0.0.1".to_string()],
        "timestamp": chrono::Utc::now().to_rfc3339(),
    });

    // 2. Perform encrypted BLE handshake
    let companion_res = BleCentralManager::pair_companion(&peripheral_id, &pin, desktop_payload).await?;

    // 3. Extract companion device metadata
    let device_id = companion_res
        .get("deviceId")
        .and_then(|v| v.as_str())
        .unwrap_or(&peripheral_id);
    let device_name = companion_res
        .get("deviceName")
        .and_then(|v| v.as_str())
        .unwrap_or("Mobile Companion");
    let device_type = companion_res
        .get("deviceType")
        .and_then(|v| v.as_str())
        .unwrap_or("Mobile");
    let companion_key = companion_res
        .get("deviceKey")
        .or_else(|| companion_res.get("passphrase"))
        .and_then(|v| v.as_str());

    // 4. Register in SQLite paired_devices
    let is_new = state.with_db(|conn| {
        InventoryStore::upsert_paired_device(
            conn,
            device_id,
            device_name,
            device_type,
            &local_ip,
            Some(&token),
            companion_key,
        )
        .map_err(|e| e.to_string())
    })?;

    state.flush_vault()?;

    // 5. Emit real-time event to Tauri frontend
    let _ = app_handle.emit(
        "device-paired",
        json!({
            "id": device_id,
            "deviceName": device_name,
            "deviceType": device_type,
            "ipAddress": local_ip,
            "isNew": is_new,
            "pairingMethod": "bluetooth",
        }),
    );

    Ok(json!({
        "success": true,
        "deviceId": device_id,
        "deviceName": device_name,
        "isNew": is_new,
    }))
}
