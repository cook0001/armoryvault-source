import { Accessory, Ammo, CustomSkuDatabase, Firearm, ReloadingComponent } from './types';

// This provides a fallback localStorage backend if the app is run in a standard
// web browser (via `npm run dev`) rather than inside the Electron shell.
export function setupMockBackend() {
  if (!window.api) {
    console.log('No Electron backend detected. Initializing browser localStorage fallback.');

    const STORAGE_KEY = 'firearms_inventory_data';
    const AMMO_STORAGE_KEY = 'ammo_inventory_data';
    const ACCESSORY_STORAGE_KEY = 'accessory_inventory_data';
    const COMPONENT_STORAGE_KEY = 'component_inventory_data';

    const getStoredFirearms = (): Firearm[] => {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    };

    const saveFirearms = (firearms: Firearm[]) => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(firearms));
    };

    const getStoredAmmo = (): Ammo[] => {
      const data = localStorage.getItem(AMMO_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    };

    const saveAmmo = (ammoList: Ammo[]) => {
      localStorage.setItem(AMMO_STORAGE_KEY, JSON.stringify(ammoList));
    };

    const getStoredAccessories = (): Accessory[] => {
      const data = localStorage.getItem(ACCESSORY_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    };

    const saveAccessories = (list: Accessory[]) => {
      localStorage.setItem(ACCESSORY_STORAGE_KEY, JSON.stringify(list));
    };

    const getStoredComponents = (): ReloadingComponent[] => {
      const data = localStorage.getItem(COMPONENT_STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    };

    const saveComponents = (list: ReloadingComponent[]) => {
      localStorage.setItem(COMPONENT_STORAGE_KEY, JSON.stringify(list));
    };

    let mockLocked = false;

    window.api = {
      isVaultSetup: async () => true,
      isVaultLocked: async () => mockLocked,
      setupVault: async (password: string) => {
        mockLocked = false;
        return 'mock-recovery-code-1234567890abcdef';
      },
      unlockVault: async (password: string) => {
        if (password === 'test') {
          mockLocked = false;
          return true;
        }
        return false;
      },
      unlockWithRecoveryCode: async (code: string) => {
        mockLocked = false;
        return true;
      },
      changePassword: async (
        currentPassword: string,
        newPassword: string,
        regenerateRecoveryKey?: boolean
      ) => {
        if (newPassword.length < 8)
          return { success: false, error: 'New password must be at least 8 characters long.' };
        return {
          success: true,
          message: regenerateRecoveryKey
            ? 'Password changed and new recovery key generated!'
            : 'Password changed successfully!',
          newRecoveryCode: regenerateRecoveryKey ? 'mock-new-recovery-code-9876543210fedcba' : null,
        };
      },
      regenerateRecoveryKey: async (currentPassword: string) => {
        return {
          success: true,
          message: 'New recovery key generated and vault re-keyed successfully!',
          newRecoveryCode: 'mock-regenerated-recovery-code-abcdef1234567890',
        };
      },
      getRecoveryCode: async () => 'mock-recovery-code-1234567890abcdef',
      lockVault: async () => {
        mockLocked = true;
      },
      getFirearms: async () => {
        if (mockLocked) return [];
        return getStoredFirearms();
      },
      addFirearm: async (firearm: Firearm) => {
        if (mockLocked) return -1;
        const firearms = getStoredFirearms();
        const newId = firearms.length > 0 ? Math.max(...firearms.map((f) => f.id || 0)) + 1 : 1;
        const newFirearm = { ...firearm, id: newId };
        firearms.push(newFirearm);
        saveFirearms(firearms);
        return newId;
      },
      importFirearmsBatch: async (firearmsList: Firearm[], updatesList?: any[]) => {
        if (mockLocked) return { insertedCount: 0, updatedCount: 0 };
        const firearms = getStoredFirearms();
        if (updatesList && Array.isArray(updatesList)) {
          for (const u of updatesList) {
            const idx = firearms.findIndex((f) => f.id === u.existingId);
            if (idx !== -1)
              firearms[idx] = { ...firearms[idx], ...u.updatedItem, id: u.existingId };
          }
        }
        let inserted = 0;
        if (firearmsList && Array.isArray(firearmsList)) {
          for (const f of firearmsList) {
            const newId = firearms.length > 0 ? Math.max(...firearms.map((x) => x.id || 0)) + 1 : 1;
            firearms.push({ ...f, id: newId });
            inserted++;
          }
        }
        saveFirearms(firearms);
        return { insertedCount: inserted, updatedCount: updatesList?.length || 0 };
      },
      updateFirearm: async (id: number, firearm: Firearm) => {
        if (mockLocked) return -1;
        const firearms = getStoredFirearms();
        const index = firearms.findIndex((f) => f.id === id);
        if (index !== -1) {
          firearms[index] = { ...firearm, id };
          saveFirearms(firearms);
        }
        return id;
      },
      deleteFirearm: async (id: number) => {
        if (mockLocked) return -1;
        let firearms = getStoredFirearms();
        firearms = firearms.filter((f) => f.id !== id);
        saveFirearms(firearms);
        return id;
      },
      logRangeSession: async (data: any) => {
        const firearms = getStoredFirearms();
        const fIndex = firearms.findIndex((f) => f.id === Number(data.firearm_id));
        let firearmRounds = 0;
        if (fIndex !== -1) {
          const f = firearms[fIndex];
          const logs = f.logs || [];
          const nextId = logs.length > 0 ? Math.max(...logs.map((l) => l.id || 0)) + 1 : 1;
          const newLog = {
            id: nextId,
            date: data.date || new Date().toISOString().split('T')[0],
            type: 'Range' as const,
            rounds_fired: Number(data.rounds_fired) || 0,
            ammo_used: data.ammo_name || '',
            cost: Number(data.cost) || 0,
            notes: data.notes || '',
          };
          logs.push(newLog);
          f.logs = logs;
          firearmRounds = logs
            .filter((l) => l.type === 'Range')
            .reduce((sum, l) => sum + (l.rounds_fired || 0), 0);
          saveFirearms(firearms);
        }

        // Deduct ammo
        let ammoRemaining: number | undefined;
        if (data.ammo_id) {
          const ammoList = getStoredAmmo();
          const aIndex = ammoList.findIndex((a) => a.id === Number(data.ammo_id));
          if (aIndex !== -1) {
            ammoList[aIndex].count = Math.max(
              0,
              (ammoList[aIndex].count || 0) - (Number(data.rounds_fired) || 0)
            );
            ammoRemaining = ammoList[aIndex].count;
            saveAmmo(ammoList);
          }
        }
        return { success: true, firearm_rounds: firearmRounds, ammo_remaining: ammoRemaining };
      },
      completeMaintenanceTask: async (firearmId: number, taskId: string, logData: any) => {
        const firearms = getStoredFirearms();
        const fIndex = firearms.findIndex((f) => f.id === Number(firearmId));
        if (fIndex === -1) return false;
        const f = firearms[fIndex];
        const logs = f.logs || [];
        const nextId = logs.length > 0 ? Math.max(...logs.map((l) => l.id || 0)) + 1 : 1;
        const currentRounds = logs
          .filter((l) => l.type === 'Range')
          .reduce((sum, l) => sum + (l.rounds_fired || 0), 0);
        const newLog = {
          id: nextId,
          date: logData.date || new Date().toISOString().split('T')[0],
          type: logData.type || logData.service_type || 'Repair',
          installed_part_details: logData.part_details || logData.action_performed || '',
          repaired_part: logData.action_performed || '',
          cost: Number(logData.cost) || 0,
          notes: logData.notes || '',
        };
        logs.push(newLog);
        f.logs = logs;

        if (f.maintenance_schedules && taskId) {
          const tIdx = f.maintenance_schedules.findIndex((t) => t.id === taskId);
          if (tIdx !== -1) {
            f.maintenance_schedules[tIdx].last_performed_rounds = currentRounds;
            f.maintenance_schedules[tIdx].last_performed_date =
              logData.date || new Date().toISOString().split('T')[0];
          }
        }
        saveFirearms(firearms);
        return true;
      },
      getAmmo: async () => {
        if (mockLocked) return [];
        return getStoredAmmo();
      },
      addAmmo: async (ammo: Ammo) => {
        if (mockLocked) return -1;
        const ammoList = getStoredAmmo();
        const newId = ammoList.length > 0 ? Math.max(...ammoList.map((a) => a.id || 0)) + 1 : 1;
        const newAmmo = { ...ammo, id: newId };
        ammoList.push(newAmmo);
        saveAmmo(ammoList);
        return newId;
      },
      importAmmoBatch: async (ammoList: Ammo[], updatesList?: any[]) => {
        if (mockLocked) return { insertedCount: 0, updatedCount: 0 };
        const list = getStoredAmmo();
        if (updatesList && Array.isArray(updatesList)) {
          for (const u of updatesList) {
            const idx = list.findIndex((a) => a.id === u.existingId);
            if (idx !== -1) list[idx] = { ...list[idx], ...u.updatedItem, id: u.existingId };
          }
        }
        let inserted = 0;
        if (ammoList && Array.isArray(ammoList)) {
          for (const a of ammoList) {
            const newId = list.length > 0 ? Math.max(...list.map((x) => x.id || 0)) + 1 : 1;
            list.push({ ...a, id: newId });
            inserted++;
          }
        }
        saveAmmo(list);
        return { insertedCount: inserted, updatedCount: updatesList?.length || 0 };
      },
      updateAmmo: async (id: number, ammo: Ammo) => {
        if (mockLocked) return -1;
        const ammoList = getStoredAmmo();
        const index = ammoList.findIndex((a) => a.id === id);
        if (index !== -1) {
          ammoList[index] = { ...ammo, id };
          saveAmmo(ammoList);
        }
        return id;
      },
      deleteAmmo: async (id: number) => {
        if (mockLocked) return -1;
        let ammoList = getStoredAmmo();
        ammoList = ammoList.filter((a) => a.id !== id);
        saveAmmo(ammoList);
        return id;
      },
      getAccessories: async () => {
        if (mockLocked) return [];
        return getStoredAccessories();
      },
      addAccessory: async (acc: any) => {
        if (mockLocked) return -1;
        const list = getStoredAccessories();
        const newId = list.length > 0 ? Math.max(...list.map((a) => a.id || 0)) + 1 : 1;
        const newAcc = { ...acc, id: newId };
        list.push(newAcc);
        saveAccessories(list);
        return newId;
      },
      importAccessoriesBatch: async (accessoriesList: any[]) => {
        if (mockLocked) return { insertedCount: 0 };
        const list = getStoredAccessories();
        let inserted = 0;
        if (accessoriesList && Array.isArray(accessoriesList)) {
          for (const a of accessoriesList) {
            const newId = list.length > 0 ? Math.max(...list.map((x) => x.id || 0)) + 1 : 1;
            list.push({ ...a, id: newId });
            inserted++;
          }
        }
        saveAccessories(list);
        return { insertedCount: inserted };
      },
      updateAccessory: async (id: number, acc: any) => {
        if (mockLocked) return -1;
        const list = getStoredAccessories();
        const index = list.findIndex((a) => a.id === id);
        if (index !== -1) {
          list[index] = { ...acc, id };
          saveAccessories(list);
        }
        return id;
      },
      deleteAccessory: async (id: number) => {
        if (mockLocked) return -1;
        let list = getStoredAccessories();
        list = list.filter((a) => a.id !== id);
        saveAccessories(list);
        return id;
      },
      getComponents: async () => {
        if (mockLocked) return [];
        return getStoredComponents();
      },
      addComponent: async (comp: any) => {
        if (mockLocked) return -1;
        const list = getStoredComponents();
        const newId = list.length > 0 ? Math.max(...list.map((c) => c.id || 0)) + 1 : 1;
        const newComp = { ...comp, id: newId };
        list.push(newComp);
        saveComponents(list);
        return newId;
      },
      importComponentsBatch: async (componentsList: any[]) => {
        if (mockLocked) return { insertedCount: 0 };
        const list = getStoredComponents();
        let inserted = 0;
        if (componentsList && Array.isArray(componentsList)) {
          for (const c of componentsList) {
            const newId = list.length > 0 ? Math.max(...list.map((x) => x.id || 0)) + 1 : 1;
            list.push({ ...c, id: newId });
            inserted++;
          }
        }
        saveComponents(list);
        return { insertedCount: inserted };
      },
      updateComponent: async (id: number, comp: any) => {
        if (mockLocked) return -1;
        const list = getStoredComponents();
        const index = list.findIndex((c) => c.id === id);
        if (index !== -1) {
          list[index] = { ...comp, id };
          saveComponents(list);
        }
        return id;
      },
      deleteComponent: async (id: number) => {
        if (mockLocked) return -1;
        let list = getStoredComponents();
        list = list.filter((c) => c.id !== id);
        saveComponents(list);
        return id;
      },
      getSkus: async () => {
        const data = localStorage.getItem('mock_skus');
        return data ? JSON.parse(data) : {};
      },
      saveSkus: async (skus: CustomSkuDatabase) => {
        localStorage.setItem('mock_skus', JSON.stringify(skus));
        return true;
      },
      deleteSku: async (skuId: string) => {
        const data = localStorage.getItem('mock_skus');
        if (data) {
          const skus = JSON.parse(data);
          delete skus[skuId];
          localStorage.setItem('mock_skus', JSON.stringify(skus));
        }
        return skuId;
      },
      exportSkusCatalog: async () => {
        const data = localStorage.getItem('mock_skus');
        const skus = data ? JSON.parse(data) : {};
        return {
          format: 'armoryvault_sku_catalog',
          version: 1,
          exportedAt: new Date().toISOString(),
          itemCount: Object.keys(skus).length,
          skus,
        };
      },
      importSkusCatalog: async (importedData: any, mode: 'merge' | 'overwrite' = 'merge') => {
        const incoming = importedData?.skus || importedData || {};
        const currentData = localStorage.getItem('mock_skus');
        const current = currentData ? JSON.parse(currentData) : {};
        const merged = mode === 'overwrite' ? incoming : { ...current, ...incoming };
        localStorage.setItem('mock_skus', JSON.stringify(merged));
        return { success: true, count: Object.keys(merged).length };
      },
      getCustomSchedulePresets: async () => {
        const data = localStorage.getItem('mock_custom_presets');
        return data ? JSON.parse(data) : [];
      },
      saveCustomSchedulePresets: async (presets: any) => {
        localStorage.setItem('mock_custom_presets', JSON.stringify(presets));
        return true;
      },
      manufactureHandloadBatch: async (ammoId: number, quantity: number, deductions: any) => {
        console.log('Mock manufacture batch:', { ammoId, quantity, deductions });
        const ammo = getStoredAmmo();
        const aIndex = ammo.findIndex((a) => a.id === ammoId);
        if (aIndex !== -1) {
          ammo[aIndex].count = (ammo[aIndex].count || 0) + quantity;
          saveAmmo(ammo);
        }
        return { success: true };
      },
      savePhoto: async (sourcePath: string, filename: string) => {
        return sourcePath;
      },
      saveDocument: async (sourcePath: string, filename: string) => {
        return sourcePath;
      },
      saveBase64Document: async (_base64Data: string, filename: string) => {
        return `/mock/documents/${filename}`;
      },
      getBackupFolder: async () => null,
      selectBackupFolder: async () => '/mock/backup/path',
      createZipBackup: async () => {
        console.log('Mock zip backup');
        return { success: true, filePath: '/mock/backup.zip' };
      },
      restoreBackup: async () => {
        console.log('Mock restore backup');
        return { success: true };
      },
      getConfig: async (key: string) => {
        const config = JSON.parse(localStorage.getItem('mock_config') || '{}');
        return config[key];
      },
      setConfig: async (key: string, value: any) => {
        const config = JSON.parse(localStorage.getItem('mock_config') || '{}');
        config[key] = value;
        localStorage.setItem('mock_config', JSON.stringify(config));
      },
      selectAndSaveDocument: async () => ({ name: 'MockDoc.pdf', path: '/mock/path/MockDoc.pdf' }),
      selectAndSavePhoto: async () => {
        console.log('Mock select photo');
        return null;
      },
      openExternalFile: async (filePath: string) => {
        console.log('Mock open external file:', filePath);
      },
      printQRLabel: async (data: any) => {
        console.log('Mock print QR', data);
        return true;
      },
      saveQRImage: async (data: any) => {
        console.log('Mock save QR', data);
        return true;
      },
      readFileBase64: async (filePath: string) => {
        console.log('Mock read base64', filePath);
        return null;
      },
      readFileBuffer: async (filePath: string) => {
        console.log('Mock read buffer', filePath);
        return null;
      },
      generateBillOfSale: async (data: any) => {
        console.log('Mock generate BoS', data);
        return null;
      },
      generateInsuranceReport: async (data: any) => {
        console.log('Mock generate Insurance', data);
        return null;
      },
      generateArmoryBinder: async (data: any) => {
        console.log('Mock generate Armory Binder', data);
        return null;
      },
      generateWorkOrder: async (data: any) => {
        console.log('Mock generate Work Order', data);
        return null;
      },
      lookupFFL: async (params: any) => {
        const mockFFLs = [
          {
            id: 1,
            license_num: '1-54-001-01-4A-12345',
            business_name: 'Apex Tactical & Armory LLC',
            trade_name: 'Apex Armory',
            street: '1004 Tactical Way',
            city: 'Dallas',
            state: 'TX',
            zip: '75201',
            phone: '(214) 555-0199',
            standard_fee: 25,
          },
          {
            id: 2,
            license_num: '9-84-015-02-7B-67890',
            business_name: 'Heritage Arms & Curio Co.',
            trade_name: 'Heritage Gunsmithing',
            street: '450 Liberty Rd',
            city: 'Fort Worth',
            state: 'TX',
            zip: '76102',
            phone: '(817) 555-0144',
            standard_fee: 30,
          },
        ];
        return { success: true, count: mockFFLs.length, source: 'mock_database', data: mockFFLs };
      },
      lookupRanges: async (params: any) => {
        const mockRanges = [
          {
            id: 1,
            name: 'Eagle Eye Precision Shooting Complex',
            trade_name: 'Eagle Eye Range',
            range_type: 'Outdoor 1000yd / Tactical Bays',
            street: '8820 Marksman Rd',
            city: 'Dallas',
            state: 'TX',
            zip: '75201',
            phone: '(214) 555-0812',
            lane_fee: 20,
            amenities: '1000yd High Power, 50yd Pistol, Chrono Bay, Steel Targets',
            is_public: 1,
          },
          {
            id: 2,
            name: 'Lone Star Defense & Sportsman Club',
            trade_name: 'Lone Star Range',
            range_type: 'Indoor 25yd Tactical',
            street: '120 Sportsman Blvd',
            city: 'Fort Worth',
            state: 'TX',
            zip: '76102',
            phone: '(817) 555-0955',
            lane_fee: 25,
            amenities: 'Climate Controlled, Programmable Turning Targets, Action Bays',
            is_public: 1,
          },
        ];
        return {
          success: true,
          count: mockRanges.length,
          source: 'mock_database',
          data: mockRanges,
        };
      },
      lookupUPC: async (upc: string) => {
        return { items: [] };
      },
      selectCSVFile: async () => {
        return null;
      },
      exportData: async (dataString: string, filename: string) => {
        const blob = new Blob([dataString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return filename;
      },
      onUpdateMessage: (callback: (message: any) => void) => {
        return () => {};
      },
      restartApp: () => {
        window.location.reload();
      },
      openUrl: async (url: string) => {
        window.open(url, '_blank');
      },
      getPlatform: () => 'browser',
      saveBase64Photo: async (base64Data: string, filename: string) => null,
      getLocalIp: async () => '192.168.1.100',
      getAllLocalIps: async () => [
        { name: 'en0', address: '192.168.1.100', score: 150, isVirtual: false },
      ],
      getPairingInfo: async () => ({
        primaryIp: '192.168.1.100',
        fallbackIps: [],
        hostname: 'mock-desktop',
        port: 3456,
        token: 'mock-pairing-token-1234567890abcdef',
        qrData:
          'armoryvault://sync?ip=192.168.1.100&port=3456&token=mock-pairing-token-1234567890abcdef&host=mock-desktop',
        interfaces: [{ name: 'en0', address: '192.168.1.100', score: 150, isVirtual: false }],
      }),
      getPairingToken: async () => 'mock-pairing-token-1234567890abcdef',
      revokePairingToken: async () => true,
      getPairedDevices: async () => [
        {
          id: 'mock-device-companion',
          deviceName: 'Mobile Companion (Demo)',
          deviceType: 'ios',
          ipAddress: '192.168.1.189',
          pairedAt: new Date().toISOString(),
          lastActiveAt: new Date().toISOString(),
          isActive: true,
        },
      ],
      removePairedDevice: async () => true,
      unpairAllDevices: async () => true,
      onSyncReceived: (callback: () => void) => () => {},
      onDevicePaired:
        (callback: (data: { deviceName?: string; timestamp?: number }) => void) => () => {},
      onDeviceUnpaired: (callback: (data: any) => void) => () => {},
      onVaultLocked: (callback: () => void) => () => {},
      getSyncQueue: async () => [],
      removeSyncItem: async (id: number | string) => (typeof id === 'number' ? id : 1),
      clearSyncQueue: async () => true,
      rejectSyncItem: async () => 'mock-rejection-id',
      getRejectedSyncs: async () => [],
      confirmRejectedSyncs: async () => 0,

      // ── Storage Locations ──
      getStorageLocations: async () => [],
      addStorageLocation: async (loc: any) => 1,
      updateStorageLocation: async (id: number, loc: any) => 1,
      deleteStorageLocation: async (id: number) => 1,

      // ── Chrono Strings ──
      getChronoStrings: async () => [],
      addChronoString: async (cs: any) => 1,
      deleteChronoString: async (id: number) => 1,

      // ── Target Analyses ──
      getTargetAnalyses: async () => [],
      addTargetAnalysis: async (ta: any) => 1,
      deleteTargetAnalysis: async (id: number) => 1,

      // ── Load Ladder Tests ──
      getLoadLadderTests: async () => [],
      addLoadLadderTest: async (test: any) => 1,
      updateLoadLadderTest: async (id: number, test: any) => 1,
      deleteLoadLadderTest: async (id: number) => 1,

      // ── Ballistic Profiles ──
      getBallisticProfiles: async () => [],
      addBallisticProfile: async (profile: any) => 1,
      updateBallisticProfile: async (id: number, profile: any) => 1,
      deleteBallisticProfile: async (id: number) => 1,

      // ── Activity Log ──
      getActivityLog: async () => [],

      // ── Module Archiving & Restoration ──
      archiveModuleData: async (moduleId: string, dataKeys: string[]) => {
        const archives = JSON.parse(localStorage.getItem('av_mock_module_archives') || '{}');
        const extracted: Record<string, any> = {};
        let totalRecords = 0;
        const dataKeyCount: Record<string, number> = {};

        dataKeys.forEach((key) => {
          const item = localStorage.getItem(`av_${key}`);
          if (item) {
            try {
              const parsed = JSON.parse(item);
              extracted[key] = parsed;
              const count = Array.isArray(parsed) ? parsed.length : 1;
              dataKeyCount[key] = count;
              totalRecords += count;
              localStorage.removeItem(`av_${key}`);
            } catch (e) {}
          }
        });

        archives[moduleId] = {
          moduleId,
          archivedAt: new Date().toISOString(),
          totalRecords,
          dataKeyCount,
          data: extracted,
        };
        localStorage.setItem('av_mock_module_archives', JSON.stringify(archives));
        return { success: true, totalRecords, dataKeyCount };
      },

      restoreModuleData: async (moduleId: string) => {
        const archives = JSON.parse(localStorage.getItem('av_mock_module_archives') || '{}');
        const archive = archives[moduleId];
        if (!archive) return { success: false, error: 'No archive found' };
        if (archive.data) {
          Object.entries(archive.data).forEach(([k, v]) => {
            localStorage.setItem(`av_${k}`, JSON.stringify(v));
          });
        }
        return { success: true, restoredRecords: archive.totalRecords || 0 };
      },

      getModuleArchives: async () => {
        const archives = JSON.parse(localStorage.getItem('av_mock_module_archives') || '{}');
        const res: Record<string, any> = {};
        Object.keys(archives).forEach((k) => {
          const a = archives[k];
          res[k] = {
            moduleId: a.moduleId,
            archivedAt: a.archivedAt,
            totalRecords: a.totalRecords,
            dataKeyCount: a.dataKeyCount,
          };
        });
        return res;
      },

      downloadModule: async (moduleId: string) => {
        const disk = JSON.parse(
          localStorage.getItem('av_mock_disk_modules') ||
            '["reloading","maintenance","ballistics","nfa","boundbook"]'
        );
        if (!disk.includes(moduleId)) {
          disk.push(moduleId);
          localStorage.setItem('av_mock_disk_modules', JSON.stringify(disk));
        }
        return { success: true, moduleId };
      },

      deleteModuleFiles: async (moduleId: string) => {
        const disk = JSON.parse(
          localStorage.getItem('av_mock_disk_modules') ||
            '["reloading","maintenance","ballistics","nfa","boundbook"]'
        );
        const filtered = disk.filter((id: string) => id !== moduleId);
        localStorage.setItem('av_mock_disk_modules', JSON.stringify(filtered));
        return { success: true };
      },

      getInstalledDiskModules: async () => {
        return JSON.parse(
          localStorage.getItem('av_mock_disk_modules') ||
            '["reloading","maintenance","ballistics","nfa","boundbook"]'
        );
      },

      checkRemoteModules: async () => {
        return {
          success: true,
          repository: 'cook0001/ArmoryVault-Modules',
          version: '1.0.0',
          lastChecked: new Date().toISOString(),
          modules: {
            reloading: {
              id: 'reloading',
              name: 'Reloading Workbench',
              version: '1.0.0',
              category: 'bench',
              description:
                'Comprehensive reloading component inventory, batch manufacturing, and load development ladders.',
              dataKeys: ['components'],
              sizeKb: '25.6 KB',
            },
            maintenance: {
              id: 'maintenance',
              name: 'Armorer & Maintenance',
              version: '1.0.0',
              category: 'armorer',
              description:
                'Round count telemetry, cleaning schedules, service logs, optic zero registry, and parts ledger.',
              dataKeys: ['custom_schedule_presets'],
              sizeKb: '22.0 KB',
            },
            ballistics: {
              id: 'ballistics',
              name: 'Ballistics Calculator',
              version: '1.0.0',
              category: 'range',
              description:
                'Long-range exterior ballistics, trajectory tables, drop charts, wind deflection, and optic clicks.',
              dataKeys: ['ballistic_profiles'],
              sizeKb: '11.3 KB',
            },
            nfa: {
              id: 'nfa',
              name: 'NFA & Compliance Tracker',
              version: '1.0.0',
              category: 'compliance',
              description:
                'ATF Form 1 and Form 4 tracker, tax stamp status, trust beneficiary records, and CLEO notifications.',
              dataKeys: ['nfa_items'],
              sizeKb: '6.1 KB',
            },
            boundbook: {
              id: 'boundbook',
              name: 'FFL / C&R Bound Book',
              version: '1.0.0',
              category: 'compliance',
              description:
                'ATF-compliant acquisition and disposition record book for collectors, C&R holders, and FFL licensees.',
              dataKeys: ['bound_book_entries'],
              sizeKb: '6.5 KB',
            },
          },
        };
      },

      onModuleDownloadProgress: () => {
        return () => {};
      },
    };
  }
}
