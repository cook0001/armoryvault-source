pub mod bluetooth;
pub mod commands;
pub mod crypto;
pub mod server;
pub mod storage;

use commands::*;
use storage::AppPaths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Prepare state with vault crypto and in-memory database store
    let enc_path = AppPaths::get_legacy_enc_path();
    let initial_state = AppState::new(enc_path);

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .register_uri_scheme_protocol("local-file", |_ctx, req| {
            storage::LocalFileProtocol::handle_request(req)
        })
        .manage(initial_state)
        .setup(|app| {
            // Enable default macOS Edit/Window menu for standard shortcuts (Cmd+C, Cmd+V, Cmd+A, Cmd+Z, Cmd+Q)
            #[cfg(target_os = "macos")]
            {
                use tauri::menu::Menu;
                let menu = Menu::default(app.handle())?;
                app.set_menu(menu)?;
            }

            // Start background LAN sync server on ports 3456 (primary standard) and 5174 (fallback) for Mobile Companion App
            let app_handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                server::CompanionServer::run(app_handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Vault & Authentication
            is_vault_setup,
            is_vault_locked,
            setup_vault,
            unlock_vault,
            unlock_with_recovery_code,
            change_password,
            regenerate_recovery_key,
            lock_vault,
            get_recovery_code,
            get_pairing_token,
            revoke_pairing_token,
            get_pairing_info,

            // Firearms
            get_firearms,
            add_firearm,
            update_firearm,
            delete_firearm,

            // Ammunition
            get_ammo,
            add_ammo,
            update_ammo,
            delete_ammo,

            // Accessories
            get_accessories,
            add_accessory,
            update_accessory,
            delete_accessory,

            // Components
            get_components,
            add_component,
            update_component,
            delete_component,

            // Custom SKUs Catalog
            get_skus,
            save_skus,
            delete_sku,
            export_skus_catalog,
            import_skus_catalog,

            // Storage Locations
            get_storage_locations,
            add_storage_location,
            update_storage_location,
            delete_storage_location,

            // Sync Queue (Companion App)
            get_sync_queue,
            remove_sync_item,
            clear_sync_queue,
            reject_sync_item,
            get_rejected_syncs,
            confirm_rejected_syncs,
            get_paired_devices,
            get_paired_device_keys,
            remove_paired_device,
            unpair_all_devices,

            // Bluetooth LE Pairing
            is_bluetooth_available,
            scan_ble_companions,
            pair_ble_companion,

            // Chronograph & Target Analyses
            get_chrono_strings,
            add_chrono_string,
            delete_chrono_string,
            get_target_analyses,
            add_target_analysis,
            delete_target_analysis,

            // Activity Log
            get_activity_log,

            // Network & System Info
            get_local_ip,
            get_all_local_ips,
            lookup_upc,

            // Media & Documents
            save_base64_photo,
            save_base64_document,
            save_photo,
            save_document,
            select_and_save_photo,
            select_and_save_document,
            select_csv_file,
            save_qr_image,
            open_external_file,
            open_url,
            read_file_base64,
            read_file_buffer,

            // Backups & Archival
            get_backup_folder,
            select_backup_folder,
            create_zip_backup,
            restore_backup,
            import_database,

            // PDF / Typst Reports
            generate_work_order,
            generate_armory_binder,
            generate_bill_of_sale,
            generate_insurance_report,

            // Maintenance & Range Telemetry
            complete_maintenance_task,
            log_range_session,
            get_custom_schedule_presets,
            save_custom_schedule_presets,

            // Batch Imports
            import_firearms_batch,
            import_ammo_batch,
            import_accessories_batch,
            import_components_batch,

            // Config & Key-Value
            get_config,
            set_config,
            get_module_data,
            set_module_data,

            // Ballistics & Reloading Extensions
            get_ballistic_profiles,
            add_ballistic_profile,
            update_ballistic_profile,
            delete_ballistic_profile,
            get_load_ladder_tests,
            add_load_ladder_test,
            update_load_ladder_test,
            delete_load_ladder_test,
            manufacture_handload_batch
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
