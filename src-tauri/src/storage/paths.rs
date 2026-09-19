use std::fs;
use std::path::PathBuf;

pub struct AppPaths;

impl AppPaths {
    /// Discovers or creates the application data directory.
    /// Checks for legacy Electron data directory first so existing user vaults
    /// and photos load without manual intervention.
    pub fn get_app_data_dir() -> PathBuf {
        #[cfg(target_os = "macos")]
        {
            if let Some(home) = dirs::home_dir() {
                let legacy = home.join("Library/Application Support/ArmoryVault");
                if legacy.exists() {
                    return legacy;
                }
                let tauri_default = home.join("Library/Application Support/com.armoryvault.desktop");
                if tauri_default.exists() {
                    return tauri_default;
                }
                // Default to legacy folder for seamless compatibility
                let _ = fs::create_dir_all(&legacy);
                return legacy;
            }
        }

        #[cfg(target_os = "windows")]
        {
            if let Some(roaming) = dirs::config_dir() {
                let legacy = roaming.join("ArmoryVault");
                if legacy.exists() {
                    return legacy;
                }
                let _ = fs::create_dir_all(&legacy);
                return legacy;
            }
        }

        #[cfg(target_os = "linux")]
        {
            if let Some(data) = dirs::data_dir() {
                let legacy = data.join("armoryvault");
                let _ = fs::create_dir_all(&legacy);
                return legacy;
            }
        }

        PathBuf::from("./armoryvault_data")
    }

    pub fn get_legacy_enc_path() -> PathBuf {
        Self::get_app_data_dir().join("firearms_inventory.enc")
    }

    pub fn get_activity_log_enc_path() -> PathBuf {
        Self::get_app_data_dir().join("activity_log.enc")
    }

    pub fn get_skus_enc_path() -> PathBuf {
        Self::get_app_data_dir().join("skus_database.enc")
    }

    pub fn get_sqlite_path() -> PathBuf {
        Self::get_app_data_dir().join("armoryvault.sqlite")
    }

    pub fn get_photos_dir() -> PathBuf {
        let dir = Self::get_app_data_dir().join("photos");
        let _ = fs::create_dir_all(&dir);
        dir
    }

    pub fn get_documents_dir() -> PathBuf {
        let dir = Self::get_app_data_dir().join("documents");
        let _ = fs::create_dir_all(&dir);
        dir
    }

    pub fn get_module_data_dir() -> PathBuf {
        let dir = Self::get_app_data_dir().join("module_data");
        let _ = fs::create_dir_all(&dir);
        dir
    }

    pub fn get_module_sqlite_path(module_id: &str) -> PathBuf {
        Self::get_module_data_dir().join(format!("{}.sqlite", module_id))
    }
}

