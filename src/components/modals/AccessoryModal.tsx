import {
  AlertTriangle,
  Camera,
  Package,
  Scan,
  Shield,
  Target,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import {
  ChassisIcon,
  GunBeltIcon,
  HolsterIcon,
  MagazineIcon,
  PicatinnyMountIcon,
  ScopeIcon,
  StockIcon,
  SuppressorIcon,
  TacticalSlingIcon,
} from '@/components/CustomIcons';
import { StorageLocationSelect } from '@/components/StorageBadge';
import { Accessory, Firearm, StorageLocation } from '@/types';
import { parseBarcodeData } from '@/utils/BarcodeEngine';
import { parseCurrencyOrNull } from '@/utils/currency';
import { getLocalImageUrl } from '@/utils/imageUrl';
import {
  assignItemToStorage,
  getItemStorageLocation,
  saveStorageLocations,
} from '@/utils/StorageSync';
import { BeltFormSection } from './accessory-form/BeltFormSection';
import { HolsterFormSection } from './accessory-form/HolsterFormSection';
import { LightFormSection } from './accessory-form/LightFormSection';
import { MagazineFormSection } from './accessory-form/MagazineFormSection';
import { MountFormSection } from './accessory-form/MountFormSection';
import { OpticFormSection } from './accessory-form/OpticFormSection';
import { SlingFormSection } from './accessory-form/SlingFormSection';
import { StockChassisFormSection } from './accessory-form/StockChassisFormSection';
import { SuppressorFormSection } from './accessory-form/SuppressorFormSection';

interface AccessoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  editingId: number | null;
  initialData?: Partial<Accessory>;
  initialUpc?: string;
  firearms: Firearm[];
}

const defaultFormData: Partial<Accessory> = {
  type: 'Optic',
  manufacturer: '',
  model: '',
  magnification: '',
  ratedCalibers: '',
  lumens: undefined,
  supportedModels: '',
  caliber: '',
  capacity: undefined,
  quantity: 1,
  serialNumber: '',
  value: null,
  purchaseDate: new Date().toISOString().split('T')[0],
  mounts: [],
  notes: '',
  photo: null,
};

