import { Eye, EyeOff, PlusCircle, Search, Shield, X } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { StorageLocationQRModal } from '../components/modals/StorageLocationQRModal';
import {
  renderAccessoryIcon,
  STORAGE_ICONS,
  StorageAssignItemModal,
  StorageLocationCard,
  StorageLocationDetailModal,
  StorageLocationFormModal,
  TYPE_COLORS,
} from '../components/storage';
import { useUndoToast } from '../components/UndoToast';
import { useVaultData } from '../context/VaultDataContext';
import type { Accessory, Ammo, Firearm, ReloadingComponent, StorageLocation } from '../types';
import { parseStorageUri } from '../utils/BarcodeEngine';
import { assignItemToStorage, saveStorageLocations } from '../utils/StorageSync';
import { getStoredTheme, saveTheme, ThemeConfig } from '../utils/themeEngine';

export { renderAccessoryIcon };

export const StorageOrganizer = () => {
  const { showUndo } = useUndoToast();
  const {
    storageLocations: vaultLocations,
    firearms: vaultFirearms,
    accessories: vaultAccessories,
    ammoList: vaultAmmoList,
    components: vaultComponents,
  } = useVaultData();

  const [locations, setLocations] = useState<StorageLocation[]>(() => vaultLocations || []);
  const [firearms, setFirearms] = useState<Firearm[]>(() => vaultFirearms || []);
  const [accessories, setAccessories] = useState<Accessory[]>(() => vaultAccessories || []);
  const [ammoList, setAmmoList] = useState<Ammo[]>(() => vaultAmmoList || []);
  const [components, setComponents] = useState<ReloadingComponent[]>(() => vaultComponents || []);

  useEffect(() => {
    if (vaultLocations && vaultLocations.length > 0) setLocations(vaultLocations);
    if (vaultFirearms && vaultFirearms.length > 0) setFirearms(vaultFirearms);
    if (vaultAccessories && vaultAccessories.length > 0) setAccessories(vaultAccessories);
    if (vaultAmmoList && vaultAmmoList.length > 0) setAmmoList(vaultAmmoList);
    if (vaultComponents && vaultComponents.length > 0) setComponents(vaultComponents);
  }, [vaultLocations, vaultFirearms, vaultAccessories, vaultAmmoList, vaultComponents]);

  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(() => getStoredTheme());
  const [showValuations, setShowValuations] = useState<boolean>(() => {
    const stored = localStorage.getItem('armoryvault_storage_valuations');
    return stored !== null ? stored !== 'false' : getStoredTheme().widgets.storageValuations;
  });

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalDefaultType, setModalDefaultType] = useState<StorageLocation['type'] | undefined>(
    undefined
  );
  const [editingLocation, setEditingLocation] = useState<StorageLocation | null>(null);
  const [inspectingLocationId, setInspectingLocationId] = useState<number | null>(null);
  const [assignModal, setAssignModal] = useState<{
    locationId: number;
    type: 'firearm' | 'accessory' | 'ammo' | 'component';
  } | null>(null);
  const [qrModalLocation, setQrModalLocation] = useState<StorageLocation | null>(null);

  // Search / Scanner Filter
  const [searchFilter, setSearchFilter] = useState('');

  useEffect(() => {
    loadData();
    const handleThemeChange = (e: Event) => {
      const custom = e as CustomEvent<ThemeConfig>;
      if (custom.detail) {
        setThemeConfig(custom.detail);
        setShowValuations(custom.detail.widgets.storageValuations);
      }
    };
    window.addEventListener('armoryvault-theme-change', handleThemeChange);
    return () => window.removeEventListener('armoryvault-theme-change', handleThemeChange);
  }, []);

  const loadData = async () => {
    if (window.api) {
      const [locs, f, a, am, comps, storedValPref] = await Promise.all([
        window.api.getStorageLocations ? window.api.getStorageLocations() : Promise.resolve([]),
        window.api.getFirearms ? window.api.getFirearms() : Promise.resolve([]),
        window.api.getAccessories ? window.api.getAccessories() : Promise.resolve([]),
        window.api.getAmmo ? window.api.getAmmo() : Promise.resolve([]),
        window.api.getComponents ? window.api.getComponents() : Promise.resolve([]),
        window.api.getConfig
          ? window.api.getConfig('showStorageValuations')
          : Promise.resolve(null),
      ]);
      setLocations(locs || []);
      setFirearms(f || []);
      setAccessories(a || []);
      setAmmoList(am || []);
      setComponents(comps || []);
      if (storedValPref !== null && storedValPref !== undefined) {
        setShowValuations(!!storedValPref);
      }
    }
  };

  const handleSave = async (formData: Partial<StorageLocation>) => {
    if (!formData.name?.trim()) return;
    const loc = formData as StorageLocation;
    if (window.api) {
      if (editingLocation?.id) {
        await window.api.updateStorageLocation(editingLocation.id, loc);
      } else {
        await window.api.addStorageLocation(loc);
      }
      await loadData();
      setIsAddModalOpen(false);
      setEditingLocation(null);
    }
  };

  const handleOpenAddModal = (defaultType?: StorageLocation['type']) => {
    setEditingLocation(null);
    setModalDefaultType(defaultType);
    setIsAddModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    const targetLoc = locations.find((l) => l.id === id);
    if (!targetLoc) return;
    if (window.api?.deleteStorageLocation) {
      await window.api.deleteStorageLocation(id);
      if (inspectingLocationId === id) setInspectingLocationId(null);
      await loadData();
      showUndo(`Deleted storage location "${targetLoc.name}"`, async () => {
        if (window.api?.addStorageLocation) {
          const { id: _oldId, ...rest } = targetLoc;
          await window.api.addStorageLocation(rest as StorageLocation);
          await loadData();
        }
      });
    }
  };

  const handleEdit = (loc: StorageLocation) => {
    setEditingLocation(loc);
    setIsAddModalOpen(true);
  };

  const handleAssignItem = async (
    locationId: number,
    type: 'firearm' | 'accessory' | 'ammo' | 'component',
    itemId: number
  ) => {
    const updated = assignItemToStorage(type, itemId, locationId, locations);
    await saveStorageLocations(updated);
    await loadData();
    setAssignModal(null);
  };

  const handleUnassignItem = async (
    locationId: number,
    type: 'firearm' | 'accessory' | 'ammo' | 'component',
    itemId: number
  ) => {
    const updated = assignItemToStorage(type, itemId, null, locations);
    await saveStorageLocations(updated);
    await loadData();
  };

  // Pre-indexed lookup maps for instant O(1) item retrieval
  const firearmsById = useMemo(() => new Map(firearms.map((f) => [f.id!, f])), [firearms]);
  const accessoriesById = useMemo(() => new Map(accessories.map((a) => [a.id!, a])), [accessories]);
  const ammoById = useMemo(() => new Map(ammoList.map((a) => [a.id!, a])), [ammoList]);
  const componentsById = useMemo(() => new Map(components.map((c) => [c.id!, c])), [components]);

  // Items already assigned anywhere (memoized)
  const assignedFirearmIds = useMemo(
    () => new Set(locations.flatMap((l) => l.firearmIds || [])),
    [locations]
  );
  const assignedAccessoryIds = useMemo(
    () => new Set(locations.flatMap((l) => l.accessoryIds || [])),
    [locations]
  );
  const assignedAmmoIds = useMemo(
    () => new Set(locations.flatMap((l) => l.ammoIds || [])),
    [locations]
  );
  const assignedComponentIds = useMemo(
    () => new Set(locations.flatMap((l) => l.componentIds || [])),
    [locations]
  );

  const totalItems = useMemo(
    () =>
      locations.reduce(
        (sum, l) =>
          sum +
          (l.firearmIds?.length || 0) +
          (l.accessoryIds?.length || 0) +
          (l.ammoIds?.length || 0) +
          (l.componentIds?.length || 0),
        0
      ),
    [locations]
  );

  const activeLocation = useMemo(
    () => locations.find((l) => Number(l.id) === Number(inspectingLocationId)) || null,
    [locations, inspectingLocationId]
  );

  const activeFirearms = useMemo(() => {
    if (!activeLocation?.firearmIds) return [];
    return activeLocation.firearmIds.map((id) => firearmsById.get(id)).filter(Boolean) as Firearm[];
  }, [activeLocation, firearmsById]);

  const activeAccessories = useMemo(() => {
    if (!activeLocation?.accessoryIds) return [];
    return activeLocation.accessoryIds
      .map((id) => accessoriesById.get(id))
      .filter(Boolean) as Accessory[];
  }, [activeLocation, accessoriesById]);

  const activeAmmo = useMemo(() => {
    if (!activeLocation?.ammoIds) return [];
    return activeLocation.ammoIds.map((id) => ammoById.get(id)).filter(Boolean) as Ammo[];
  }, [activeLocation, ammoById]);

  const activeComponents = useMemo(() => {
    if (!activeLocation?.componentIds) return [];
    return activeLocation.componentIds
      .map((id) => componentsById.get(id))
      .filter(Boolean) as ReloadingComponent[];
  }, [activeLocation, componentsById]);

  const handleSearchOrScan = (input: string) => {
    const parsedId = parseStorageUri(input);
    if (parsedId !== null && parsedId !== undefined) {
      const match = locations.find((l) => Number(l.id) === Number(parsedId));
      if (match) {
        setInspectingLocationId(match.id!);
        setSearchFilter('');
        return;
      }
    }
    setSearchFilter(input);
  };

  const filteredLocations = locations.filter((l) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      l.name.toLowerCase().includes(q) ||
      (l.notes && l.notes.toLowerCase().includes(q)) ||
      l.type.toLowerCase().includes(q)
    );
  });

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1
            style={{
              color: 'var(--text-primary)',
              margin: 0,
              fontSize: '1.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Shield size={24} style={{ color: 'var(--accent)' }} />
            Storage & Safe Organizer
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: '0.88rem' }}>
            {locations.length} locations • {totalItems} items assigned
          </p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const newVal = !showValuations;
              setShowValuations(newVal);
              localStorage.setItem('armoryvault_storage_valuations', String(newVal));
              if (window.api?.setConfig) window.api.setConfig('showStorageValuations', newVal);
              saveTheme({ widgets: { ...themeConfig.widgets, storageValuations: newVal } });
            }}
            title={showValuations ? 'Hide financial dollar values' : 'Show financial dollar values'}
          >
            {showValuations ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>{showValuations ? 'Valuations Visible' : 'Valuations Hidden'}</span>
          </button>
          <button className="btn-primary" onClick={() => handleOpenAddModal()}>
            <PlusCircle size={16} /> Add Location
          </button>
        </div>
      </div>

      {/* Quick Search & Scanner Bar */}
      <div
        style={{
          display: 'flex',
          gap: '0.75rem',
          marginBottom: '1.25rem',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: '280px',
            maxWidth: '520px',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            className="form-input"
            style={{
              width: '100%',
              paddingLeft: '2.25rem',
              paddingRight: searchFilter ? '2.25rem' : '0.85rem',
              fontSize: '0.85rem',
            }}
            placeholder="Scan storage QR, or search safe name, container type, notes..."
            value={searchFilter}
            onChange={(e) => handleSearchOrScan(e.target.value)}
          />
          {searchFilter && (
            <button
              onClick={() => setSearchFilter('')}
              style={{
                position: 'absolute',
                right: '10px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '2px',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        {searchFilter && (
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Showing {filteredLocations.length} of {locations.length} locations
          </span>
        )}
      </div>

      {/* Stats Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem',
        }}
      >
        {(['Safe', 'Cabinet', 'AmmoCan', 'Case', 'Vehicle', 'Other'] as const).map((type) => {
          const count = locations.filter((l) => l.type === type).length;
          const colorMeta = TYPE_COLORS[type] || TYPE_COLORS.Other;
          return (
            <div
              key={type}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '0.75rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: colorMeta.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {STORAGE_ICONS[type]}
              </div>
              <div>
                <div
                  style={{
                    color: 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '1.15rem',
                    lineHeight: 1.2,
                  }}
                >
                  {count}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {type === 'AmmoCan' ? 'Ammo Cans' : type + 's'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Location Cards (Quick Look Grid) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
          gap: '1rem',
        }}
      >
        {filteredLocations.map((loc) => (
          <StorageLocationCard
            key={loc.id}
            location={loc}
            firearmsById={firearmsById}
            accessoriesById={accessoriesById}
            ammoById={ammoById}
            componentsById={componentsById}
            showValuations={showValuations}
            themeConfig={themeConfig}
            onInspect={(id) => setInspectingLocationId(id)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onShowQR={(l) => setQrModalLocation(l)}
          />
        ))}
      </div>

      {locations.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem',
            color: 'var(--text-muted)',
            background: 'var(--card-bg)',
            borderRadius: 16,
            border: '1px solid var(--border-light)',
          }}
        >
          <Shield size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <h3 style={{ color: 'var(--text-primary)', margin: '0 0 0.5rem' }}>
            No storage locations configured
          </h3>
          <p style={{ margin: '0 0 1.25rem' }}>
            Create safe, cabinet, or ammo can profiles to organize your armory inventory.
          </p>
          <button className="btn-primary" onClick={() => handleOpenAddModal()}>
            <PlusCircle size={16} /> Add Your First Location
          </button>
        </div>
      )}

      {/* ─── Location Details Modal (Quick Look / Manage) ─── */}
      <StorageLocationDetailModal
        isOpen={!!activeLocation}
        location={activeLocation}
        locations={locations}
        activeFirearms={activeFirearms}
        activeAccessories={activeAccessories}
        activeAmmo={activeAmmo}
        activeComponents={activeComponents}
        allFirearms={firearms}
        allAccessories={accessories}
        allAmmo={ammoList}
        allComponents={components}
        onClose={() => setInspectingLocationId(null)}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onShowQR={(loc) => setQrModalLocation(loc)}
        onOpenAssignModal={(type) => {
          if (activeLocation?.id) {
            setAssignModal({ locationId: activeLocation.id, type });
          }
        }}
        onAssignItem={handleAssignItem}
        onUnassignItem={handleUnassignItem}
      />

      {/* ─── Add/Edit Storage Location Modal ─── */}
      <StorageLocationFormModal
        isOpen={isAddModalOpen}
        editingLocation={editingLocation}
        defaultType={modalDefaultType}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingLocation(null);
        }}
        onSave={handleSave}
      />

      {/* ─── Item Assignment Selector Modal ─── */}
      <StorageAssignItemModal
        isOpen={!!assignModal}
        assignModal={assignModal}
        firearms={firearms}
        accessories={accessories}
        ammoList={ammoList}
        components={components}
        assignedFirearmIds={assignedFirearmIds}
        assignedAccessoryIds={assignedAccessoryIds}
        assignedAmmoIds={assignedAmmoIds}
        assignedComponentIds={assignedComponentIds}
        onClose={() => setAssignModal(null)}
        onAssign={handleAssignItem}
      />

      {/* ─── Storage Location QR Code Modal ─── */}
      <StorageLocationQRModal
        isOpen={!!qrModalLocation}
        onClose={() => setQrModalLocation(null)}
        location={qrModalLocation}
        itemCount={
          qrModalLocation
            ? (qrModalLocation.firearmIds?.length || 0) +
              (qrModalLocation.accessoryIds?.length || 0) +
              (qrModalLocation.ammoIds?.length || 0) +
              (qrModalLocation.componentIds?.length || 0)
            : 0
        }
      />
    </div>
  );
};
