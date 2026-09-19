import { invoke, isTauri } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open as openDialog, save as saveDialog } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { platform as getOsPlatform } from '@tauri-apps/plugin-os';
import { writeText as copyToClipboard } from '@tauri-apps/plugin-clipboard-manager';
import { setupMockBackend } from '../mockBackend';
import { buildWorkOrderHtml } from '../utils/workOrderExporter';
import type {
  Accessory,
  Ammo,
  CustomSkuDatabase,
  Firearm,
  PairedDevice,
  ReloadingComponent,
} from '../types';

/**
 * Initializes the API bridge for Tauri desktop execution.
 * When running inside a native Tauri window, native Tauri commands (invoke)
 * and plugins are called. Any methods still pending native implementation
 * gracefully fall back to the mock storage layer so the entire UI remains functional.
 */
export async function setupDesktopBridge(): Promise<void> {
  // If window.api is already provided (e.g. Electron preload), do nothing
  if (typeof window === 'undefined' || window.api) {
    return;
  }

  // First initialize standard fallback implementations
  setupMockBackend();
  const fallbackApi = (window.api || {}) as NonNullable<Window['api']>;

  if (isTauri()) {
    console.log('[TauriBridge] Native Tauri runtime detected. Attaching native commands.');

    window.api = {
      ...fallbackApi,

      // Core system / platform info
      getPlatform: () => {
        try {
          const os = getOsPlatform();
          return os === 'macos' ? 'darwin' : os === 'windows' ? 'win32' : 'linux';
        } catch {
          return 'darwin';
        }
      },

      // Vault / Authentication
      isVaultSetup: async () => {
        try {
          return await invoke<boolean>('is_vault_setup');
        } catch {
          return fallbackApi.isVaultSetup();
        }
      },
      isVaultLocked: async () => {
        try {
          return await invoke<boolean>('is_vault_locked');
        } catch {
          return fallbackApi.isVaultLocked();
        }
      },
      setupVault: async (password: string) => {
        try {
          return await invoke<string>('setup_vault', { password });
        } catch {
          return fallbackApi.setupVault(password);
        }
      },
      unlockVault: async (password: string) => {
        try {
          return await invoke<boolean>('unlock_vault', { password });
        } catch {
          return fallbackApi.unlockVault(password);
        }
      },
      unlockWithRecoveryCode: async (code: string) => {
        try {
          return await invoke<boolean>('unlock_with_recovery_code', { code });
        } catch {
          return fallbackApi.unlockWithRecoveryCode(code);
        }
      },
      lockVault: async () => {
        try {
          await invoke('lock_vault');
        } catch {
          await fallbackApi.lockVault();
        }
      },
      getRecoveryCode: async () => {
        try {
          return await invoke<string | null>('get_recovery_code');
        } catch {
          return fallbackApi.getRecoveryCode();
        }
      },
      changePassword: async (
        currentPassword: string,
        newPassword: string,
        regenerateRecoveryKey?: boolean
      ) => {
        try {
          return await invoke<any>('change_password', {
            currentPassword,
            newPassword,
            regenerateRecoveryKey: Boolean(regenerateRecoveryKey),
          });
        } catch (err: any) {
          console.error('[TauriBridge] change_password error:', err);
          return { success: false, error: err?.message || String(err) };
        }
      },
      regenerateRecoveryKey: async (currentPassword: string) => {
        try {
          return await invoke<any>('regenerate_recovery_key', { currentPassword });
        } catch (err: any) {
          console.error('[TauriBridge] regenerate_recovery_key error:', err);
          return { success: false, error: err?.message || String(err) };
        }
      },

      // Firearms CRUD
      getFirearms: async () => {
        try {
          return await invoke<Firearm[]>('get_firearms');
        } catch {
          return fallbackApi.getFirearms();
        }
      },
      addFirearm: async (firearm: Firearm) => {
        try {
          return await invoke<number>('add_firearm', { firearm });
        } catch {
          return fallbackApi.addFirearm(firearm);
        }
      },
      updateFirearm: async (id: number, firearm: Firearm) => {
        try {
          return await invoke<number>('update_firearm', { id, firearm });
        } catch {
          return fallbackApi.updateFirearm(id, firearm);
        }
      },
      deleteFirearm: async (id: number) => {
        try {
          return await invoke<number>('delete_firearm', { id });
        } catch {
          return fallbackApi.deleteFirearm(id);
        }
      },

      // Ammunition CRUD
      getAmmo: async () => {
        try {
          return await invoke<Ammo[]>('get_ammo');
        } catch {
          return fallbackApi.getAmmo();
        }
      },
      addAmmo: async (ammo: Ammo) => {
        try {
          return await invoke<number>('add_ammo', { ammo });
        } catch {
          return fallbackApi.addAmmo(ammo);
        }
      },
      updateAmmo: async (id: number, ammo: Ammo) => {
        try {
          return await invoke<number>('update_ammo', { id, ammo });
        } catch {
          return fallbackApi.updateAmmo(id, ammo);
        }
      },
      deleteAmmo: async (id: number) => {
        try {
          return await invoke<number>('delete_ammo', { id });
        } catch {
          return fallbackApi.deleteAmmo(id);
        }
      },

      // Accessories CRUD
      getAccessories: async () => {
        try {
          return await invoke<Accessory[]>('get_accessories');
        } catch {
          return fallbackApi.getAccessories();
        }
      },
      addAccessory: async (accessory: Accessory) => {
        try {
          return await invoke<number>('add_accessory', { accessory });
        } catch {
          return fallbackApi.addAccessory(accessory);
        }
      },
      updateAccessory: async (id: number, accessory: Accessory) => {
        try {
          return await invoke<number>('update_accessory', { id, accessory });
        } catch {
          return fallbackApi.updateAccessory(id, accessory);
        }
      },
      deleteAccessory: async (id: number) => {
        try {
          return await invoke<number>('delete_accessory', { id });
        } catch {
          return fallbackApi.deleteAccessory(id);
        }
      },

      // Reloading Components CRUD
      getComponents: async () => {
        try {
          return await invoke<ReloadingComponent[]>('get_components');
        } catch {
          return fallbackApi.getComponents();
        }
      },
      addComponent: async (component: ReloadingComponent) => {
        try {
          return await invoke<number>('add_component', { component });
        } catch {
          return fallbackApi.addComponent(component);
        }
      },
      updateComponent: async (id: number, component: ReloadingComponent) => {
        try {
          return await invoke<number>('update_component', { id, component });
        } catch {
          return fallbackApi.updateComponent(id, component);
        }
      },
      deleteComponent: async (id: number) => {
        try {
          return await invoke<number>('delete_component', { id });
        } catch {
          return fallbackApi.deleteComponent(id);
        }
      },

      // Custom SKUs Catalog
      getSkus: async () => {
        try {
          return await invoke<CustomSkuDatabase>('get_skus');
        } catch {
          return fallbackApi.getSkus();
        }
      },
      saveSkus: async (skus: CustomSkuDatabase) => {
        try {
          return await invoke<boolean>('save_skus', { skus });
        } catch {
          return fallbackApi.saveSkus(skus);
        }
      },
      deleteSku: async (skuId: string) => {
        try {
          return await invoke<string>('delete_sku', { skuId });
        } catch {
          return fallbackApi.deleteSku(skuId);
        }
      },
      exportSkusCatalog: async () => {
        try {
          return await invoke<any>('export_skus_catalog');
        } catch (err) {
          console.error('[TauriBridge] export_skus_catalog error:', err);
          return fallbackApi.exportSkusCatalog ? fallbackApi.exportSkusCatalog() : null;
        }
      },
      importSkusCatalog: async (
        catalogData: any,
        mode: 'merge' | 'overwrite' = 'merge'
      ): Promise<{ success: boolean; count: number }> => {
        try {
          const res = await invoke<any>('import_skus_catalog', {
            catalogData,
            mode: mode === 'overwrite' ? 'replace' : 'merge',
          });
          return { success: true, count: res?.importedCount || 0 };
        } catch (err) {
          console.error('[TauriBridge] import_skus_catalog error:', err);
          return fallbackApi.importSkusCatalog
            ? fallbackApi.importSkusCatalog(catalogData, mode)
            : { success: false, count: 0 };
        }
      },

      // Storage Locations
      getStorageLocations: async () => {
        try {
          return await invoke<any[]>('get_storage_locations');
        } catch {
          return fallbackApi.getStorageLocations();
        }
      },
      addStorageLocation: async (loc: any) => {
        try {
          return await invoke<any>('add_storage_location', { location: loc });
        } catch {
          return fallbackApi.addStorageLocation(loc);
        }
      },
      deleteStorageLocation: async (id: number) => {
        try {
          await invoke('delete_storage_location', { id: id.toString() });
          return id;
        } catch {
          return fallbackApi.deleteStorageLocation(id);
        }
      },
      updateStorageLocation: async (id: number | string, loc: any) => {
        try {
          return await invoke<any>('update_storage_location', {
            id: String(id),
            location: loc,
          });
        } catch {
          return (fallbackApi as any).updateStorageLocation
            ? (fallbackApi as any).updateStorageLocation(id, loc)
            : loc;
        }
      },

      // Offline Synchronization Queue
      getSyncQueue: async () => {
        try {
          return await invoke<any[]>('get_sync_queue');
        } catch {
          return [];
        }
      },
      removeSyncItem: async (id: number | string) => {
        try {
          await invoke('remove_sync_item', { id: String(id) });
          window.dispatchEvent(new CustomEvent('armoryvault-sync-queue-updated'));
          return typeof id === 'number' ? id : 1;
        } catch (err) {
          console.error('[TauriBridge] removeSyncItem error:', err);
          return typeof id === 'number' ? id : 1;
        }
      },
      clearSyncQueue: async () => {
        try {
          await invoke('clear_sync_queue');
          window.dispatchEvent(new CustomEvent('armoryvault-sync-queue-updated'));
          return true;
        } catch (err) {
          console.error('[TauriBridge] clearSyncQueue error:', err);
          return false;
        }
      },
      rejectSyncItem: async (params: {
        syncId: string;
        itemType?: string;
        filename?: string;
        itemIdentifier?: string;
        payload?: string;
        deleteFromMobile?: boolean;
      }) => {
        try {
          await invoke('reject_sync_item', {
            id: String(params.syncId),
            deleteFromMobile: params.deleteFromMobile ?? true,
          });
          window.dispatchEvent(new CustomEvent('armoryvault-sync-queue-updated'));
          return params.syncId;
        } catch (err) {
          console.error('[TauriBridge] rejectSyncItem error:', err);
          return null;
        }
      },
      getRejectedSyncs: async () => {
        try {
          return await invoke<any[]>('get_rejected_syncs');
        } catch (err) {
          console.error('[TauriBridge] getRejectedSyncs error:', err);
          return [];
        }
      },
      confirmRejectedSyncs: async (ids: string[]) => {
        try {
          return await invoke<number>('confirm_rejected_syncs', { ids });
        } catch (err) {
          console.error('[TauriBridge] confirmRejectedSyncs error:', err);
          return 0;
        }
      },

      // Activity Audit Log
      getActivityLog: async () => {
        try {
          return await invoke<any[]>('get_activity_log');
        } catch {
          return fallbackApi.getActivityLog ? fallbackApi.getActivityLog() : [];
        }
      },

      // Media & Photos
      saveBase64Photo: async (base64Data: string, filename: string) => {
        try {
          return await invoke<string>('save_base64_photo', { base64Data, filename });
        } catch {
          return fallbackApi.saveBase64Photo(base64Data, filename);
        }
      },
      saveBase64Document: async (base64Data: string, filename: string) => {
        try {
          return await invoke<string>('save_base64_document', { base64Data, filename });
        } catch {
          return fallbackApi.saveBase64Document(base64Data, filename);
        }
      },
      savePhoto: async (sourcePath: string, filename: string) => {
        try {
          return await invoke<string>('save_photo', { sourcePath, filename });
        } catch (err) {
          console.error('[TauriBridge] save_photo error:', err);
          return fallbackApi.savePhoto(sourcePath, filename);
        }
      },
      saveDocument: async (sourcePath: string, filename: string) => {
        try {
          return await invoke<string>('save_document', { sourcePath, filename });
        } catch (err) {
          console.error('[TauriBridge] save_document error:', err);
          return fallbackApi.saveDocument(sourcePath, filename);
        }
      },
      selectAndSavePhoto: async () => {
        try {
          return await invoke<string[] | null>('select_and_save_photo');
        } catch (err) {
          console.error('[TauriBridge] select_and_save_photo error:', err);
          return fallbackApi.selectAndSavePhoto ? fallbackApi.selectAndSavePhoto() : null;
        }
      },
      selectAndSaveDocument: async () => {
        try {
          return await invoke<{ name: string; path: string } | null>('select_and_save_document');
        } catch (err) {
          console.error('[TauriBridge] select_and_save_document error:', err);
          return fallbackApi.selectAndSaveDocument ? fallbackApi.selectAndSaveDocument() : null;
        }
      },

      // Maintenance & Range Telemetry
      completeMaintenanceTask: async (
        firearmId: number,
        taskId: string,
        logData: {
          action_performed?: string;
          part_details?: string;
          cost?: number;
          date?: string;
          notes?: string;
        }
      ) => {
        try {
          return await invoke<boolean>('complete_maintenance_task', {
            firearmId,
            taskId,
            logData,
          });
        } catch (err) {
          console.error('[TauriBridge] complete_maintenance_task error, falling back:', err);
          return fallbackApi.completeMaintenanceTask(firearmId, taskId, logData);
        }
      },
      logRangeSession: async (data: {
        firearm_id: number;
        ammo_id?: number;
        rounds_fired: number;
        date?: string;
        notes?: string;
        cost?: number;
        location?: string;
      }) => {
        try {
          return await invoke<any>('log_range_session', { sessionData: data });
        } catch (err) {
          console.error('[TauriBridge] log_range_session error, falling back:', err);
          return fallbackApi.logRangeSession(data);
        }
      },

      // Directory Lookups (Shooting Ranges & FFLs)
      lookupRanges: async (params: { zip?: string; state?: string; limit?: number }) => {
        try {
          const cleanLimit = Math.min(100, Math.max(1, Number(params.limit) || 25));
          const queryParam = params.zip
            ? `zip=${encodeURIComponent(params.zip)}`
            : params.state
              ? `state=${encodeURIComponent(params.state)}`
              : '';
          if (queryParam) {
            const res = await fetch(
              `https://armstrader.store/api/ranges/search?${queryParam}&limit=${cleanLimit}`
            );
            if (res.ok) {
              const data = await res.json();
              return { ...data, source: 'cloud_api' };
            }
          }
        } catch (err) {
          console.warn('[TauriBridge] lookupRanges network failed, using fallback:', err);
        }
        return fallbackApi.lookupRanges
          ? fallbackApi.lookupRanges(params)
          : { success: false, data: [], message: 'No ranges found' };
      },
      lookupFFL: async (params: { zip?: string; state?: string; limit?: number }) => {
        try {
          const cleanLimit = Math.min(100, Math.max(1, Number(params.limit) || 25));
          const queryParam = params.zip
            ? `zip=${encodeURIComponent(params.zip)}`
            : params.state
              ? `state=${encodeURIComponent(params.state)}`
              : '';
          if (queryParam) {
            const res = await fetch(
              `https://armstrader.store/api/ffl/search?${queryParam}&limit=${cleanLimit}`
            );
            if (res.ok) {
              const data = await res.json();
              return { ...data, source: 'cloud_api' };
            }
          }
        } catch (err) {
          console.warn('[TauriBridge] lookupFFL network failed, using fallback:', err);
        }
        return fallbackApi.lookupFFL
          ? fallbackApi.lookupFFL(params)
          : { success: false, data: [], message: 'No FFLs found' };
      },
      lookupUPC: async (upc: string) => {
        try {
          return await invoke<any>('lookup_upc', { upc });
        } catch (err) {
          console.error('[TauriBridge] lookup_upc error:', err);
          return fallbackApi.lookupUPC ? fallbackApi.lookupUPC(upc) : null;
        }
      },

      // Batch Imports
      importFirearmsBatch: async (
        firearmsList: Firearm[],
        updatesList?: { existingId: number; updatedItem: Partial<Firearm> }[]
      ) => {
        try {
          return await invoke<any>('import_firearms_batch', {
            firearmsList,
            updatesList: updatesList || null,
          });
        } catch (err) {
          console.error('[TauriBridge] import_firearms_batch error, falling back:', err);
          return fallbackApi.importFirearmsBatch
            ? fallbackApi.importFirearmsBatch(firearmsList, updatesList)
            : { insertedCount: 0, updatedCount: 0 };
        }
      },
      importAmmoBatch: async (
        ammoList: Ammo[],
        updatesList?: { existingId: number; updatedItem: Partial<Ammo> }[]
      ) => {
        try {
          return await invoke<any>('import_ammo_batch', {
            ammoList,
            updatesList: updatesList || null,
          });
        } catch (err) {
          console.error('[TauriBridge] import_ammo_batch error, falling back:', err);
          return fallbackApi.importAmmoBatch
            ? fallbackApi.importAmmoBatch(ammoList, updatesList)
            : { insertedCount: 0, updatedCount: 0 };
        }
      },
      importAccessoriesBatch: async (accessoriesList: Accessory[]) => {
        try {
          return await invoke<any>('import_accessories_batch', {
            accessoriesList,
          });
        } catch (err) {
          console.error('[TauriBridge] import_accessories_batch error, falling back:', err);
          return fallbackApi.importAccessoriesBatch
            ? fallbackApi.importAccessoriesBatch(accessoriesList)
            : { insertedCount: 0 };
        }
      },
      importComponentsBatch: async (componentsList: ReloadingComponent[]) => {
        try {
          return await invoke<any>('import_components_batch', {
            componentsList,
          });
        } catch (err) {
          console.error('[TauriBridge] import_components_batch error, falling back:', err);
          return fallbackApi.importComponentsBatch
            ? fallbackApi.importComponentsBatch(componentsList)
            : { insertedCount: 0 };
        }
      },

      // Work Orders & Reports
      generateWorkOrder: async (woData: any) => {
        try {
          return await invoke<string | null>('generate_work_order', { data: woData });
        } catch (err) {
          console.error('[TauriBridge] generate_work_order error:', err);
          return null;
        }
      },
      generateArmoryBinder: async (data: any) => {
        try {
          return await invoke<string | null>('generate_armory_binder', { data });
        } catch (err) {
          console.error('[TauriBridge] generate_armory_binder error:', err);
          return null;
        }
      },
      generateBillOfSale: async (data: any) => {
        try {
          return await invoke<string | null>('generate_bill_of_sale', { data });
        } catch (err) {
          console.error('[TauriBridge] generate_bill_of_sale error:', err);
          return null;
        }
      },
      generateInsuranceReport: async (data: any) => {
        try {
          return await invoke<string | null>('generate_insurance_report', { data });
        } catch (err) {
          console.error('[TauriBridge] generate_insurance_report error:', err);
          return null;
        }
      },
      exportData: async (dataString: string, filename: string) => {
        try {
          const filePath = await saveDialog({
            defaultPath: filename,
          });
          if (filePath) {
            await writeTextFile(filePath, dataString);
            return filePath;
          }
          return null;
        } catch (err) {
          console.error('[TauriBridge] exportData error, falling back:', err);
          return fallbackApi.exportData(dataString, filename);
        }
      },

      // Backup & Archival
      getBackupFolder: async () => {
        try {
          return await invoke<string | null>('get_backup_folder');
        } catch {
          return null;
        }
      },
      selectBackupFolder: async () => {
        try {
          return await invoke<string | null>('select_backup_folder');
        } catch {
          return null;
        }
      },
      createZipBackup: async () => {
        try {
          return await invoke<any>('create_zip_backup');
        } catch (err: any) {
          console.error('[TauriBridge] create_zip_backup error:', err);
          return { success: false, error: err?.message || String(err) };
        }
      },
      restoreBackup: async () => {
        try {
          return await invoke<any>('restore_backup');
        } catch (err: any) {
          console.error('[TauriBridge] restore_backup error:', err);
          return { success: false, error: err?.message || String(err) };
        }
      },
      importDatabase: async () => {
        try {
          return await invoke<any>('import_database');
        } catch (err: any) {
          console.error('[TauriBridge] import_database error:', err);
          return { success: false, error: err?.message || String(err) };
        }
      },

      // File Dialogs & System
      selectCSVFile: async () => {
        try {
          return await invoke<any>('select_csv_file');
        } catch (err) {
          console.error('[TauriBridge] select_csv_file error:', err);
          return null;
        }
      },
      saveQRImage: async (data: { itemName: string; qrDataUrl: string }) => {
        try {
          return await invoke<boolean>('save_qr_image', {
            itemName: data.itemName,
            qrDataUrl: data.qrDataUrl,
          });
        } catch {
          return false;
        }
      },
      openExternalFile: async (filePath: string) => {
        try {
          await invoke('open_external_file', { filePath });
        } catch (err) {
          console.error('[TauriBridge] open_external_file error:', err);
        }
      },
      openUrl: async (url: string) => {
        try {
          await invoke('open_url', { url });
        } catch (err) {
          console.error('[TauriBridge] open_url error:', err);
        }
      },
      readFileBase64: async (filePath: string) => {
        try {
          return await invoke<string | null>('read_file_base64', { filePath });
        } catch {
          return null;
        }
      },
      readFileBuffer: async (filePath: string) => {
        try {
          const bytes = await invoke<number[] | null>('read_file_buffer', { filePath });
          return bytes ? new Uint8Array(bytes) : null;
        } catch {
          return null;
        }
      },

      // Config & Preferences (kv_meta)
      getConfig: async (key: string) => {
        try {
          return await invoke('get_config', { key });
        } catch (err) {
          console.error('[TauriBridge] get_config error, falling back:', err);
          return fallbackApi.getConfig(key);
        }
      },
      setConfig: async (key: string, value: any) => {
        try {
          await invoke('set_config', { key, value });
        } catch (err) {
          console.error('[TauriBridge] set_config error, falling back:', err);
          await fallbackApi.setConfig(key, value);
        }
      },
      saveConfig: async (key: string, value: any) => {
        try {
          await invoke('set_config', { key, value });
        } catch (err) {
          console.error('[TauriBridge] saveConfig error, falling back:', err);
          if ((fallbackApi as any).saveConfig) {
            await (fallbackApi as any).saveConfig(key, value);
          } else {
            await fallbackApi.setConfig(key, value);
          }
        }
      },

      // Ballistic Profiles
      getBallisticProfiles: async () => {
        try {
          return await invoke<any[]>('get_ballistic_profiles');
        } catch (err) {
          console.error('[TauriBridge] get_ballistic_profiles error, falling back:', err);
          return fallbackApi.getBallisticProfiles ? fallbackApi.getBallisticProfiles() : [];
        }
      },
      addBallisticProfile: async (profile: any) => {
        try {
          await invoke('add_ballistic_profile', { profile });
          return 1;
        } catch (err) {
          console.error('[TauriBridge] add_ballistic_profile error, falling back:', err);
          return fallbackApi.addBallisticProfile ? fallbackApi.addBallisticProfile(profile) : 1;
        }
      },
      deleteBallisticProfile: async (id: number | string) => {
        try {
          await invoke('delete_ballistic_profile', { id: String(id) });
          return typeof id === 'number' ? id : 1;
        } catch (err) {
          console.error('[TauriBridge] delete_ballistic_profile error, falling back:', err);
          return fallbackApi.deleteBallisticProfile ? fallbackApi.deleteBallisticProfile(id as any) : 1;
        }
      },
      updateBallisticProfile: async (id: number | string, profile: any) => {
        try {
          await invoke('update_ballistic_profile', { id: String(id), profile });
          return 1;
        } catch (err) {
          console.error('[TauriBridge] update_ballistic_profile error:', err);
          return (fallbackApi as any).updateBallisticProfile
            ? (fallbackApi as any).updateBallisticProfile(id, profile)
            : 1;
        }
      },

      // Chronograph Telemetry
      getChronoStrings: async () => {
        try {
          return await invoke<any[]>('get_chrono_strings');
        } catch {
          return [];
        }
      },
      addChronoString: async (item: any) => {
        try {
          return await invoke<any>('add_chrono_string', {
            chronoString: item,
            chrono_string: item,
          });
        } catch (err) {
          console.error('[TauriBridge] add_chrono_string error:', err);
          return fallbackApi.addChronoString ? fallbackApi.addChronoString(item) : item;
        }
      },
      deleteChronoString: async (id: number) => {
        try {
          await invoke('delete_chrono_string', { id: String(id) });
          return id;
        } catch (err) {
          console.error('[TauriBridge] delete_chrono_string error:', err);
          return id;
        }
      },

      // Target Analyses Telemetry
      getTargetAnalyses: async () => {
        try {
          return await invoke<any[]>('get_target_analyses');
        } catch {
          return [];
        }
      },
      addTargetAnalysis: async (item: any) => {
        try {
          return await invoke<any>('add_target_analysis', {
            targetAnalysis: item,
            target_analysis: item,
          });
        } catch (err) {
          console.error('[TauriBridge] add_target_analysis error:', err);
          return fallbackApi.addTargetAnalysis ? fallbackApi.addTargetAnalysis(item) : item;
        }
      },
      deleteTargetAnalysis: async (id: number) => {
        try {
          await invoke('delete_target_analysis', { id: String(id) });
          return id;
        } catch (err) {
          console.error('[TauriBridge] delete_target_analysis error:', err);
          return id;
        }
      },

      // Load Ladder Tests & Development
      getLoadLadderTests: async () => {
        try {
          return await invoke<any[]>('get_load_ladder_tests');
        } catch (err) {
          console.error('[TauriBridge] get_load_ladder_tests error, falling back:', err);
          return fallbackApi.getLoadLadderTests ? fallbackApi.getLoadLadderTests() : [];
        }
      },
      addLoadLadderTest: async (test: any) => {
        try {
          await invoke('add_load_ladder_test', { test });
          return 1;
        } catch (err) {
          console.error('[TauriBridge] add_load_ladder_test error, falling back:', err);
          return fallbackApi.addLoadLadderTest ? fallbackApi.addLoadLadderTest(test) : 1;
        }
      },
      updateLoadLadderTest: async (id: number | string, test: any) => {
        try {
          await invoke('update_load_ladder_test', { id: String(id), test });
          return 1;
        } catch (err) {
          console.error('[TauriBridge] update_load_ladder_test error, falling back:', err);
          return fallbackApi.updateLoadLadderTest ? fallbackApi.updateLoadLadderTest(id as any, test) : 1;
        }
      },
      deleteLoadLadderTest: async (id: number | string) => {
        try {
          await invoke('delete_load_ladder_test', { id: String(id) });
          return typeof id === 'number' ? id : 1;
        } catch (err) {
          console.error('[TauriBridge] delete_load_ladder_test error, falling back:', err);
          return fallbackApi.deleteLoadLadderTest ? fallbackApi.deleteLoadLadderTest(id as any) : 1;
        }
      },

      // Handload Manufacturing Batch
      manufactureHandloadBatch: async (
        ammoId: number,
        quantity: number,
        deductions: {
          powderId?: number;
          powderAmount?: number;
          powderUnit?: 'lbs' | 'oz' | 'grains';
          primerId?: number;
          primerCount?: number;
          brassId?: number;
          brassCount?: number;
          bulletId?: number;
          bulletCount?: number;
        }
      ) => {
        try {
          return await invoke<any>('manufacture_handload_batch', {
            ammoId,
            quantity,
            deductions,
          });
        } catch (err) {
          console.error('[TauriBridge] manufacture_handload_batch error, falling back:', err);
          return fallbackApi.manufactureHandloadBatch(ammoId, quantity, deductions);
        }
      },

      // Remote Modules Catalog & Archiving
      checkRemoteModules: async () => {
        try {
          const catalogUrl =
            'https://raw.githubusercontent.com/cook0001/ArmoryVault-Modules/main/modules-index.json';
          const res = await fetch(catalogUrl, { cache: 'no-cache' });
          if (res.ok) {
            const data = await res.json();
            return {
              success: true,
              modules: data.modules || {},
              version: data.version,
              repository: data.repository || 'cook0001/ArmoryVault-Modules',
              lastChecked: new Date().toISOString(),
              fromCache: false,
            };
          }
        } catch (err) {
          console.warn('[TauriBridge] checkRemoteModules fetch failed, falling back:', err);
        }
        return fallbackApi.checkRemoteModules
          ? fallbackApi.checkRemoteModules()
          : { success: true, modules: {} };
      },
      archiveModuleData: async (moduleId: string, dataKeys: string[]) => {
        try {
          const archives = (await invoke<any>('get_config', { key: 'module_archives' })) || {};
          const extracted: Record<string, any> = {};
          let totalRecords = 0;
          const dataKeyCount: Record<string, number> = {};

          for (const key of dataKeys) {
            const item = await invoke<any>('get_config', { key });
            if (item) {
              extracted[key] = item;
              const count = Array.isArray(item) ? item.length : 1;
              dataKeyCount[key] = count;
              totalRecords += count;
              await invoke('set_config', { key, value: null });
            }
          }

          archives[moduleId] = {
            moduleId,
            archivedAt: new Date().toISOString(),
            totalRecords,
            dataKeyCount,
            data: extracted,
          };
          await invoke('set_config', { key: 'module_archives', value: archives });

          return { success: true, totalRecords, dataKeyCount };
        } catch (err) {
          console.error('[TauriBridge] archiveModuleData error, falling back:', err);
          return fallbackApi.archiveModuleData
            ? fallbackApi.archiveModuleData(moduleId, dataKeys)
            : { success: true };
        }
      },
      restoreModuleData: async (moduleId: string) => {
        try {
          const archives = (await invoke<any>('get_config', { key: 'module_archives' })) || {};
          const archive = archives[moduleId];
          if (!archive || !archive.data) {
            return { success: true, restoredRecords: 0 };
          }
          let restoredRecords = 0;
          for (const key of Object.keys(archive.data)) {
            await invoke('set_config', { key, value: archive.data[key] });
            const count = Array.isArray(archive.data[key]) ? archive.data[key].length : 1;
            restoredRecords += count;
          }
          delete archives[moduleId];
          await invoke('set_config', { key: 'module_archives', value: archives });
          return { success: true, restoredRecords };
        } catch (err) {
          console.error('[TauriBridge] restoreModuleData error, falling back:', err);
          return fallbackApi.restoreModuleData
            ? fallbackApi.restoreModuleData(moduleId)
            : { success: true, restoredRecords: 0 };
        }
      },
      getModuleArchives: async () => {
        try {
          const archives = (await invoke<any>('get_config', { key: 'module_archives' })) || {};
          return archives;
        } catch (err) {
          console.error('[TauriBridge] getModuleArchives error, falling back:', err);
          return fallbackApi.getModuleArchives ? fallbackApi.getModuleArchives() : {};
        }
      },

      // System / LAN Sync Info
      getLocalIp: async () => {
        try {
          return await invoke<string>('get_local_ip');
        } catch {
          return '127.0.0.1';
        }
      },
      getAllLocalIps: async () => {
        try {
          const info = await invoke<any>('get_pairing_info');
          if (info && Array.isArray(info.interfaces)) {
            return info.interfaces;
          }
        } catch {}
        if (fallbackApi.getAllLocalIps) {
          return fallbackApi.getAllLocalIps();
        }
        return [{ name: 'Default', address: '127.0.0.1', score: 100, isVirtual: false }];
      },
      getPairingInfo: async () => {
        try {
          return await invoke<any>('get_pairing_info');
        } catch (err) {
          console.error('[TauriBridge] get_pairing_info error:', err);
          return fallbackApi.getPairingInfo ? fallbackApi.getPairingInfo() : null;
        }
      },
      getPairingToken: async () => {
        try {
          return await invoke<string>('get_pairing_token');
        } catch {
          return '';
        }
      },
      revokePairingToken: async () => {
        try {
          return await invoke<boolean>('revoke_pairing_token');
        } catch {
          return false;
        }
      },

      // Paired Devices Management
      getPairedDevices: async () => {
        try {
          return await invoke<PairedDevice[]>('get_paired_devices');
        } catch (err) {
          console.error('[TauriBridge] get_paired_devices error:', err);
          return fallbackApi.getPairedDevices ? fallbackApi.getPairedDevices() : [];
        }
      },
      removePairedDevice: async (id: string) => {
        try {
          return await invoke<boolean>('remove_paired_device', { id });
        } catch (err) {
          console.error('[TauriBridge] remove_paired_device error:', err);
          return false;
        }
      },
      unpairAllDevices: async () => {
        try {
          return await invoke<boolean>('unpair_all_devices');
        } catch (err) {
          console.error('[TauriBridge] unpair_all_devices error:', err);
          return false;
        }
      },

      // Custom Maintenance Schedule Presets
      getCustomSchedulePresets: async () => {
        try {
          return await invoke<any>('get_custom_schedule_presets');
        } catch (err) {
          console.error('[TauriBridge] get_custom_schedule_presets error:', err);
          return fallbackApi.getCustomSchedulePresets
            ? fallbackApi.getCustomSchedulePresets()
            : [];
        }
      },
      saveCustomSchedulePresets: async (presets: any) => {
        try {
          return await invoke<boolean>('save_custom_schedule_presets', { presets });
        } catch (err) {
          console.error('[TauriBridge] save_custom_schedule_presets error:', err);
          return fallbackApi.saveCustomSchedulePresets
            ? fallbackApi.saveCustomSchedulePresets(presets)
            : false;
        }
      },

      // QR Label Printing
      printQRLabel: async (data: {
        itemName: string;
        itemDetails: string;
        qrDataUrl: string;
      }): Promise<boolean> => {
        const printWindow = window.open('', '_blank', 'width=650,height=650');
        if (printWindow) {
          const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>QR Label - ${data.itemName}</title>
  <style>
    @page { size: auto; margin: 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px; text-align: center; color: #000; }
    .label-card { border: 2px solid #000; border-radius: 8px; padding: 16px; max-width: 320px; }
    .title { font-size: 16pt; font-weight: bold; margin-bottom: 8px; }
    .details { font-size: 10pt; color: #444; margin-bottom: 12px; }
    .qr-img { width: 180px; height: 180px; }
  </style>
</head>
<body>
  <div class="label-card">
    <div class="title">${data.itemName}</div>
    <div class="details">${data.itemDetails}</div>
    <img class="qr-img" src="${data.qrDataUrl}" alt="QR Code" />
  </div>
</body>
</html>`;
          printWindow.document.write(html);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 300);
          return true;
        }
        return false;
      },

      // Real-time Event Subscriptions
      onSyncReceived: (callback: () => void) => {
        let unlistenSync: (() => void) | null = null;
        let unlistenChanged: (() => void) | null = null;
        listen('sync-received', () => {
          callback();
        }).then((fn) => {
          unlistenSync = fn;
        });
        listen('sync-queue-changed', () => {
          callback();
        }).then((fn) => {
          unlistenChanged = fn;
        });
        const handleWindowUpdate = () => callback();
        window.addEventListener('armoryvault-sync-queue-updated', handleWindowUpdate);
        return () => {
          if (unlistenSync) unlistenSync();
          if (unlistenChanged) unlistenChanged();
          window.removeEventListener('armoryvault-sync-queue-updated', handleWindowUpdate);
        };
      },
      onDevicePaired: (callback: (data: any) => void) => {
        let unlisten: (() => void) | null = null;
        listen('device-paired', (event: any) => {
          callback(event.payload);
        }).then((fn) => {
          unlisten = fn;
        });
        return () => {
          if (unlisten) unlisten();
        };
      },
      onDeviceUnpaired: (callback: (data: any) => void) => {
        let unlisten: (() => void) | null = null;
        listen('device-unpaired', (event: any) => {
          callback(event.payload);
        }).then((fn) => {
          unlisten = fn;
        });
        return () => {
          if (unlisten) unlisten();
        };
      },
      onVaultLocked: (callback: () => void) => {
        let unlisten: (() => void) | null = null;
        listen('vault-locked', () => {
          callback();
        }).then((fn) => {
          unlisten = fn;
        });
        return () => {
          if (unlisten) unlisten();
        };
      },
    };
  }
}