export const AccessoryModal: React.FC<AccessoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingId,
  initialData,
  initialUpc,
  firearms,
}) => {
  const [formData, setFormData] = useState<Partial<Accessory>>(defaultFormData);
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [storageLocationId, setStorageLocationId] = useState<number | null>(null);
  const [upcInput, setUpcInput] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [lookupStatus, setLookupStatus] = useState<{
    message: string;
    type: 'error' | 'success';
  } | null>(null);
  const [saveToSkuDb, setSaveToSkuDb] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (window.api && window.api.getStorageLocations) {
      window.api.getStorageLocations().then((locs) => {
        setLocations(locs || []);
        if (editingId) {
          const matched = getItemStorageLocation('accessory', editingId, locs || []);
          if (matched) setStorageLocationId(matched.id || null);
        }
      });
    }

    if (isOpen) {
      setUpcInput('');
      setLookupStatus(null);
      setSaveToSkuDb(false);
      if (initialData) {
        setFormData({ ...defaultFormData, ...initialData });
      } else {
        setFormData(defaultFormData);
      }
      if (initialUpc) {
        setUpcInput(initialUpc);
        if (!initialData || !initialData.manufacturer) {
          lookupUPC(initialUpc);
        }
      }
    }
  }, [isOpen, initialData, initialUpc, editingId]);

  const lookupUPC = async (upc: string) => {
    if (!upc || !window.api) return;
    setIsLookingUp(true);
    setLookupStatus(null);
    try {
      if (window.api.getSkus) {
        const skus = await window.api.getSkus();
        const cleanUpc = upc.trim().toUpperCase();
        if (skus && skus[cleanUpc]) {
          const skuData = skus[cleanUpc];
          if (skuData.category === 'accessory') {
            setFormData((prev) => ({
              ...prev,
              type: (skuData.accessoryType as any) || prev.type,
              manufacturer: skuData.manufacturer || prev.manufacturer,
              model: skuData.model || prev.model,
              value: skuData.value !== undefined ? skuData.value : prev.value,
              notes: skuData.notes || prev.notes,
              upc_code: cleanUpc,
            }));
            setLookupStatus({
              message: `Custom SKU "${cleanUpc}" matched and loaded!`,
              type: 'success',
            });
            setIsLookingUp(false);
            return;
          }
        }
      }

      if (window.api && window.api.lookupUPC) {
        const result = await window.api.lookupUPC(upc);
        if (result && (result.title || result.description)) {
          const rawText = `${result.title || ''} ${result.description || ''}`.trim();
          const parsed = parseBarcodeData(result);

          if (parsed.category === 'ammo') {
            if (
              window.confirm(
                'This item appears to be Ammunition. Would you like to switch to the Ammo Dashboard?'
              )
            ) {
              navigate('/ammo', { state: { openAddModal: true, upc: upc } });
              return;
            }
          } else if (parsed.category === 'component') {
            if (
              window.confirm(
                'This item appears to be a Reloading Component. Would you like to switch to the Components tab?'
              )
            ) {
              navigate('/components', { state: { openAddModal: true, upc: upc } });
              return;
            }
          }

          setFormData((prev) => ({
            ...prev,
            type: (parsed.parsedAccessory?.type as any) || prev.type,
            manufacturer: parsed.parsedAccessory?.manufacturer || prev.manufacturer,
            model: parsed.parsedAccessory?.model || prev.model,
            value: parsed.parsedAccessory?.value || prev.value,
            upc_code: upc,
          }));
          setLookupStatus({
            message: 'Accessory identified and auto-populated from barcode database!',
            type: 'success',
          });
        } else {
          setLookupStatus({
            message: 'Barcode not found. You can enter details manually and save to Custom SKUs.',
            type: 'error',
          });
        }
      }
    } catch (e: any) {
      console.error(e);
      setLookupStatus({ message: `Lookup error: ${e.message}`, type: 'error' });
    } finally {
      setIsLookingUp(false);
    }
  };

  const accessoryTypeOptions: Array<{
    type: Accessory['type'];
    label: string;
    icon: React.ReactNode;
  }> = [
    { type: 'Optic', label: 'Optic', icon: <ScopeIcon size={16} /> },
    { type: 'Suppressor', label: 'Suppressor', icon: <SuppressorIcon size={16} /> },
    { type: 'Light', label: 'Light / Laser', icon: <Zap size={16} /> },
    { type: 'Magazine', label: 'Magazine', icon: <MagazineIcon size={16} /> },
    { type: 'Holster', label: 'Holster', icon: <HolsterIcon size={16} /> },
    { type: 'Mount', label: 'Mount / Rings', icon: <PicatinnyMountIcon size={16} /> },
    { type: 'Sling', label: 'Sling', icon: <TacticalSlingIcon size={16} /> },
    { type: 'Stock', label: 'Stock', icon: <StockIcon size={16} /> },
    { type: 'Chassis', label: 'Chassis', icon: <ChassisIcon size={16} /> },
    { type: 'Belt', label: 'Gun Belt', icon: <GunBeltIcon size={16} /> },
    { type: 'Other', label: 'Other', icon: <Package size={16} /> },
  ];

  const handlePhotoUpload = async () => {
    if (window.api && window.api.selectAndSavePhoto) {
      const paths = await window.api.selectAndSavePhoto();
      if (paths && paths.length > 0) {
        setFormData((prev) => ({ ...prev, photo: paths[0] }));
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api || !window.api.addAccessory || !window.api.updateAccessory) return;

    const newAcc = {
      ...formData,
      value: parseCurrencyOrNull(formData.value),
    } as Accessory;

    if (upcInput && !newAcc.upc_code) {
      newAcc.upc_code = upcInput.trim().toUpperCase();
    }

    let savedId = editingId;
    if (editingId) {
      await window.api.updateAccessory(editingId, newAcc);
    } else {
      const allAccs = await window.api.getAccessories();
      const duplicate = allAccs.find(
        (a: any) =>
          a.type === newAcc.type &&
          a.manufacturer === newAcc.manufacturer &&
          a.model === newAcc.model
      );

      let merged = false;
      if (duplicate) {
        if (
          window.confirm(
            `An existing entry for ${duplicate.manufacturer || ''} ${duplicate.model || duplicate.type} was found. Would you like to merge quantities?`
          )
        ) {
          const mergedData = { ...duplicate };
          mergedData.quantity = (duplicate.quantity || 1) + (newAcc.quantity || 1);
          if (!mergedData.upc_code && newAcc.upc_code) {
            mergedData.upc_code = newAcc.upc_code;
          }
          await window.api.updateAccessory(duplicate.id!, mergedData);
          savedId = duplicate.id || null;
          merged = true;
        }
      }

      if (!merged) {
        const res: any = await window.api.addAccessory(newAcc);
        if (typeof res === 'number') {
          savedId = res;
        } else if (res && typeof res.id === 'number') {
          savedId = res.id;
        } else {
          const fresh = await window.api.getAccessories();
          if (fresh && fresh.length > 0) {
            savedId = Math.max(...fresh.map((a: any) => a.id || 0));
          }
        }
      }
    }

    // Bi-directional Storage Sync
    if (savedId && locations.length > 0) {
      const updatedLocations = assignItemToStorage(
        'accessory',
        savedId,
        storageLocationId,
        locations
      );
      await saveStorageLocations(updatedLocations);
    }

    // Custom SKU Database Save
    if (saveToSkuDb && newAcc.upc_code && window.api && window.api.saveSkus) {
      const existingSkus = (window.api.getSkus ? await window.api.getSkus() : {}) || {};
      const updated = {
        ...existingSkus,
        [newAcc.upc_code.trim().toUpperCase()]: {
          category: 'accessory' as const,
          accessoryType: newAcc.type,
          manufacturer: newAcc.manufacturer,
          model: newAcc.model,
          caliber: newAcc.caliber || newAcc.supportedModels || newAcc.ratedCalibers,
          value: newAcc.value || undefined,
          notes: newAcc.notes,
        },
      };
      await window.api.saveSkus(updated);
    }

    onSave();
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container modal-container-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <Package size={22} className="text-accent" />
            <div className="modal-header-text">
              <h2>{editingId ? 'Edit Accessory' : 'Add New Accessory'}</h2>
              <p>Configure technical specifications, mounting allocation & valuations</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave} className="modal-body">
          {/* Universal Barcode Scanner Tray (Add mode) */}
          {!editingId && (
            <div className="form-section-card">
              <div className="form-section-header">
                <div className="form-section-title-wrap">
                  <Scan size={18} className="text-accent" />
                  <h4 className="form-section-title">Universal Barcode / UPC Lookup</h4>
                </div>
                <span className="barcode-badge-upc">AUTO-POPULATE</span>
              </div>
              <div className="barcode-lookup-tray">
                <input
                  type="text"
                  className="form-input"
                  placeholder="Scan or type UPC..."
                  value={upcInput}
                  onChange={(e) => setUpcInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      lookupUPC(upcInput);
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => lookupUPC(upcInput)}
                  disabled={!upcInput || isLookingUp}
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
          )}

          {/* Segmented Accessory Type Selector */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Target size={16} className="text-accent" />
                <h4 className="form-section-title">Accessory Category</h4>
              </div>
              <span className="form-section-desc">Select gear type to load dedicated technical controls</span>
            </div>

            <div className="form-type-selector">
              {accessoryTypeOptions.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  className={`form-type-btn ${formData.type === opt.type ? 'active' : ''}`}
                  onClick={() => setFormData((prev) => ({ ...prev, type: opt.type }))}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Primary Identification */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Package size={16} className="text-accent" />
                <h4 className="form-section-title">Core Item Details</h4>
              </div>
              <span className="form-section-desc">Manufacturer, model & physical storage</span>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label>Manufacturer / Brand *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.manufacturer || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, manufacturer: e.target.value }))}
                  placeholder="e.g. Vortex, SureFire, Magpul, Safariland"
                />
              </div>

              <div className="form-group">
                <label>Model Name / Description *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formData.model || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, model: e.target.value }))}
                  placeholder="e.g. Razor HD Gen II-E, SOCOM556-RC2"
                />
              </div>

              <div className="form-group">
                <label>Storage Location</label>
                <StorageLocationSelect
                  value={storageLocationId}
                  onChange={(locId) => setStorageLocationId(locId)}
                  locations={locations}
                  placeholder="Select Safe / Cabinet / Container..."
                />
              </div>
            </div>
          </div>

          {/* Dynamic Technical Sub-Section based on Type */}
          {formData.type === 'Optic' && (
            <OpticFormSection formData={formData} setFormData={setFormData} />
          )}
          {formData.type === 'Suppressor' && (
            <SuppressorFormSection formData={formData} setFormData={setFormData} />
          )}
          {formData.type === 'Light' && (
            <LightFormSection formData={formData} setFormData={setFormData} />
          )}
          {formData.type === 'Magazine' && (
            <MagazineFormSection formData={formData} setFormData={setFormData} />
          )}
          {formData.type === 'Holster' && (
            <HolsterFormSection formData={formData} setFormData={setFormData} />
          )}
          {formData.type === 'Mount' && (
            <MountFormSection formData={formData} setFormData={setFormData} />
          )}
          {formData.type === 'Sling' && (
            <SlingFormSection formData={formData} setFormData={setFormData} />
          )}
          {(formData.type === 'Stock' || formData.type === 'Chassis') && (
            <StockChassisFormSection formData={formData} setFormData={setFormData} />
          )}
          {formData.type === 'Belt' && (
            <BeltFormSection formData={formData} setFormData={setFormData} />
          )}

          {/* Inventory, Pricing & Tracking */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Target size={16} className="text-accent" />
                <h4 className="form-section-title">Valuation & Tracking</h4>
              </div>
              <span className="form-section-desc">Quantity on hand, purchase value & serial numbers</span>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label>Quantity Owned</label>
                <input
                  type="number"
                  min="1"
                  className="form-input"
                  value={formData.quantity === undefined || formData.quantity === null ? '' : formData.quantity}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      quantity: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                    }))
                  }
                />
              </div>

              <div className="form-group">
                <label>Unit Value / Price ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  value={formData.value === undefined || formData.value === null ? '' : formData.value}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      value: e.target.value === '' ? null : parseFloat(e.target.value),
                    }))
                  }
                  placeholder="0.00"
                />
              </div>

              <div className="form-group">
                <label>Rounds on Gear</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="form-input"
                  value={formData.round_count === undefined || formData.round_count === null ? '' : formData.round_count}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      round_count: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                    }))
                  }
                  placeholder="e.g. 1500"
                />
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label>Serial Number (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.serialNumber || ''}
                  onChange={(e) => setFormData((prev) => ({ ...prev, serialNumber: e.target.value }))}
                  placeholder="e.g. SN-981240"
                />
              </div>

              <div className="form-group">
                <label>Part # / SKU / UPC Barcode</label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.upc_code || upcInput || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormData((prev) => ({ ...prev, upc_code: val }));
                    setUpcInput(val);
                  }}
                  placeholder="e.g. APX-EXT-100, HS507C-X2"
                />
              </div>
            </div>

            {(formData.upc_code || upcInput) && (
              <div className="form-checkbox-row">
                <input
                  type="checkbox"
                  id="saveToSkuDb"
                  checked={saveToSkuDb}
                  onChange={(e) => setSaveToSkuDb(e.target.checked)}
                />
                <label htmlFor="saveToSkuDb">
                  Save this part to <strong>Custom SKU Dictionary</strong> for instant auto-filling when scanning
                </label>
              </div>
            )}
          </div>

          {/* Mounting Allocations to Firearms */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <PicatinnyMountIcon size={18} color="var(--accent)" />
                <h4 className="form-section-title">Firearm Mount Allocations</h4>
              </div>
              <span className="form-section-desc">Assign item quantities to active firearms in your armory</span>
            </div>

            <div className="form-subcard">
              {(formData.mounts || []).map((mount, index) => (
                <div key={index} className="form-grid-3col">
                  <div className="form-group">
                    <label>Assigned Firearm</label>
                    <AutocompleteInput
                      mode="select"
                      name={`mount-${index}`}
                      value={String(mount.firearmId)}
                      onChange={(e) => {
                        const newMounts = [...(formData.mounts || [])];
                        newMounts[index].firearmId = Number(e.target.value);
                        setFormData((prev) => ({ ...prev, mounts: newMounts }));
                      }}
                      options={[
                        { value: '0', label: 'Select Firearm...' },
                        ...firearms.map((f) => ({
                          value: String(f.id),
                          label: `${f.make} ${f.model} (${f.caliber})`,
                        })),
                      ]}
                    />
                  </div>

                  <div className="form-group">
                    <label>Mounted Qty</label>
                    <input
                      type="number"
                      min="1"
                      max={formData.quantity || 1}
                      className="form-input"
                      value={mount.quantity === undefined ? '' : mount.quantity}
                      onChange={(e) => {
                        const newMounts = [...(formData.mounts || [])];
                        newMounts[index].quantity =
                          e.target.value === '' ? ('' as any) : Number(e.target.value);
                        setFormData((prev) => ({ ...prev, mounts: newMounts }));
                      }}
                    />
                  </div>

                  <div className="form-group">
                    <label>&nbsp;</label>
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => {
                        const newMounts = [...(formData.mounts || [])];
                        newMounts.splice(index, 1);
                        setFormData((prev) => ({ ...prev, mounts: newMounts }));
                      }}
                    >
                      Remove Mount
                    </button>
                  </div>
                </div>
              ))}

              {(() => {
                const totalAllocated = (formData.mounts || []).reduce(
                  (sum, m) => sum + (Number(m.quantity) || 0),
                  0
                );
                const unallocated = (formData.quantity || 1) - totalAllocated;
                return (
                  <div className="form-alloc-bar">
                    <span className={unallocated < 0 ? 'form-alloc-status-err' : 'form-alloc-status-ok'}>
                      {unallocated > 0
                        ? `${unallocated} unallocated (available in storage)`
                        : unallocated < 0
                          ? `Over-allocated by ${Math.abs(unallocated)}!`
                          : 'All items currently mounted.'}
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => {
                        const newMounts = [...(formData.mounts || [])];
                        newMounts.push({ firearmId: firearms[0]?.id || 0, quantity: 1 });
                        setFormData((prev) => ({ ...prev, mounts: newMounts }));
                      }}
                      disabled={unallocated <= 0 || firearms.length === 0}
                    >
                      + Add Firearm Mount
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* NFA Compliance Card */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Shield size={18} className="text-warning" />
                <h4 className="form-section-title">NFA ATF Compliance</h4>
              </div>
              <label className="form-checkbox-row">
                <input
                  type="checkbox"
                  checked={!!formData.is_nfa}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_nfa: e.target.checked }))}
                />
                <span>Regulated NFA Item</span>
              </label>
            </div>

            {formData.is_nfa && (
              <div className="form-grid-3col">
                <div className="form-group">
                  <label>NFA Classification</label>
                  <AutocompleteInput
                    mode="select"
                    name="nfa_type"
                    value={formData.nfa_type || ''}
                    onChange={(e) => setFormData((prev) => ({ ...prev, nfa_type: e.target.value as any }))}
                    options={[
                      { value: '', label: 'Select Type...' },
                      { value: 'Suppressor', label: 'Silencer / Suppressor' },
                      { value: 'Machine Gun', label: 'Machine Gun' },
                      { value: 'Destructive Device', label: 'Destructive Device' },
                      { value: 'AOW', label: 'Any Other Weapon (AOW)' },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label>Registration Entity</label>
                  <AutocompleteInput
                    mode="select"
                    name="registration_type"
                    value={formData.registration_type || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, registration_type: e.target.value as any }))
                    }
                    options={[
                      { value: '', label: 'Select Registration...' },
                      { value: 'Individual', label: 'Individual (Form 1/4)' },
                      { value: 'Trust', label: 'NFA Gun Trust' },
                      { value: 'Corporation', label: 'Corporation / LLC' },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label>Tax Stamp Status</label>
                  <AutocompleteInput
                    mode="select"
                    name="stamp_status"
                    value={formData.stamp_status || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stamp_status: e.target.value as any }))
                    }
                    options={[
                      { value: '', label: 'Select Status...' },
                      { value: 'Pending', label: 'Pending ATF Review' },
                      { value: 'Approved', label: 'Approved Stamp Issued' },
                    ]}
                  />
                </div>

                <div className="form-group">
                  <label>Date Submitted to ATF</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.stamp_submitted_date || ''}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, stamp_submitted_date: e.target.value }))
                    }
                  />
                </div>

                {formData.stamp_status === 'Approved' && (
                  <div className="form-group">
                    <label>Date Approved</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.stamp_approved_date || ''}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, stamp_approved_date: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes & Documentation */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Target size={16} className="text-accent" />
                <h4 className="form-section-title">Notes & Documentation</h4>
              </div>
            </div>

            <div className="form-group">
              <label>Armorer Notes / Configuration Details</label>
              <textarea
                className="form-input"
                rows={3}
                value={formData.notes || ''}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Serial numbers, mounting torque values, accessories included..."
              />
            </div>

            <div className="form-group">
              <label>Item Photo</label>
              <div className="form-alloc-bar">
                <div className="form-type-btn">
                  {formData.photo && (
                    <img
                      src={getLocalImageUrl(formData.photo, true)}
                      alt="Accessory Preview"
                      className="photo-preview-thumb"
                    />
                  )}
                  <button type="button" className="btn-secondary" onClick={handlePhotoUpload}>
                    <Camera size={16} /> {formData.photo ? 'Replace Image' : 'Select Photo'}
                  </button>
                  {formData.photo && (
                    <button
                      type="button"
                      className="btn-danger"
                      onClick={() => setFormData((prev) => ({ ...prev, photo: null }))}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingId ? 'Save Changes' : 'Add Accessory'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
