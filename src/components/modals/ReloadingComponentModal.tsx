import { AlertTriangle, DollarSign, Package, Scale, Scan, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import {
  BrassCaseIcon,
  BulletProjectileIcon,
  GunpowderIcon,
  PrimerIcon,
} from '@/components/CustomIcons';
import { StorageLocationSelect } from '@/components/StorageBadge';
import { ReloadingComponent, StorageLocation } from '@/types';
import { parseBarcodeData } from '@/utils/BarcodeEngine';
import { COMPREHENSIVE_BULLET_TYPES } from '@/utils/caliberHelpers';
import { parseCurrencyOrNull } from '@/utils/currency';
import { CALIBER_OPTIONS } from '@/utils/formOptions';
import { calcCostPerGrain, formatPowderMultiUnit } from '@/utils/powderUnits';
import {
  assignItemToStorage,
  getItemStorageLocation,
  saveStorageLocations,
} from '@/utils/StorageSync';

interface ReloadingComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingId: number | null;
  initialData?: Partial<ReloadingComponent>;
}

const defaultFormData: Partial<ReloadingComponent> = {
  type: 'Powder',
  manufacturer: '',
  name: '',
  quantity: 0,
  cost: undefined,
  purchaseDate: new Date().toISOString().split('T')[0],
  notes: '',
  weightUnit: 'lbs',
  usageTags: [],
  primerType: 'Small Rifle',
  isMagnumPrimer: false,
  prepStage: 'Fired / Dirty',
  caliber: '',
  bulletType: '',
  grain: undefined,
};

