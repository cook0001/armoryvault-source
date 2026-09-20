use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::{Adapter, Manager};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::time::Duration;
use tokio::time::sleep;
use uuid::Uuid;

// Standard ArmoryVault GATT Service and Characteristic UUIDs
pub const AV_SERVICE_UUID_STR: &str = "0000av01-0000-1000-8000-00805f9b34fb";
pub const AV_PAIR_CHAR_UUID_STR: &str = "0000av02-0000-1000-8000-00805f9b34fb";
pub const AV_SYNC_CHAR_UUID_STR: &str = "0000av03-0000-1000-8000-00805f9b34fb"; // Reserved for Option B

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredCompanion {
    pub id: String,
    pub name: String,
    pub rssi: Option<i16>,
    pub is_armoryvault: bool,
}

pub struct BleCentralManager;

impl BleCentralManager {
    /// Get the primary Bluetooth adapter, if available
    async fn get_adapter() -> Result<Adapter, String> {
        let manager = Manager::new()
            .await
            .map_err(|e| format!("Failed to initialize Bluetooth manager: {}", e))?;
        let adapters = manager
            .adapters()
            .await
            .map_err(|e| format!("Failed to get Bluetooth adapters: {}", e))?;

        adapters
            .into_iter()
            .next()
            .ok_or_else(|| "No Bluetooth adapter found on this system".to_string())
    }

    /// Check if a Bluetooth adapter is present and accessible
    pub async fn is_available() -> Result<bool, String> {
        match Self::get_adapter().await {
            Ok(_) => Ok(true),
            Err(_) => Ok(false),
        }
    }

    /// Scan for nearby Bluetooth devices advertising ArmoryVault Companion service
    pub async fn scan_companions(timeout_secs: u64) -> Result<Vec<DiscoveredCompanion>, String> {
        let adapter = Self::get_adapter().await?;

        let service_uuid = Uuid::parse_str(AV_SERVICE_UUID_STR)
            .map_err(|e| format!("Invalid AV service UUID: {}", e))?;

        // Start scanning with filter if supported, or open scan
        let filter = ScanFilter {
            services: vec![service_uuid],
        };

        // Fall back to scanning all nearby devices if service filter is unsupported by backend
        if adapter.start_scan(filter).await.is_err() {
            adapter
                .start_scan(ScanFilter::default())
                .await
                .map_err(|e| format!("Failed to start Bluetooth scan: {}", e))?;
        }

        let scan_duration = if timeout_secs == 0 || timeout_secs > 30 {
            5
        } else {
            timeout_secs
        };

        sleep(Duration::from_secs(scan_duration)).await;

        let peripherals = adapter
            .peripherals()
            .await
            .map_err(|e| format!("Failed to get discovered peripherals: {}", e))?;

        let mut discovered = Vec::new();

        for peripheral in peripherals {
            if let Ok(Some(props)) = peripheral.properties().await {
                let name = props
                    .local_name
                    .clone()
                    .unwrap_or_else(|| "Unknown Device".to_string());
                let has_av_service = props.services.contains(&service_uuid);
                let is_av_name = name.to_lowercase().contains("armoryvault")
                    || name.to_lowercase().contains("companion");

                if has_av_service || is_av_name {
                    discovered.push(DiscoveredCompanion {
                        id: peripheral.id().to_string(),
                        name,
                        rssi: props.rssi,
                        is_armoryvault: true,
                    });
                }
            }
        }

        // Stop scan to conserve battery and radio time
        let _ = adapter.stop_scan().await;

        // Sort strongest signal first (closest proximity)
        discovered.sort_by_key(|a| std::cmp::Reverse(a.rssi.unwrap_or(-100)));

        Ok(discovered)
    }

