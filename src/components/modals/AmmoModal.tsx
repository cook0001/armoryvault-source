import {
  AlertTriangle,
  Calculator,
  DollarSign,
  Package,
  Scan,
  Target,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { AmmoCanIcon, CartridgesIcon } from '@/components/CustomIcons';
import { StorageLocationSelect } from '@/components/StorageBadge';
import { Ammo, StorageLocation } from '@/types';
import { parseBarcodeData } from '@/utils/BarcodeEngine';
import {
  COMPREHENSIVE_BULLET_TYPES,
  formatCaliber,
  generateInternalUPC,
  getBarcodeLabelType,
  getStandardPelletCount,
  isShotgunCaliber,
} from '@/utils/caliberHelpers';
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
} from '@/utils/formOptions';

export interface AmmoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ammoData: Partial<Ammo>, storageLocationId: number | null) => Promise<void>;
  editingAmmo: Ammo | null;
  isAddingStockMode?: boolean;
  initialType?: 'factory' | 'handload';
  initialUpc?: string;
  storageLocations: StorageLocation[];
  ammoList: Ammo[];
  onSwitchToComponents?: () => void;
}

const defaultAmmoData: Partial<Ammo> = {
  type: 'factory',
  caliber: '',
  count: 0,
  isPlusP: false,
  manufacturer: '',
  grain: undefined,
  projectile: '',
  boxPrice: undefined,
  costPerRound: undefined,
  target_stock_goal: undefined,
  min_threshold: undefined,
  notes: '',
  upc_code: '',
};

