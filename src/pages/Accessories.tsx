import {
  AlertCircle,
  DollarSign,
  Package,
  PlusCircle,
  Search,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChassisIcon,
  HolsterIcon,
  MagazineIcon,
  PicatinnyMountIcon,
  ScopeIcon,
  StockIcon,
  SuppressorIcon,
} from '../components/CustomIcons';
import { AccessoryCard } from '../components/accessories/AccessoryCard';
import { AccessoryDetailModal } from '../components/modals/AccessoryDetailModal';
import { AccessoryModal } from '../components/modals/AccessoryModal';
import { useUndoToast } from '../components/UndoToast';
import { useVaultData } from '../context/VaultDataContext';
import { Accessory, Firearm, StorageLocation } from '../types';
import { formatCurrency, parseCurrency } from '../utils/currency';
import {
  removeItemFromAllStorage,
  saveStorageLocations,
} from '../utils/StorageSync';
import { buildStorageIndex } from '../utils/storageIndex';
import { getStoredTheme, maskValue, ThemeConfig } from '../utils/themeEngine';

export const Accessories: React.FC = () => {
  const { showUndo } = useUndoToast();
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => getStoredTheme());
  const {
    accessories: vaultAccessories,
    firearms: vaultFirearms,
    storageLocations: vaultLocations,
  } = useVaultData();

  const [accessories, setAccessories] = useState<Accessory[]>(() => vaultAccessories || []);
  const [firearms, setFirearms] = useState<Firearm[]>(() => vaultFirearms || []);
  const [locations, setLocations] = useState<StorageLocation[]>(() => vaultLocations || []);

  useEffect(() => {
    if (vaultAccessories && vaultAccessories.length > 0) setAccessories(vaultAccessories);
    if (vaultFirearms && vaultFirearms.length > 0) setFirearms(vaultFirearms);
    if (vaultLocations && vaultLocations.length > 0) setLocations(vaultLocations);
  }, [vaultAccessories, vaultFirearms, vaultLocations]);

  const [selectedLocationId, setSelectedLocationId] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<
    | 'all'
    | 'optics'
    | 'suppressors'
    | 'magazines'
    | 'holsters'
    | 'lights'
    | 'mounts'
    | 'stocks'
    | 'mounted'
    | 'unmounted'
  >('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedAccessoryForDetail, setSelectedAccessoryForDetail] = useState<Accessory | null>(
    null
  );

  const [formData, setFormData] = useState<Partial<Accessory>>({});
  const [visibleCount, setVisibleCount] = useState(36);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const locationProcessed = useRef<string | null>(null);

  useEffect(() => {
    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<ThemeConfig>;
      if (custom.detail) {
        setThemeConfig(custom.detail);
      }
    };
    window.addEventListener('armoryvault-theme-change', handleThemeChange);
    return () => window.removeEventListener('armoryvault-theme-change', handleThemeChange);
  }, []);

  useEffect(() => {
    setVisibleCount(36);
  }, [search, selectedLocationId, activeTab]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (
      location.state &&
      location.state.openAddModal &&
      locationProcessed.current !== location.key
    ) {
      locationProcessed.current = location.key;
      const initialNotes = location.state.upc ? `UPC: ${location.state.upc}` : '';
      const formDataToSet: any = { notes: initialNotes };
      if (location.state.parsedData) {
        Object.assign(formDataToSet, location.state.parsedData);
      }
      if (location.state.initialData) {
        Object.assign(formDataToSet, location.state.initialData);
      }
      if (location.state.upc) {
        formDataToSet.upc_code = location.state.upc;
      }
      setFormData(formDataToSet);
      setEditingId(null);
      setIsModalOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const storageIndex = useMemo(() => buildStorageIndex(locations), [locations]);
  const firearmsMap = useMemo(() => new Map(firearms.map((f) => [f.id!, f])), [firearms]);

  const loadData = async () => {
    if (window.api && window.api.getAccessories && window.api.getFirearms) {
      const [fetchedAcc, fetchedFirearms, locs] = await Promise.all([
        window.api.getAccessories(),
        window.api.getFirearms(),
        window.api.getStorageLocations ? window.api.getStorageLocations() : Promise.resolve([]),
      ]);
      setAccessories(fetchedAcc || []);
      setFirearms(fetchedFirearms || []);
      setLocations(locs || []);

      if (selectedAccessoryForDetail && fetchedAcc) {
        const refreshed = fetchedAcc.find((a) => a.id === selectedAccessoryForDetail.id);
        setSelectedAccessoryForDetail(refreshed || null);
      }
    }
  };

  const handleEdit = (acc: Accessory) => {
    setFormData(acc);
    setEditingId(acc.id || null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const targetAcc = accessories.find((a) => a.id === id);
    if (!targetAcc) return;

    if (locations.length > 0) {
      const updatedLocs = removeItemFromAllStorage('accessory', id, locations);
      await saveStorageLocations(updatedLocs);
    }
    if (window.api && window.api.deleteAccessory) {
      await window.api.deleteAccessory(id);
      if (selectedAccessoryForDetail?.id === id) {
        setSelectedAccessoryForDetail(null);
      }
      loadData();
      showUndo(`Deleted "${targetAcc.manufacturer} ${targetAcc.model}"`, async () => {
        if (window.api?.addAccessory) {
          const { id: _oldId, ...rest } = targetAcc;
          await window.api.addAccessory(rest as Accessory);
          loadData();
        }
      });
    }
  };

  const openNewModal = () => {
    setFormData({});
    setEditingId(null);
    setIsModalOpen(true);
  };

  // Metrics summaries
  const totalValue = useMemo(
    () =>
      accessories.reduce(
        (sum, acc) => sum + parseCurrency(acc.value) * (Number(acc.quantity) || 1),
        0
      ),
    [accessories]
  );

  const totalItemsCount = useMemo(
    () => accessories.reduce((sum, acc) => sum + (acc.quantity && acc.quantity > 0 ? acc.quantity : 1), 0),
    [accessories]
  );

  const totalMountedCount = useMemo(
    () =>
      accessories.reduce(
        (sum, acc) => sum + (acc.mounts?.reduce((mSum, m) => mSum + (m.quantity || 1), 0) || 0),
        0
      ),
    [accessories]
  );

  const opticsValuation = useMemo(
    () =>
      accessories
        .filter((a) => a.type?.toLowerCase().includes('optic') || a.type?.toLowerCase().includes('scope'))
        .reduce((sum, a) => sum + parseCurrency(a.value) * (Number(a.quantity) || 1), 0),
    [accessories]
  );

  const categoryCounts = useMemo(() => {
    return {
      all: accessories.length,
      optics: accessories.filter((a) => {
        const t = (a.type || '').toLowerCase();
        return t.includes('optic') || t.includes('scope') || t.includes('sight');
      }).length,
      suppressors: accessories.filter((a) => {
        const t = (a.type || '').toLowerCase();
        return t.includes('suppressor') || t.includes('silencer') || a.is_nfa;
      }).length,
      magazines: accessories.filter((a) => {
        const t = (a.type || '').toLowerCase();
        return t.includes('magazine') || t.includes('mag');
      }).length,
      holsters: accessories.filter((a) => {
        const t = (a.type || '').toLowerCase();
        return t.includes('holster') || t.includes('belt');
      }).length,
      lights: accessories.filter((a) => {
        const t = (a.type || '').toLowerCase();
        return t.includes('light') || t.includes('laser');
      }).length,
      mounts: accessories.filter((a) => (a.type || '').toLowerCase().includes('mount')).length,
      stocks: accessories.filter((a) => {
        const t = (a.type || '').toLowerCase();
        return t.includes('stock') || t.includes('chassis');
      }).length,
      mounted: accessories.filter(
        (a) => a.mounts && a.mounts.some((m) => (m.quantity || 1) > 0 && m.firearmId)
      ).length,
      unmounted: accessories.filter((a) => {
        const totalMounted = a.mounts ? a.mounts.reduce((sum, m) => sum + (m.quantity || 1), 0) : 0;
        const qty = a.quantity && a.quantity > 0 ? a.quantity : 1;
        return qty > totalMounted;
      }).length,
    };
  }, [accessories]);

  // Filtered accessories memo
  const filteredAccessories = useMemo(() => {
    const term = search.toLowerCase().trim();
    return accessories.filter((a) => {
      // Category / Tab filter
      if (activeTab === 'optics') {
        const t = (a.type || '').toLowerCase();
        if (!t.includes('optic') && !t.includes('scope') && !t.includes('sight')) return false;
      } else if (activeTab === 'suppressors') {
        const t = (a.type || '').toLowerCase();
        if (!t.includes('suppressor') && !t.includes('silencer') && !a.is_nfa) return false;
      } else if (activeTab === 'magazines') {
        const t = (a.type || '').toLowerCase();
        if (!t.includes('magazine') && !t.includes('mag')) return false;
      } else if (activeTab === 'holsters') {
        const t = (a.type || '').toLowerCase();
        if (!t.includes('holster') && !t.includes('belt')) return false;
      } else if (activeTab === 'lights') {
        const t = (a.type || '').toLowerCase();
        if (!t.includes('light') && !t.includes('laser')) return false;
      } else if (activeTab === 'mounts') {
        const t = (a.type || '').toLowerCase();
        if (!t.includes('mount')) return false;
      } else if (activeTab === 'stocks') {
        const t = (a.type || '').toLowerCase();
        if (!t.includes('stock') && !t.includes('chassis')) return false;
      } else if (activeTab === 'mounted') {
        const isMounted = a.mounts && a.mounts.some((m) => (m.quantity || 1) > 0 && m.firearmId);
        if (!isMounted) return false;
      } else if (activeTab === 'unmounted') {
        const totalMounted = a.mounts ? a.mounts.reduce((sum, m) => sum + (m.quantity || 1), 0) : 0;
        const qty = a.quantity && a.quantity > 0 ? a.quantity : 1;
        if (qty <= totalMounted) return false;
      }

      // Text search
      if (term) {
        const matchesSearch =
          a.manufacturer.toLowerCase().includes(term) ||
          a.model.toLowerCase().includes(term) ||
          a.type.toLowerCase().includes(term) ||
          (a.stockType && a.stockType.toLowerCase().includes(term)) ||
          (a.actionInlet && a.actionInlet.toLowerCase().includes(term)) ||
          (a.bufferTubeType && a.bufferTubeType.toLowerCase().includes(term)) ||
          (a.beltType && a.beltType.toLowerCase().includes(term)) ||
          (a.dropLoopType && a.dropLoopType.toLowerCase().includes(term)) ||
          (a.cartridgeLoopCaliber && a.cartridgeLoopCaliber.toLowerCase().includes(term)) ||
          (a.upc_code && a.upc_code.toLowerCase().includes(term)) ||
          (a.serialNumber && a.serialNumber.toLowerCase().includes(term)) ||
          (a.supportedModels && a.supportedModels.toLowerCase().includes(term));

        if (!matchesSearch) return false;
      }

      // Storage location
      if (selectedLocationId === 'ALL') return true;
      const loc = storageIndex.getLocation('accessory', a.id);
      if (selectedLocationId === 'UNASSIGNED') {
        return !loc;
      }
      return loc?.id === Number(selectedLocationId);
    });
  }, [accessories, search, selectedLocationId, storageIndex, activeTab]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisibleCount(filteredAccessories.length);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) => Math.min(prev + 36, filteredAccessories.length));
        }
      },
      { rootMargin: '400px' }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => observer.disconnect();
  }, [filteredAccessories.length]);

  return (
    <div className="page-container fade-in">
      {/* Page Header Bar */}
      <div className="page-header">
        <div>
          <h1>Accessories & Optics</h1>
          <p className="page-subtitle">
            Track sights, suppressors, mounts, and tactical gear with comprehensive detail cards.
          </p>
        </div>
        <button className="btn-primary" onClick={openNewModal}>
          <PlusCircle size={16} />
          <span>Add Accessory</span>
        </button>
      </div>

      {/* Togglable Command Metrics Grid */}
      <div className="accessory-metrics-grid">
        {/* Metric 1: Total Gear Items */}
        <div
          className="stat-card stat-card-clickable"
          onClick={() => setActiveTab('all')}
          title="Click to view all accessories"
        >
          <div className="stat-card-content">
            <div className="stat-icon-wrap stat-icon-blue">
              <Package size={22} />
            </div>
            <div>
              <div className="stat-label">Total Gear Items</div>
              <div className="stat-val">{totalItemsCount}</div>
              <div className="stat-sub">
                {accessories.length} Models &bull; {totalMountedCount} Mounted
              </div>
            </div>
          </div>
        </div>

        {/* Metric 2: Optics & Sights */}
        <div
          className="stat-card stat-card-clickable"
          onClick={() => setActiveTab(activeTab === 'optics' ? 'all' : 'optics')}
          title="Click to filter optics & sights"
        >
          <div className="stat-card-content">
            <div className="stat-icon-wrap stat-icon-cyan">
              <ScopeIcon size={22} color="#38bdf8" />
            </div>
            <div>
              <div className="stat-label">Optics & Sights</div>
              <div className="stat-val">{categoryCounts.optics}</div>
              <div className="stat-sub">
                {maskValue(formatCurrency(opticsValuation), 'currency', themeConfig.privacyMode)} Value
              </div>
            </div>
          </div>
        </div>

        {/* Metric 3: Magazines */}
        <div
          className="stat-card stat-card-clickable"
          onClick={() => setActiveTab(activeTab === 'magazines' ? 'all' : 'magazines')}
          title="Click to filter magazines"
        >
          <div className="stat-card-content">
            <div className="stat-icon-wrap stat-icon-purple">
              <MagazineIcon size={22} color="#c084fc" />
            </div>
            <div>
              <div className="stat-label">Magazines</div>
              <div className="stat-val">{categoryCounts.magazines}</div>
              <div className="stat-sub">Multi-Caliber Profiles</div>
            </div>
          </div>
        </div>

        {/* Metric 4: Suppressors & NFA */}
        <div
          className="stat-card stat-card-clickable"
          onClick={() => setActiveTab(activeTab === 'suppressors' ? 'all' : 'suppressors')}
          title="Click to filter suppressors & NFA items"
        >
          <div className="stat-card-content">
            <div className="stat-icon-wrap stat-icon-emerald">
              <SuppressorIcon size={22} color="#34d399" />
            </div>
            <div>
              <div className="stat-label">Suppressors & NFA</div>
              <div className="stat-val">{categoryCounts.suppressors}</div>
              <div className="stat-sub">NFA Regulated Items</div>
            </div>
          </div>
        </div>

        {/* Metric 5: Total Gear Valuation */}
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-icon-wrap stat-icon-amber">
              <DollarSign size={22} color="#fbbf24" />
            </div>
            <div>
              <div className="stat-label">Gear Valuation</div>
              <div className="stat-val">
                {maskValue(formatCurrency(totalValue), 'currency', themeConfig.privacyMode)}
              </div>
              <div className="stat-sub">Tactical Asset Baseline</div>
            </div>
          </div>
        </div>
      </div>

      {/* Unified Dashboard Control Deck */}
      <div className="dashboard-control-deck">
        {/* Left: Category Filter Chips */}
        <div className="filter-chips-bar" data-testid="filter-chips-bar">
          <button
            type="button"
            className={`filter-chip ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <span>All Items</span>
            <span className="filter-chip-count">{categoryCounts.all}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'optics' ? 'active' : ''}`}
            onClick={() => setActiveTab('optics')}
          >
            <ScopeIcon size={14} color="#38bdf8" />
            <span>Optics</span>
            <span className="filter-chip-count">{categoryCounts.optics}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'suppressors' ? 'active' : ''}`}
            onClick={() => setActiveTab('suppressors')}
          >
            <SuppressorIcon size={14} color="#34d399" />
            <span>Suppressors</span>
            <span className="filter-chip-count">{categoryCounts.suppressors}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'magazines' ? 'active' : ''}`}
            onClick={() => setActiveTab('magazines')}
          >
            <MagazineIcon size={14} color="#c084fc" />
            <span>Magazines</span>
            <span className="filter-chip-count">{categoryCounts.magazines}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'holsters' ? 'active' : ''}`}
            onClick={() => setActiveTab('holsters')}
          >
            <HolsterIcon size={14} color="#f59e0b" />
            <span>Holsters</span>
            <span className="filter-chip-count">{categoryCounts.holsters}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'mounts' ? 'active' : ''}`}
            onClick={() => setActiveTab('mounts')}
          >
            <PicatinnyMountIcon size={14} color="#60a5fa" />
            <span>Mounts</span>
            <span className="filter-chip-count">{categoryCounts.mounts}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'stocks' ? 'active' : ''}`}
            onClick={() => setActiveTab('stocks')}
          >
            <ChassisIcon size={14} color="#10b981" />
            <span>Stocks</span>
            <span className="filter-chip-count">{categoryCounts.stocks}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'mounted' ? 'active' : ''}`}
            onClick={() => setActiveTab('mounted')}
          >
            <StockIcon size={14} color="#34d399" />
            <span>Mounted</span>
            <span className="filter-chip-count">{categoryCounts.mounted}</span>
          </button>

          <button
            type="button"
            className={`filter-chip ${activeTab === 'unmounted' ? 'active' : ''}`}
            onClick={() => setActiveTab('unmounted')}
          >
            <Package size={14} color="#94a3b8" />
            <span>In Safe</span>
            <span className="filter-chip-count">{categoryCounts.unmounted}</span>
          </button>
        </div>

        {/* Right: Search Box + Storage Location Dropdown */}
        <div className="dashboard-control-right">
          <div className="search-box">
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search make, model, type, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <select
            className="form-input select-box"
            value={selectedLocationId}
            onChange={(e) => setSelectedLocationId(e.target.value)}
            title="Filter accessories by storage location / safe"
          >
            <option value="ALL">All Storage Locations</option>
            <option value="UNASSIGNED">Unassigned Containers</option>
            {locations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                [{loc.type}] {loc.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid or Empty State */}
      {filteredAccessories.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-state-icon">
            <AlertCircle size={48} />
          </div>
          <h3 className="empty-state-title">No accessories found</h3>
          <p className="empty-state-desc">
            Add your first optic, suppressor, or accessory to start tracking.
          </p>
          <button type="button" className="btn-primary" onClick={openNewModal}>
            Add Accessory
          </button>
        </div>
      ) : (
        <div className="accessory-grid">
          {filteredAccessories.slice(0, visibleCount).map((acc) => (
            <AccessoryCard
              key={acc.id}
              accessory={acc}
              firearmsMap={firearmsMap}
              locations={locations}
              themeConfig={themeConfig}
              onSelectDetail={(target) => setSelectedAccessoryForDetail(target)}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onNavigateToFirearm={(firearmId) => navigate(`/details/${firearmId}`)}
              onNavigateToStorage={() => navigate('/storage')}
            />
          ))}
          {visibleCount < filteredAccessories.length && (
            <div ref={loadMoreRef} style={{ height: '40px', width: '100%', gridColumn: '1 / -1' }} />
          )}
        </div>
      )}

      {/* Edit / Create Modal */}
      <AccessoryModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={loadData}
        editingId={editingId}
        initialData={formData}
        initialUpc={location.state?.upc}
        firearms={firearms}
      />

      {/* Interactive Tactical Detail Card / Modal */}
      <AccessoryDetailModal
        isOpen={!!selectedAccessoryForDetail}
        accessory={selectedAccessoryForDetail}
        firearms={firearms}
        onClose={() => setSelectedAccessoryForDetail(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    </div>
  );
};