    /// Connect to a discovered companion, verify the 6-digit PIN, and transmit the pairing credentials
    pub async fn pair_companion(
        peripheral_id_str: &str,
        pin: &str,
        desktop_payload: Value,
    ) -> Result<Value, String> {
        let clean_pin = pin.trim();
        if clean_pin.len() != 6 || !clean_pin.chars().all(|c| c.is_ascii_digit()) {
            return Err("Pairing PIN must be exactly 6 numeric digits".to_string());
        }

        let adapter = Self::get_adapter().await?;
        let peripherals = adapter
            .peripherals()
            .await
            .map_err(|e| format!("Failed to query peripherals: {}", e))?;

        let target_peripheral = peripherals
            .into_iter()
            .find(|p| p.id().to_string() == peripheral_id_str)
            .ok_or_else(|| format!("Peripheral with ID '{}' not found", peripheral_id_str))?;

        // Connect with timeout
        target_peripheral
            .connect()
            .await
            .map_err(|e| format!("Failed to connect to Bluetooth peripheral: {}", e))?;

        // Discover services
        target_peripheral
            .discover_services()
            .await
            .map_err(|e| format!("Failed to discover GATT services: {}", e))?;

        let pair_char_uuid = Uuid::parse_str(AV_PAIR_CHAR_UUID_STR)
            .map_err(|e| format!("Invalid pair char UUID: {}", e))?;

        let chars = target_peripheral.characteristics();
        let pair_char = chars
            .iter()
            .find(|c| c.uuid == pair_char_uuid)
            .ok_or_else(|| {
                "ArmoryVault pairing characteristic not found on peripheral".to_string()
            })?;

        // Encrypt pairing payload using the 6-digit PIN as key derivation source
        let plaintext_bytes = serde_json::to_vec(&desktop_payload)
            .map_err(|e| format!("Failed to serialize desktop payload: {}", e))?;

        let encrypted_envelope = encrypt_with_pin(&plaintext_bytes, clean_pin)?;

        // Write encrypted envelope to characteristic
        target_peripheral
            .write(
                pair_char,
                &encrypted_envelope,
                btleplug::api::WriteType::WithResponse,
            )
            .await
            .map_err(|e| format!("Failed to write pairing payload to characteristic: {}", e))?;

        // Read confirmation response from peripheral
        let response_bytes = target_peripheral
            .read(pair_char)
            .await
            .map_err(|e| format!("Failed to read response from characteristic: {}", e))?;

        // Disconnect immediately (One-Shot Radio Timeout Protocol)
        let _ = target_peripheral.disconnect().await;

        let decrypted_response = decrypt_with_pin(&response_bytes, clean_pin)?;
        let response_val: Value = serde_json::from_slice(&decrypted_response)
            .map_err(|e| format!("Invalid JSON in companion response: {}", e))?;

        Ok(response_val)
    }
}

/// Derive a 256-bit AES key from the 6-digit PIN with a fixed salt
fn derive_key_from_pin(pin: &str) -> [u8; 32] {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(b"ArmoryVault-BLE-PIN-Salt-v1:");
    hasher.update(pin.as_bytes());
    let result = hasher.finalize();
    let mut key = [0u8; 32];
    key.copy_from_slice(&result);
    key
}

/// Encrypt data with AES-256-GCM using key derived from PIN
pub fn encrypt_with_pin(data: &[u8], pin: &str) -> Result<Vec<u8>, String> {
    use aes_gcm::aead::{Aead, KeyInit};
    use aes_gcm::{Aes256Gcm, Nonce};
    use rand::RngCore;

    let key = derive_key_from_pin(pin);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to initialize AES-GCM: {}", e))?;

    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, data)
        .map_err(|e| format!("Encryption error: {}", e))?;

    // Format: [12 bytes nonce] + [ciphertext + tag]
    let mut output = Vec::with_capacity(12 + ciphertext.len());
    output.extend_from_slice(&nonce_bytes);
    output.extend_from_slice(&ciphertext);

    Ok(output)
}

/// Decrypt data with AES-256-GCM using key derived from PIN
pub fn decrypt_with_pin(data: &[u8], pin: &str) -> Result<Vec<u8>, String> {
    use aes_gcm::aead::{Aead, KeyInit};
    use aes_gcm::{Aes256Gcm, Nonce};

    if data.len() < 12 + 16 {
        return Err("Payload too short for AES-GCM envelope".to_string());
    }

    let key = derive_key_from_pin(pin);
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| format!("Failed to initialize AES-GCM: {}", e))?;

    let nonce = Nonce::from_slice(&data[0..12]);
    let ciphertext = &data[12..];

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Decryption failed: incorrect PIN or corrupted data".to_string())?;

    Ok(plaintext)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_pin_encryption_decryption_roundtrip() {
        let pin = "492015";
        let message = b"{\"ip\":\"192.168.1.189\",\"port\":3456,\"token\":\"sec_tok_123\"}";

        let encrypted = encrypt_with_pin(message, pin).expect("encryption succeeds");
        assert_ne!(encrypted.as_slice(), message);

        let decrypted = decrypt_with_pin(&encrypted, pin).expect("decryption succeeds");
        assert_eq!(decrypted.as_slice(), message);
    }

    #[test]
    fn test_wrong_pin_fails_decryption() {
        let correct_pin = "123456";
        let wrong_pin = "654321";
        let message = b"sensitive_pairing_data";

        let encrypted = encrypt_with_pin(message, correct_pin).unwrap();
        let result = decrypt_with_pin(&encrypted, wrong_pin);
        assert!(result.is_err());
    }

    #[test]
    fn test_tampered_ciphertext_fails_decryption() {
        let pin = "998877";
        let message = b"armoryvault_secret";

        let mut encrypted = encrypt_with_pin(message, pin).unwrap();
        // Flip one byte in the ciphertext
        let len = encrypted.len();
        encrypted[len - 1] ^= 0xFF;

        let result = decrypt_with_pin(&encrypted, pin);
        assert!(result.is_err());
    }
}
