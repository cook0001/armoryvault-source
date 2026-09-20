use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use rand::RngCore;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

const PBKDF2_ROUNDS: u32 = 100_000;
const TOKEN_PBKDF2_ROUNDS: u32 = 2_000;
const KEY_LEN: usize = 32;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct VaultMeta {
    pub salt: String,
    pub iv: String,
    #[serde(rename = "authTag")]
    pub auth_tag: String,
    #[serde(rename = "encryptedMasterKey")]
    pub encrypted_master_key: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct EncryptedVaultFile {
    pub vault: VaultMeta,
    #[serde(rename = "dataIv")]
    pub data_iv: String,
    #[serde(rename = "dataAuthTag")]
    pub data_auth_tag: String,
    #[serde(rename = "encryptedData")]
    pub encrypted_data: String,
}

pub struct VaultCrypto {
    pub enc_path: PathBuf,
    pub master_key: Option<[u8; 32]>,
    pub vault_meta: Option<VaultMeta>,
}

impl VaultCrypto {
    pub fn new<P: AsRef<Path>>(enc_path: P) -> Self {
        Self {
            enc_path: enc_path.as_ref().to_path_buf(),
            master_key: None,
            vault_meta: None,
        }
    }

    pub fn is_vault_setup(&self) -> bool {
        self.enc_path.exists()
    }

    pub fn is_locked(&self) -> bool {
        self.master_key.is_none()
    }

    pub fn lock(&mut self) {
        self.master_key = None;
    }

    pub fn lock_vault(&mut self) {
        self.lock();
    }

    pub fn decrypt_vault(&self) -> Result<String, String> {
        self.decrypt_payload(&self.enc_path.clone())
    }

    pub fn get_recovery_code(&self) -> Option<String> {
        self.master_key.map(hex::encode)
    }

    /// Derives 32-byte key from password + salt via PBKDF2-HMAC-SHA256 with specific round count
    pub fn derive_key_with_rounds(password: &str, salt: &[u8], rounds: u32) -> [u8; 32] {
        let mut key = [0u8; KEY_LEN];
        pbkdf2::pbkdf2_hmac::<sha2::Sha256>(password.as_bytes(), salt, rounds, &mut key);
        key
    }

    /// Derives 32-byte key from password + salt via PBKDF2-HMAC-SHA256 (100,000 rounds for vault master key)
    pub fn derive_key(password: &str, salt: &[u8]) -> [u8; 32] {
        Self::derive_key_with_rounds(password, salt, PBKDF2_ROUNDS)
    }

    /// Initializes a new vault with password, returning the 64-character recovery code
    pub fn setup_vault(&mut self, password: &str, initial_json: &str) -> Result<String, String> {
        let mut rng = rand::thread_rng();

        let mut master_key = [0u8; 32];
        rng.fill_bytes(&mut master_key);
        let recovery_code = hex::encode(master_key);

        let mut salt = [0u8; 16];
        rng.fill_bytes(&mut salt);

        let derived_key = Self::derive_key(password, &salt);

        let mut iv = [0u8; 12];
        rng.fill_bytes(&mut iv);

        let cipher = Aes256Gcm::new_from_slice(&derived_key)
            .map_err(|e| format!("Cipher init error: {}", e))?;
        let nonce = Nonce::from_slice(&iv);

        let ciphertext_with_tag = cipher
            .encrypt(nonce, master_key.as_ref())
            .map_err(|e| format!("Encryption error: {}", e))?;

        let (encrypted_master_key, auth_tag) =
            ciphertext_with_tag.split_at(ciphertext_with_tag.len() - 16);

        let meta = VaultMeta {
            salt: hex::encode(salt),
            iv: hex::encode(iv),
            auth_tag: hex::encode(auth_tag),
            encrypted_master_key: hex::encode(encrypted_master_key),
        };

        // Encrypt initial payload
        let mut data_iv = [0u8; 12];
        rng.fill_bytes(&mut data_iv);

        let data_cipher = Aes256Gcm::new_from_slice(&master_key)
            .map_err(|e| format!("Data cipher error: {}", e))?;
        let data_nonce = Nonce::from_slice(&data_iv);

        let enc_data_with_tag = data_cipher
            .encrypt(data_nonce, initial_json.as_bytes())
            .map_err(|e| format!("Data encryption error: {}", e))?;

        let (encrypted_data, data_tag) = enc_data_with_tag.split_at(enc_data_with_tag.len() - 16);

        let vault_file = EncryptedVaultFile {
            vault: meta.clone(),
            data_iv: hex::encode(data_iv),
            data_auth_tag: hex::encode(data_tag),
            encrypted_data: hex::encode(encrypted_data),
        };

        let json_str = serde_json::to_string_pretty(&vault_file)
            .map_err(|e| format!("Serialization error: {}", e))?;

        if let Some(parent) = self.enc_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        fs::write(&self.enc_path, json_str).map_err(|e| e.to_string())?;

        self.master_key = Some(master_key);
        self.vault_meta = Some(meta);

        Ok(recovery_code)
    }

    /// Unlocks vault using master password
    pub fn unlock_vault(&mut self, password: &str) -> Result<String, String> {
        if !self.enc_path.exists() {
            return Err("Vault file does not exist".to_string());
        }

        let raw = fs::read_to_string(&self.enc_path).map_err(|e| e.to_string())?;
        let file_payload: EncryptedVaultFile =
            serde_json::from_str(&raw).map_err(|e| format!("Invalid vault file: {}", e))?;

        let salt = hex::decode(&file_payload.vault.salt).map_err(|e| e.to_string())?;
        let iv = hex::decode(&file_payload.vault.iv).map_err(|e| e.to_string())?;
        let auth_tag = hex::decode(&file_payload.vault.auth_tag).map_err(|e| e.to_string())?;
        let enc_mk = hex::decode(&file_payload.vault.encrypted_master_key).map_err(|e| e.to_string())?;

        let derived_key = Self::derive_key(password, &salt);
        let cipher = Aes256Gcm::new_from_slice(&derived_key).map_err(|e| e.to_string())?;
        let nonce = Nonce::from_slice(&iv);

        let mut combined_mk = enc_mk;
        combined_mk.extend_from_slice(&auth_tag);

        let decrypted_mk = cipher
            .decrypt(nonce, combined_mk.as_ref())
            .map_err(|_| "Incorrect master password".to_string())?;

        if decrypted_mk.len() != 32 {
            return Err("Decrypted master key length invalid".to_string());
        }

        let mut master_key = [0u8; 32];
        master_key.copy_from_slice(&decrypted_mk);

        // Decrypt data payload
        let data = Self::decrypt_data_payload(&file_payload, &master_key)?;

        self.master_key = Some(master_key);
        self.vault_meta = Some(file_payload.vault);

        Ok(data)
    }

    /// Unlocks vault with 64-character recovery code
    pub fn unlock_with_recovery_code(&mut self, code: &str) -> Result<String, String> {
        if !self.enc_path.exists() {
            return Err("Vault file does not exist".to_string());
        }

        let raw = fs::read_to_string(&self.enc_path).map_err(|e| e.to_string())?;
        let file_payload: EncryptedVaultFile =
            serde_json::from_str(&raw).map_err(|e| format!("Invalid vault file: {}", e))?;

        let key_bytes = hex::decode(code.trim()).map_err(|_| "Invalid recovery code format".to_string())?;
        if key_bytes.len() != 32 {
            return Err("Recovery code must be exactly 64 hex characters (32 bytes)".to_string());
        }

        let mut master_key = [0u8; 32];
        master_key.copy_from_slice(&key_bytes);

        let data = Self::decrypt_data_payload(&file_payload, &master_key)?;

        self.master_key = Some(master_key);
        self.vault_meta = Some(file_payload.vault);

        Ok(data)
    }

    fn decrypt_data_payload(
        file_payload: &EncryptedVaultFile,
        master_key: &[u8; 32],
    ) -> Result<String, String> {
        let data_iv = hex::decode(&file_payload.data_iv).map_err(|e| e.to_string())?;
        let data_tag = hex::decode(&file_payload.data_auth_tag).map_err(|e| e.to_string())?;
        let enc_data = hex::decode(&file_payload.encrypted_data).map_err(|e| e.to_string())?;

        let cipher = Aes256Gcm::new_from_slice(master_key).map_err(|e| e.to_string())?;
        let nonce = Nonce::from_slice(&data_iv);

        let mut combined_data = enc_data;
        combined_data.extend_from_slice(&data_tag);

        let decrypted = cipher
            .decrypt(nonce, combined_data.as_ref())
            .map_err(|_| "Failed to decrypt vault data payload".to_string())?;

        String::from_utf8(decrypted).map_err(|e| format!("UTF-8 decode error: {}", e))
    }

    /// Updates vault password and optionally rolls the 64-character recovery code
    pub fn change_password(
        &mut self,
        current_password: &str,
        new_password: &str,
        regenerate_recovery_key: bool,
    ) -> Result<Option<String>, String> {
        let current_data = self.unlock_vault(current_password)?;

        let mut rng = rand::thread_rng();
        let master_key = if regenerate_recovery_key {
            let mut mk = [0u8; 32];
            rng.fill_bytes(&mut mk);
            mk
        } else {
            self.master_key.ok_or_else(|| "Vault must be unlocked".to_string())?
        };

        let mut salt = [0u8; 16];
        rng.fill_bytes(&mut salt);
        let derived_key = Self::derive_key(new_password, &salt);

        let mut iv = [0u8; 12];
        rng.fill_bytes(&mut iv);

        let cipher = Aes256Gcm::new_from_slice(&derived_key).map_err(|e| e.to_string())?;
        let nonce = Nonce::from_slice(&iv);

        let ciphertext_with_tag = cipher
            .encrypt(nonce, master_key.as_ref())
            .map_err(|e| e.to_string())?;

        let (encrypted_master_key, auth_tag) =
            ciphertext_with_tag.split_at(ciphertext_with_tag.len() - 16);

        let meta = VaultMeta {
            salt: hex::encode(salt),
            iv: hex::encode(iv),
            auth_tag: hex::encode(auth_tag),
            encrypted_master_key: hex::encode(encrypted_master_key),
        };

        // Re-encrypt payload with master key
        let mut data_iv = [0u8; 12];
        rng.fill_bytes(&mut data_iv);

        let data_cipher = Aes256Gcm::new_from_slice(&master_key).map_err(|e| e.to_string())?;
        let data_nonce = Nonce::from_slice(&data_iv);

        let enc_data_with_tag = data_cipher
            .encrypt(data_nonce, current_data.as_bytes())
            .map_err(|e| e.to_string())?;

        let (encrypted_data, data_tag) = enc_data_with_tag.split_at(enc_data_with_tag.len() - 16);

        let vault_file = EncryptedVaultFile {
            vault: meta.clone(),
            data_iv: hex::encode(data_iv),
            data_auth_tag: hex::encode(data_tag),
            encrypted_data: hex::encode(encrypted_data),
        };

        let json_str = serde_json::to_string_pretty(&vault_file).map_err(|e| e.to_string())?;
        fs::write(&self.enc_path, json_str).map_err(|e| e.to_string())?;

        self.master_key = Some(master_key);
        self.vault_meta = Some(meta);

        if regenerate_recovery_key {
            Ok(Some(hex::encode(master_key)))
        } else {
            Ok(None)
        }
    }

    /// Regenerates recovery key using current password verification
    pub fn regenerate_recovery_key(&mut self, current_password: &str) -> Result<String, String> {
        self.change_password(current_password, current_password, true)?
            .ok_or_else(|| "Failed to generate new recovery code".to_string())
    }

    /// Generic atomic encryption routine for any target .enc file using the active master key
    pub fn encrypt_payload(&self, target_path: &Path, json_payload: &str) -> Result<(), String> {
        let master_key = self
            .master_key
            .ok_or_else(|| "Cannot encrypt: vault is locked or master key is missing".to_string())?;
        let meta = self
            .vault_meta
            .as_ref()
            .ok_or_else(|| "Cannot encrypt: vault metadata is missing".to_string())?;

        let mut rng = rand::thread_rng();
        let mut data_iv = [0u8; 12];
        rng.fill_bytes(&mut data_iv);

        let data_cipher = Aes256Gcm::new_from_slice(&master_key)
            .map_err(|e| format!("Data cipher error: {}", e))?;
        let data_nonce = Nonce::from_slice(&data_iv);

        let enc_data_with_tag = data_cipher
            .encrypt(data_nonce, json_payload.as_bytes())
            .map_err(|e| format!("Data encryption error: {}", e))?;

        let (encrypted_data, data_tag) = enc_data_with_tag.split_at(enc_data_with_tag.len() - 16);

        let vault_file = EncryptedVaultFile {
            vault: meta.clone(),
            data_iv: hex::encode(data_iv),
            data_auth_tag: hex::encode(data_tag),
            encrypted_data: hex::encode(encrypted_data),
        };

        let json_str = serde_json::to_string_pretty(&vault_file)
            .map_err(|e| format!("Serialization error: {}", e))?;

        if let Some(parent) = target_path.parent() {
            fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }

        // Atomic write: write to temporary file, flush, then rename
        let tmp_path = target_path.with_extension(format!("tmp.{}", rand::random::<u32>()));
        fs::write(&tmp_path, json_str).map_err(|e| e.to_string())?;
        fs::rename(&tmp_path, target_path).map_err(|e| e.to_string())?;

        Ok(())
    }

    /// Decrypts any target .enc file using the currently active in-memory master key
    pub fn decrypt_payload(&self, target_path: &Path) -> Result<String, String> {
        let master_key = self
            .master_key
            .ok_or_else(|| "Cannot decrypt: vault is locked".to_string())?;

        if !target_path.exists() {
            return Err(format!("File does not exist: {}", target_path.display()));
        }

        let raw = fs::read_to_string(target_path).map_err(|e| e.to_string())?;
        let file_payload: EncryptedVaultFile =
            serde_json::from_str(&raw).map_err(|e| format!("Invalid vault format in {}: {}", target_path.display(), e))?;

        Self::decrypt_data_payload(&file_payload, &master_key)
    }

    /// Flushes the core firearms vault payload back to firearms_inventory.enc
    pub fn encrypt_vault(&self, data_json: &str) -> Result<(), String> {
        self.encrypt_payload(&self.enc_path, data_json)
    }

    /// Flushes activity audit logs back to activity_log.enc
    pub fn encrypt_activity_log(&self, log_json: &str) -> Result<(), String> {
        let path = crate::storage::AppPaths::get_activity_log_enc_path();
        self.encrypt_payload(&path, log_json)
    }

    /// Flushes custom SKUs dictionary back to skus_database.enc
    pub fn encrypt_skus(&self, skus_json: &str) -> Result<(), String> {
        let path = crate::storage::AppPaths::get_skus_enc_path();
        self.encrypt_payload(&path, skus_json)
    }

    /// Decrypts activity_log.enc if it exists
    pub fn decrypt_activity_log(&self) -> Result<Option<String>, String> {
        let path = crate::storage::AppPaths::get_activity_log_enc_path();
        if path.exists() {
            self.decrypt_payload(&path).map(Some)
        } else {
            Ok(None)
        }
    }

    /// Decrypts skus_database.enc if it exists
    pub fn decrypt_skus(&self) -> Result<Option<String>, String> {
        let path = crate::storage::AppPaths::get_skus_enc_path();
        if path.exists() {
            self.decrypt_payload(&path).map(Some)
        } else {
            Ok(None)
        }
    }
}

/// Encrypts an arbitrary string payload using token + PBKDF2-HMAC-SHA256 + AES-256-GCM.
/// Formats as an authenticated `armoryvault_encrypted_payload` envelope matching Mobile WebCrypto.
pub fn encrypt_with_token(plaintext: &str, token: &str) -> Result<serde_json::Value, String> {
    let mut rng = rand::thread_rng();

    let mut salt = [0u8; 16];
    rng.fill_bytes(&mut salt);

    let derived_key = VaultCrypto::derive_key_with_rounds(token, &salt, TOKEN_PBKDF2_ROUNDS);

    let mut iv = [0u8; 12];
    rng.fill_bytes(&mut iv);

    let cipher = Aes256Gcm::new_from_slice(&derived_key)
        .map_err(|e| format!("Cipher init error: {}", e))?;
    let nonce = Nonce::from_slice(&iv);

    let ciphertext_with_tag = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption error: {}", e))?;

    let now_iso = chrono::Utc::now().to_rfc3339();

    Ok(serde_json::json!({
        "format": "armoryvault_encrypted_payload",
        "version": "1.0.0",
        "created_at": now_iso,
        "encryption": {
            "algorithm": "AES-256-GCM",
            "kdf": "PBKDF2",
            "iterations": TOKEN_PBKDF2_ROUNDS,
            "salt": hex::encode(salt),
            "iv": hex::encode(iv),
            "auth_tag_length_bits": 128
        },
        "ciphertext": hex::encode(ciphertext_with_tag)
    }))
}

/// Helper to decode a string that may be encoded as base64 (Standard, URL-safe, padded or unpadded).
pub fn decode_base64_variants(s: &str) -> Result<Vec<u8>, String> {
    let trimmed = s.trim();
    base64::Engine::decode(&base64::engine::general_purpose::STANDARD, trimmed)
        .or_else(|_| base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE, trimmed))
        .or_else(|_| base64::Engine::decode(&base64::engine::general_purpose::STANDARD_NO_PAD, trimmed))
        .or_else(|_| base64::Engine::decode(&base64::engine::general_purpose::URL_SAFE_NO_PAD, trimmed))
        .map_err(|e| format!("Base64 decode error: {}", e))
}