export const ReloadingComponentModal: React.FC<ReloadingComponentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingId,
  initialData,
}) => {
  const [formData, setFormData] = useState<Partial<ReloadingComponent>>(defaultFormData);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [storageLocationId, setStorageLocationId] = useState<number | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);
  const navigate = useNavigate();

  const lookupUPC = async (upc: string) => {
    if (!upc || !window.api || !window.api.lookupUPC) return;
    setIsLookingUp(true);
    setLookupStatus(null);
    try {
      const data = await window.api.lookupUPC(upc);
      if (data && data.items && data.items.length > 0) {
        const item = data.items[0];
        const parsed = parseBarcodeData(item);

        if (parsed.category === 'ammo') {
          if (
            window.confirm(
              'This looks like loaded Ammunition. Would you like to redirect to the Ammo tab?'
            )
          ) {
            navigate('/ammo', { state: { openAddModal: true, upc: upc } });
            return;
          }
        } else if (parsed.category === 'accessory') {
          if (
            window.confirm(
              'This looks like an Accessory. Would you like to redirect to the Accessories tab?'
            )
          ) {
            navigate('/accessories', { state: { openAddModal: true, upc: upc } });
            return;
          }
        }

        const comp = parsed.parsedComponent;
        if (comp) {
          setFormData((prev) => ({
            ...prev,
            type: comp.type || prev.type,
            manufacturer: comp.manufacturer || prev.manufacturer,
            name: comp.name || prev.name,
            caliber: comp.caliber || prev.caliber,
            grain: comp.grain !== undefined ? comp.grain : prev.grain,
            bulletType: comp.bulletType || prev.bulletType,
            primerType: comp.primerType || prev.primerType,
            weightUnit: comp.weightUnit || prev.weightUnit,
            quantity: comp.quantity !== undefined ? comp.quantity : prev.quantity,
            upc_code: upc,
          }));
          setLookupStatus({
            message: 'Component parsed from barcode database!',
            type: 'success',
          });
        }
      } else {
        setLookupStatus({
          message: 'UPC not found in database. Manual entry required.',
          type: 'error',
        });
      }
    } catch (e: any) {
      console.error(e);
      setLookupStatus({ message: `Lookup error: ${e.message}`, type: 'error' });
    } finally {
      setIsLookingUp(false);
    }
  };

  useEffect(() => {
    if (window.api && window.api.getStorageLocations) {
      window.api.getStorageLocations().then((locs) => {
        setLocations(locs || []);
        if (editingId) {
          const matched = getItemStorageLocation('component', editingId, locs || []);
          if (matched) setStorageLocationId(matched.id || null);
        }
      });
    }

    if (isOpen) {
      setLookupStatus(null);
      if (initialData) {
        setFormData({ ...defaultFormData, ...initialData });
      } else {
        setFormData(defaultFormData);
      }
    }
  }, [isOpen, initialData, editingId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api || !window.api.addComponent || !window.api.updateComponent) return;

    const newComp = {
      ...formData,
      cost: parseCurrencyOrNull(formData.cost),
    } as ReloadingComponent;

    let savedId = editingId;
    if (editingId) {
      await window.api.updateComponent(editingId, newComp);
    } else {
      const allComps = await window.api.getComponents();
      const duplicate = allComps.find(
        (c: any) =>
          c.type === newComp.type &&
          c.manufacturer === newComp.manufacturer &&
          c.name === newComp.name
      );

      let merged = false;
      if (duplicate) {
        if (
          window.confirm(
            `An existing entry for ${duplicate.manufacturer || ''} ${duplicate.name || duplicate.type} was found. Would you like to merge quantities?`
          )
        ) {
          const mergedData = { ...duplicate };
          mergedData.quantity = (duplicate.quantity || 0) + (newComp.quantity || 0);
          if (!mergedData.upc_code && newComp.upc_code) {
            mergedData.upc_code = newComp.upc_code;
          }
          await window.api.updateComponent(duplicate.id!, mergedData);
          savedId = duplicate.id || null;
          merged = true;
        }
      }

      if (!merged) {
        const res = await window.api.addComponent(newComp);
        if (typeof res === 'number') {
          savedId = res;
        } else if (res && typeof (res as any).id === 'number') {
          savedId = (res as any).id;
        } else {
          const fresh = await window.api.getComponents();
          if (fresh && fresh.length > 0) {
            savedId = Math.max(...fresh.map((c: any) => c.id || 0));
          }
        }
      }
    }

    // Bi-directional Storage Sync
    if (savedId && locations.length > 0) {
      const updatedLocations = assignItemToStorage(
        'component',
        savedId,
        storageLocationId,
        locations
      );
      await saveStorageLocations(updatedLocations);
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  const componentTypeButtons = [
    { type: 'Powder' as const, label: 'Smokeless Powder', icon: <GunpowderIcon size={16} /> },
    { type: 'Primer' as const, label: 'Primers', icon: <PrimerIcon size={16} /> },
    { type: 'Bullet' as const, label: 'Bullets / Projectiles', icon: <BulletProjectileIcon size={16} /> },
    { type: 'Brass' as const, label: 'Brass / Hulls', icon: <BrassCaseIcon size={16} /> },
  ];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container modal-container-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <Scale size={22} className="text-accent" />
            <div className="modal-header-text">
              <h2>{editingId ? 'Edit Reloading Component' : 'Add Reloading Component'}</h2>
              <p>Record bench stock levels, prep stages, and cost-per-grain metrics</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {/* Barcode Scanner Tray */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Scan size={18} className="text-accent" />
                <h4 className="form-section-title">UPC Barcode Quick Lookup</h4>
              </div>
              <span className="barcode-badge-upc">AUTO-POPULATE</span>
            </div>

            <div className="barcode-lookup-tray">
              <input
                type="text"
                className="form-input"
                placeholder="Scan or type component UPC barcode..."
                value={formData.upc_code || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, upc_code: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    lookupUPC(formData.upc_code || '');
                  }
                }}
                onBlur={(e) => lookupUPC(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => lookupUPC(formData.upc_code || '')}
                disabled={isLookingUp}
              >
                {isLookingUp ? 'Searching...' : 'Lookup'}
              </button>
            </div>

            {lookupStatus && (
              <div className={`notification-banner ${lookupStatus.type === 'success' ? 'notification-banner-success' : 'notification-banner-danger'}`}>
                <AlertTriangle size={16} />
                <span>{lookupStatus.message}</span>
              </div>
            )}
          </div>

          {/* Component Classification Segmented Selector */}
          {!editingId && (
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-title-wrap">
                  <Package size={16} className="text-accent" />
                  <h4 className="form-section-title">Component Category</h4>
                </div>
                <span className="form-section-desc">Select reloading material to display specialized technical inputs</span>
              </div>

              <div className="form-type-selector">
                {componentTypeButtons.map((btn) => (
                  <button
                    key={btn.type}
                    type="button"
                    className={`form-type-btn ${formData.type === btn.type ? 'active' : ''}`}
                    onClick={() => setFormData((prev) => ({ ...prev, type: btn.type }))}
                  >
                    {btn.icon}
                    <span>{btn.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Core Specifications */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                {formData.type === 'Powder' && <GunpowderIcon size={18} color="var(--accent)" />}
                {formData.type === 'Primer' && <PrimerIcon size={18} color="var(--accent)" />}
                {formData.type === 'Bullet' && <BulletProjectileIcon size={18} color="var(--accent)" />}
                {formData.type === 'Brass' && <BrassCaseIcon size={18} color="var(--accent)" />}
                <h4 className="form-section-title">{formData.type} Specifications</h4>
              </div>
              <span className="form-section-desc">Manufacturer markings, name & physical storage</span>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label>Manufacturer / Brand *</label>
                <input
                  required
                  type="text"
                  className="form-input"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                  placeholder="e.g. Hodgdon, Alliant, Sierra, Starline"
                />
              </div>

              {(formData.type === 'Powder' || formData.type === 'Primer' || formData.type === 'Bullet') && (
                <div className="form-group">
                  <label>Product Designation / Name *</label>
                  <input
                    required
                    type="text"
                    className="form-input"
                    placeholder={
                      formData.type === 'Powder'
                        ? 'e.g. Varget, CFE 223, H4350'
                        : formData.type === 'Primer'
                          ? 'e.g. #400 Small Rifle, 205M'
                          : 'e.g. MatchKing, ELD-X, V-Max'
                    }
                    value={formData.name || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Storage Location</label>
                <StorageLocationSelect
                  value={storageLocationId}
                  onChange={(locId) => setStorageLocationId(locId)}
                  locations={locations}
                  placeholder="Select Powder Magazine / Bench Shelf..."
                />
              </div>
            </div>

            {(formData.type === 'Brass' || formData.type === 'Bullet') && (
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Caliber / Chambering *</label>
                  <AutocompleteInput
                    required
                    name="caliber"
                    value={formData.caliber || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, caliber: e.target.value }))}
                    options={CALIBER_OPTIONS}
                    placeholder="e.g. .308 Win, 6.5 Creedmoor, 9mm Luger"
                  />
                </div>

                {formData.type === 'Bullet' && (
                  <div className="form-grid-2col">
                    <div className="form-group">
                      <label>Bullet Construction</label>
                      <AutocompleteInput
                        required
                        name="bulletType"
                        value={formData.bulletType || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, bulletType: e.target.value }))}
                        options={COMPREHENSIVE_BULLET_TYPES}
                        placeholder="e.g. BTHP, FMJ, Polymer Tip"
                      />
                    </div>

                    <div className="form-group">
                      <label>Bullet Weight (Grains) *</label>
                      <input
                        required
                        type="number"
                        min="0"
                        step="0.1"
                        className="form-input"
                        value={formData.grain === undefined ? '' : formData.grain}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            grain: e.target.value === '' ? undefined : parseFloat(e.target.value),
                          }))
                        }
                        placeholder="e.g. 77, 168, 140"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {(formData.type === 'Brass' || formData.type === 'Primer') && (
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Primer Cup Pocket Size</label>
                  <AutocompleteInput
                    mode="select"
                    name="primerType"
                    value={formData.primerType || 'Small Rifle'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, primerType: e.target.value }))}
                    options={[
                      'Small Rifle',
                      'Large Rifle',
                      'Small Pistol',
                      'Large Pistol',
                      '209 Shotgun',
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label className="form-checkbox-row mt-7">
                    <input
                      type="checkbox"
                      checked={formData.isMagnumPrimer || false}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isMagnumPrimer: e.target.checked }))}
                    />
                    <span>Magnum Primer Cup / Extra Brissance</span>
                  </label>
                </div>
              </div>
            )}

            {formData.type === 'Brass' && (
              <div className="form-group">
                <label>Brass Preparation Stage</label>
                <AutocompleteInput
                  mode="select"
                  name="prepStage"
                  value={formData.prepStage || 'Fired / Dirty'}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prepStage: e.target.value as any }))}
                  options={[
                    'Fired / Dirty',
                    'Cleaned & Tumbled',
                    'Deprimed & Cleaned',
                    'Fully Sized & Trimmed',
                    'Primed & Ready to Charge',
                    'Ready to Load (Match Prep)',
                  ]}
                />
              </div>
            )}
          </div>

          {/* Inventory Counts & Financials */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <DollarSign size={18} className="text-accent" />
                <h4 className="form-section-title">Stock Level & Valuation</h4>
              </div>
              <span className="form-section-desc">Quantity on bench, re-order alerts & acquisition cost</span>
            </div>

            {formData.type === 'Powder' ? (
              <div className="form-grid-4col">
                <div className="form-group">
                  <label>Quantity in Stock *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="0.01"
                    className="form-input"
                    placeholder="e.g. 1"
                    value={
                      formData.quantity === undefined || formData.quantity === null
                        ? ''
                        : formData.quantity
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: e.target.value === '' ? ('' as any) : parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Weight Unit</label>
                  <AutocompleteInput
                    mode="select"
                    name="weightUnit"
                    value={formData.weightUnit || 'lbs'}
                    onChange={(e) => setFormData((prev) => ({ ...prev, weightUnit: e.target.value as any }))}
                    options={[
                      { value: 'lbs', label: 'lbs (Pounds)' },
                      { value: 'oz', label: 'oz (Ounces)' },
                      { value: 'grains', label: 'gr (Grains)' },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label>Low-Stock Warning</label>
                  <input
                    type="number"
                    min="0"
                    step="0.1"
                    className="form-input"
                    placeholder="e.g. 1 (lb)"
                    value={
                      formData.min_threshold === undefined || formData.min_threshold === null
                        ? ''
                        : formData.min_threshold
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        min_threshold: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Canister Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 48.00"
                    value={formData.cost === undefined || formData.cost === null ? '' : formData.cost}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cost: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="form-grid-3col">
                <div className="form-group">
                  <label>Quantity in Stock *</label>
                  <input
                    required
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="e.g. 1000"
                    value={
                      formData.quantity === undefined || formData.quantity === null
                        ? ''
                        : formData.quantity
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        quantity: e.target.value === '' ? ('' as any) : parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Low-Stock Alert (Units)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-input"
                    placeholder="e.g. 250"
                    value={
                      formData.min_threshold === undefined || formData.min_threshold === null
                        ? ''
                        : formData.min_threshold
                    }
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        min_threshold: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Box Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="e.g. 42.50"
                    value={formData.cost === undefined || formData.cost === null ? '' : formData.cost}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        cost: e.target.value === '' ? undefined : parseFloat(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
            )}

            {/* Live Powder Unit Equivalents Banner */}
            {formData.type === 'Powder' &&
              formData.quantity !== undefined &&
              Number(formData.quantity) > 0 &&
              (() => {
                const breakdown = formatPowderMultiUnit(
                  Number(formData.quantity),
                  formData.weightUnit || 'lbs'
                );
                const costVal = Number(formData.cost) || 0;
                const costPerGr =
                  costVal > 0
                    ? calcCostPerGrain(
                        costVal,
                        Number(formData.quantity),
                        formData.weightUnit || 'lbs'
                      )
                    : 0;
                return (
                  <div className="form-subcard mt-3">
                    <div className="form-alloc-bar">
                      <div className="form-checkbox-row">
                        <Scale size={16} className="text-accent" />
                        <span className="font-semibold">Live Unit Breakdown:</span>
                        <span>{breakdown.summary}</span>
                      </div>
                      {costVal > 0 && (
                        <span className="barcode-badge-upc">
                          ≈ ${costPerGr.toFixed(4)} / grain
                        </span>
                      )}
                    </div>
                  </div>
                );
              })()}
          </div>

          {/* Notes & Acquisition */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Package size={16} className="text-accent" />
                <h4 className="form-section-title">Purchase Date & Armorer Notes</h4>
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label>Purchase Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={formData.purchaseDate || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, purchaseDate: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Lot Number / Bench Notes</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Lot # 2108B, sealed canister..."
                  value={formData.notes || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingId ? 'Save Changes' : 'Save Component'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