export const AmmoModal: React.FC<AmmoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingAmmo,
  isAddingStockMode = false,
  initialType = 'factory',
  initialUpc = '',
  storageLocations,
  ammoList,
  onSwitchToComponents,
}) => {
  const [formData, setFormData] = useState<Partial<Ammo>>(defaultAmmoData);
  const [storageLocationId, setStorageLocationId] = useState<number | null>(null);
  const [calcRds, setCalcRds] = useState<number | ''>('');
  const [calcBoxes, setCalcBoxes] = useState<number>(1);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLookupStatus(null);
      if (editingAmmo) {
        setFormData({ ...editingAmmo });
        setCalcRds(editingAmmo.count || '');
        setCalcBoxes(1);
      } else {
        setFormData({
          ...defaultAmmoData,
          type: initialType,
          upc_code: initialUpc || '',
        });
        setCalcRds('');
        setCalcBoxes(1);
        if (initialUpc) {
          lookupBarcode(initialUpc);
        }
      }
    }
  }, [isOpen, editingAmmo, initialType, initialUpc]);

  if (!isOpen) return null;

  const isShotgun = isShotgunCaliber(formData.caliber || '');

  const handleShotgunChange = (field: string, val: string) => {
    const updated = { ...formData, [field]: val };
    if (field === 'shot_size' || field === 'shell_length' || field === 'caliber') {
      const cal = field === 'caliber' ? val : formData.caliber;
      const len = field === 'shell_length' ? val : formData.shell_length;
      const shot = field === 'shot_size' ? val : formData.shot_size;
      const autoPellets = getStandardPelletCount(cal, len, shot);
      if (autoPellets !== '') {
        updated.pellet_count = autoPellets;
      }
    }
    setFormData(updated);
  };

  const lookupBarcode = async (barcode: string) => {
    const clean = barcode.trim().toUpperCase();
    if (!clean) return;

    setIsLookingUp(true);
    setLookupStatus(null);

    try {
      // 1. Check local SKU DB
      if (window.api && window.api.getSkus) {
        const skus = await window.api.getSkus();
        if (skus && skus[clean]) {
          const item = skus[clean];
          setFormData((prev) => ({
            ...prev,
            ...item,
            upc_code: clean,
          }));
          if (item.count) {
            setCalcRds(item.count);
            setCalcBoxes(1);
          }
          setLookupStatus({ message: 'Found in custom SKU dictionary!', type: 'success' });
          setIsLookingUp(false);
          return;
        }
      }

      // 2. Check existing local inventory
      const existing = ammoList.find((a) => a.upc_code === clean);
      if (existing) {
        setFormData((prev) => ({ ...prev, ...existing }));
        setCalcBoxes(1);
        setCalcRds(existing.count || '');
        setLookupStatus({
          message: 'Found in your armory inventory! Adjust box count to add stock.',
          type: 'success',
        });
        setIsLookingUp(false);
        return;
      }

      // 3. Online barcode lookup
      if (window.api && window.api.lookupUPC) {
        const data = await window.api.lookupUPC(clean);
        if (data && data.items && data.items.length > 0) {
          const item = data.items[0];
          const parsed = parseBarcodeData(item, ammoList);

          if (parsed.category === 'component') {
            if (
              window.confirm(
                'This barcode represents a Reloading Component. Would you like to switch to the Reloading Depot?'
              )
            ) {
              onClose();
              if (onSwitchToComponents) onSwitchToComponents();
              return;
            }
          }

          if (parsed.parsedAmmo) {
            setFormData((prev) => ({
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
              upc_code: clean,
            }));
            if (parsed.parsedAmmo.count) {
              setCalcRds(parsed.parsedAmmo.count);
              setCalcBoxes(1);
            }
            setLookupStatus({
              message: 'Barcode specifications verified and imported!',
              type: 'success',
            });
          }
        } else {
          setLookupStatus({
            message: 'Barcode not found. You can enter details manually.',
            type: 'info',
          });
        }
      }
    } catch (e: any) {
      console.warn('Barcode lookup error:', e);
      setLookupStatus({ message: 'Error querying barcode database.', type: 'error' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const submission = { ...formData };
    if (submission.type === 'handload' && !submission.upc_code) {
      submission.upc_code = generateInternalUPC();
    }
    await onSave(submission, storageLocationId);
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container modal-container-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <CartridgesIcon size={22} color="var(--accent)" />
            <div className="modal-header-text">
              <h2>
                {isAddingStockMode
                  ? 'Add Stock to Ammunition'
                  : editingAmmo
                    ? 'Edit Ammunition Record'
                    : 'Add Ammunition'}
              </h2>
              <p>
                {formData.type === 'factory'
                  ? 'Commercial factory manufactured ammunition'
                  : 'Precision custom handload recipe & telemetry'}
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Segmented Ammo Type Selector */}
          {!editingAmmo && (
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-title-wrap">
                  <Target size={16} className="text-accent" />
                  <h4 className="form-section-title">Ammunition Classification</h4>
                </div>
                <span className="form-section-desc">Factory production vs custom bench handload</span>
              </div>

              <div className="form-type-selector">
                <button
                  type="button"
                  className={`form-type-btn ${formData.type === 'factory' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'factory' }))}
                >
                  <Package size={16} />
                  <span>Factory Ammunition</span>
                </button>
                <button
                  type="button"
                  className={`form-type-btn ${formData.type === 'handload' ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: 'handload' }))}
                >
                  <CartridgesIcon size={16} color="currentColor" />
                  <span>Custom Handload Recipe</span>
                </button>
              </div>
            </div>
          )}

          {/* Identification, Barcode & Stock Count */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Scan size={18} className="text-accent" />
                <h4 className="form-section-title">Inventory & Identification</h4>
              </div>
              {formData.upc_code && (
                <span className={getBarcodeLabelType(formData.upc_code) === 'UPC' ? 'barcode-badge-upc' : 'barcode-badge-sku'}>
                  {getBarcodeLabelType(formData.upc_code)}
                </span>
              )}
            </div>

            <div className="barcode-lookup-tray">
              <input
                type="text"
                className="form-input"
                placeholder="Scan or enter UPC / EAN / SKU barcode..."
                value={formData.upc_code || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, upc_code: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    lookupBarcode(formData.upc_code || '');
                  }
                }}
              />
              <button
                type="button"
                className="btn-primary"
                onClick={() => lookupBarcode(formData.upc_code || '')}
                disabled={!formData.upc_code || isLookingUp}
              >
                {isLookingUp ? 'Searching...' : 'Lookup'}
              </button>
            </div>

            {lookupStatus && (
              <div className={`notification-banner ${lookupStatus.type === 'success' ? 'notification-banner-success' : lookupStatus.type === 'error' ? 'notification-banner-danger' : ''}`}>
                <AlertTriangle size={16} />
                <span>{lookupStatus.message}</span>
              </div>
            )}

            <div className="form-grid-3col mt-4">
              <div className="form-group">
                <label>Caliber / Gauge *</label>
                <div className="barcode-lookup-tray">
                  <AutocompleteInput
                    required
                    name="caliber"
                    value={formData.caliber || ''}
                    onChange={(e) => handleShotgunChange('caliber', e.target.value)}
                    onBlur={() => handleShotgunChange('caliber', formatCaliber(formData.caliber || ''))}
                    options={CALIBER_OPTIONS}
                    placeholder="e.g. 9mm Luger, 5.56 NATO, 12 Gauge"
                  />
                  <label className="form-checkbox-row">
                    <input
                      type="checkbox"
                      checked={!!formData.isPlusP}
                      onChange={(e) => setFormData((prev) => ({ ...prev, isPlusP: e.target.checked }))}
                    />
                    <span>+P</span>
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>Total Rounds in Stock *</label>
                <input
                  required
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.count === undefined ? '' : formData.count}
                  onChange={(e) => {
                    const cnt = e.target.value === '' ? ('' as any) : parseInt(e.target.value, 10);
                    setCalcRds('');
                    const boxPrice = (formData as any).boxPrice;
                    let newCPR = formData.costPerRound;
                    if (boxPrice && typeof cnt === 'number' && cnt > 0) {
                      newCPR = parseFloat((boxPrice / cnt).toFixed(3));
                    }
                    setFormData((prev) => ({ ...prev, count: cnt, costPerRound: newCPR }));
                  }}
                  placeholder="e.g. 500"
                />
              </div>

              <div className="form-group">
                <label>Storage Location / Safe / Can</label>
                <StorageLocationSelect
                  value={storageLocationId}
                  onChange={(locId) => setStorageLocationId(locId)}
                  locations={storageLocations}
                  placeholder="Select Ammo Can / Safe..."
                />
              </div>
            </div>

            {/* Quick Box Calculator Banner */}
            <div className="form-subcard mt-3">
              <div className="form-grid-3col">
                <div className="form-checkbox-row">
                  <Calculator size={18} className="text-accent" />
                  <span className="font-semibold">Quick Box Calculator</span>
                </div>
                <div className="form-grid-2col">
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="Rds/Box"
                    value={calcRds}
                    onChange={(e) => {
                      const rds = e.target.value === '' ? '' : parseInt(e.target.value, 10);
                      setCalcRds(rds);
                      const newCount = typeof rds === 'number' ? rds * calcBoxes : formData.count;
                      const boxPrice = (formData as any).boxPrice;
                      let newCPR = formData.costPerRound;
                      if (boxPrice && typeof rds === 'number' && rds > 0) {
                        newCPR = parseFloat((boxPrice / rds).toFixed(3));
                      }
                      setFormData((prev) => ({ ...prev, count: newCount, costPerRound: newCPR }));
                    }}
                  />
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    placeholder="Boxes"
                    value={calcBoxes}
                    onChange={(e) => {
                      const boxes = e.target.value === '' ? 1 : parseInt(e.target.value, 10);
                      setCalcBoxes(boxes);
                      if (typeof calcRds === 'number') {
                        setFormData((prev) => ({ ...prev, count: calcRds * boxes }));
                      }
                    }}
                  />
                </div>
                <div className="form-hint flex items-center">
                  Multiplies rds per box by box quantity to auto-fill total rounds.
                </div>
              </div>
            </div>
          </div>

          {/* Ammunition Specifications Card */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <CartridgesIcon size={18} color="var(--accent)" />
                <h4 className="form-section-title">
                  {formData.type === 'factory' ? 'Factory Specifications' : 'Custom Handload Recipe'}
                </h4>
              </div>
              <span className="form-section-desc">
                {formData.type === 'factory'
                  ? 'Projectile weight, bullet construction & manufacturer'
                  : 'Powder charge, primer selection, brass & seating depth'}
              </span>
            </div>

            {formData.type === 'factory' ? (
              <>
                <div className="form-grid-3col">
                  <div className="form-group">
                    <label>Manufacturer / Brand</label>
                    <AutocompleteInput
                      name="manufacturer"
                      value={formData.manufacturer || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                      options={AMMO_MANUFACTURERS}
                      placeholder="e.g. Winchester, Federal, Hornady"
                    />
                  </div>

                  {isShotgun ? (
                    <div className="form-group">
                      <label>Shell Length</label>
                      <AutocompleteInput
                        mode="select"
                        name="shell_length"
                        value={formData.shell_length || ''}
                        onChange={(e) => handleShotgunChange('shell_length', e.target.value)}
                        options={SHOTGUN_SHELL_LENGTHS}
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Bullet Weight (Grains)</label>
                      <input
                        type="number"
                        min="1"
                        className="form-input"
                        value={formData.grain ?? ''}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            grain: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                          }))
                        }
                        placeholder="e.g. 115, 124, 147, 55, 62, 77, 230"
                      />
                    </div>
                  )}

                  {isShotgun ? (
                    <div className="form-group">
                      <label>Shot Size / Slug</label>
                      <AutocompleteInput
                        mode="select"
                        name="shot_size"
                        value={formData.shot_size || ''}
                        onChange={(e) => handleShotgunChange('shot_size', e.target.value)}
                        options={SHOTGUN_SHOT_SIZES}
                      />
                    </div>
                  ) : (
                    <div className="form-group">
                      <label>Bullet Type / Projectile</label>
                      <AutocompleteInput
                        name="projectile"
                        value={formData.projectile || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, projectile: e.target.value }))}
                        options={COMPREHENSIVE_BULLET_TYPES}
                        placeholder="e.g. FMJ, JHP, HST, Gold Dot, MatchKing"
                      />
                    </div>
                  )}
                </div>

                {isShotgun && (
                  <div className="form-grid-2col">
                    {formData.shot_size?.toLowerCase().includes('buck') ? (
                      <div className="form-group">
                        <label>Pellet Count</label>
                        <input
                          type="number"
                          min="1"
                          className="form-input"
                          value={formData.pellet_count || ''}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              pellet_count: e.target.value ? parseInt(e.target.value, 10) : undefined,
                            }))
                          }
                          placeholder="e.g. 8, 9, 12"
                        />
                      </div>
                    ) : (
                      <div className="form-group">
                        <label>Payload Weight (oz)</label>
                        <AutocompleteInput
                          mode="select"
                          name="oz_payload"
                          value={formData.oz_payload || ''}
                          onChange={(e) => setFormData((prev) => ({ ...prev, oz_payload: e.target.value }))}
                          options={SHOTGUN_PAYLOADS}
                        />
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="form-grid-3col">
                  <div className="form-group">
                    <label>Bullet Manufacturer</label>
                    <AutocompleteInput
                      name="bullet_manufacturer"
                      value={formData.bullet_manufacturer || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, bullet_manufacturer: e.target.value }))
                      }
                      options={BULLET_MANUFACTURERS}
                      placeholder="e.g. Sierra, Hornady, Nosler"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bullet Weight (Grains)</label>
                    <input
                      type="number"
                      min="1"
                      className="form-input"
                      value={formData.grain ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          grain: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                        }))
                      }
                      placeholder="e.g. 77, 124, 168"
                    />
                  </div>

                  <div className="form-group">
                    <label>Bullet Type</label>
                    <AutocompleteInput
                      name="projectile"
                      value={formData.projectile || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, projectile: e.target.value }))}
                      options={COMPREHENSIVE_BULLET_TYPES}
                      placeholder="e.g. TMK, BTHP, V-Max"
                    />
                  </div>
                </div>

                <div className="form-grid-3col">
                  <div className="form-group">
                    <label>Powder Selection</label>
                    <AutocompleteInput
                      name="powder"
                      value={formData.powder || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, powder: e.target.value }))}
                      options={COMMON_POWDERS}
                      placeholder="e.g. Varget, CFE 223, Titegroup"
                    />
                  </div>

                  <div className="form-group">
                    <label>Powder Charge (Grains)</label>
                    <input
                      type="number"
                      step="0.1"
                      className="form-input"
                      value={formData.powderCharge ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          powderCharge: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        }))
                      }
                      placeholder="e.g. 24.5 gr"
                    />
                  </div>

                  <div className="form-group">
                    <label>Overall Length (COAL / OAL)</label>
                    <input
                      type="number"
                      step="0.001"
                      className="form-input"
                      value={formData.oal ?? ''}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          oal: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        }))
                      }
                      placeholder='e.g. 2.260"'
                    />
                  </div>
                </div>

                <div className="form-grid-3col">
                  <div className="form-group">
                    <label>Primer Type</label>
                    <AutocompleteInput
                      name="primer_type"
                      value={formData.primer_type || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, primer_type: e.target.value }))}
                      options={PRIMER_TYPES}
                      placeholder="e.g. Small Rifle, Large Pistol"
                    />
                  </div>

                  <div className="form-group">
                    <label>Primer Model</label>
                    <AutocompleteInput
                      name="primer"
                      value={formData.primer || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, primer: e.target.value }))}
                      options={COMMON_PRIMERS}
                      placeholder="e.g. CCI #400, Fed 205M"
                    />
                  </div>

                  <div className="form-group">
                    <label>Brass Casing Make</label>
                    <AutocompleteInput
                      name="brass"
                      value={formData.brass || ''}
                      onChange={(e) => setFormData((prev) => ({ ...prev, brass: e.target.value }))}
                      options={BRASS_MAKES}
                      placeholder="e.g. Starline, Lake City, Lapua"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Financials & Stock Alerts */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <DollarSign size={18} className="text-accent" />
                <h4 className="form-section-title">Valuation & Stock Alerts</h4>
              </div>
              <span className="form-section-desc">Cost per round (CPR) and threshold warnings</span>
            </div>

            <div className="form-grid-4col">
              <div className="form-group">
                <label>Box Purchase Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={(formData as any).boxPrice ?? ''}
                  onChange={(e) => {
                    const valStr = e.target.value;
                    const val = parseFloat(valStr);
                    if (!isNaN(val)) {
                      const divisor =
                        typeof calcRds === 'number' && calcRds > 0
                          ? calcRds
                          : formData.count && formData.count > 0
                            ? formData.count
                            : 0;
                      const cpr = divisor > 0 ? parseFloat((val / divisor).toFixed(3)) : formData.costPerRound;
                      setFormData((prev) => ({ ...prev, boxPrice: val, costPerRound: cpr } as any));
                    } else {
                      setFormData((prev) => ({
                        ...prev,
                        boxPrice: valStr === '' ? undefined : (val as any),
                      } as any));
                    }
                  }}
                  placeholder="e.g. 24.99"
                />
              </div>

              <div className="form-group">
                <label>Cost Per Round ($)</label>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="form-input"
                  value={formData.costPerRound ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      costPerRound: e.target.value === '' ? undefined : parseFloat(e.target.value),
                    }))
                  }
                  placeholder="e.g. 0.35"
                />
              </div>

              <div className="form-group">
                <label>Target Stock Goal (Rds)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.target_stock_goal ?? ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      target_stock_goal: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                    }))
                  }
                  placeholder="e.g. 1000"
                />
              </div>

              <div className="form-group">
                <label>Low Stock Warning (Rds)</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={formData.min_threshold || formData.low_stock_threshold || ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : parseInt(e.target.value, 10);
                    setFormData((prev) => ({
                      ...prev,
                      min_threshold: val,
                      low_stock_threshold: val,
                    }));
                  }}
                  placeholder="e.g. 200"
                />
              </div>
            </div>
          </div>

          {/* Notes Card */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Target size={16} className="text-accent" />
                <h4 className="form-section-title">Notes & Batch Telemetry</h4>
              </div>
            </div>

            <div className="form-group">
              <label>Armorer Notes</label>
              <textarea
                className="form-input"
                rows={2}
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Lot numbers, chronometer velocity averages, extreme spread (ES)..."
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {isAddingStockMode ? 'Add Stock' : editingAmmo ? 'Save Changes' : 'Save Ammunition'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
