import { Bluetooth, CheckCircle, Package, RefreshCw, Server, Smartphone, Trash2 } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BoxSizePromptModal,
  LanPairingModal,
  MaintenanceAlertBanner,
  PairSuccessToast,
  PayloadIngestModal,
  RejectSyncModal,
  RejectSyncTarget,
  SyncInboxItemCard,
  UnknownRouteModal,
  PairedDevicesTab,
} from '../components/sync';
import { BlePairingModal } from '../components/sync/modals/BlePairingModal';
import { useModules } from '../modules/registry/ModuleContext';
import { Ammo, Firearm, PairedDevice, ReloadingComponent, SyncItem } from '../types';
import { parseBarcodeData } from '../utils/BarcodeEngine';
import { parseCurrency, parseCurrencyOrNull } from '../utils/currency';
import { assignItemToStorage, saveStorageLocations } from '../utils/StorageSync';
import { ensureItemSku } from '../utils/skuEngine';

export const SyncInbox = () => {
  const [activeTab, setActiveTab] = useState<'inbox' | 'devices'>('inbox');
  const [queue, setQueue] = useState<SyncItem[]>([]);
  const [pairedDevices, setPairedDevices] = useState<PairedDevice[]>([]);
  const [isRefreshingDevices, setIsRefreshingDevices] = useState(false);
  const [serverPort, setServerPort] = useState(3456);
  const [hostname, setHostname] = useState('');
  const [syncQrUrl, setSyncQrUrl] = useState('');
  const [localIp, setLocalIp] = useState('');
  const [networkInterfaces, setNetworkInterfaces] = useState<
    Array<{ name: string; address: string; score: number; isVirtual: boolean }>
  >([]);
  const [isPairModalOpen, setIsPairModalOpen] = useState(false);
  const [isBleModalOpen, setIsBleModalOpen] = useState(false);
  const [pairSuccess, setPairSuccess] = useState<{ deviceName: string; timestamp: number } | null>(
    null
  );
  const pairTimerRef = useRef<number | null>(null);

  const [ammoList, setAmmoList] = useState<Ammo[]>([]);
  const [firearms, setFirearms] = useState<Firearm[]>([]);
  const [componentsList, setComponentsList] = useState<ReloadingComponent[]>([]);
  const [accessoriesList, setAccessoriesList] = useState<any[]>([]);
  const [skus, setSkus] = useState<Record<string, any>>({});
  const [pendingBoxSizePrompt, setPendingBoxSizePrompt] = useState<{
    item: SyncItem;
    target: any;
  } | null>(null);
  const [customBoxSize, setCustomBoxSize] = useState('50');
  const navigate = useNavigate();
  const location = useLocation();
  const { isInstalled, openModuleCenter } = useModules();
  const [isResolving, setIsResolving] = useState<number | null>(null);
  const [unknownRouteItem, setUnknownRouteItem] = useState<{ item: SyncItem; upc: string } | null>(
    null
  );
  const [maintenanceAlert, setMaintenanceAlert] = useState<{
    firearmId: number;
    firearmName: string;
    taskName: string;
    projectedRounds: number;
  } | null>(null);

  const [manualPayloadContent, setManualPayloadContent] = useState<string | null>(null);
  const [manualPayloadFilename, setManualPayloadFilename] = useState<string | undefined>(undefined);
  const [isManualPayloadModalOpen, setIsManualPayloadModalOpen] = useState(false);
  const [pendingRejectTarget, setPendingRejectTarget] = useState<RejectSyncTarget | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setManualPayloadFilename(file.name);
      setManualPayloadContent(text);
      setIsManualPayloadModalOpen(true);
    } catch (err) {
      console.error('[SyncInbox] Failed to read selected file:', err);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const getFirearmMaintenanceWarning = (firearm: Firearm, additionalRounds: number) => {
    const currentRounds = Number(firearm.round_count) || 0;
    const projectedRounds = currentRounds + additionalRounds;

    // 1. Check custom schedules
    if (firearm.maintenance_schedules && firearm.maintenance_schedules.length > 0) {
      for (const sched of firearm.maintenance_schedules) {
        if (sched.interval_rounds && sched.interval_rounds > 0) {
          const lastServicedRounds = sched.last_performed_rounds || 0;
          const roundsSince = projectedRounds - lastServicedRounds;
          if (roundsSince >= sched.interval_rounds) {
            return {
              taskName: sched.task_name,
              interval: sched.interval_rounds,
              projectedRounds,
              isOverdue: true,
            };
          }
        }
      }
    }

    // 2. Default clean threshold
    const threshold = firearm.maintenance_round_threshold || 500;
    const lastCleanLog = (firearm.logs || [])
      .filter((l) => l.type === 'Cleaning' || l.type === 'Repair')
      .slice(-1)[0];
    const lastCleanRounds = lastCleanLog
      ? Number((lastCleanLog as any).round_count_at_service) || 0
      : 0;
    const roundsSinceClean = projectedRounds - lastCleanRounds;

    if (roundsSinceClean >= threshold) {
      return {
        taskName: 'Clean & Lubricate Service',
        interval: threshold,
        projectedRounds,
        isOverdue: true,
      };
    }

    return null;
  };

  const isPairModalOpenRef = useRef(isPairModalOpen);
  isPairModalOpenRef.current = isPairModalOpen;
  const lastPairToastRef = useRef<{ deviceName: string; time: number } | null>(null);

  const handlePairSuccess = (deviceName = 'Mobile Companion App') => {
    setIsPairModalOpen(false);

    // Throttle toast display: prevent repeated toast popups for the same device within 15 seconds
    const now = Date.now();
    if (
      lastPairToastRef.current &&
      lastPairToastRef.current.deviceName === deviceName &&
      now - lastPairToastRef.current.time < 15000
    ) {
      return;
    }
    lastPairToastRef.current = { deviceName, time: now };

    // Retain user's currently selected tab (inbox or devices)
    setPairSuccess({ deviceName, timestamp: now });

    if (pairTimerRef.current) {
      clearTimeout(pairTimerRef.current);
    }
    pairTimerRef.current = window.setTimeout(() => {
      setPairSuccess(null);
      pairTimerRef.current = null;
    }, 3800);
  };

  useEffect(() => {
    loadData();
    generateQr();

    if (location.state && (location.state as any).openPairModal) {
      setIsPairModalOpen(true);
    }

    let unsubscribeSync: (() => void) | undefined;
    let unsubscribePair: (() => void) | undefined;
    let unsubscribeUnpair: (() => void) | undefined;

    if (window.api && window.api.onSyncReceived) {
      unsubscribeSync = window.api.onSyncReceived(() => {
        loadData();
        if (isPairModalOpenRef.current) {
          handlePairSuccess('Mobile Device');
        }
      });
    }

    if (window.api && window.api.onDevicePaired) {
      unsubscribePair = window.api.onDevicePaired((data) => {
        fetchPairedDevices();

        // Only show the popup toast if:
        // 1. The user explicitly opened the QR Pairing modal (waiting for a scan), OR
        // 2. This device is brand-new (data.isNew === true)
        const isModalOpen = isPairModalOpenRef.current;
        const isNewDevice = data?.isNew === true;
        if (isModalOpen || isNewDevice) {
          handlePairSuccess(data?.deviceName || 'Mobile Companion App');
        }
      });
    }

    if (window.api && window.api.onDeviceUnpaired) {
      unsubscribeUnpair = window.api.onDeviceUnpaired(() => {
        fetchPairedDevices();
      });
    }

    return () => {
      if (unsubscribeSync) unsubscribeSync();
      if (unsubscribePair) unsubscribePair();
      if (unsubscribeUnpair) unsubscribeUnpair();
      if (pairTimerRef.current) clearTimeout(pairTimerRef.current);
    };
  }, [location.state]);

  const fetchPairedDevices = async () => {
    if (window.api && window.api.getPairedDevices) {
      setIsRefreshingDevices(true);
      try {
        const devs = await window.api.getPairedDevices();
        setPairedDevices(devs || []);
      } catch (err) {
        console.error('[SyncInbox] Failed to load paired devices:', err);
      } finally {
        setIsRefreshingDevices(false);
      }
    }
  };

  const handleUnpairDevice = async (id: string, name: string) => {
    if (!window.api || !window.api.removePairedDevice) return;
    if (window.confirm(`Are you sure you want to unpair "${name}"? This device will lose sync access until paired again.`)) {
      await window.api.removePairedDevice(id);
      await fetchPairedDevices();
    }
  };

  const handleUnpairAll = async () => {
    if (!window.api || !window.api.unpairAllDevices) return;
    if (window.confirm('Are you sure you want to unpair ALL mobile devices? All paired companions will need to be re-paired.')) {
      await window.api.unpairAllDevices();
      await fetchPairedDevices();
    }
  };

  const loadData = async () => {
    fetchPairedDevices();
    if (window.api) {
      const ammo = await window.api.getAmmo();
      setAmmoList(ammo);
      const f = await window.api.getFirearms();
      setFirearms(f);
      let c: any[] = [];
      if (window.api.getComponents) {
        c = await window.api.getComponents();
        setComponentsList(c);
      }
      let acc: any[] = [];
      if (window.api.getAccessories) {
        acc = await window.api.getAccessories();
        setAccessoriesList(acc);
      }
      if (window.api.getSkus) {
        const s = await window.api.getSkus();
        setSkus(s || {});
      }

      const q = await window.api.getSyncQueue();
      // Pre-categorize universal scans if they already exist in inventory
      const processedQueue = q.map((item: any) => {
        if (item.type === 'universal_scan') {
          const upcOrId = String(item.upcOrId);
          if (upcOrId.startsWith('AV-AMMO-')) {
            const ammoId = parseInt(upcOrId.replace('AV-AMMO-', ''));
            if (ammo.some((a: any) => a.id === ammoId)) {
              return { ...item, type: 'ammo_adjustment', upcOrId: String(ammoId) };
            }
          }
          if (ammo.some((a: any) => String(a.id) === upcOrId || a.upc_code === upcOrId)) {
            return { ...item, type: 'ammo_adjustment' };
          }
          if (c.some((comp: any) => String(comp.id) === upcOrId || comp.upc_code === upcOrId)) {
            return { ...item, type: 'component_adjustment' };
          }
          if (
            acc.some(
              (a: any) =>
                String(a.id) === upcOrId ||
                a.serialNumber === upcOrId ||
                (a.notes && a.notes.includes(upcOrId))
            )
          ) {
            return { ...item, type: 'accessory_adjustment' };
          }
        }
        return item;
      });
      setQueue(processedQueue);
    }
  };

  const generateQr = async (overrideIp?: string) => {
    if (window.api) {
      let qrData = '';
      let activeIp = overrideIp || '127.0.0.1';

      if (window.api.getPairingInfo) {
        const info = await window.api.getPairingInfo();
        setNetworkInterfaces(info.interfaces || []);
        if (info.port) setServerPort(info.port);
        if (info.hostname) setHostname(info.hostname);
        if (overrideIp) {
          activeIp = overrideIp;
          const tokenParam = info.token ? `&token=${encodeURIComponent(info.token)}` : '';
          const hostParam = info.hostname ? `&host=${encodeURIComponent(info.hostname)}` : '';
          const otherIps = (info.interfaces || [])
            .map((i) => i.address)
            .filter((a) => a !== activeIp);
          const fallbacksParam =
            otherIps.length > 0 ? `&fallbacks=${encodeURIComponent(otherIps.join(','))}` : '';
          qrData = `armoryvault://sync?ip=${activeIp}&port=${info.port || 3456}${tokenParam}${fallbacksParam}${hostParam}`;
        } else {
          activeIp = info.primaryIp;
          qrData = info.qrData;
        }
      } else {
        const ip = await window.api.getLocalIp();
        let token = '';
        if (window.api.getPairingToken) {
          token = (await window.api.getPairingToken()) || '';
        }
        activeIp = overrideIp || ip || '127.0.0.1';
        const tokenParam = token ? `&token=${encodeURIComponent(token)}` : '';
        qrData = `armoryvault://sync?ip=${activeIp}&port=3456${tokenParam}`;
      }

      setLocalIp(activeIp);
      const QRCode = (await import('qrcode')).default;
      const url = await QRCode.toDataURL(qrData, {
        width: 320,
        margin: 1,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      });
      setSyncQrUrl(url);
    }
  };

  const handleResolveUniversal = async (item: SyncItem) => {
    setIsResolving(item.id!);
    try {
      const upcOrId = String(item.upcOrId);

      // 1. Check Custom SKU Dictionary first
      if (skus) {
        const matchedSkuKey = Object.keys(skus).find(
          (k) => k.trim().toUpperCase() === upcOrId.trim().toUpperCase()
        );
        if (matchedSkuKey) {
          const skuData = skus[matchedSkuKey];
          const cat =
            skuData.category ||
            (skuData.accessoryType ? 'accessory' : skuData.componentType ? 'component' : 'ammo');

          if (cat === 'accessory') {
            await window.api.removeSyncItem(item.id!);
            navigate('/accessories', {
              state: {
                openAddModal: true,
                upc: matchedSkuKey,
                initialData: {
                  type: skuData.accessoryType || 'Optic',
                  manufacturer: skuData.manufacturer || '',
                  model: skuData.model || '',
                  caliber: skuData.caliber || skuData.supportedModels || '',
                  supportedModels: skuData.supportedModels || '',
                  value: skuData.value,
                  notes: skuData.notes,
                },
                syncItemId: item.id,
              },
            });
            return;
          } else if (cat === 'component') {
            await window.api.removeSyncItem(item.id!);
            navigate('/components', {
              state: {
                openAddModal: true,
                upc: matchedSkuKey,
                parsedData: {
                  type: skuData.componentType || 'Powder',
                  manufacturer: skuData.manufacturer || '',
                  name: skuData.name || '',
                  caliber: skuData.caliber || '',
                  quantity: skuData.quantity || 0,
                  cost: skuData.cost,
                  weightUnit: skuData.weightUnit,
                },
                syncItemId: item.id,
              },
            });
            return;
          } else if (cat === 'ammo') {
            await window.api.removeSyncItem(item.id!);
            navigate('/ammo', {
              state: {
                openAddModal: true,
                upc: matchedSkuKey,
                parsedData: {
                  manufacturer: skuData.manufacturer || '',
                  caliber: skuData.caliber || '',
                  grain: skuData.grain,
                  projectile: skuData.projectile || '',
                  isPlusP: skuData.isPlusP,
                  count: skuData.count,
                  boxPrice: skuData.boxPrice,
                  costPerRound: skuData.costPerRound,
                },
                syncItemId: item.id,
              },
            });
            return;
          }
        }
      }

      // 1b. Check if upcOrId is a LoadBench / ArmoryVault Handload QR or JSON payload
      if (
        upcOrId.trim().startsWith('{') ||
        upcOrId.includes('"type":"handload"') ||
        upcOrId.includes('LoadBench') ||
        upcOrId.includes('load_project')
      ) {
        const parsedHandload = parseBarcodeData(upcOrId, ammoList);
        if (parsedHandload.category === 'ammo' && parsedHandload.parsedAmmo) {
          await window.api.removeSyncItem(item.id!);
          navigate('/ammo', {
            state: {
              openAddModal: true,
              upc: parsedHandload.parsedAmmo.upc_code || upcOrId,
              parsedData: parsedHandload.parsedAmmo,
              syncItemId: item.id,
            },
          });
          return;
        }
      }

      // 2. Fallback to online lookup
      const data = await window.api.lookupUPC(upcOrId);

      let parsedData: any = { category: 'unknown', upcOrId };

      if (data && data.items && data.items.length > 0) {
        parsedData = parseBarcodeData(data.items[0], ammoList);
        parsedData.upcOrId = upcOrId;
      }

      if (parsedData.category === 'ammo') {
        await window.api.removeSyncItem(item.id!);
        navigate('/ammo', {
          state: {
            openAddModal: true,
            upc: upcOrId,
            parsedData: parsedData.parsedAmmo,
            syncItemId: item.id,
          },
        });
      } else if (parsedData.category === 'component') {
        await window.api.removeSyncItem(item.id!);
        navigate('/components', {
          state: {
            openAddModal: true,
            upc: upcOrId,
            parsedData: parsedData.parsedComponent,
            syncItemId: item.id,
          },
        });
      } else if (parsedData.category === 'accessory') {
        await window.api.removeSyncItem(item.id!);
        navigate('/accessories', {
          state: {
            openAddModal: true,
            upc: upcOrId,
            parsedData: parsedData.parsedAccessory,
            syncItemId: item.id,
          },
        });
      } else {
        setUnknownRouteItem({ item, upc: upcOrId });
        setIsResolving(null);
      }
    } catch (e: any) {
      console.error(e);
      setUnknownRouteItem({ item, upc: String(item.upcOrId) });
      setIsResolving(null);
    }
  };

  const finalizeApprove = async (item: SyncItem, target: any, multiplier: number) => {
    if (item.type === 'ammo_adjustment') {
      const currentCount = parseInt(target.count as any) || 0;
      const adjustment = (parseInt(item.count as any) || 0) * multiplier;
      if (item.action === 'add') target.count = currentCount + adjustment;
      else if (item.action === 'remove') target.count = Math.max(0, currentCount - adjustment);
      if (item.data && typeof item.data.isPlusP === 'boolean') {
        target.isPlusP = item.data.isPlusP;
      }
      await window.api.updateAmmo(target.id!, target);

      const fId = Number(
        (item as any).firearmId ||
          (item as any).firearm_id ||
          (item.data && ((item.data as any).firearmId || (item.data as any).firearm_id))
      );
      if (fId && item.action === 'remove' && adjustment > 0) {
        const firearm = firearms.find((f) => f.id === fId);
        if (firearm) {
          const newRoundCount = (Number(firearm.round_count) || 0) + adjustment;
          const updatedFirearm = { ...firearm, round_count: newRoundCount };
          await window.api.updateFirearm(firearm.id!, updatedFirearm);

          const warn = getFirearmMaintenanceWarning(firearm, adjustment);
          if (warn) {
            setMaintenanceAlert({
              firearmId: firearm.id!,
              firearmName: `${firearm.make} ${firearm.model}`,
              taskName: warn.taskName,
              projectedRounds: warn.projectedRounds,
            });
          }
        }
      }
    } else if (item.type === 'component_adjustment') {
      const currentCount = parseInt(target.quantity as any) || 0;
      const adjustment = (parseInt(item.count as any) || 0) * multiplier;
      if (item.action === 'add') target.quantity = currentCount + adjustment;
      else if (item.action === 'remove') target.quantity = Math.max(0, currentCount - adjustment);
      await window.api.updateComponent(target.id!, target);
    }
    await window.api.removeSyncItem(item.id!);
    loadData();
  };

  const saveCustomBoxSize = async () => {
    if (!pendingBoxSizePrompt) return;
    const { item, target } = pendingBoxSizePrompt;
    const size = parseInt(customBoxSize) || 1;

    // Save to skus DB for future
    const upc = target.upc_code || String(item.upcOrId);
    if (upc) {
      const currentDbSkus = window.api && window.api.getSkus ? await window.api.getSkus() : skus;
      const newSkus = { ...currentDbSkus, [upc]: { ...(currentDbSkus[upc] || {}), count: size } };
      await window.api.saveSkus(newSkus);
      setSkus(newSkus);
    }

    setPendingBoxSizePrompt(null);
    await finalizeApprove(item, target, size);
  };

  const handleApprove = async (item: SyncItem) => {
    if (!window.api) return;

    if (item.type === 'ammo_adjustment') {
      const upcOrId = String(item.upcOrId);
      const ammo = ammoList.find(
        (a) => String(a.id) === upcOrId || a.upc_code === upcOrId || a.sku === upcOrId
      );
      if (ammo) {
        await ensureItemSku(ammo, 'ammo', window.api);
        if (item.measurement === 'rds' || item.measurement === 'lbs') {
          return finalizeApprove(item, ammo, 1);
        }

        let boxSize = 0;
        const ammoIdentifier = ammo.upc_code || ammo.sku;
        if (ammoIdentifier && skus[ammoIdentifier] && skus[ammoIdentifier].count) {
          boxSize = skus[ammoIdentifier].count;
        }

        if (boxSize === 0) {
          try {
            const data = await window.api.lookupUPC(upcOrId);
            if (data && data.items && data.items.length > 0) {
              const parsed = parseBarcodeData(data.items[0], ammoList);
              if (parsed.parsedAmmo && parsed.parsedAmmo.count) {
                boxSize = parsed.parsedAmmo.count;
                if (ammoIdentifier) {
                  const currentDbSkus =
                    window.api && window.api.getSkus ? await window.api.getSkus() : skus;
                  const newSkus = {
                    ...currentDbSkus,
                    [ammoIdentifier]: { ...(currentDbSkus[ammoIdentifier] || {}), count: boxSize },
                  };
                  await window.api.saveSkus(newSkus);
                  setSkus(newSkus);
                }
              }
            }
          } catch (e) {}
        }

        if (boxSize === 0) {
          setPendingBoxSizePrompt({ item, target: ammo });
          return;
        }

        return finalizeApprove(item, ammo, boxSize);
      }
    } else if (item.type === 'component_adjustment') {
      if (!isInstalled('reloading')) {
        openModuleCenter('reloading');
        return;
      }
      const upcOrId = String(item.upcOrId);
      const component = componentsList.find(
        (c) => String(c.id) === upcOrId || c.upc_code === upcOrId || (c as any).sku === upcOrId
      );
      if (component) {
        await ensureItemSku(component, 'component', window.api);
        if (item.measurement === 'rds' || item.measurement === 'lbs') {
          return finalizeApprove(item, component, 1);
        } else if (item.measurement === 'brick' || component.type === 'Primer') {
          return finalizeApprove(item, component, 1000);
        }

        let unitSize = 0;
        const compIdentifier = component.upc_code || (component as any).sku;
        if (compIdentifier && skus[compIdentifier] && skus[compIdentifier].count) {
          unitSize = skus[compIdentifier].count;
        }

        if (unitSize === 0) {
          try {
            const data = await window.api.lookupUPC(upcOrId);
            if (data && data.items && data.items.length > 0) {
              const parsed = parseBarcodeData(data.items[0], ammoList);
              if (parsed.parsedComponent && parsed.parsedComponent.quantity) {
                unitSize = parsed.parsedComponent.quantity;
                if (compIdentifier) {
                  const currentDbSkus =
                    window.api && window.api.getSkus ? await window.api.getSkus() : skus;
                  const newSkus = {
                    ...currentDbSkus,
                    [compIdentifier]: {
                      ...(currentDbSkus[compIdentifier] || {}),
                      count: unitSize,
                    },
                  };
                  await window.api.saveSkus(newSkus);
                  setSkus(newSkus);
                }
              }
            }
          } catch (e) {}
        }

        if (unitSize === 0) {
          if (component.type === 'Bullet' || component.type === 'Brass') {
            setPendingBoxSizePrompt({ item, target: component });
            return;
          } else {
            unitSize = 1;
          }
        }

        return finalizeApprove(item, component, unitSize);
      }
    } else if (item.type === 'accessory_adjustment') {
      const upcOrId = String(item.upcOrId);
      const acc = accessoriesList.find(
        (a: any) =>
          String(a.id) === upcOrId ||
          a.serialNumber === upcOrId ||
          a.sku === upcOrId ||
          a.upc === upcOrId ||
          (a.notes && a.notes.includes(upcOrId))
      );
      if (acc) {
        await ensureItemSku(acc, 'accessory', window.api);
        const currentCount = parseInt(acc.quantity as any) || 0;
        const adjustment = parseInt(item.count as any) || 0;
        if (item.action === 'add') {
          acc.quantity = currentCount + adjustment;
        } else if (item.action === 'remove') {
          acc.quantity = Math.max(0, currentCount - adjustment);
        }
        await window.api.updateAccessory(acc.id!, acc);
        await window.api.removeSyncItem(item.id!);
        loadData();
      }
    } else if (item.type === 'firearm_log') {
      const fId = Number((item as any).firearmId);
      const firearm = firearms.find((f) => f.id === fId);
      if (firearm) {
        let image_path = '';
        if ((item as any).photoBase64) {
          const ext = (item as any).photoBase64.split(';')[0].split('/')[1] || 'jpg';
          const filename = `photo_${Date.now()}_log.${ext}`;
          image_path =
            (await window.api.saveBase64Photo((item as any).photoBase64, filename)) || '';
        }

        const newLog: any = {
          id: Date.now(),
          date: new Date(item.timestamp).toISOString().split('T')[0],
          type: (item as any).logType === 'maintenance' ? 'Cleaning' : 'Range',
          notes: (item as any).notes || '',
          rounds_fired: parseInt((item as any).roundCount) || 0,
          image_path: image_path || undefined,
        };

        const updatedLogs = [...(firearm.logs || []), newLog];
        await window.api.updateFirearm(fId, { ...firearm, logs: updatedLogs });
        await window.api.removeSyncItem(item.id!);
        loadData();
      }
    } else if (item.type === 'firearm_photo') {
      const fId = Number((item as any).firearmId);
      const firearm = firearms.find((f) => f.id === fId);
      if (firearm && (item as any).photoBase64) {
        const ext = (item as any).photoBase64.split(';')[0].split('/')[1] || 'jpg';
        const filename = `photo_${Date.now()}_firearm.${ext}`;
        const image_path = await window.api.saveBase64Photo((item as any).photoBase64, filename);

        if (image_path) {
          const updatedPhotos = [...(firearm.photos || []), image_path];
          await window.api.updateFirearm(fId, { ...firearm, photos: updatedPhotos });
        }
        await window.api.removeSyncItem(item.id!);
        loadData();
      }
    } else if (item.type === 'range_session') {
      const fId = Number(item.firearm_id);
      const aId = item.ammo_id ? Number(item.ammo_id) : undefined;
      const rounds = Number(item.rounds_fired || item.count) || 0;

      if (window.api && window.api.logRangeSession) {
        await window.api.logRangeSession({
          firearm_id: fId,
          ammo_id: aId,
          rounds_fired: rounds,
          date: item.date || new Date(item.timestamp).toISOString().split('T')[0],
          notes: item.notes || '',
          cost: parseCurrency(item.cost),
          location: item.location || '',
        });

        // Also record target grouping telemetry if bundled in session
        if (item.group_metrics && window.api.addTargetAnalysis) {
          await window.api.addTargetAnalysis({
            distance_yards: item.group_metrics.distanceYards || item.distance_yards || 100,
            moa: item.group_metrics.moa,
            extreme_spread_inches:
              item.group_metrics.extremeSpreadInches || item.group_metrics.extreme_spread_in,
            mean_radius_inches: item.group_metrics.meanRadiusInches,
            shot_count: item.group_metrics.shotCount || rounds,
            date: item.date || new Date(item.timestamp).toISOString().split('T')[0],
            optic_name: item.optic_name,
            notes: `Range Session (${rounds} rds)${item.location ? ` @ ${item.location}` : ''}`,
            photo_path: item.target_photo_path || item.photo_path || item.photoBase64,
          });
        }

        // Also record chronograph shot string telemetry if bundled
        if (item.chrono_data && window.api.addChronoString) {
          const avg = item.chrono_data.averageVelocity ?? item.chrono_data.avg;
          const sd = item.chrono_data.standardDeviation ?? item.chrono_data.sd;
          const es = item.chrono_data.extremeSpread ?? item.chrono_data.es;
          const shots = item.chrono_data.shotVelocities ?? item.chrono_data.shots ?? [];
          await window.api.addChronoString({
            ...item.chrono_data,
            firearm_id: fId,
            firearmId: fId,
            ammo_id: aId,
            ammoId: aId,
            ammoLabel: item.ammo_name,
            averageVelocity: avg,
            avg: avg,
            standardDeviation: sd,
            sd: sd,
            extremeSpread: es,
            es: es,
            shotVelocities: shots,
            shots: shots,
            date:
              item.chrono_data.date ||
              item.date ||
              new Date(item.timestamp).toISOString().split('T')[0],
          });
        }

        await window.api.removeSyncItem(item.id!);

        const firearm = firearms.find((f) => f.id === fId);
        if (firearm && rounds > 0) {
          const warn = getFirearmMaintenanceWarning(firearm, rounds);
          if (warn) {
            setMaintenanceAlert({
              firearmId: firearm.id!,
              firearmName: `${firearm.make} ${firearm.model}`,
              taskName: warn.taskName,
              projectedRounds: warn.projectedRounds,
            });
          }
        }

        loadData();
      }
    } else if (item.type === 'firearm_maintenance') {
      const fId = Number(item.firearm_id);
      const firearm = firearms.find((f) => f.id === fId);
      if (firearm && window.api && window.api.updateFirearm) {
        const logNote = `[Maintenance] ${item.notes || (item as any).service_type || 'Service performed'} on ${item.date || new Date().toLocaleDateString()}`;
        const updatedNotes = firearm.notes ? `${firearm.notes}\n${logNote}` : logNote;
        const newLog: any = {
          id: Date.now(),
          date: item.date || new Date(item.timestamp || Date.now()).toISOString().split('T')[0],
          type: (item as any).service_type || 'Cleaning',
          notes: item.notes || 'Service performed',
          rounds_fired: parseInt((item as any).roundCount || (item as any).round_count) || 0,
          round_count_at_service: Number(firearm.round_count) || 0,
        };
        const updatedLogs = [...(firearm.logs || []), newLog];
        await window.api.updateFirearm(fId, { ...firearm, logs: updatedLogs, notes: updatedNotes });
      }
      await window.api.removeSyncItem(item.id!);
      loadData();
    } else if (item.type === 'optic_zero_update') {
      const data: any = item.data || item;
      const opticId =
        data.optic_id || data.opticId || (item as any).optic_id || (item as any).opticId;
      const opticName =
        data.optic_name ||
        data.opticName ||
        data.name ||
        (item as any).optic_name ||
        (item as any).opticName ||
        'Optic';

      const allAcc = window.api.getAccessories ? await window.api.getAccessories() : accessoriesList;
      const acc = (allAcc || []).find(
        (a: any) =>
          (opticId && String(a.id) === String(opticId)) ||
          (data.serialNumber &&
            a.serialNumber &&
            a.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()) ||
          (a.name && opticName && a.name.toLowerCase() === opticName.toLowerCase()) ||
          (a.model && opticName && a.model.toLowerCase() === opticName.toLowerCase())
      );

      const zeroDistance =
        data.zero_distance_yards ||
        data.zero_distance ||
        data.zeroDistance ||
        (item as any).zero_distance_yards ||
        (item as any).zero_distance ||
        100;

      const clickValue =
        data.click_value || data.clickValue || (item as any).click_value || '1/4 MOA';

      const dateStr =
        data.date ||
        data.last_zero_date ||
        new Date(item.timestamp || Date.now()).toISOString().split('T')[0];

      if (acc && acc.id !== undefined && window.api.updateAccessory) {
        const zeroNote = `[Zero Update] ${zeroDistance} yds, ${clickValue} on ${dateStr}${data.notes ? ` - ${data.notes}` : ''}`;
        const updatedNotes = acc.notes ? `${acc.notes}\n${zeroNote}` : zeroNote;
        const updatedAcc = {
          ...acc,
          zeroDistance,
          clickValue,
          lastZeroDate: dateStr,
          notes: updatedNotes,
        };
        await window.api.updateAccessory(acc.id, updatedAcc);
      }

      const fId = Number(
        data.firearm_id || data.firearmId || (item as any).firearm_id || (item as any).firearmId
      );
      if (fId) {
        const freshFirearms = await window.api.getFirearms();
        const targetFirearm = (freshFirearms || []).find((f: any) => f.id === fId);
        if (targetFirearm && targetFirearm.id !== undefined && window.api.updateFirearm) {
          const newLog: any = {
            id: Date.now(),
            date: dateStr,
            type: 'Maintenance',
            notes: `Optic Zeroed: ${acc ? acc.name || acc.model : opticName} at ${zeroDistance} yds (${clickValue})${data.notes ? ` - ${data.notes}` : ''}`,
            rounds_fired: 0,
          };
          const updatedLogs = [...(targetFirearm.logs || []), newLog];
          await window.api.updateFirearm(targetFirearm.id, { ...targetFirearm, logs: updatedLogs });
        }
      }

      await window.api.removeSyncItem(item.id!);
      loadData();
    } else if (item.type === 'bill_of_sale_transfer') {
      const fId = Number(item.firearm_id);
      const serial = item.serial_number ? String(item.serial_number).trim().toLowerCase() : '';
      const firearm = firearms.find(
        (f) =>
          (fId && f.id === fId) ||
          (serial && f.serial_number && f.serial_number.trim().toLowerCase() === serial)
      );
      if (firearm && window.api && window.api.updateFirearm) {
        let savedDocPath = '';
        if (item.pdf_base64 && window.api.saveBase64Document) {
          const filename = item.pdf_filename || `BillOfSale_${item.transfer_id || Date.now()}.pdf`;
          savedDocPath = (await window.api.saveBase64Document(item.pdf_base64, filename)) || '';
        }

        const existingDocs = firearm.documents || [];
        const newDocs = [...existingDocs];
        if (savedDocPath) {
          newDocs.push({
            name: `Bill of Sale (${item.transfer_id || 'Signed'})`,
            path: savedDocPath,
            date_added: item.date || new Date().toISOString().split('T')[0],
          });
        }

        const transferNote = `[SOLD / TRANSFERRED] Transferred to ${item.buyer_name || 'Buyer'} (DL: ${item.buyer_dl || 'On File'}) for $${item.sale_price || 0} on ${item.date || new Date().toLocaleDateString()}. Bill of Sale ID: ${item.transfer_id || 'N/A'}`;
        const updatedNotes = firearm.notes ? `${firearm.notes}\n${transferNote}` : transferNote;

        await window.api.updateFirearm(firearm.id!, {
          ...firearm,
          is_sold: true,
          sold_date: item.date || new Date().toISOString().split('T')[0],
          sold_to_name: item.buyer_name || 'Buyer',
          sold_price: parseCurrency(item.sale_price),
          sale_notes: item.notes || '',
          condition: 'Sold / Transferred',
          notes: updatedNotes,
          documents: newDocs,
        });
      }
      await window.api.removeSyncItem(item.id!);
      loadData();
    } else if (item.type === 'chrono_string') {
      const chrono = (item as any).chrono_data || item;
      if (window.api && window.api.addChronoString) {
        await window.api.addChronoString(chrono);
      }
      await window.api.removeSyncItem(item.id!);
      loadData();
    } else if (item.type === 'target_analysis') {
      const target = (item as any).target_data || item;
      if (window.api && window.api.addTargetAnalysis) {
        await window.api.addTargetAnalysis(target);
      }
      await window.api.removeSyncItem(item.id!);
      loadData();
    } else if (item.type === 'new_firearm') {
      const data: any = item.data || item;
      const make = data.make || '';
      const model = data.model || '';
      const caliber = data.caliber || '';
      const serial_number = data.serial_number || '';

      const freshFirearms = await window.api.getFirearms();
      // Check if duplicate serial already exists
      const existing = (freshFirearms || []).find(
        (f: any) =>
          serial_number &&
          f.serial_number &&
          f.serial_number.trim().toLowerCase() === serial_number.trim().toLowerCase()
      );

      const savedPhotos: string[] = [];
      if (data.photosBase64 && Array.isArray(data.photosBase64)) {
        for (let i = 0; i < data.photosBase64.length; i++) {
          const b64 = data.photosBase64[i];
          const ext = b64.split(';')[0].split('/')[1] || 'jpg';
          const filename = `firearm_${Date.now()}_${i}.${ext}`;
          const savedPath = await window.api.saveBase64Photo(b64, filename);
          if (savedPath) savedPhotos.push(savedPath);
        }
      } else if (data.photoBase64) {
        const ext = data.photoBase64.split(';')[0].split('/')[1] || 'jpg';
        const filename = `firearm_${Date.now()}.${ext}`;
        const savedPath = await window.api.saveBase64Photo(data.photoBase64, filename);
        if (savedPath) savedPhotos.push(savedPath);
      }

      const { photosBase64: _pB64, photoBase64: _pOne, firearmId: _fId, id: _ignoreId, ...cleanData } = data;

      if (existing && existing.id !== undefined) {
        const existingPhotos = existing.photos || [];
        const mergedPhotos = Array.from(new Set([...existingPhotos, ...savedPhotos]));
        const updated = {
          ...existing,
          ...cleanData,
          id: existing.id,
          purchase_price:
            cleanData.purchase_price !== undefined
              ? parseCurrencyOrNull(cleanData.purchase_price)
              : existing.purchase_price,
          sold_price:
            cleanData.sold_price !== undefined
              ? parseCurrencyOrNull(cleanData.sold_price)
              : existing.sold_price,
          photos: mergedPhotos,
          image_path: existing.image_path || (mergedPhotos.length > 0 ? mergedPhotos[0] : ''),
        };
        await window.api.updateFirearm(existing.id, updated);
      } else {
        const newFirearm: any = {
          ...cleanData,
          make,
          model,
          serial_number,
          caliber,
          action_type: data.action_type || '',
          firearm_type: data.firearm_type || '',
          barrel_length: data.barrel_length || '',
          finish: data.finish || '',
          condition: data.condition || 'Excellent',
          purchase_price: parseCurrencyOrNull(data.purchase_price),
          purchase_date: data.purchase_date || '',
          purchased_from: data.purchased_from || '',
          notes: data.notes || '',
          is_nfa: !!data.is_nfa,
          nfa_type: data.nfa_type || '',
          image_path: savedPhotos.length > 0 ? savedPhotos[0] : '',
          photos: savedPhotos,
          is_sold: false,
        };
        const newId = await window.api.addFirearm(newFirearm);

        if (data.storageLocationId && window.api.getStorageLocations) {
          const locs = await window.api.getStorageLocations();
          const updatedLocs = assignItemToStorage(
            'firearm',
            newId,
            Number(data.storageLocationId),
            locs || []
          );
          await saveStorageLocations(updatedLocs);
        }
      }

      await window.api.removeSyncItem(item.id!);
      loadData();
    } else if (item.type === 'firearm_update') {
      const data: any = item.data || item;
      const fId = Number(data.firearmId || (item as any).firearmId || data.id);
      const serial_number = data.serial_number || '';

      const freshFirearms = await window.api.getFirearms();
      const firearm = (freshFirearms || []).find(
        (f: any) =>
          (fId && f.id === fId) ||
          (serial_number &&
            f.serial_number &&
            f.serial_number.trim().toLowerCase() === serial_number.trim().toLowerCase())
      );

      const savedPhotos: string[] = [];
      if (data.photosBase64 && Array.isArray(data.photosBase64)) {
        for (let i = 0; i < data.photosBase64.length; i++) {
          const b64 = data.photosBase64[i];
          const ext = b64.split(';')[0].split('/')[1] || 'jpg';
          const filename = `firearm_${Date.now()}_${i}.${ext}`;
          const savedPath = await window.api.saveBase64Photo(b64, filename);
          if (savedPath) savedPhotos.push(savedPath);
        }
      } else if (data.photoBase64) {
        const ext = data.photoBase64.split(';')[0].split('/')[1] || 'jpg';
        const filename = `firearm_${Date.now()}.${ext}`;
        const savedPath = await window.api.saveBase64Photo(data.photoBase64, filename);
        if (savedPath) savedPhotos.push(savedPath);
      }

      const { photosBase64: _pB64, photoBase64: _pOne, firearmId: _fId, id: _ignoreId, ...cleanData } = data;

      if (firearm && firearm.id !== undefined) {
        const existingPhotos = firearm.photos || [];
        const mergedPhotos = Array.from(new Set([...existingPhotos, ...savedPhotos]));
        const updated = {
          ...firearm,
          ...cleanData,
          id: firearm.id, // Strictly preserve existing ID!
          purchase_price:
            cleanData.purchase_price !== undefined
              ? parseCurrencyOrNull(cleanData.purchase_price)
              : firearm.purchase_price,
          sold_price:
            cleanData.sold_price !== undefined
              ? parseCurrencyOrNull(cleanData.sold_price)
              : firearm.sold_price,
          photos: mergedPhotos,
          image_path: firearm.image_path || (mergedPhotos.length > 0 ? mergedPhotos[0] : ''),
        };

        await window.api.updateFirearm(firearm.id, updated);

        if (data.storageLocationId && window.api.getStorageLocations) {
          const locs = await window.api.getStorageLocations();
          const updatedLocs = assignItemToStorage(
            'firearm',
            firearm.id,
            Number(data.storageLocationId),
            locs || []
          );
          await saveStorageLocations(updatedLocs);
        }
      } else {
        // Fallback: If firearm not found in DB (e.g. temporary mobile ID was used), insert as new firearm
        const newFirearm: any = {
          ...cleanData,
          make: data.make || 'Unknown Make',
          model: data.model || 'Unknown Model',
          serial_number: serial_number,
          caliber: data.caliber || '',
          action_type: data.action_type || '',
          firearm_type: data.firearm_type || '',
          barrel_length: data.barrel_length || '',
          finish: data.finish || '',
          condition: data.condition || 'Excellent',
          purchase_price: parseCurrencyOrNull(data.purchase_price),
          purchase_date: data.purchase_date || '',
          purchased_from: data.purchased_from || '',
          notes: data.notes || '',
          is_nfa: !!data.is_nfa,
          nfa_type: data.nfa_type || '',
          image_path: savedPhotos.length > 0 ? savedPhotos[0] : '',
          photos: savedPhotos,
          is_sold: false,
        };
        const newId = await window.api.addFirearm(newFirearm);

        if (data.storageLocationId && window.api.getStorageLocations) {
          const locs = await window.api.getStorageLocations();
          const updatedLocs = assignItemToStorage(
            'firearm',
            newId,
            Number(data.storageLocationId),
            locs || []
          );
          await saveStorageLocations(updatedLocs);
        }
      }

      await window.api.removeSyncItem(item.id!);
      loadData();
    }
  };

  const handleApproveAll = async () => {
    if (
      !window.api ||
      !confirm('Automatically approve all recognized sync items? (Unknown items will be skipped)')
    )
      return;

    const currentAmmo = await window.api.getAmmo();
    const currentFirearms = await window.api.getFirearms();
    const currentComponents = window.api.getComponents ? await window.api.getComponents() : [];
    const currentAccessories = window.api.getAccessories ? await window.api.getAccessories() : [];
    let processedAny = false;

    for (const item of queue) {
      if (item.type === 'ammo_adjustment') {
        const upcOrId = String(item.upcOrId);
        const ammoIndex = currentAmmo.findIndex(
          (a) => String(a.id) === upcOrId || a.upc_code === upcOrId || a.sku === upcOrId
        );
        if (ammoIndex >= 0) {
          const ammo = currentAmmo[ammoIndex];
          await ensureItemSku(ammo, 'ammo', window.api);
          const currentCount = parseInt(ammo.count as any) || 0;
          const adjustment = parseInt(item.count as any) || 0;
          if (item.action === 'add') {
            ammo.count = currentCount + adjustment;
          } else if (item.action === 'remove') {
            ammo.count = Math.max(0, currentCount - adjustment);
          }
          if (item.data && typeof item.data.isPlusP === 'boolean') {
            ammo.isPlusP = item.data.isPlusP;
          }
          await window.api.updateAmmo(ammo.id!, ammo);

          const fId = Number(
            (item as any).firearmId ||
              (item as any).firearm_id ||
              (item.data && ((item.data as any).firearmId || (item.data as any).firearm_id))
          );
          if (fId && item.action === 'remove' && adjustment > 0) {
            const firearmIndex = currentFirearms.findIndex((f) => f.id === fId);
            if (firearmIndex >= 0) {
              const firearm = currentFirearms[firearmIndex];
              const newRoundCount = (Number(firearm.round_count) || 0) + adjustment;
              const updatedFirearm = { ...firearm, round_count: newRoundCount };
              await window.api.updateFirearm(firearm.id!, updatedFirearm);
              currentFirearms[firearmIndex] = updatedFirearm;

              const warn = getFirearmMaintenanceWarning(firearm, adjustment);
              if (warn) {
                setMaintenanceAlert({
                  firearmId: firearm.id!,
                  firearmName: `${firearm.make} ${firearm.model}`,
                  taskName: warn.taskName,
                  projectedRounds: warn.projectedRounds,
                });
              }
            }
          }

          await window.api.removeSyncItem(item.id!);
          currentAmmo[ammoIndex] = ammo;
          processedAny = true;
        }
      } else if (item.type === 'component_adjustment') {
        if (!isInstalled('reloading')) {
          // Gracefully skip uninstalled module items without crashing or throwing
          continue;
        }
        const upcOrId = String(item.upcOrId);
        const compIndex = currentComponents.findIndex(
          (c) => String(c.id) === upcOrId || c.upc_code === upcOrId || (c as any).sku === upcOrId
        );
        if (compIndex >= 0) {
          const component = currentComponents[compIndex];
          await ensureItemSku(component, 'component', window.api);
          const currentCount = parseInt(component.quantity as any) || 0;
          const adjustment = parseInt(item.count as any) || 0;
          if (item.action === 'add') {
            component.quantity = currentCount + adjustment;
          } else if (item.action === 'remove') {
            component.quantity = Math.max(0, currentCount - adjustment);
          }
          await window.api.updateComponent(component.id!, component);
          await window.api.removeSyncItem(item.id!);
          currentComponents[compIndex] = component;
          processedAny = true;
        }
      } else if (item.type === 'accessory_adjustment') {
        const upcOrId = String(item.upcOrId);
        const accIndex = currentAccessories.findIndex(
          (a: any) =>
            String(a.id) === upcOrId ||
            a.serialNumber === upcOrId ||
            a.sku === upcOrId ||
            a.upc === upcOrId ||
            (a.notes && a.notes.includes(upcOrId))
        );
        if (accIndex >= 0) {
          const acc = currentAccessories[accIndex];
          await ensureItemSku(acc, 'accessory', window.api);
          const currentCount = parseInt(acc.quantity as any) || 0;
          const adjustment = parseInt(item.count as any) || 0;
          if (item.action === 'add') {
            acc.quantity = currentCount + adjustment;
          } else if (item.action === 'remove') {
            acc.quantity = Math.max(0, currentCount - adjustment);
          }
          await window.api.updateAccessory(acc.id!, acc);
          currentAccessories[accIndex] = acc;
          await window.api.removeSyncItem(item.id!);
          processedAny = true;
        }
      } else if (item.type === 'firearm_log') {
        const fId = Number((item as any).firearmId);
        const firearmIndex = currentFirearms.findIndex((f) => f.id === fId);
        if (firearmIndex >= 0) {
          const firearm = currentFirearms[firearmIndex];
          let image_path = '';
          if ((item as any).photoBase64) {
            const ext = (item as any).photoBase64.split(';')[0].split('/')[1] || 'jpg';
            const filename = `photo_${Date.now()}_log.${ext}`;
            image_path =
              (await window.api.saveBase64Photo((item as any).photoBase64, filename)) || '';
          }

          const newLog: any = {
            id: Date.now() + Math.random(),
            date: new Date(item.timestamp).toISOString().split('T')[0],
            type: (item as any).logType === 'maintenance' ? 'Cleaning' : 'Range',
            notes: (item as any).notes || '',
            rounds_fired: parseInt((item as any).roundCount) || 0,
            image_path: image_path || undefined,
          };

          const updatedLogs = [...(firearm.logs || []), newLog];
          const updatedFirearm = { ...firearm, logs: updatedLogs };
          await window.api.updateFirearm(fId, updatedFirearm);
          await window.api.removeSyncItem(item.id!);
          currentFirearms[firearmIndex] = updatedFirearm;
          processedAny = true;
        }
      } else if (item.type === 'firearm_photo') {
        const fId = Number((item as any).firearmId);
        const firearmIndex = currentFirearms.findIndex((f) => f.id === fId);
        if (firearmIndex >= 0) {
          const firearm = currentFirearms[firearmIndex];
          if ((item as any).photoBase64) {
            const ext = (item as any).photoBase64.split(';')[0].split('/')[1] || 'jpg';
            const filename = `photo_${Date.now()}_firearm.${ext}`;
            const image_path = await window.api.saveBase64Photo(
              (item as any).photoBase64,
              filename
            );

            if (image_path) {
              const updatedPhotos = [...(firearm.photos || []), image_path];
              const updatedFirearm = { ...firearm, photos: updatedPhotos };
              await window.api.updateFirearm(fId, updatedFirearm);
              currentFirearms[firearmIndex] = updatedFirearm;
            }
          }
          await window.api.removeSyncItem(item.id!);
          processedAny = true;
        }
      } else if (item.type === 'new_firearm') {
        const data: any = item.data || item;
        const make = data.make || '';
        const model = data.model || '';
        const caliber = data.caliber || '';
        const serial_number = data.serial_number || '';

        const existing = currentFirearms.find(
          (f) =>
            serial_number &&
            f.serial_number &&
            f.serial_number.trim().toLowerCase() === serial_number.trim().toLowerCase()
        );

        const savedPhotos: string[] = [];
        if (data.photosBase64 && Array.isArray(data.photosBase64)) {
          for (let i = 0; i < data.photosBase64.length; i++) {
            const b64 = data.photosBase64[i];
            const ext = b64.split(';')[0].split('/')[1] || 'jpg';
            const filename = `firearm_${Date.now()}_${i}.${ext}`;
            const savedPath = await window.api.saveBase64Photo(b64, filename);
            if (savedPath) savedPhotos.push(savedPath);
          }
        } else if (data.photoBase64) {
          const ext = data.photoBase64.split(';')[0].split('/')[1] || 'jpg';
          const filename = `firearm_${Date.now()}.${ext}`;
          const savedPath = await window.api.saveBase64Photo(data.photoBase64, filename);
          if (savedPath) savedPhotos.push(savedPath);
        }

        const { photosBase64: _pB64, photoBase64: _pOne, firearmId: _fId, id: _ignoreId, ...cleanData } = data;

        if (existing && existing.id !== undefined) {
          const existingPhotos = existing.photos || [];
          const mergedPhotos = Array.from(new Set([...existingPhotos, ...savedPhotos]));
          const updated = {
            ...existing,
            ...cleanData,
            id: existing.id,
            purchase_price:
              cleanData.purchase_price !== undefined
                ? parseCurrencyOrNull(cleanData.purchase_price)
                : existing.purchase_price,
            sold_price:
              cleanData.sold_price !== undefined
                ? parseCurrencyOrNull(cleanData.sold_price)
                : existing.sold_price,
            photos: mergedPhotos,
            image_path: existing.image_path || (mergedPhotos.length > 0 ? mergedPhotos[0] : ''),
          };
          await window.api.updateFirearm(existing.id, updated);
          const idx = currentFirearms.findIndex((f) => f.id === existing.id);
          if (idx >= 0) currentFirearms[idx] = updated;
        } else {
          const newFirearm: any = {
            ...cleanData,
            make,
            model,
            serial_number,
            caliber,
            action_type: data.action_type || '',
            firearm_type: data.firearm_type || '',
            barrel_length: data.barrel_length || '',
            finish: data.finish || '',
            condition: data.condition || 'Excellent',
            purchase_price: parseCurrencyOrNull(data.purchase_price),
            purchase_date: data.purchase_date || '',
            purchased_from: data.purchased_from || '',
            notes: data.notes || '',
            is_nfa: !!data.is_nfa,
            nfa_type: data.nfa_type || '',
            image_path: savedPhotos.length > 0 ? savedPhotos[0] : '',
            photos: savedPhotos,
            is_sold: false,
          };
          const newId = await window.api.addFirearm(newFirearm);
          newFirearm.id = newId;
          currentFirearms.push(newFirearm);

          if (data.storageLocationId && window.api.getStorageLocations) {
            const locs = await window.api.getStorageLocations();
            const updatedLocs = assignItemToStorage(
              'firearm',
              newId,
              Number(data.storageLocationId),
              locs || []
            );
            await saveStorageLocations(updatedLocs);
          }
        }

        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      } else if (item.type === 'firearm_update') {
        const data: any = item.data || item;
        const fId = Number(data.firearmId || (item as any).firearmId || data.id);
        const serial_number = data.serial_number || '';

        const firearm = currentFirearms.find(
          (f) =>
            (fId && f.id === fId) ||
            (serial_number &&
              f.serial_number &&
              f.serial_number.trim().toLowerCase() === serial_number.trim().toLowerCase())
        );

        const savedPhotos: string[] = [];
        if (data.photosBase64 && Array.isArray(data.photosBase64)) {
          for (let i = 0; i < data.photosBase64.length; i++) {
            const b64 = data.photosBase64[i];
            const ext = b64.split(';')[0].split('/')[1] || 'jpg';
            const filename = `firearm_${Date.now()}_${i}.${ext}`;
            const savedPath = await window.api.saveBase64Photo(b64, filename);
            if (savedPath) savedPhotos.push(savedPath);
          }
        } else if (data.photoBase64) {
          const ext = data.photoBase64.split(';')[0].split('/')[1] || 'jpg';
          const filename = `firearm_${Date.now()}.${ext}`;
          const savedPath = await window.api.saveBase64Photo(data.photoBase64, filename);
          if (savedPath) savedPhotos.push(savedPath);
        }

        const { photosBase64: _pB64, photoBase64: _pOne, firearmId: _fId, id: _ignoreId, ...cleanData } = data;

        if (firearm && firearm.id !== undefined) {
          const existingPhotos = firearm.photos || [];
          const mergedPhotos = Array.from(new Set([...existingPhotos, ...savedPhotos]));
          const updated = {
            ...firearm,
            ...cleanData,
            id: firearm.id, // Strictly preserve existing ID!
            purchase_price:
              cleanData.purchase_price !== undefined
                ? parseCurrencyOrNull(cleanData.purchase_price)
                : firearm.purchase_price,
            sold_price:
              cleanData.sold_price !== undefined
                ? parseCurrencyOrNull(cleanData.sold_price)
                : firearm.sold_price,
            photos: mergedPhotos,
            image_path: firearm.image_path || (mergedPhotos.length > 0 ? mergedPhotos[0] : ''),
          };

          await window.api.updateFirearm(firearm.id, updated);
          const idx = currentFirearms.findIndex((f) => f.id === firearm.id);
          if (idx >= 0) currentFirearms[idx] = updated;

          if (data.storageLocationId && window.api.getStorageLocations) {
            const locs = await window.api.getStorageLocations();
            const updatedLocs = assignItemToStorage(
              'firearm',
              firearm.id,
              Number(data.storageLocationId),
              locs || []
            );
            await saveStorageLocations(updatedLocs);
          }
        } else {
          // Fallback: If firearm not found in DB (e.g. temporary mobile ID was used), insert as new firearm
          const newFirearm: any = {
            ...cleanData,
            make: data.make || 'Unknown Make',
            model: data.model || 'Unknown Model',
            serial_number: serial_number,
            caliber: data.caliber || '',
            action_type: data.action_type || '',
            firearm_type: data.firearm_type || '',
            barrel_length: data.barrel_length || '',
            finish: data.finish || '',
            condition: data.condition || 'Excellent',
            purchase_price: parseCurrencyOrNull(data.purchase_price),
            purchase_date: data.purchase_date || '',
            purchased_from: data.purchased_from || '',
            notes: data.notes || '',
            is_nfa: !!data.is_nfa,
            nfa_type: data.nfa_type || '',
            image_path: savedPhotos.length > 0 ? savedPhotos[0] : '',
            photos: savedPhotos,
            is_sold: false,
          };
          const newId = await window.api.addFirearm(newFirearm);
          newFirearm.id = newId;
          currentFirearms.push(newFirearm);

          if (data.storageLocationId && window.api.getStorageLocations) {
            const locs = await window.api.getStorageLocations();
            const updatedLocs = assignItemToStorage(
              'firearm',
              newId,
              Number(data.storageLocationId),
              locs || []
            );
            await saveStorageLocations(updatedLocs);
          }
        }

        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      } else if (item.type === 'bill_of_sale_transfer') {
        const fId = Number(item.firearm_id);
        const serial = item.serial_number ? String(item.serial_number).trim().toLowerCase() : '';
        const firearm = currentFirearms.find(
          (f) =>
            (fId && f.id === fId) ||
            (serial && f.serial_number && f.serial_number.trim().toLowerCase() === serial)
        );
        if (firearm && firearm.id !== undefined && window.api && window.api.updateFirearm) {
          let savedDocPath = '';
          if (item.pdf_base64 && window.api.saveBase64Document) {
            const filename =
              item.pdf_filename || `BillOfSale_${item.transfer_id || Date.now()}.pdf`;
            savedDocPath = (await window.api.saveBase64Document(item.pdf_base64, filename)) || '';
          }

          const existingDocs = firearm.documents || [];
          const newDocs = [...existingDocs];
          if (savedDocPath) {
            newDocs.push({
              name: `Bill of Sale (${item.transfer_id || 'Signed'})`,
              path: savedDocPath,
              date_added: item.date || new Date().toISOString().split('T')[0],
            });
          }

          const transferNote = `[SOLD / TRANSFERRED] Transferred to ${item.buyer_name || 'Buyer'} (DL: ${item.buyer_dl || 'On File'}) for $${item.sale_price || 0} on ${item.date || new Date().toLocaleDateString()}. Bill of Sale ID: ${item.transfer_id || 'N/A'}`;
          const updatedNotes = firearm.notes ? `${firearm.notes}\n${transferNote}` : transferNote;

          const updatedFirearm = {
            ...firearm,
            is_sold: true,
            sold_date: item.date || new Date().toISOString().split('T')[0],
            sold_to_name: item.buyer_name || 'Buyer',
            sold_price:
              typeof item.sale_price === 'number'
                ? item.sale_price
                : parseFloat(String(item.sale_price || 0)) || 0,
            sale_notes: item.notes || '',
            condition: 'Sold / Transferred',
            notes: updatedNotes,
            documents: newDocs,
          };

          await window.api.updateFirearm(firearm.id, updatedFirearm);
          const idx = currentFirearms.findIndex((f) => f.id === firearm.id);
          if (idx >= 0) currentFirearms[idx] = updatedFirearm;
        }
        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      } else if (item.type === 'firearm_maintenance') {
        const fId = Number(item.firearm_id);
        const firearm = currentFirearms.find((f) => f.id === fId);
        if (firearm && firearm.id !== undefined && window.api && window.api.updateFirearm) {
          const logNote = `[Maintenance] ${item.notes || (item as any).service_type || 'Service performed'} on ${item.date || new Date().toLocaleDateString()}`;
          const updatedNotes = firearm.notes ? `${firearm.notes}\n${logNote}` : logNote;
          const newLog: any = {
            id: Date.now() + Math.random(),
            date: item.date || new Date(item.timestamp || Date.now()).toISOString().split('T')[0],
            type: (item as any).service_type || 'Cleaning',
            notes: item.notes || 'Service performed',
            rounds_fired: parseInt((item as any).roundCount || (item as any).round_count) || 0,
            round_count_at_service: Number(firearm.round_count) || 0,
          };
          const updatedLogs = [...(firearm.logs || []), newLog];
          const updatedFirearm = { ...firearm, logs: updatedLogs, notes: updatedNotes };
          await window.api.updateFirearm(firearm.id, updatedFirearm);
          const idx = currentFirearms.findIndex((f) => f.id === firearm.id);
          if (idx >= 0) currentFirearms[idx] = updatedFirearm;
        }
        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      } else if (item.type === 'optic_zero_update') {
        const data: any = item.data || item;
        const opticId =
          data.optic_id || data.opticId || (item as any).optic_id || (item as any).opticId;
        const opticName =
          data.optic_name ||
          data.opticName ||
          data.name ||
          (item as any).optic_name ||
          (item as any).opticName ||
          'Optic';

        const accIndex = currentAccessories.findIndex(
          (a: any) =>
            (opticId && String(a.id) === String(opticId)) ||
            (data.serialNumber &&
              a.serialNumber &&
              a.serialNumber.toLowerCase() === data.serialNumber.toLowerCase()) ||
            (a.name && opticName && a.name.toLowerCase() === opticName.toLowerCase()) ||
            (a.model && opticName && a.model.toLowerCase() === opticName.toLowerCase())
        );

        const zeroDistance =
          data.zero_distance_yards ||
          data.zero_distance ||
          data.zeroDistance ||
          (item as any).zero_distance_yards ||
          (item as any).zero_distance ||
          100;

        const clickValue =
          data.click_value || data.clickValue || (item as any).click_value || '1/4 MOA';

        const dateStr =
          data.date ||
          data.last_zero_date ||
          new Date(item.timestamp || Date.now()).toISOString().split('T')[0];

        if (accIndex >= 0 && window.api && window.api.updateAccessory) {
          const acc = currentAccessories[accIndex];
          if (acc && acc.id !== undefined) {
            const zeroNote = `[Zero Update] ${zeroDistance} yds, ${clickValue} on ${dateStr}${data.notes ? ` - ${data.notes}` : ''}`;
            const updatedNotes = acc.notes ? `${acc.notes}\n${zeroNote}` : zeroNote;
            const updatedAcc = {
              ...acc,
              zeroDistance,
              clickValue,
              lastZeroDate: dateStr,
              notes: updatedNotes,
            };
            await window.api.updateAccessory(acc.id, updatedAcc);
            currentAccessories[accIndex] = updatedAcc;
          }
        }

        const fId = Number(
          data.firearm_id || data.firearmId || (item as any).firearm_id || (item as any).firearmId
        );
        if (fId) {
          const firearmIndex = currentFirearms.findIndex((f) => f.id === fId);
          if (firearmIndex >= 0 && window.api && window.api.updateFirearm) {
            const firearm = currentFirearms[firearmIndex];
            if (firearm && firearm.id !== undefined) {
              const newLog: any = {
                id: Date.now() + Math.random(),
                date: dateStr,
                type: 'Maintenance',
                notes: `Optic Zeroed: ${opticName || 'Optic'} at ${zeroDistance} yds (${clickValue})${data.notes ? ` - ${data.notes}` : ''}`,
                rounds_fired: 0,
              };
              const updatedLogs = [...(firearm.logs || []), newLog];
              const updatedFirearm = { ...firearm, logs: updatedLogs };
              await window.api.updateFirearm(firearm.id, updatedFirearm);
              currentFirearms[firearmIndex] = updatedFirearm;
            }
          }
        }

        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      } else if (item.type === 'range_session') {
        const fId = Number(item.firearm_id);
        const aId = item.ammo_id ? Number(item.ammo_id) : undefined;
        const rounds = Number(item.rounds_fired || item.count) || 0;

        if (window.api && window.api.logRangeSession) {
          await window.api.logRangeSession({
            firearm_id: fId,
            ammo_id: aId,
            rounds_fired: rounds,
            date: item.date || new Date(item.timestamp).toISOString().split('T')[0],
            notes: item.notes || '',
            cost: parseCurrency(item.cost),
            location: item.location || '',
          });

          if (item.group_metrics && window.api.addTargetAnalysis) {
            await window.api.addTargetAnalysis({
              distance_yards: item.group_metrics.distanceYards || item.distance_yards || 100,
              moa: item.group_metrics.moa,
              extreme_spread_inches:
                item.group_metrics.extremeSpreadInches || item.group_metrics.extreme_spread_in,
              mean_radius_inches: item.group_metrics.meanRadiusInches,
              shot_count: item.group_metrics.shotCount || rounds,
              date: item.date || new Date(item.timestamp).toISOString().split('T')[0],
              optic_name: item.optic_name,
              notes: `Range Session (${rounds} rds)${item.location ? ` @ ${item.location}` : ''}`,
              photo_path: item.target_photo_path || item.photo_path || item.photoBase64,
            });
          }

          if (item.chrono_data && window.api.addChronoString) {
            const avg = item.chrono_data.averageVelocity ?? item.chrono_data.avg;
            const sd = item.chrono_data.standardDeviation ?? item.chrono_data.sd;
            const es = item.chrono_data.extremeSpread ?? item.chrono_data.es;
            const shots = item.chrono_data.shotVelocities ?? item.chrono_data.shots ?? [];
            await window.api.addChronoString({
              ...item.chrono_data,
              firearm_id: fId,
              firearmId: fId,
              ammo_id: aId,
              ammoId: aId,
              ammoLabel: item.ammo_name,
              averageVelocity: avg,
              avg: avg,
              standardDeviation: sd,
              sd: sd,
              extremeSpread: es,
              es: es,
              shotVelocities: shots,
              shots: shots,
              date:
                item.chrono_data.date ||
                item.date ||
                new Date(item.timestamp).toISOString().split('T')[0],
            });
          }
        }
        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      } else if (item.type === 'chrono_string') {
        const chrono = (item as any).chrono_data || item;
        if (window.api && window.api.addChronoString) {
          await window.api.addChronoString(chrono);
        }
        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      } else if (item.type === 'target_analysis') {
        const target = (item as any).target_data || (item as any).target_analysis || item;
        if (window.api && window.api.addTargetAnalysis) {
          await window.api.addTargetAnalysis(target);
        }
        await window.api.removeSyncItem(item.id!);
        processedAny = true;
      }
    }

    if (processedAny) {
      loadData();
    } else {
      alert(
        'No recognizable items to approve automatically. Unknown barcodes must be resolved manually.'
      );
    }
  };

  const handleDelete = (id: number | string) => {
    const item = queue.find((q) => String(q.id) === String(id));
    if (!item) {
      if (window.api) {
        window.api.removeSyncItem(id as any).then(() => {
          window.dispatchEvent(new CustomEvent('armoryvault-sync-queue-updated'));
          loadData();
        });
      }
      return;
    }

    let itemType = 'Sync Item';
    let filename: string | undefined;
    let itemIdentifier: string | undefined;
    let title: string | undefined;

    if (item.custom_payload_filename) {
      filename = item.custom_payload_filename;
      itemType = item.custom_payload_extension?.toUpperCase() || 'Payload';
      title = filename;
    } else if (item.item_type) {
      itemType = item.item_type;
      itemIdentifier =
        (item as any).serial_number ||
        (item as any).upc ||
        (item as any).lot_number ||
        (item as any).name;
      title = `${item.item_type}: ${itemIdentifier || '#' + item.id}`;
    } else if (item.action) {
      itemType = item.action;
      title = `${item.action} entry`;
    }

    setPendingRejectTarget({
      id: item.id ?? id,
      itemType,
      filename,
      itemIdentifier,
      title,
      payload: item,
    });
  };

  const handleConfirmReject = async (target: RejectSyncTarget, deleteFromMobile: boolean) => {
    if (!window.api) return;

    if (deleteFromMobile && window.api.rejectSyncItem) {
      await window.api.rejectSyncItem({
        syncId: String(target.id),
        itemType: target.itemType,
        filename: target.filename,
        itemIdentifier: target.itemIdentifier,
        payload: typeof target.payload === 'object' ? JSON.stringify(target.payload) : target.payload,
        deleteFromMobile: true,
      });
    }

    await window.api.removeSyncItem(target.id as any);
    window.dispatchEvent(new CustomEvent('armoryvault-sync-queue-updated'));
    loadData();
  };

  const handleClearAll = async () => {
    if (window.confirm('Are you sure you want to delete all pending sync items?')) {
      if (window.api) {
        await window.api.clearSyncQueue();
        window.dispatchEvent(new CustomEvent('armoryvault-sync-queue-updated'));
        loadData();
      }
    }
  };

  const handleResolveAmmo = (upcOrId: string, count: number, syncItemId: number) => {
    navigate('/ammo', {
      state: {
        openAddModal: true,
        upc: upcOrId,
        count,
        syncItemId,
      },
    });
  };

  const handleResolveComponent = (upcOrId: string, count: number, syncItemId: number) => {
    navigate('/components', {
      state: {
        openAddModal: true,
        upc: upcOrId,
        count,
        syncItemId,
      },
    });
  };

  const handleEditFirearm = (data: any, syncItemId: number, existingFirearmId?: number) => {
    if (existingFirearmId) {
      navigate(`/edit/${existingFirearmId}`, {
        state: { parsedData: data, syncItemId },
      });
    } else {
      navigate('/add', {
        state: { parsedData: data, syncItemId },
      });
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1 className="page-title">Mobile Sync</h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Pair your phone and manage incoming data.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-light)',
          paddingBottom: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('inbox')}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'inbox' ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderBottom: activeTab === 'inbox' ? '2px solid var(--accent)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: activeTab === 'inbox' ? 600 : 400,
            }}
          >
            <Server size={20} /> Sync Inbox
            {queue.length > 0 && (
              <span
                style={{
                  background: '#ef4444',
                  color: '#fff',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '12px',
                }}
              >
                {queue.length}
              </span>
            )}
          </button>
          <button
            onClick={() => {
              setActiveTab('devices');
              fetchPairedDevices();
            }}
            style={{
              background: 'transparent',
              border: 'none',
              color: activeTab === 'devices' ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: '1.1rem',
              cursor: 'pointer',
              padding: '0.5rem 1rem',
              borderBottom: activeTab === 'devices' ? '2px solid var(--accent)' : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              fontWeight: activeTab === 'devices' ? 600 : 400,
            }}
          >
            <Smartphone size={20} /> Paired Devices
            {pairedDevices.length > 0 && (
              <span
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  color: 'var(--accent)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  padding: '0.1rem 0.5rem',
                  borderRadius: '12px',
                }}
              >
                {pairedDevices.length}
              </span>
            )}
          </button>
        </div>

        <button
          className="btn-secondary"
          onClick={() => {
            generateQr();
            setIsPairModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
        >
          <Smartphone size={16} /> Pair Device (QR)
        </button>
        <button
          className="btn-secondary"
          onClick={() => {
            setIsBleModalOpen(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}
          title="Pair nearby mobile companion using Bluetooth Low Energy"
        >
          <Bluetooth size={16} /> Pair via Bluetooth
        </button>
      </div>

      {/* Auto-Disappearing Pair Success Toast Notification */}
      <PairSuccessToast pairSuccess={pairSuccess} onDismiss={() => setPairSuccess(null)} />

      {/* Dedicated QR Code Pairing Modal */}
      <LanPairingModal
        isOpen={isPairModalOpen}
        syncQrUrl={syncQrUrl}
        localIp={localIp}
        networkInterfaces={networkInterfaces}
        onClose={() => setIsPairModalOpen(false)}
        onSelectIp={(ip) => generateQr(ip)}
        onTestPair={(name) => handlePairSuccess(name)}
      />

      {/* Dedicated Bluetooth LE Pairing Modal */}
      <BlePairingModal
        isOpen={isBleModalOpen}
        onClose={() => setIsBleModalOpen(false)}
        onSuccess={(name) => handlePairSuccess(name)}
      />

      {activeTab === 'inbox' && (
        <div>
          <MaintenanceAlertBanner
            maintenanceAlert={maintenanceAlert}
            onDismiss={() => setMaintenanceAlert(null)}
            onRecordService={(alert) => {
              navigate('/maintenance', {
                state: {
                  openQuickService: true,
                  firearmId: alert.firearmId,
                  taskName: alert.taskName,
                },
              });
              setMaintenanceAlert(null);
            }}
          />

          {queue.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
              <RefreshCw size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
              <h2>No pending items</h2>
              <p>Scan items on your mobile app and tap "Sync" to send them here.</p>
              <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  className="btn-primary"
                  onClick={() => {
                    generateQr();
                    setIsPairModalOpen(true);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Smartphone size={18} /> Pair Mobile Device
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Package size={18} /> Import Payload (.av*)
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '1rem',
                  gap: '0.5rem',
                }}
              >
                <button
                  className="btn-secondary"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                >
                  <Package size={16} /> Import Payload (.av*)
                </button>
                <button className="btn-primary" onClick={handleApproveAll}>
                  <CheckCircle size={16} /> Approve All Valid
                </button>
                <button
                  className="btn-secondary"
                  onClick={handleClearAll}
                  style={{ color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                >
                  <Trash2 size={16} /> Clear All
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {queue.map((item) => (
                  <SyncInboxItemCard
                    key={item.id}
                    item={item}
                    ammoList={ammoList}
                    firearms={firearms}
                    componentsList={componentsList}
                    accessoriesList={accessoriesList}
                    isReloadingInstalled={isInstalled('reloading')}
                    isResolving={isResolving === item.id}
                    onApprove={handleApprove}
                    onDelete={handleDelete}
                    onEditFirearm={handleEditFirearm}
                    onResolveAmmo={handleResolveAmmo}
                    onResolveComponent={handleResolveComponent}
                    onResolveUniversal={handleResolveUniversal}
                    onInstallReloadingModule={() => openModuleCenter('reloading')}
                    getFirearmMaintenanceWarning={getFirearmMaintenanceWarning}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'devices' && (
        <PairedDevicesTab
          devices={pairedDevices}
          serverIp={localIp}
          serverPort={serverPort}
          hostname={hostname}
          isRefreshing={isRefreshingDevices}
          onRefreshDevices={fetchPairedDevices}
          onOpenPairModal={() => {
            generateQr();
            setIsPairModalOpen(true);
          }}
          onUnpairDevice={handleUnpairDevice}
          onUnpairAll={handleUnpairAll}
        />
      )}

      {/* Box Size Configuration Modal */}
      <BoxSizePromptModal
        pendingPrompt={pendingBoxSizePrompt}
        customBoxSize={customBoxSize}
        onCustomBoxSizeChange={setCustomBoxSize}
        onClose={() => setPendingBoxSizePrompt(null)}
        onSave={saveCustomBoxSize}
      />

      {/* Unknown Barcode Category Router Modal */}
      <UnknownRouteModal
        unknownRouteItem={unknownRouteItem}
        onClose={() => setUnknownRouteItem(null)}
        onRoute={async (destination, item, upc) => {
          await window.api.removeSyncItem(item.id!);
          navigate(`/${destination}`, {
            state: { openAddModal: true, upc },
          });
        }}
      />

      {/* Hidden File Picker for Custom ArmoryVault Payloads */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".avfirearm,.avsession,.avammo,.avcomponent,.avaccessory,.avmaintenance,.avtransfer,.avbundle,.json"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* Manual Payload Ingest Modal */}
      <PayloadIngestModal
        isOpen={isManualPayloadModalOpen}
        rawPayload={manualPayloadContent}
        filename={manualPayloadFilename}
        onClose={() => setIsManualPayloadModalOpen(false)}
        onApproved={() => {
          loadData();
        }}
      />

      {/* Cross-Device Rejection & Mobile Pruning Modal */}
      <RejectSyncModal
        isOpen={Boolean(pendingRejectTarget)}
        target={pendingRejectTarget}
        onClose={() => setPendingRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />
    </div>
  );
};