/// Helper to decode a string that may be encoded as either hex or base64.
#[allow(clippy::manual_is_multiple_of)]
pub fn decode_hex_or_base64(s: &str) -> Result<Vec<u8>, String> {
    let trimmed = s.trim();
    if trimmed.len() % 2 == 0 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        if let Ok(bytes) = hex::decode(trimmed) {
            return Ok(bytes);
        }
    }
    decode_base64_variants(trimmed)
}

/// Decrypts an authenticated `armoryvault_encrypted_payload` envelope using token + PBKDF2 + AES-256-GCM.
/// Fully compatible with both:
/// 1. Mobile Companion envelopes: Base64 ciphertext + separate 16-byte auth_tag in encryption metadata.
/// 2. Desktop Rust envelopes: Hex ciphertext with 16-byte auth tag embedded directly at the end.
pub fn decrypt_with_token(envelope: &serde_json::Value, token: &str) -> Result<String, String> {
    let enc_meta = envelope
        .get("encryption")
        .ok_or_else(|| "Missing 'encryption' object in envelope".to_string())?;

    let algo = enc_meta
        .get("algorithm")
        .and_then(|v| v.as_str())
        .unwrap_or("");
    if algo != "AES-256-GCM" {
        return Err(format!("Unsupported algorithm in envelope: {}", algo));
    }

    let salt_str = enc_meta
        .get("salt")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing salt in encryption metadata".to_string())?;
    let iv_str = enc_meta
        .get("iv")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing iv in encryption metadata".to_string())?;
    let ciphertext_str = envelope
        .get("ciphertext")
        .and_then(|v| v.as_str())
        .ok_or_else(|| "Missing ciphertext in envelope".to_string())?;

    let salt = decode_hex_or_base64(salt_str)
        .map_err(|e| format!("Invalid salt encoding: {}", e))?;
    let iv = decode_hex_or_base64(iv_str)
        .map_err(|e| format!("Invalid iv encoding: {}", e))?;

    if iv.len() != 12 {
        return Err(format!("Invalid IV length: expected 12 bytes, got {}", iv.len()));
    }

    // Check if auth_tag is provided separately in encryption metadata or top-level envelope
    let maybe_auth_tag_str = enc_meta
        .get("auth_tag")
        .or_else(|| enc_meta.get("authTag"))
        .or_else(|| enc_meta.get("tag"))
        .or_else(|| envelope.get("auth_tag"))
        .or_else(|| envelope.get("authTag"))
        .or_else(|| envelope.get("tag"))
        .and_then(|v| v.as_str());

    let maybe_auth_tag = match maybe_auth_tag_str {
        Some(tag_str) => Some(
            decode_hex_or_base64(tag_str)
                .map_err(|e| format!("Invalid auth tag encoding: {}", e))?,
        ),
        None => None,
    };

    let iterations = enc_meta
        .get("iterations")
        .and_then(|v| v.as_u64())
        .map(|v| v as u32)
        .unwrap_or(TOKEN_PBKDF2_ROUNDS);

    let derived_key = VaultCrypto::derive_key_with_rounds(token, &salt, iterations);
    let cipher = Aes256Gcm::new_from_slice(&derived_key)
        .map_err(|e| format!("Cipher init error: {}", e))?;
    let nonce = Nonce::from_slice(&iv);

    // Build candidate ciphertext slices (with 16-byte auth tag appended for Aes256Gcm)
    let mut candidates: Vec<Vec<u8>> = Vec::new();

    if let Some(ref tag) = maybe_auth_tag {
        // Mobile Companion format: separate auth tag, ciphertext is typically Base64
        if let Ok(mut bytes) = decode_base64_variants(ciphertext_str) {
            bytes.extend_from_slice(tag);
            candidates.push(bytes);
        }
        // Fallback: Hex-encoded ciphertext with separate tag
        if let Ok(mut bytes) = hex::decode(ciphertext_str.trim()) {
            bytes.extend_from_slice(tag);
            candidates.push(bytes);
        }
    } else {
        // Desktop Rust format: tag embedded at end of ciphertext, typically Hex encoded
        if let Ok(bytes) = hex::decode(ciphertext_str.trim()) {
            candidates.push(bytes);
        }
        // Fallback: Base64-encoded ciphertext with embedded tag
        if let Ok(bytes) = decode_base64_variants(ciphertext_str) {
            candidates.push(bytes);
        }
    }

    if candidates.is_empty() {
        return Err("Failed to decode ciphertext: not valid hex or base64".to_string());
    }

    let mut last_error = "Decryption authentication failed".to_string();
    for ct_with_tag in candidates {
        if ct_with_tag.len() < 16 {
            continue;
        }
        match cipher.decrypt(nonce, ct_with_tag.as_slice()) {
            Ok(decrypted_bytes) => {
                return String::from_utf8(decrypted_bytes)
                    .map_err(|e| format!("UTF-8 decode error: {}", e));
            }
            Err(e) => {
                last_error = format!("Decryption authentication failed: {}", e);
            }
        }
    }

    Err(last_error)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_token_encryption_roundtrip() {
        let token = "test-lan-pairing-token-abc123xyz";
        let plaintext = r#"{"firearms":[{"make":"Glock","model":"19 Gen 5"}],"count":50}"#;

        let envelope = encrypt_with_token(plaintext, token).expect("Encryption failed");
        assert_eq!(
            envelope.get("format").and_then(|v| v.as_str()),
            Some("armoryvault_encrypted_payload")
        );

        let decrypted = decrypt_with_token(&envelope, token).expect("Decryption failed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_token_decryption_with_wrong_key_fails() {
        let token = "correct-key-123";
        let wrong_token = "wrong-key-456";
        let plaintext = "secret firearm data";

        let envelope = encrypt_with_token(plaintext, token).expect("Encryption failed");
        let result = decrypt_with_token(&envelope, wrong_token);
        assert!(result.is_err());
    }

    #[test]
    fn test_token_decryption_tampered_ciphertext_fails() {
        let token = "my-secure-token";
        let plaintext = "tamper test payload";

        let mut envelope = encrypt_with_token(plaintext, token).expect("Encryption failed");
        // Tamper with the ciphertext hex string
        if let Some(ct) = envelope.get_mut("ciphertext") {
            *ct = serde_json::json!("ffffffffdeadbeef1234");
        }

        let result = decrypt_with_token(&envelope, token);
        assert!(result.is_err());
    }

    #[test]
    fn test_decrypt_mobile_format_envelope() {
        let token = "test-mobile-token-abc123";
        let plaintext = r#"{"items":[{"type":"firearm","make":"Sig Sauer","model":"P365"}]}"#;

        let salt = [42u8; 16];
        let iv = [7u8; 12];
        let iterations = 1000u32;
        let derived_key = VaultCrypto::derive_key_with_rounds(token, &salt, iterations);

        let cipher = Aes256Gcm::new_from_slice(&derived_key).unwrap();
        let nonce = Nonce::from_slice(&iv);
        let ct_with_tag = cipher.encrypt(nonce, plaintext.as_bytes()).unwrap();

        let (ct_bytes, tag_bytes) = ct_with_tag.split_at(ct_with_tag.len() - 16);
        let ct_base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, ct_bytes);
        let tag_hex = hex::encode(tag_bytes);

        let mobile_envelope = serde_json::json!({
            "format": "armoryvault_encrypted_payload",
            "version": "1.0.0",
            "encryption": {
                "algorithm": "AES-256-GCM",
                "kdf": "PBKDF2-HMAC-SHA256",
                "salt": hex::encode(salt),
                "iterations": iterations,
                "iv": hex::encode(iv),
                "auth_tag": tag_hex
            },
            "ciphertext": ct_base64
        });

        let decrypted = decrypt_with_token(&mobile_envelope, token).expect("Mobile envelope decryption failed");
        assert_eq!(decrypted, plaintext);
    }

    #[test]
    fn test_decrypt_mobile_format_with_plus_and_slash() {
        let token = "token-test-xyz";
        let plaintext = r#"{"test":"special chars >>> ??? &&& +++ /// ~~~"}"#;

        let salt = [99u8; 16];
        let iv = [12u8; 12];
        let iterations = 1000u32;
        let derived_key = VaultCrypto::derive_key_with_rounds(token, &salt, iterations);

        let cipher = Aes256Gcm::new_from_slice(&derived_key).unwrap();
        let nonce = Nonce::from_slice(&iv);
        let ct_with_tag = cipher.encrypt(nonce, plaintext.as_bytes()).unwrap();

        let (ct_bytes, tag_bytes) = ct_with_tag.split_at(ct_with_tag.len() - 16);
        let ct_base64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, ct_bytes);
        let tag_hex = hex::encode(tag_bytes);

        let mobile_envelope = serde_json::json!({
            "format": "armoryvault_encrypted_payload",
            "version": "1.0.0",
            "encryption": {
                "algorithm": "AES-256-GCM",
                "kdf": "PBKDF2-HMAC-SHA256",
                "salt": hex::encode(salt),
                "iterations": iterations,
                "iv": hex::encode(iv),
                "auth_tag": tag_hex
            },
            "ciphertext": ct_base64
        });

        let decrypted = decrypt_with_token(&mobile_envelope, token).expect("Decryption with base64 special chars failed");
        assert_eq!(decrypted, plaintext);
    }
}

