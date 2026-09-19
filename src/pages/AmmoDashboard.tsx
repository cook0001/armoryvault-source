import {
  AlertTriangle,
  Boxes,
  Calculator,
  CheckCircle2,
  CircleDot,
  DollarSign,
  Edit,
  Eye,
  Filter,
  Flame,
  FlaskConical,
  Layers,
  Package,
  PlusCircle,
  Printer,
  Search,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Tag,
  Target,
  Trash2,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { AutocompleteInput } from '../components/AutocompleteInput';
import {
  BrassCaseIcon,
  BulletProjectileIcon,
  CartridgesIcon,
  GunpowderIcon,
  HandgunIcon,
  PrimerIcon,
  RifleIcon,
  ShotgunIcon,
} from '../components/CustomIcons';
import { AmmoCanLabelModal } from '../components/modals/AmmoCanLabelModal';
import { AmmoModal } from '../components/modals/AmmoModal';
import { BatchManufactureModal } from '../components/modals/BatchManufactureModal';
import { ReloadingComponentModal } from '../components/modals/ReloadingComponentModal';
import { StorageBadge, StorageLocationSelect } from '../components/StorageBadge';
import { useUndoToast } from '../components/UndoToast';
import { useVaultData } from '../context/VaultDataContext';
import { useModules } from '../modules/registry/ModuleContext';
import { Ammo, ReloadingComponent, StorageLocation } from '../types';
import { parseBarcodeData } from '../utils/BarcodeEngine';
import {
  buildCustomCategories,
  COMPREHENSIVE_BULLET_TYPES,
  escapeRegExp,
  formatCaliber,
  formatShotgunSpecs,
  generateInternalUPC,
  getAmmoCategory,
  getBarcodeLabelType,
  getStandardPelletCount,
  isShotgunAmmo,
} from '../utils/caliberHelpers';
import { formatCurrency, parseCurrency } from '../utils/currency';
import {
  AMMO_MANUFACTURERS,
  BRASS_MAKES,
  BULLET_MANUFACTURERS,
  CALIBER_OPTIONS,
  COMMON_POWDERS,
  COMMON_PRIMERS,
  PRIMER_TYPES,
  SHOTGUN_PAYLOADS,
  SHOTGUN_SHELL_LENGTHS,
  SHOTGUN_SHOT_SIZES,
} from '../utils/formOptions';
import { formatPowderMultiUnit, toGrains } from '../utils/powderUnits';
import {
  assignItemToStorage,
  getItemStorageLocation,
  removeItemFromAllStorage,
  saveStorageLocations,
} from '../utils/StorageSync';
import { buildStorageIndex } from '../utils/storageIndex';
import { getStoredTheme, maskValue, ThemeConfig } from '../utils/themeEngine';

export { formatCaliber } from '../utils/caliberHelpers';

type DepotView = 'ammo' | 'reloading' | 'combined';

interface MetricVisibility {
  totalRounds: boolean;
  caliberProfiles: boolean;
  ammoValue: boolean;
  lowStockHealth: boolean;
  powderStock: boolean;
  primersStock: boolean;
  bulletsStock: boolean;
  brassStock: boolean;
}

const DEFAULT_METRIC_VISIBILITY: MetricVisibility = {
  totalRounds: true,
  caliberProfiles: true,
  ammoValue: true,
  lowStockHealth: true,
  powderStock: true,
  primersStock: true,
  bulletsStock: true,
  brassStock: true,
};

export const AmmoDashboard = () => {
  const { showUndo } = useUndoToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { isInstalled, openModuleCenter } = useModules();

  // Primary State
  const {
    ammoList: vaultAmmoList,
    components: vaultComponents,
    storageLocations: vaultStorageLocations,
  } = useVaultData();

  const [ammoList, setAmmoList] = useState<Ammo[]>(() => vaultAmmoList || []);
  const [components, setComponents] = useState<ReloadingComponent[]>(() => vaultComponents || []);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>(
    () => vaultStorageLocations || []
  );

  useEffect(() => {
    if (vaultAmmoList && vaultAmmoList.length > 0) setAmmoList(vaultAmmoList);
    if (vaultComponents && vaultComponents.length > 0) setComponents(vaultComponents);
    if (vaultStorageLocations && vaultStorageLocations.length > 0)
      setStorageLocations(vaultStorageLocations);
  }, [vaultAmmoList, vaultComponents, vaultStorageLocations]);
  const storageIndex = useMemo(() => buildStorageIndex(storageLocations), [storageLocations]);
  const [selectedStorageLocationId, setSelectedStorageLocationId] = useState<string>('ALL');
  const [ammoStorageLocationId, setAmmoStorageLocationId] = useState<number | null>(null);
  const [activeDepotView, setActiveDepotView] = useState<DepotView>('ammo');
  const [activeAmmoTab, setActiveAmmoTab] = useState<'factory' | 'handload'>('factory');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterChip, setSelectedFilterChip] = useState<string>('all');

  // Customization
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => getStoredTheme());
  const [metricVisibility, setMetricVisibility] = useState<MetricVisibility>(() => {
    const stored = getStoredTheme();
    try {
      const saved = localStorage.getItem('armoryvault_ammo_metrics');
      const base = saved
        ? { ...DEFAULT_METRIC_VISIBILITY, ...JSON.parse(saved) }
        : DEFAULT_METRIC_VISIBILITY;
      return {
        ...base,
        ammoValue: stored.widgets.ammoValuation ?? base.ammoValue,
        lowStockHealth: stored.widgets.ammoLowStockAlert ?? base.lowStockHealth,
      };
    } catch {
      return DEFAULT_METRIC_VISIBILITY;
    }
  });

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<ThemeConfig>;
      if (custom.detail) {
        setThemeConfig(custom.detail);
        setMetricVisibility((prev) => ({
          ...prev,
          ammoValue: custom.detail.widgets.ammoValuation,
          lowStockHealth: custom.detail.widgets.ammoLowStockAlert,
        }));
      }
    };
    window.addEventListener('armoryvault-theme-change', handleThemeChange);
    return () => window.removeEventListener('armoryvault-theme-change', handleThemeChange);
  }, []);

  // Modal States
  const [isAmmoModalOpen, setIsAmmoModalOpen] = useState(false);
  const [isComponentModalOpen, setIsComponentModalOpen] = useState(false);
  const [isAddingStockMode, setIsAddingStockMode] = useState(false);
  const [editingAmmo, setEditingAmmo] = useState<Ammo | null>(null);
  const [editingComponent, setEditingComponent] = useState<ReloadingComponent | null>(null);
  const [inspectingAmmo, setInspectingAmmo] = useState<Ammo | null>(null);
  const [labelModalAmmo, setLabelModalAmmo] = useState<Ammo | null>(null);
  const [batchManufactureAmmo, setBatchManufactureAmmo] = useState<Ammo | null>(null);
  const [upcStatus, setUpcStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info' | 'loading';
  } | null>(null);
  const [calcRds, setCalcRds] = useState<number | ''>('');
  const [calcBoxes, setCalcBoxes] = useState<number>(1);
  const locationProcessed = useRef<string | null>(null);

  const [formData, setFormData] = useState<Partial<Ammo>>({ type: 'factory' });

  const customCategories = useMemo(() => buildCustomCategories(ammoList), [ammoList]);

  // Load Data
  const loadData = async () => {
    if (window.api) {
      const [ammoData, compData, locData] = await Promise.all([
        window.api.getAmmo(),
        window.api.getComponents ? window.api.getComponents() : [],
        window.api.getStorageLocations ? window.api.getStorageLocations() : [],
      ]);
      setAmmoList(ammoData || []);
      setComponents(compData || []);
      setStorageLocations(locData || []);
    }
  };

  useEffect(() => {
    loadData();
    let unsubscribe: (() => void) | undefined;
    if (window.api?.onSyncReceived) {
      unsubscribe = window.api.onSyncReceived(() => {
        loadData();
      });
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Handle location query or openAddModal
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('tab') === 'reloading') {
      setActiveDepotView('reloading');
    }

    if (
      location.state &&
      (location.state as any).openAddModal &&
      locationProcessed.current !== location.key
    ) {
      locationProcessed.current = location.key;
      const state = location.state as any;

      if (
        state.type === 'Powder' ||
        state.type === 'Primer' ||
        state.type === 'Bullet' ||
        state.type === 'Brass' ||
        state.parsedData?.type
      ) {
        setActiveDepotView('reloading');
        setEditingComponent(null);
        setIsComponentModalOpen(true);
      } else {
        setActiveDepotView('ammo');
        setIsAmmoModalOpen(true);
        setEditingAmmo(null);
        setIsAddingStockMode(false);

        const upcToLookup = state.upc || '';
        const formDataToSet: any = {
          type: 'factory',
          upc_code: upcToLookup,
          count: state.count,
        };

        if (state.parsedData) {
          Object.assign(formDataToSet, state.parsedData);
        }

        setFormData(formDataToSet);

        if (upcToLookup && !state.parsedData) {
          setTimeout(() => {
            lookupUPC(upcToLookup);
          }, 100);
        }
      }

      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleToggleMetric = (key: keyof MetricVisibility) => {
    setMetricVisibility((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      localStorage.setItem('armoryvault_ammo_metrics', JSON.stringify(updated));
      return updated;
    });
  };

  const openAddAmmoModal = (type: 'factory' | 'handload') => {
    setEditingAmmo(null);
    setIsAddingStockMode(false);
    setFormData({ type });
    setAmmoStorageLocationId(null);
    setUpcStatus(null);
    setIsAmmoModalOpen(true);
    setCalcRds('');
    setCalcBoxes(1);
  };

  const openEditAmmoModal = (ammo: Ammo) => {
    setEditingAmmo(ammo);
    setIsAddingStockMode(false);
    setFormData({ ...ammo });
    const loc = storageIndex.getLocation('ammo', ammo.id);
    setAmmoStorageLocationId(loc?.id || null);
    setUpcStatus(null);
    setIsAmmoModalOpen(true);
    setCalcRds(ammo.count);
    setCalcBoxes(1);
  };

  const openAddComponentModal = (type: 'Powder' | 'Primer' | 'Bullet' | 'Brass' = 'Powder') => {
    setEditingComponent(null);
    setIsComponentModalOpen(true);
  };

  const openEditComponentModal = (comp: ReloadingComponent) => {
    setEditingComponent(comp);
    setIsComponentModalOpen(true);
  };

  const handlePrintAmmoQR = async (ammo: Ammo) => {
    if (!window.api) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(`armoryvault://ammo/${ammo.id}`, {
        width: 300,
        margin: 1,
      });

      const isShotgun = isShotgunAmmo(ammo);
      const barcodeType = getBarcodeLabelType(ammo.upc_code);
      let specs = '';
      if (isShotgun) {
        specs = `Specs: ${formatShotgunSpecs(ammo).summary}`;
      } else {
        specs = `Bullet: ${ammo.grain ? `${ammo.grain}gr ` : ''}${ammo.projectile || ammo.type}`;
      }

      let itemDetails = `${specs}\nQuantity: ${ammo.count || 0}`;
      if (ammo.upc_code) {
        itemDetails += `\n${barcodeType}: ${ammo.upc_code}`;
      }

      await window.api.printQRLabel({
        itemName: `${ammo.caliber} ${ammo.manufacturer || 'Ammo'}`,
        itemDetails,
        qrDataUrl,
      });
    } catch (err) {
      console.error('Failed to print QR label', err);
      alert('Failed to print QR label.');
    }
  };

  const handleSaveAmmoQR = async (ammo: Ammo) => {
    if (!window.api) return;
    try {
      const QRCode = (await import('qrcode')).default;
      const qrDataUrl = await QRCode.toDataURL(`armoryvault://ammo/${ammo.id}`, {
        width: 300,
        margin: 1,
      });
      await window.api.saveQRImage({
        itemName: `${ammo.caliber} ${ammo.manufacturer || 'Ammo'}`,
        qrDataUrl,
      });
    } catch (err) {
      console.error('Failed to save QR label', err);
      alert('Failed to save QR label.');
    }
  };

  const handleShotgunChange = (field: 'caliber' | 'shell_length' | 'shot_size', value: string) => {
    const newForm = { ...formData, [field]: value };
    if (newForm.shot_size?.toLowerCase().includes('buck')) {
      const pc = getStandardPelletCount(newForm.caliber, newForm.shell_length, newForm.shot_size);
      if (pc !== '') {
        newForm.pellet_count = pc;
      }
    } else {
      newForm.pellet_count = undefined;
    }
    setFormData(newForm);
  };

  const handleDeleteAmmo = async (id: number) => {
    const targetAmmo = ammoList.find((a) => a.id === id);
    if (!targetAmmo) return;
    if (storageLocations.length > 0) {
      const updatedLocs = removeItemFromAllStorage('ammo', id, storageLocations);
      await saveStorageLocations(updatedLocs);
    }
    if (window.api) {
      await window.api.deleteAmmo(id);
      await loadData();
      showUndo(`Deleted ${targetAmmo.caliber} (${targetAmmo.count} rds)`, async () => {
        if (window.api?.addAmmo) {
          const { id: _oldId, ...rest } = targetAmmo;
          await window.api.addAmmo(rest as Ammo);
          await loadData();
        }
      });
    }
  };

  const handleDeleteComponent = async (id: number) => {
    const targetComp = components.find((c) => c.id === id);
    if (!targetComp) return;
    if (storageLocations.length > 0) {
      const updatedLocs = removeItemFromAllStorage('component', id, storageLocations);
      await saveStorageLocations(updatedLocs);
    }
    if (window.api && window.api.deleteComponent) {
      await window.api.deleteComponent(id);
      await loadData();
      showUndo(
        `Deleted ${targetComp.type}: ${targetComp.manufacturer} ${targetComp.name || ''}`,
        async () => {
          if (window.api?.addComponent) {
            const { id: _oldId, ...rest } = targetComp;
            await window.api.addComponent(rest as ReloadingComponent);
            await loadData();
          }
        }
      );
    }
  };

  const lookupUPC = async (upc: string) => {
    const cleanUpc = upc.trim().toUpperCase();
    if (!cleanUpc) return;

    setUpcStatus({ message: 'Searching database...', type: 'loading' });

    // 1. Check Local Custom SKU Database first
    const currentSkus = await window.api.getSkus();
    if (currentSkus[cleanUpc]) {
      const data = currentSkus[cleanUpc];

      const localMatch = ammoList.find((a) => a.upc_code === cleanUpc);
      if (localMatch) {
        setEditingAmmo(localMatch);
        setIsAddingStockMode(true);
        setFormData({ ...localMatch });
        setCalcRds(data.count || 20);
        setCalcBoxes(1);
        setUpcStatus({
          message: 'Found in your inventory! How many boxes are you adding?',
          type: 'success',
        });
        return;
      }

      setFormData((prev) => ({
        ...prev,
        ...data,
        upc_code: cleanUpc,
      }));
      if (data.count) {
        setCalcRds(data.count);
        setCalcBoxes(1);
      }
      setUpcStatus({ message: 'Match found in local SKU database!', type: 'success' });
      return;
    }

    // 2. Check Inventory
    const localMatch = ammoList.find((a) => a.upc_code === upc);
    if (localMatch) {
      setEditingAmmo(localMatch);
      setIsAddingStockMode(true);
      setFormData({ ...localMatch });
      setCalcBoxes(1);
      setCalcRds('');
      setUpcStatus({
        message: 'Found in your inventory! How many boxes are you adding?',
        type: 'success',
      });
      return;
    }

    // 2b. Check LoadBench Handload QR / JSON payload
    if (
      upc.trim().startsWith('{') ||
      upc.includes('"type":"handload"') ||
      upc.includes('LoadBench')
    ) {
      const parsed = parseBarcodeData(upc, ammoList);
      if (parsed.category === 'ammo' && parsed.parsedAmmo) {
        setActiveAmmoTab('handload');
        setFormData((prev) => ({
          ...prev,
          type: 'handload',
          caliber: parsed.parsedAmmo?.caliber || prev.caliber,
          grain: parsed.parsedAmmo?.grain || prev.grain,
          projectile: parsed.parsedAmmo?.projectile || prev.projectile,
          powder: parsed.parsedAmmo?.powder || prev.powder,
          powderCharge: parsed.parsedAmmo?.powderCharge || prev.powderCharge,
          primer: parsed.parsedAmmo?.primer || prev.primer,
          oal: parsed.parsedAmmo?.oal || prev.oal,
          count: parsed.parsedAmmo?.count || prev.count,
          notes: parsed.parsedAmmo?.notes || prev.notes,
          upc_code: parsed.parsedAmmo?.upc_code || '',
        }));
        if (parsed.parsedAmmo.count) {
          setCalcRds(parsed.parsedAmmo.count);
          setCalcBoxes(1);
        }
        setUpcStatus({
          message: `LoadBench Handload Identified: ${parsed.bestTitle}`,
          type: 'success',
        });
        return;
      }
    }

    try {
      const data = await window.api.lookupUPC(upc);
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const parsed = parseBarcodeData(item, ammoList);

        if (parsed.category === 'component') {
          if (
            window.confirm(
              'This looks like a Reloading Component. Would you like to switch to Components?'
            )
          ) {
            setIsAmmoModalOpen(false);
            setActiveDepotView('reloading');
            openAddComponentModal();
            return;
          }
        }

        if (parsed.parsedAmmo?.count) {
          setCalcRds(parsed.parsedAmmo.count);
          setCalcBoxes(1);
        }

        setFormData(
          (prev) =>
            ({
              ...prev,
              manufacturer: parsed.parsedAmmo?.manufacturer || prev.manufacturer,
              caliber: parsed.parsedAmmo?.caliber || prev.caliber,
              grain: parsed.parsedAmmo?.grain || prev.grain,
              projectile: parsed.parsedAmmo?.projectile || prev.projectile,
              isPlusP:
                parsed.parsedAmmo?.isPlusP !== undefined ? parsed.parsedAmmo.isPlusP : prev.isPlusP,
              costPerRound: parsed.parsedAmmo?.costPerRound || prev.costPerRound,
              boxPrice:
                parsed.parsedAmmo?.boxPrice !== undefined
                  ? parsed.parsedAmmo.boxPrice
                  : (prev as any).boxPrice,
              count: parsed.parsedAmmo?.count || prev.count,
              upc_match: parsed.parsedAmmo?.upc_match || prev.upc_match,
              upc_code: upc,
            }) as any
        );

        setUpcStatus({ message: 'Barcode parsed automatically!', type: 'success' });
      } else {
        setUpcStatus({
          message: 'Barcode not found in database. Manual entry required.',
          type: 'error',
        });
      }
    } catch (e) {
      console.warn('UPC Lookup failed:', e);
      setUpcStatus({ message: 'Network error looking up barcode.', type: 'error' });
    }
  };

  const handleAmmoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submissionData = { ...formData };
    if (submissionData.type === 'handload' && !submissionData.upc_code) {
      submissionData.upc_code = generateInternalUPC();
    }

    let savedId = editingAmmo?.id || null;
    if (editingAmmo && editingAmmo.id) {
      if (isAddingStockMode) {
        submissionData.count = (editingAmmo.count || 0) + (submissionData.count || 0);
      }
      await window.api.updateAmmo(editingAmmo.id, submissionData as Ammo);
      savedId = editingAmmo.id;
    } else {
      const duplicate = ammoList.find(
        (a) =>
          a.type === submissionData.type &&
          a.caliber === submissionData.caliber &&
          a.manufacturer === submissionData.manufacturer &&
          a.grain === submissionData.grain &&
          a.projectile === submissionData.projectile
      );

      let merged = false;
      if (duplicate) {
        if (
          window.confirm(
            `An existing entry for ${duplicate.manufacturer || ''} ${duplicate.caliber} ${duplicate.grain || ''}gr was found. Would you like to merge this into the existing entry?`
          )
        ) {
          const mergedData = { ...duplicate };
          mergedData.count = (duplicate.count || 0) + (submissionData.count || 0);
          if (!mergedData.upc_code && submissionData.upc_code) {
            mergedData.upc_code = submissionData.upc_code;
          }
          await window.api.updateAmmo(duplicate.id!, mergedData as Ammo);
          savedId = duplicate.id || null;
          merged = true;
        }
      }

      if (!merged) {
        const res = await window.api.addAmmo(submissionData as Ammo);
        if (typeof res === 'number') {
          savedId = res;
        } else if (res && typeof (res as any).id === 'number') {
          savedId = (res as any).id;
        } else {
          const fresh = await window.api.getAmmo();
          if (fresh && fresh.length > 0) {
            savedId = Math.max(...fresh.map((a: any) => a.id || 0));
          }
        }
      }

      if (location.state && (location.state as any).syncItemId) {
        await window.api.removeSyncItem((location.state as any).syncItemId);
      }
    }

    // Bi-directional Storage Sync
    if (savedId && storageLocations.length > 0) {
      const updatedLocations = assignItemToStorage(
        'ammo',
        savedId,
        ammoStorageLocationId,
        storageLocations
      );
      await saveStorageLocations(updatedLocations);
    }

    setIsAmmoModalOpen(false);
    setIsAddingStockMode(false);

    if ((location.state as any)?.syncItemId) {
      window.history.replaceState({}, document.title);
    }

    loadData();
  };

  const isAmmoLow = (a: Ammo) => {
    const threshold = a.min_threshold ?? a.low_stock_threshold;
    if (threshold !== undefined && threshold > 0 && a.count <= threshold) return true;
    if (a.target_stock_goal && (a.count / a.target_stock_goal) * 100 <= (a.alert_percentage || 20))
      return true;
    return false;
  };

  const isComponentLow = (c: ReloadingComponent) => {
    return c.min_threshold !== undefined && c.min_threshold > 0 && c.quantity <= c.min_threshold;
  };

  // Telemetry Calculations
  const totalAmmoCount = useMemo(
    () => ammoList.reduce((sum, a) => sum + (Number(a.count) || 0), 0),
    [ammoList]
  );
  const totalCaliberCount = useMemo(() => new Set(ammoList.map((a) => a.caliber)).size, [ammoList]);
  const totalAmmoVal = useMemo(
    () =>
      ammoList.reduce((sum, a) => sum + (Number(a.count) || 0) * parseCurrency(a.costPerRound), 0),
    [ammoList]
  );
  const lowAmmoAlerts = useMemo(() => ammoList.filter((ammo) => isAmmoLow(ammo)), [ammoList]);

  const totalPowderGrains = useMemo(() => {
    return components
      .filter((c) => c.type === 'Powder')
      .reduce((sum, c) => sum + toGrains(Number(c.quantity) || 0, c.weightUnit || 'lbs'), 0);
  }, [components]);

  const totalPowderLbs = useMemo(() => {
    return Number((totalPowderGrains / 7000).toFixed(2));
  }, [totalPowderGrains]);

  const totalPrimersCount = useMemo(() => {
    return components
      .filter((c) => c.type === 'Primer')
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [components]);

  const totalBulletsCount = useMemo(() => {
    return components
      .filter((c) => c.type === 'Bullet')
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [components]);

  const totalBrassCount = useMemo(() => {
    return components
      .filter((c) => c.type === 'Brass')
      .reduce((sum, c) => sum + (Number(c.quantity) || 0), 0);
  }, [components]);

  const totalReloadingVal = useMemo(() => {
    return components.reduce((sum, c) => sum + parseCurrency(c.cost), 0);
  }, [components]);

  const grandTotalDepotVal = totalAmmoVal + totalReloadingVal;
  const lowComponentAlerts = useMemo(
    () => components.filter((c) => isComponentLow(c)),
    [components]
  );

  // Top Caliber Showcase Breakdown (Website Preview Style)
  const topCaliberShowcase = useMemo(() => {
    const caliberMap: Record<
      string,
      {
        caliber: string;
        count: number;
        factoryCount: number;
        handloadCount: number;
        goal: number;
        profiles: string[];
      }
    > = {};

    ammoList.forEach((a) => {
      const cal = a.caliber || 'Unknown';
      if (!caliberMap[cal]) {
        caliberMap[cal] = {
          caliber: cal,
          count: 0,
          factoryCount: 0,
          handloadCount: 0,
          goal: 0,
          profiles: [],
        };
      }
      caliberMap[cal].count += Number(a.count) || 0;
      if (a.type === 'factory') caliberMap[cal].factoryCount += Number(a.count) || 0;
      else caliberMap[cal].handloadCount += Number(a.count) || 0;
      if (a.target_stock_goal) caliberMap[cal].goal += a.target_stock_goal;

      const profileName =
        a.type === 'factory'
          ? `${a.manufacturer || ''} ${a.projectile || (a.grain ? a.grain + 'gr' : '')}`.trim()
          : `Handload ${a.bullet_manufacturer || ''} ${a.grain ? a.grain + 'gr' : ''} (${a.powder || ''})`.trim();
      if (profileName && !caliberMap[cal].profiles.includes(profileName)) {
        caliberMap[cal].profiles.push(profileName);
      }
    });

    return Object.values(caliberMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
  }, [ammoList]);

  // Filtered Ammo List
  const filteredAmmo = useMemo(() => {
    return ammoList.filter((a) => {
      // Storage Location filter
      if (selectedStorageLocationId !== 'ALL') {
        const loc = storageIndex.getLocation('ammo', a.id);
        if (selectedStorageLocationId === 'UNASSIGNED') {
          if (loc) return false;
        } else if (loc?.id !== Number(selectedStorageLocationId)) {
          return false;
        }
      }

      // Subview filter
      if (activeDepotView === 'ammo' && a.type !== activeAmmoTab) return false;

      // Chip filter
      if (selectedFilterChip === 'low_stock' && !isAmmoLow(a)) return false;
      if (selectedFilterChip === 'handload' && a.type !== 'handload') return false;
      if (
        selectedFilterChip === 'pistol' &&
        getAmmoCategory(a.caliber, customCategories) !== 'Pistol'
      )
        return false;
      if (
        selectedFilterChip === 'rifle' &&
        getAmmoCategory(a.caliber, customCategories) !== 'Rifle'
      )
        return false;
      if (
        selectedFilterChip === 'shotgun' &&
        getAmmoCategory(a.caliber, customCategories) !== 'Shotgun'
      )
        return false;

      // Text query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable =
          `${a.caliber} ${a.manufacturer || ''} ${a.projectile || ''} ${a.powder || ''} ${a.shot_size || ''} ${a.notes || ''}`.toLowerCase();
        return searchable.includes(q);
      }
      return true;
    });
  }, [
    ammoList,
    activeDepotView,
    activeAmmoTab,
    selectedFilterChip,
    searchQuery,
    customCategories,
    selectedStorageLocationId,
    storageIndex,
  ]);

  // Filtered Components List
  const filteredComponents = useMemo(() => {
    return components.filter((c) => {
      if (selectedFilterChip === 'low_stock' && !isComponentLow(c)) return false;
      if (selectedFilterChip === 'powder' && c.type !== 'Powder') return false;
      if (selectedFilterChip === 'primer' && c.type !== 'Primer') return false;
      if (selectedFilterChip === 'bullet' && c.type !== 'Bullet') return false;
      if (selectedFilterChip === 'brass' && c.type !== 'Brass') return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const searchable =
          `${c.manufacturer} ${c.name || ''} ${c.type} ${c.caliber || ''} ${c.notes || ''}`.toLowerCase();
        return searchable.includes(q);
      }
      return true;
    });
  }, [components, selectedFilterChip, searchQuery]);

  const isFormShotgun = useMemo(() => {
    const cat = getAmmoCategory(formData.caliber || '', customCategories);
    return cat === 'Shotgun';
  }, [formData.caliber, customCategories]);

  return (
    <div className="page-container">
      {/* Page Header Bar */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Ammo &amp; Reloading Depot</h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
            Ammunition Stocks, Handload Recipes, Powder, Primers &amp; Reloading Logistics
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Quick Add Menu */}
          <button
            className="btn-primary"
            onClick={() => {
              if (activeDepotView === 'reloading') openAddComponentModal();
              else openAddAmmoModal(activeAmmoTab);
            }}
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <PlusCircle size={16} />
            <span>
              {activeDepotView === 'reloading'
                ? 'Add Component'
                : `Add ${activeAmmoTab === 'factory' ? 'Ammo' : 'Handload'}`}
            </span>
          </button>

          {/* Customize Cards Dropdown */}
          <div className="customize-metrics-wrap">
            <button
              className="btn-secondary"
              onClick={() => setIsCustomizeOpen(!isCustomizeOpen)}
              title="Customize Depot Metric Cards"
              style={{ padding: '0.5rem 0.85rem', fontSize: '0.85rem' }}
            >
              <SlidersHorizontal size={15} />
              <span>Customize Cards</span>
            </button>

            {isCustomizeOpen && (
              <div className="customize-metrics-popover">
                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                    marginBottom: '0.4rem',
                  }}
                >
                  Live Ammunition Cards
                </div>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <CartridgesIcon size={14} color="var(--accent)" />
                    <span>Total Live Rounds</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.totalRounds}
                    onChange={() => handleToggleMetric('totalRounds')}
                  />
                </label>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <Package size={14} color="#60a5fa" />
                    <span>Caliber Profiles</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.caliberProfiles}
                    onChange={() => handleToggleMetric('caliberProfiles')}
                  />
                </label>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <DollarSign size={14} color="#10b981" />
                    <span>Ammo Inventory Value</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.ammoValue}
                    onChange={() => handleToggleMetric('ammoValue')}
                  />
                </label>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle size={14} color="#f59e0b" />
                    <span>Ammo Low Stock Health</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.lowStockHealth}
                    onChange={() => handleToggleMetric('lowStockHealth')}
                  />
                </label>

                <div
                  style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-muted)',
                    margin: '0.8rem 0 0.4rem',
                  }}
                >
                  Reloading Component Cards
                </div>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <GunpowderIcon size={14} color="#38bdf8" />
                    <span>Smokeless Powder (lbs)</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.powderStock}
                    onChange={() => handleToggleMetric('powderStock')}
                  />
                </label>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <PrimerIcon size={14} color="#fbbf24" />
                    <span>Primers on Hand</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.primersStock}
                    onChange={() => handleToggleMetric('primersStock')}
                  />
                </label>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <BulletProjectileIcon size={14} color="#f97316" />
                    <span>Projectiles / Bullets</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.bulletsStock}
                    onChange={() => handleToggleMetric('bulletsStock')}
                  />
                </label>
                <label className="metric-toggle-row">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <BrassCaseIcon size={14} color="#eab308" />
                    <span>Brass Casings</span>
                  </span>
                  <input
                    type="checkbox"
                    checked={metricVisibility.brassStock}
                    onChange={() => handleToggleMetric('brassStock')}
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Togglable Command Metrics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.75rem',
        }}
      >
        {/* Metric 1: Total Live Rounds */}
        {metricVisibility.totalRounds && (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.12)',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: '#60a5fa',
                }}
              >
                <Target size={22} />
              </div>
              <div>
                <div className="stat-label">Total Live Rounds</div>
                <div className="stat-val">
                  {totalAmmoCount.toLocaleString()}{' '}
                  <span
                    style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}
                  >
                    rds
                  </span>
                </div>
                <div className="stat-sub">{totalCaliberCount} Distinct Calibers</div>
              </div>
            </div>
          </div>
        )}

        {/* Metric 2: Caliber Profiles */}
        {metricVisibility.caliberProfiles && (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: '#34d399',
                }}
              >
                <Package size={22} />
              </div>
              <div>
                <div className="stat-label">Caliber Profiles</div>
                <div className="stat-val">{ammoList.length}</div>
                <div className="stat-sub">
                  {ammoList.filter((a) => a.type === 'factory').length} Factory &bull;{' '}
                  {ammoList.filter((a) => a.type === 'handload').length} Handload
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metric 3: Ammo Net Value */}
        {metricVisibility.ammoValue && (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(245, 158, 11, 0.12)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: '#fbbf24',
                }}
              >
                <DollarSign size={22} />
              </div>
              <div>
                <div className="stat-label">Ammo Net Value</div>
                <div className="stat-val privacy-mask-val">
                  {maskValue(formatCurrency(totalAmmoVal), 'currency', themeConfig.privacyMode)}
                </div>
                <div className="stat-sub">Live Ammo Stock Baseline</div>
              </div>
            </div>
          </div>
        )}

        {/* Metric 4: Low Stock Health */}
        {metricVisibility.lowStockHealth && (
          <div
            className="stat-card"
            onClick={() =>
              setSelectedFilterChip(selectedFilterChip === 'low_stock' ? 'all' : 'low_stock')
            }
            style={{ cursor: 'pointer' }}
            title="Click to filter low stock items"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background:
                    lowAmmoAlerts.length > 0
                      ? 'rgba(239, 68, 68, 0.15)'
                      : 'rgba(16, 185, 129, 0.12)',
                  border: `1px solid ${lowAmmoAlerts.length > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.25)'}`,
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: lowAmmoAlerts.length > 0 ? '#f87171' : '#34d399',
                }}
              >
                {lowAmmoAlerts.length > 0 ? (
                  <AlertTriangle size={22} />
                ) : (
                  <CheckCircle2 size={22} />
                )}
              </div>
              <div>
                <div className="stat-label">Stock Health</div>
                <div
                  className="stat-val"
                  style={{ color: lowAmmoAlerts.length > 0 ? '#f87171' : '#34d399' }}
                >
                  {lowAmmoAlerts.length > 0 ? `${lowAmmoAlerts.length} Low` : '100% Ready'}
                </div>
                <div className="stat-sub">
                  {lowAmmoAlerts.length > 0 ? 'Replenishment Needed' : 'All Levels Optimal'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metric 5: Smokeless Powder */}
        {metricVisibility.powderStock && (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(168, 85, 247, 0.12)',
                  border: '1px solid rgba(168, 85, 247, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: '#c084fc',
                }}
              >
                <FlaskConical size={22} />
              </div>
              <div>
                <div className="stat-label">Smokeless Powder</div>
                <div className="stat-val">
                  {totalPowderLbs.toFixed(1)}{' '}
                  <span
                    style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}
                  >
                    lbs
                  </span>
                </div>
                <div className="stat-sub">
                  {components.filter((c) => c.type === 'Powder').length} Powder Types
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metric 6: Primers */}
        {metricVisibility.primersStock && (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(234, 179, 8, 0.12)',
                  border: '1px solid rgba(234, 179, 8, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: '#facc15',
                }}
              >
                <Zap size={22} />
              </div>
              <div>
                <div className="stat-label">Primers on Hand</div>
                <div className="stat-val">
                  {totalPrimersCount.toLocaleString()}{' '}
                  <span
                    style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}
                  >
                    ct
                  </span>
                </div>
                <div className="stat-sub">
                  {components.filter((c) => c.type === 'Primer').length} Primer Lots
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metric 7: Projectiles */}
        {metricVisibility.bulletsStock && (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(56, 189, 248, 0.12)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: '#38bdf8',
                }}
              >
                <CircleDot size={22} />
              </div>
              <div>
                <div className="stat-label">Projectiles</div>
                <div className="stat-val">
                  {totalBulletsCount.toLocaleString()}{' '}
                  <span
                    style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}
                  >
                    ct
                  </span>
                </div>
                <div className="stat-sub">
                  {components.filter((c) => c.type === 'Bullet').length} Bullet Varieties
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Metric 8: Brass */}
        {metricVisibility.brassStock && (
          <div className="stat-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.12)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  padding: '0.75rem',
                  borderRadius: '12px',
                  color: '#f87171',
                }}
              >
                <Shield size={22} />
              </div>
              <div>
                <div className="stat-label">Brass &amp; Hulls</div>
                <div className="stat-val">
                  {totalBrassCount.toLocaleString()}{' '}
                  <span
                    style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}
                  >
                    ct
                  </span>
                </div>
                <div className="stat-sub">Across All Prep Stages</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Top Caliber Quick-Stock Breakdown Cards (Website Preview Style) */}
      {topCaliberShowcase.length > 0 && (
        <div style={{ marginBottom: '1.75rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.85rem',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Boxes size={18} style={{ color: 'var(--accent-primary)' }} />
              Top Vault Calibers &bull; Live Telemetry
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Total Depot Net Worth:{' '}
              <strong style={{ color: 'var(--success)' }}>
                $
                {grandTotalDepotVal.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </span>
          </div>

          <div className="ammo-showcase-grid">
            {topCaliberShowcase.map((top, idx) => {
              const accents = ['accent-blue', 'accent-emerald', 'accent-amber'];
              const accentClass = accents[idx % accents.length];
              return (
                <div key={top.caliber} className={`ammo-showcase-card ${accentClass}`}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        fontWeight: 700,
                      }}
                    >
                      {top.caliber}
                    </div>
                    <span className="inventory-caliber-badge">#{idx + 1} Caliber</span>
                  </div>

                  <div
                    style={{
                      fontSize: '1.4rem',
                      fontWeight: 700,
                      margin: '0.4rem 0 0.2rem',
                      color: '#fff',
                    }}
                  >
                    {top.count.toLocaleString()}{' '}
                    <span
                      style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}
                    >
                      rds
                    </span>
                  </div>

                  <div
                    style={{
                      fontSize: '0.775rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '0.75rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {top.profiles.slice(0, 2).join(' + ') || `${top.factoryCount} factory rds`}
                  </div>

                  {top.goal > 0 && (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.725rem',
                          color: 'var(--text-muted)',
                          marginBottom: '3px',
                        }}
                      >
                        <span>Target Goal ({top.goal} rds)</span>
                        <span>{Math.min(100, Math.round((top.count / top.goal) * 100))}%</span>
                      </div>
                      <div
                        style={{
                          width: '100%',
                          height: '5px',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${Math.min(100, (top.count / top.goal) * 100)}%`,
                            height: '100%',
                            background:
                              idx === 0
                                ? 'var(--accent-primary)'
                                : idx === 1
                                  ? 'var(--accent-emerald)'
                                  : 'var(--accent-amber)',
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-View Switcher Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.25rem',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '0.75rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          onClick={() => {
            setActiveDepotView('ammo');
            setSelectedFilterChip('all');
          }}
          className={`btn-secondary ${activeDepotView === 'ammo' ? 'active' : ''}`}
          style={{
            padding: '0.5rem 1.15rem',
            fontSize: '0.9rem',
            background: activeDepotView === 'ammo' ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
            borderColor:
              activeDepotView === 'ammo' ? 'var(--accent-primary)' : 'var(--border-light)',
            color: activeDepotView === 'ammo' ? '#93c5fd' : 'var(--text-secondary)',
          }}
        >
          <Target size={16} />
          <span>Live Ammunition ({totalAmmoCount.toLocaleString()} rds)</span>
        </button>

        {isInstalled('reloading') ? (
          <>
            <button
              onClick={() => {
                setActiveDepotView('reloading');
                setSelectedFilterChip('all');
              }}
              className={`btn-secondary ${activeDepotView === 'reloading' ? 'active' : ''}`}
              style={{
                padding: '0.5rem 1.15rem',
                fontSize: '0.9rem',
                background:
                  activeDepotView === 'reloading' ? 'rgba(168, 85, 247, 0.2)' : 'transparent',
                borderColor: activeDepotView === 'reloading' ? '#c084fc' : 'var(--border-light)',
                color: activeDepotView === 'reloading' ? '#c084fc' : 'var(--text-secondary)',
              }}
            >
              <FlaskConical size={16} />
              <span>Reloading Supplies ({components.length} Items)</span>
            </button>

            <button
              onClick={() => {
                setActiveDepotView('combined');
                setSelectedFilterChip('all');
              }}
              className={`btn-secondary ${activeDepotView === 'combined' ? 'active' : ''}`}
              style={{
                padding: '0.5rem 1.15rem',
                fontSize: '0.9rem',
                background:
                  activeDepotView === 'combined' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                borderColor:
                  activeDepotView === 'combined' ? 'var(--accent-emerald)' : 'var(--border-light)',
                color: activeDepotView === 'combined' ? '#34d399' : 'var(--text-secondary)',
              }}
            >
              <Layers size={16} />
              <span>Combined Overview</span>
            </button>
          </>
        ) : (
          <button
            onClick={() => openModuleCenter('reloading')}
            className="btn-secondary"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              borderStyle: 'dashed',
            }}
            title="Install Reloading Workbench module to track powder, primers, brass & bullets"
          >
            <FlaskConical size={15} />
            <span>+ Add Reloading Supplies Module</span>
          </button>
        )}
      </div>

      {/* Unified Tactical Control Deck */}
      <div className="dashboard-control-deck">
        {/* Left: Filter Chips */}
        <div className="filter-chips-bar">
          <button
            className={`filter-chip ${selectedFilterChip === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedFilterChip('all')}
          >
            <span>All Items</span>
            <span className="filter-chip-count">
              {activeDepotView === 'ammo'
                ? ammoList.length
                : activeDepotView === 'reloading'
                  ? components.length
                  : ammoList.length + components.length}
            </span>
          </button>

          {activeDepotView === 'ammo' && (
            <>
              <button
                className={`filter-chip ${selectedFilterChip === 'pistol' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('pistol')}
              >
                <HandgunIcon size={14} />
                <span>Handguns</span>
                <span className="filter-chip-count">
                  {
                    ammoList.filter(
                      (a) => getAmmoCategory(a.caliber, customCategories) === 'Pistol'
                    ).length
                  }
                </span>
              </button>

              <button
                className={`filter-chip ${selectedFilterChip === 'rifle' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('rifle')}
              >
                <RifleIcon size={14} />
                <span>Rifles</span>
                <span className="filter-chip-count">
                  {
                    ammoList.filter((a) => getAmmoCategory(a.caliber, customCategories) === 'Rifle')
                      .length
                  }
                </span>
              </button>

              <button
                className={`filter-chip ${selectedFilterChip === 'shotgun' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('shotgun')}
              >
                <ShotgunIcon size={14} />
                <span>Shotguns</span>
                <span className="filter-chip-count">
                  {
                    ammoList.filter(
                      (a) => getAmmoCategory(a.caliber, customCategories) === 'Shotgun'
                    ).length
                  }
                </span>
              </button>

              <button
                className={`filter-chip ${selectedFilterChip === 'handload' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('handload')}
              >
                <Flame size={14} color="#f97316" />
                <span>Handloads</span>
                <span className="filter-chip-count">
                  {ammoList.filter((a) => a.type === 'handload').length}
                </span>
              </button>
            </>
          )}

          {activeDepotView === 'reloading' && (
            <>
              <button
                className={`filter-chip ${selectedFilterChip === 'powder' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('powder')}
              >
                <GunpowderIcon size={14} color="#38bdf8" />
                <span>Powder</span>
                <span className="filter-chip-count">
                  {components.filter((c) => c.type === 'Powder').length}
                </span>
              </button>

              <button
                className={`filter-chip ${selectedFilterChip === 'primer' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('primer')}
              >
                <PrimerIcon size={14} color="#fbbf24" />
                <span>Primers</span>
                <span className="filter-chip-count">
                  {components.filter((c) => c.type === 'Primer').length}
                </span>
              </button>

              <button
                className={`filter-chip ${selectedFilterChip === 'bullet' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('bullet')}
              >
                <BulletProjectileIcon size={14} color="#f97316" />
                <span>Bullets</span>
                <span className="filter-chip-count">
                  {components.filter((c) => c.type === 'Bullet').length}
                </span>
              </button>

              <button
                className={`filter-chip ${selectedFilterChip === 'brass' ? 'active' : ''}`}
                onClick={() => setSelectedFilterChip('brass')}
              >
                <BrassCaseIcon size={14} color="#eab308" />
                <span>Brass</span>
                <span className="filter-chip-count">
                  {components.filter((c) => c.type === 'Brass').length}
                </span>
              </button>
            </>
          )}

          <button
            className={`filter-chip ${selectedFilterChip === 'low_stock' ? 'active' : ''}`}
            onClick={() => setSelectedFilterChip('low_stock')}
            style={{
              borderColor:
                lowAmmoAlerts.length > 0 || lowComponentAlerts.length > 0
                  ? 'rgba(239, 68, 68, 0.4)'
                  : undefined,
              color:
                lowAmmoAlerts.length > 0 || lowComponentAlerts.length > 0 ? '#f87171' : undefined,
            }}
          >
            <AlertTriangle size={14} style={{ color: '#f87171' }} />
            <span>Low Stock</span>
            <span
              className="filter-chip-count"
              style={{
                background:
                  lowAmmoAlerts.length > 0 || lowComponentAlerts.length > 0
                    ? 'rgba(239,68,68,0.3)'
                    : undefined,
              }}
            >
              {activeDepotView === 'reloading' ? lowComponentAlerts.length : lowAmmoAlerts.length}
            </span>
          </button>
        </div>

        {/* Right: Search Box + Factory/Handload Subtabs */}
        <div className="dashboard-control-right">
          {activeDepotView === 'ammo' && (
            <div className="view-mode-toggle" style={{ marginRight: '0.4rem' }}>
              <button
                className={`view-mode-btn ${activeAmmoTab === 'factory' ? 'active' : ''}`}
                onClick={() => setActiveAmmoTab('factory')}
                style={{ width: 'auto', padding: '0 0.6rem', fontSize: '0.8rem', gap: '0.3rem' }}
                title="Factory Production Ammo"
              >
                <Package size={14} />
                <span>Factory</span>
              </button>
              <button
                className={`view-mode-btn ${activeAmmoTab === 'handload' ? 'active' : ''}`}
                onClick={() => setActiveAmmoTab('handload')}
                style={{ width: 'auto', padding: '0 0.6rem', fontSize: '0.8rem', gap: '0.3rem' }}
                title="Custom Handload Recipes"
              >
                <Target size={14} />
                <span>Handload</span>
              </button>
            </div>
          )}

          <div className="search-box">
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search calibers, bullets, powder..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            className="form-input"
            style={{
              width: 'auto',
              minWidth: '180px',
              padding: '0.35rem 0.6rem',
              fontSize: '0.8rem',
              height: '36px',
            }}
            value={selectedStorageLocationId}
            onChange={(e) => setSelectedStorageLocationId(e.target.value)}
            title="Filter depot items by storage location / container"
          >
            <option value="ALL">All Storage Locations</option>
            <option value="UNASSIGNED">Unassigned Containers</option>
            {storageLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                [{loc.type}] {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main View: Ammunition Inventory */}
      {(activeDepotView === 'ammo' || activeDepotView === 'combined') && (
        <div style={{ marginBottom: '2.5rem' }}>
          {activeDepotView === 'combined' && (
            <h2
              style={{
                fontSize: '1.25rem',
                marginBottom: '1rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <Target size={20} style={{ color: 'var(--accent-primary)' }} />
              Live Ammunition Inventory
            </h2>
          )}

          {['Pistol', 'Rifle', 'Shotgun', 'Other'].map((category) => {
            const categoryAmmo = filteredAmmo
              .filter((a) => getAmmoCategory(a.caliber, customCategories) === category)
              .sort((a, b) => (a.caliber || '').localeCompare(b.caliber || ''));
            if (categoryAmmo.length === 0) return null;
            return (
              <div key={category} style={{ marginBottom: '2rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.5rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
                    {category} Calibers
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {categoryAmmo
                      .reduce((sum, a) => sum + (Number(a.count) || 0), 0)
                      .toLocaleString()}{' '}
                    rounds
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {categoryAmmo.map((ammo) => {
                    const isLow = isAmmoLow(ammo);
                    return (
                      <div
                        key={ammo.id}
                        className="card ammo-card"
                        onClick={() => setInspectingAmmo(ammo)}
                        style={{
                          position: 'relative',
                          cursor: 'pointer',
                          border: isLow ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                          background: isLow ? 'rgba(239, 68, 68, 0.03)' : undefined,
                        }}
                      >
                        {/* Top Header Row: Storage & Status Badges on left, Quick Actions on right */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '0.5rem',
                            marginBottom: '0.45rem',
                            minHeight: '1.75rem',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.4rem',
                              flexWrap: 'wrap',
                              minWidth: 0,
                            }}
                          >
                            <StorageBadge
                              location={storageIndex.getLocation('ammo', ammo.id)}
                              onClick={(e) => {
                                e?.stopPropagation();
                                navigate('/storage');
                              }}
                              size="sm"
                            />
                            {isLow && (
                              <span
                                style={{
                                  background: 'rgba(239, 68, 68, 0.15)',
                                  color: '#f87171',
                                  border: '1px solid rgba(239, 68, 68, 0.3)',
                                  padding: '0.1rem 0.4rem',
                                  borderRadius: '4px',
                                  fontSize: '0.7rem',
                                  fontWeight: 'bold',
                                }}
                              >
                                Low Stock
                              </span>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.35rem',
                              flexShrink: 0,
                            }}
                          >
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setLabelModalAmmo(ammo);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#38bdf8',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Print Can / Box Sticker Label"
                            >
                              <Tag size={15} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePrintAmmoQR(ammo);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#60a5fa',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Print Standard QR Sheet"
                            >
                              <Printer size={15} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveAmmoQR(ammo);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#60a5fa',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Save QR Image"
                            >
                              <Upload size={15} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditAmmoModal(ammo);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Edit Ammo"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteAmmo(ammo.id!);
                              }}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                              title="Delete Ammo"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Caliber Heading */}
                        <h3
                          style={{
                            fontSize: '1.25rem',
                            margin: '0 0 0.25rem 0',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            color: 'var(--text-primary)',
                            letterSpacing: '-0.01em',
                            wordBreak: 'break-word',
                          }}
                        >
                          {ammo.caliber}
                          {ammo.isPlusP && (
                            <span
                              style={{
                                fontSize: '0.7rem',
                                padding: '0.1rem 0.35rem',
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: '#ef4444',
                                borderRadius: '4px',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                fontWeight: 'bold',
                              }}
                            >
                              +P
                            </span>
                          )}
                        </h3>

                        <p
                          style={{
                            color: 'var(--text-secondary)',
                            fontSize: '0.85rem',
                            marginBottom: '1rem',
                            minHeight: '1.3rem',
                          }}
                        >
                          {(() => {
                            const isShotgun = category === 'Shotgun';
                            if (ammo.type === 'factory') {
                              if (isShotgun) {
                                const fmtPayload = ammo.oz_payload
                                  ? ammo.oz_payload.toLowerCase().includes('oz')
                                    ? ammo.oz_payload
                                    : `${ammo.oz_payload} oz`
                                  : ammo.pellet_count
                                    ? `${ammo.pellet_count} pellets`
                                    : '';
                                return `${ammo.manufacturer || 'Unknown Make'} - ${ammo.shot_size || 'Unknown Shot'} ${fmtPayload ? `(${fmtPayload})` : ''}`.trim();
                              }
                              return `${ammo.manufacturer || 'Unknown Make'} - ${ammo.grain || '??'}gr ${ammo.projectile || ''}`.trim();
                            } else {
                              if (isShotgun) {
                                const fmtPayload = ammo.oz_payload
                                  ? ammo.oz_payload.toLowerCase().includes('oz')
                                    ? ammo.oz_payload
                                    : `${ammo.oz_payload} oz`
                                  : ammo.pellet_count
                                    ? `${ammo.pellet_count} pellets`
                                    : '';
                                return `${ammo.shot_size || 'Unknown Shot'} - ${ammo.powder || 'Unknown Powder'} ${ammo.powderCharge ? `(${ammo.powderCharge}gr)` : ''} ${fmtPayload ? `(${fmtPayload})` : ''}`.trim();
                              }
                              return `${ammo.bullet_manufacturer ? ammo.bullet_manufacturer + ' ' : ''}${ammo.grain ? ammo.grain + 'gr ' : ''}${ammo.projectile || 'Unknown'} - ${ammo.powder || 'Unknown Powder'} ${ammo.powderCharge ? `(${ammo.powderCharge}gr)` : ''}`.trim();
                            }
                          })()}
                        </p>

                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            background: 'rgba(0,0,0,0.25)',
                            padding: '0.85rem 1rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                            }}
                          >
                            <div>
                              <span
                                style={{
                                  color: 'var(--text-muted)',
                                  fontSize: '0.75rem',
                                  display: 'block',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                Rounds in Stock
                              </span>
                              <strong
                                style={{
                                  fontSize: '1.35rem',
                                  color: isLow ? 'var(--danger)' : 'var(--accent)',
                                }}
                              >
                                {ammo.count.toLocaleString()}
                              </strong>
                            </div>
                            {ammo.costPerRound && (
                              <div style={{ textAlign: 'right' }}>
                                <span
                                  style={{
                                    color: 'var(--text-muted)',
                                    fontSize: '0.75rem',
                                    display: 'block',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.04em',
                                  }}
                                >
                                  Cost / Rnd
                                </span>
                                <strong style={{ fontSize: '1.1rem', color: 'var(--success)' }}>
                                  ${parseCurrency(ammo.costPerRound).toFixed(2)}
                                </strong>
                              </div>
                            )}
                          </div>

                          {ammo.target_stock_goal && (
                            <div>
                              <div
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  fontSize: '0.725rem',
                                  color: 'var(--text-secondary)',
                                  marginBottom: '3px',
                                }}
                              >
                                <span>Stock Goal</span>
                                <span>
                                  {Math.round((ammo.count / ammo.target_stock_goal) * 100)}% (
                                  {ammo.target_stock_goal})
                                </span>
                              </div>
                              <div
                                style={{
                                  width: '100%',
                                  height: '5px',
                                  background: 'rgba(255,255,255,0.08)',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                }}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${Math.min(100, (ammo.count / ammo.target_stock_goal) * 100)}%`,
                                    background: isLow ? 'var(--danger)' : 'var(--accent)',
                                    transition: 'width 0.3s ease',
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        {ammo.type === 'handload' && (
                          <>
                            <div
                              style={{
                                marginTop: '0.85rem',
                                fontSize: '0.8rem',
                                color: 'var(--text-secondary)',
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr',
                                gap: '0.4rem',
                              }}
                            >
                              <div>
                                <strong>Primer:</strong>{' '}
                                {ammo.primer_type
                                  ? `${ammo.primer_type} (${ammo.primer || 'Unknown'})`
                                  : ammo.primer || 'N/A'}
                              </div>
                              <div>
                                <strong>Brass/Hull:</strong>{' '}
                                {ammo.brass || ammo.shell_length || 'N/A'}
                              </div>
                              <div>
                                <strong>OAL:</strong> {ammo.oal ? `${ammo.oal}"` : 'N/A'}
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn-primary"
                              onClick={(e) => {
                                e.stopPropagation();
                                setBatchManufactureAmmo(ammo);
                              }}
                              style={{
                                marginTop: '0.85rem',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.825rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.4rem',
                                width: '100%',
                              }}
                              title="Manufacture a batch of this recipe and deduct powder, primers, brass, and bullets automatically"
                            >
                              <Sparkles size={14} /> Assemble / Manufacture Batch
                            </button>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredAmmo.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <Target size={36} opacity={0.3} style={{ marginBottom: '0.75rem' }} />
              <h3>No Ammunition Profiles Found</h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem',
                }}
              >
                Try adjusting your search query or add a new ammunition profile.
              </p>
              <button
                className="btn-secondary btn-sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedFilterChip('all');
                }}
                style={{ marginTop: '0.85rem' }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* Main View: Reloading Supplies Inventory */}
      {(activeDepotView === 'reloading' || activeDepotView === 'combined') && (
        <div style={{ marginBottom: '2.5rem' }}>
          {activeDepotView === 'combined' && (
            <h2
              style={{
                fontSize: '1.25rem',
                marginBottom: '1rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <FlaskConical size={20} style={{ color: '#c084fc' }} />
              Reloading Components Inventory
            </h2>
          )}

          {['Powder', 'Primer', 'Bullet', 'Brass'].map((type) => {
            const typeComps = filteredComponents.filter((c) => c.type === type);
            if (typeComps.length === 0) return null;

            return (
              <div key={type} style={{ marginBottom: '2rem' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid var(--border-subtle)',
                    paddingBottom: '0.5rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <h3
                    style={{
                      fontSize: '1.1rem',
                      margin: 0,
                      color: 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {type === 'Powder' ? (
                      <>
                        <GunpowderIcon size={18} color="#38bdf8" />
                        <span>Smokeless Powder</span>
                      </>
                    ) : type === 'Primer' ? (
                      <>
                        <PrimerIcon size={18} color="#fbbf24" />
                        <span>Primers</span>
                      </>
                    ) : type === 'Bullet' ? (
                      <>
                        <BulletProjectileIcon size={18} color="#f97316" />
                        <span>Projectiles &amp; Bullets</span>
                      </>
                    ) : (
                      <>
                        <BrassCaseIcon size={18} color="#eab308" />
                        <span>Brass &amp; Casings</span>
                      </>
                    )}
                  </h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {typeComps.length} Varieties
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                    gap: '1.25rem',
                  }}
                >
                  {typeComps.map((c) => {
                    const isLow = isComponentLow(c);
                    return (
                      <div
                        key={c.id}
                        className="card ammo-card"
                        style={{
                          position: 'relative',
                          border: isLow ? '1px solid rgba(239, 68, 68, 0.4)' : undefined,
                          background: isLow ? 'rgba(239, 68, 68, 0.03)' : undefined,
                        }}
                      >
                        {/* Top Header: Manufacturer on left, Edit/Delete on right */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '0.2rem',
                          }}
                        >
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--accent)',
                              textTransform: 'uppercase',
                              letterSpacing: '0.05em',
                              fontWeight: 700,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {c.manufacturer}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              gap: '0.35rem',
                              flexShrink: 0,
                            }}
                          >
                            <button
                              onClick={() => openEditComponentModal(c)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                              }}
                              title="Edit Component"
                            >
                              <Edit size={15} />
                            </button>
                            <button
                              onClick={() => handleDeleteComponent(c.id!)}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                                padding: '0.2rem',
                              }}
                              title="Delete Component"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        <h3
                          style={{
                            fontSize: '1.15rem',
                            margin: '0.2rem 0 0.5rem',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {c.name || c.caliber || c.type}
                        </h3>

                        {/* Component Type Details */}
                        <div style={{ marginBottom: '0.85rem' }}>
                          {c.type === 'Powder' && c.usageTags && c.usageTags.length > 0 && (
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                              {c.usageTags.map((tag) => (
                                <span key={tag} className="powder-usage-tag">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {c.type === 'Brass' && (
                            <div
                              style={{
                                display: 'flex',
                                gap: '0.5rem',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                              }}
                            >
                              <span className="reloading-stage-badge">
                                Stage: {c.prepStage || 'Raw Fired'}
                              </span>
                              {c.caliber && (
                                <span className="inventory-caliber-badge">{c.caliber}</span>
                              )}
                            </div>
                          )}

                          {c.type === 'Bullet' && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {c.caliber} &bull; {c.grain ? `${c.grain}gr ` : ''}
                              {c.bulletType}
                            </div>
                          )}

                          {c.type === 'Primer' && (
                            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                              {c.primerType} {c.isMagnumPrimer ? '(Magnum)' : ''}
                            </div>
                          )}
                        </div>

                        {/* Stock & Valuation Box */}
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            background: 'rgba(0,0,0,0.25)',
                            padding: '0.75rem 0.95rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-subtle)',
                          }}
                        >
                          <div>
                            <span
                              style={{
                                color: 'var(--text-muted)',
                                fontSize: '0.725rem',
                                display: 'block',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                              }}
                            >
                              Quantity on Hand
                            </span>
                            <strong
                              style={{
                                fontSize: '1.25rem',
                                color: isLow ? 'var(--danger)' : '#fff',
                              }}
                            >
                              {c.type === 'Powder' ? (
                                <>
                                  {c.quantity}{' '}
                                  <span
                                    style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 500,
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    {c.weightUnit || 'lbs'}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: '0.75rem',
                                      fontWeight: 400,
                                      color: 'var(--accent)',
                                      marginLeft: '0.4rem',
                                    }}
                                  >
                                    (
                                    {toGrains(
                                      c.quantity || 0,
                                      c.weightUnit || 'lbs'
                                    ).toLocaleString()}{' '}
                                    gr)
                                  </span>
                                </>
                              ) : (
                                <>
                                  {c.quantity}{' '}
                                  <span
                                    style={{
                                      fontSize: '0.8rem',
                                      fontWeight: 500,
                                      color: 'var(--text-muted)',
                                    }}
                                  >
                                    ct
                                  </span>
                                </>
                              )}
                            </strong>
                          </div>

                          {c.cost !== undefined && c.cost > 0 && (
                            <div style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  color: 'var(--text-muted)',
                                  fontSize: '0.725rem',
                                  display: 'block',
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.04em',
                                }}
                              >
                                Valuation
                              </span>
                              <strong
                                className="privacy-mask-val"
                                style={{ fontSize: '1.05rem', color: 'var(--success)' }}
                              >
                                {maskValue(
                                  formatCurrency(c.cost),
                                  'currency',
                                  themeConfig.privacyMode
                                )}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {filteredComponents.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '3.5rem 1rem',
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <FlaskConical size={36} opacity={0.3} style={{ marginBottom: '0.75rem' }} />
              <h3>No Reloading Components Found</h3>
              <p
                style={{
                  color: 'var(--text-secondary)',
                  fontSize: '0.875rem',
                  marginTop: '0.25rem',
                }}
              >
                Add powders, primers, bullets, or brass casings to start tracking your reloading
                depot.
              </p>
              <button
                className="btn-primary btn-sm"
                onClick={() => openAddComponentModal()}
                style={{ marginTop: '0.85rem' }}
              >
                + Add First Component
              </button>
            </div>
          )}
        </div>
      )}

      {/* Standalone Modular Ammo Form Modal */}
      <AmmoModal
        isOpen={isAmmoModalOpen}
        onClose={() => {
          setIsAmmoModalOpen(false);
          setIsAddingStockMode(false);
        }}
        onSave={async (submissionData, locId) => {
          let savedId = editingAmmo?.id || null;
          if (editingAmmo && editingAmmo.id) {
            if (isAddingStockMode) {
              submissionData.count = (editingAmmo.count || 0) + (submissionData.count || 0);
            }
            await window.api.updateAmmo(editingAmmo.id, submissionData as Ammo);
            savedId = editingAmmo.id;
          } else {
            const duplicate = ammoList.find(
              (a) =>
                a.type === submissionData.type &&
                a.caliber === submissionData.caliber &&
                a.manufacturer === submissionData.manufacturer &&
                a.grain === submissionData.grain &&
                a.projectile === submissionData.projectile
            );

            let merged = false;
            if (duplicate) {
              if (
                window.confirm(
                  `An existing entry for ${duplicate.manufacturer || ''} ${duplicate.caliber} ${duplicate.grain || ''}gr was found. Would you like to merge this into the existing entry?`
                )
              ) {
                const mergedData = { ...duplicate };
                mergedData.count = (duplicate.count || 0) + (submissionData.count || 0);
                if (!mergedData.upc_code && submissionData.upc_code) {
                  mergedData.upc_code = submissionData.upc_code;
                }
                await window.api.updateAmmo(duplicate.id!, mergedData as Ammo);
                savedId = duplicate.id || null;
                merged = true;
              }
            }

            if (!merged) {
              const res = await window.api.addAmmo(submissionData as Ammo);
              if (typeof res === 'number') {
                savedId = res;
              } else if (res && typeof (res as any).id === 'number') {
                savedId = (res as any).id;
              } else {
                const fresh = await window.api.getAmmo();
                if (fresh && fresh.length > 0) {
                  savedId = Math.max(...fresh.map((a: any) => a.id || 0));
                }
              }
            }

            if (location.state && (location.state as any).syncItemId) {
              await window.api.removeSyncItem((location.state as any).syncItemId);
            }
          }

          // Bi-directional Storage Sync
          if (savedId && storageLocations.length > 0) {
            const updatedLocations = assignItemToStorage(
              'ammo',
              savedId,
              locId,
              storageLocations
            );
            await saveStorageLocations(updatedLocations);
          }

          setIsAmmoModalOpen(false);
          setIsAddingStockMode(false);

          if ((location.state as any)?.syncItemId) {
            window.history.replaceState({}, document.title);
          }

          loadData();
        }}
        editingAmmo={editingAmmo}
        isAddingStockMode={isAddingStockMode}
        initialType={activeAmmoTab === 'handload' ? 'handload' : 'factory'}
        initialUpc={formData.upc_code}
        storageLocations={storageLocations}
        ammoList={ammoList}
        onSwitchToComponents={() => {
          setActiveDepotView('reloading');
          openAddComponentModal();
        }}
      />

      {/* Inspecting Ammo Details Dossier Modal */}
      {inspectingAmmo &&
        createPortal(
          <div className="modal-overlay" onClick={() => setInspectingAmmo(null)}>
            <div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '640px' }}
            >
              <div className="modal-header">
                <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {inspectingAmmo.caliber}
                  {inspectingAmmo.isPlusP && (
                    <span
                      style={{
                        fontSize: '0.75rem',
                        padding: '0.1rem 0.4rem',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        borderRadius: '4px',
                        fontWeight: 'bold',
                      }}
                    >
                      +P
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      fontWeight: 'normal',
                    }}
                  >
                    ({inspectingAmmo.type === 'factory' ? 'Factory Ammo' : 'Custom Handload'})
                  </span>
                </h2>
                <button type="button" className="btn-icon" onClick={() => setInspectingAmmo(null)}>
                  <X size={18} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '1rem',
                    background: 'rgba(0,0,0,0.25)',
                    padding: '1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                      }}
                    >
                      Rounds in Stock
                    </span>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--accent)' }}>
                      {inspectingAmmo.count.toLocaleString()} rds
                    </div>
                  </div>
                  {inspectingAmmo.costPerRound && (
                    <div>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-muted)',
                          textTransform: 'uppercase',
                        }}
                      >
                        Cost Per Round
                      </span>
                      <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--success)' }}>
                        ${parseCurrency(inspectingAmmo.costPerRound).toFixed(2)}
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      Manufacturer / Make
                    </span>
                    <div style={{ fontWeight: 600 }}>
                      {inspectingAmmo.manufacturer || inspectingAmmo.bullet_manufacturer || 'N/A'}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {isShotgunAmmo(inspectingAmmo)
                        ? 'Shotgun Shell Specs'
                        : 'Bullet Weight & Type'}
                    </span>
                    <div style={{ fontWeight: 600 }}>
                      {isShotgunAmmo(inspectingAmmo)
                        ? formatShotgunSpecs(inspectingAmmo).summary
                        : `${inspectingAmmo.grain ? `${inspectingAmmo.grain}gr ` : ''}${inspectingAmmo.projectile || 'N/A'}`}
                    </div>
                  </div>
                  {inspectingAmmo.upc_code && (
                    <div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        {getBarcodeLabelType(inspectingAmmo.upc_code)} Identifier
                      </span>
                      <div style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                        {inspectingAmmo.upc_code}
                      </div>
                    </div>
                  )}
                  {inspectingAmmo.type === 'handload' && (
                    <>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Powder &amp; Charge
                        </span>
                        <div style={{ fontWeight: 600 }}>
                          {inspectingAmmo.powder || 'N/A'}{' '}
                          {inspectingAmmo.powderCharge ? `(${inspectingAmmo.powderCharge}gr)` : ''}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          Primer
                        </span>
                        <div style={{ fontWeight: 600 }}>
                          {inspectingAmmo.primer_type
                            ? `${inspectingAmmo.primer_type} (${inspectingAmmo.primer || ''})`
                            : inspectingAmmo.primer || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {isShotgunAmmo(inspectingAmmo) ? 'Hull' : 'Brass Casing'}
                        </span>
                        <div style={{ fontWeight: 600 }}>{inspectingAmmo.brass || 'N/A'}</div>
                      </div>
                      {!isShotgunAmmo(inspectingAmmo) && (
                        <div>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Overall Length (OAL)
                          </span>
                          <div style={{ fontWeight: 600 }}>
                            {inspectingAmmo.oal ? `${inspectingAmmo.oal}"` : 'N/A'}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>

                {inspectingAmmo.notes && (
                  <div
                    style={{
                      background: 'rgba(0,0,0,0.2)',
                      padding: '0.85rem',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '0.75rem',
                        color: 'var(--text-muted)',
                        textTransform: 'uppercase',
                        display: 'block',
                        marginBottom: '0.25rem',
                      }}
                    >
                      Notes
                    </span>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {inspectingAmmo.notes}
                    </div>
                  </div>
                )}

                <div
                  style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}
                >
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setInspectingAmmo(null);
                      setLabelModalAmmo(inspectingAmmo);
                    }}
                    style={{ flex: 1 }}
                  >
                    <Tag size={15} /> Print Box Label
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setInspectingAmmo(null);
                      openEditAmmoModal(inspectingAmmo);
                    }}
                    style={{ flex: 1 }}
                  >
                    <Edit size={15} /> Edit Details
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Reloading Component Modal */}
      <ReloadingComponentModal
        isOpen={isComponentModalOpen}
        onClose={() => setIsComponentModalOpen(false)}
        onSave={() => loadData()}
        editingId={editingComponent?.id || null}
        initialData={editingComponent || undefined}
      />

      {/* Ammo Can Label Sticker Modal */}
      {labelModalAmmo && (
        <AmmoCanLabelModal
          isOpen={true}
          onClose={() => setLabelModalAmmo(null)}
          ammo={labelModalAmmo}
        />
      )}

      {/* Batch Manufacture Modal */}
      {batchManufactureAmmo && (
        <BatchManufactureModal
          isOpen={true}
          onClose={() => setBatchManufactureAmmo(null)}
          onSuccess={() => loadData()}
          ammo={batchManufactureAmmo}
        />
      )}
    </div>
  );
};
