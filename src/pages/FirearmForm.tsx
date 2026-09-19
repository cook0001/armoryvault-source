import { Camera, Clock, DollarSign, FileText, Package, Save, Shield, Upload, Wrench, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { AutocompleteInput } from '../components/AutocompleteInput';
import { RifleIcon } from '../components/CustomIcons';
import { StorageLocationSelect } from '../components/StorageBadge';
import { Firearm, StorageLocation } from '../types';
import { formatCaliber } from '../utils/caliberHelpers';
import { parseCurrencyOrNull } from '../utils/currency';
import {
  ACTION_OPTIONS,
  CALIBER_OPTIONS,
  CONDITION_OPTIONS,
  FINISH_OPTIONS,
  TYPE_OPTIONS,
} from '../utils/formOptions';
import {
  assignItemToStorage,
  getItemStorageLocation,
  saveStorageLocations,
} from '../utils/StorageSync';

export const FirearmForm = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState<Partial<Firearm>>({
    make: '',
    model: '',
    serial_number: '',
    caliber: '',
    barrel_length: '',
    action_type: '',
    finish: '',
    notes: '',
    purchase_price: null,
    purchase_date: '',
    condition: '',
    image_path: '',
    is_sold: false,
    purchased_from: '',
    firearm_type: '',
  });
  const [locations, setLocations] = useState<StorageLocation[]>([]);
  const [storageLocationId, setStorageLocationId] = useState<number | null>(null);
  const [previews, setPreviews] = useState<{ url: string; isExisting: boolean; path?: string }[]>(
    []
  );
  const { id } = useParams();

  useEffect(() => {
    if (window.api && window.api.getStorageLocations) {
      window.api.getStorageLocations().then((locs) => {
        setLocations(locs || []);
        if (id) {
          const matched = getItemStorageLocation('firearm', Number(id), locs || []);
          if (matched) setStorageLocationId(matched.id || null);
        } else if (location.state?.parsedData?.storageLocationId) {
          setStorageLocationId(Number(location.state.parsedData.storageLocationId));
        }
      });
    }

    if (id && window.api) {
      window.api.getFirearms().then((all) => {
        const found = all.find((f) => f.id === Number(id));
        if (found) {
          const p = location.state?.parsedData || {};
          const merged: Partial<Firearm> = {
            ...found,
            make: p.make || found.make,
            model: p.model || found.model,
            serial_number: p.serial_number !== undefined ? p.serial_number : found.serial_number,
            caliber: p.caliber || found.caliber,
            barrel_length: p.barrel_length !== undefined ? p.barrel_length : found.barrel_length,
            action_type: p.action_type || found.action_type,
            finish: p.finish !== undefined ? p.finish : found.finish,
            notes: p.notes !== undefined ? p.notes : found.notes,
            purchase_price:
              p.purchase_price !== undefined ? p.purchase_price : found.purchase_price,
            purchase_date: p.purchase_date !== undefined ? p.purchase_date : found.purchase_date,
            condition: p.condition || found.condition,
            purchased_from:
              p.purchased_from !== undefined ? p.purchased_from : found.purchased_from,
            firearm_type: p.firearm_type || found.firearm_type,
          };
          setFormData(merged);

          if (p.storageLocationId) {
            setStorageLocationId(Number(p.storageLocationId));
          }

          const currentPreviews: { url: string; isExisting: boolean; path?: string }[] = [];
          if (found.photos && found.photos.length > 0) {
            found.photos.forEach((photoPath: string) => {
              currentPreviews.push({
                url: `local-file://${photoPath}`,
                isExisting: true,
                path: photoPath,
              });
            });
          } else if (found.image_path) {
            currentPreviews.push({
              url: `local-file://${found.image_path}`,
              isExisting: true,
              path: found.image_path,
            });
          }

          if (p.photosBase64 && Array.isArray(p.photosBase64)) {
            p.photosBase64.forEach((b64: string) => {
              currentPreviews.push({ url: b64, isExisting: false });
            });
          } else if (p.photoBase64) {
            currentPreviews.push({ url: p.photoBase64, isExisting: false });
          }
          setPreviews(currentPreviews);
        }
      });
    } else if (location.state?.parsedData) {
      const p = location.state.parsedData;
      setFormData((prev) => ({
        ...prev,
        make: p.make || prev.make,
        model: p.model || prev.model,
        serial_number: p.serial_number || prev.serial_number,
        caliber: p.caliber || prev.caliber,
        barrel_length: p.barrel_length || prev.barrel_length,
        action_type: p.action_type || prev.action_type,
        finish: p.finish || prev.finish,
        notes: p.notes || prev.notes,
        purchase_price: p.purchase_price !== undefined ? p.purchase_price : prev.purchase_price,
        purchase_date: p.purchase_date || prev.purchase_date,
        condition: p.condition || prev.condition,
        purchased_from: p.purchased_from || prev.purchased_from,
        firearm_type: p.firearm_type || prev.firearm_type,
      }));
      const currentPreviews: { url: string; isExisting: boolean; path?: string }[] = [];
      if (p.photosBase64 && Array.isArray(p.photosBase64)) {
        p.photosBase64.forEach((b64: string) => {
          currentPreviews.push({ url: b64, isExisting: false });
        });
      } else if (p.photoBase64) {
        currentPreviews.push({ url: p.photoBase64, isExisting: false });
      }
      if (currentPreviews.length > 0) {
        setPreviews(currentPreviews);
      }
    }
  }, [id, location.state]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePhotoSelectNative = async () => {
    if (!window.api) return;
    try {
      const paths = await window.api.selectAndSavePhoto();
      if (paths && paths.length > 0) {
        setPreviews((prev) => [
          ...prev,
          ...paths.map((path) => ({ url: `local-file://${path}`, isExisting: true, path })),
        ]);
      }
    } catch (e) {
      console.error('Photo selection error:', e);
    }
  };

  const removePhoto = (index: number) => {
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.api) return;

    const finalPhotos: string[] = [];
    for (let i = 0; i < previews.length; i++) {
      const p = previews[i];
      if (p.isExisting && p.path) {
        finalPhotos.push(p.path);
      } else if (p.url.startsWith('data:image') && window.api?.saveBase64Photo) {
        const ext = p.url.split(';')[0].split('/')[1] || 'jpg';
        const filename = `firearm_${Date.now()}_${i}.${ext}`;
        const savedPath = await window.api.saveBase64Photo(p.url, filename);
        if (savedPath) finalPhotos.push(savedPath);
      } else if (p.path) {
        finalPhotos.push(p.path);
      }
    }

    const payload: Firearm = {
      ...(formData as Firearm),
      purchase_price: parseCurrencyOrNull(formData.purchase_price),
      sold_price: parseCurrencyOrNull(formData.sold_price),
      photos: finalPhotos,
      image_path: finalPhotos.length > 0 ? finalPhotos[0] : '',
      storageLocationId: storageLocationId || undefined,
    };

    let savedId = Number(id);
    if (id) {
      await window.api.updateFirearm(Number(id), payload);
    } else {
      const res: any = await window.api.addFirearm(payload);
      if (typeof res === 'number') {
        savedId = res;
      } else if (res && typeof res.id === 'number') {
        savedId = res.id;
      } else {
        const all = await window.api.getFirearms();
        if (all && all.length > 0) {
          savedId = Math.max(...all.map((f: any) => f.id || 0));
        }
      }
    }

    // Bi-directional Storage Sync
    if (savedId && locations.length > 0) {
      const updatedLocations = assignItemToStorage(
        'firearm',
        savedId,
        storageLocationId,
        locations
      );
      await saveStorageLocations(updatedLocations);
    }

    // Remove sync queue item if opened from Sync Inbox
    if (location.state?.syncItemId && window.api?.removeSyncItem) {
      await window.api.removeSyncItem(location.state.syncItemId);
    }

    if (id) {
      navigate(`/details/${id}`);
    } else {
      navigate('/');
    }
  };

  return (
    <div className="form-page">
      <div className="page-header">
        <div className="page-header-title">
          <RifleIcon size={24} color="var(--accent)" />
          <div>
            <h1>{id ? 'Edit Firearm Record' : 'Add New Firearm'}</h1>
            <p className="page-header-desc">Record manufacturer markings, physical barrel specs, provenance & NFA compliance</p>
          </div>
        </div>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/'))}
        >
          <X size={18} /> Cancel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="firearm-form">
        {/* Card 1: Core Platform & Identification */}
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="form-section-title-wrap">
              <RifleIcon size={18} color="var(--accent)" />
              <h4 className="form-section-title">Core Platform & Identity</h4>
            </div>
            <span className="form-section-desc">Manufacturer, model designation, caliber & storage location</span>
          </div>

          <div className="form-grid-3col">
            <div className="form-group">
              <label htmlFor="make">Make</label>
              <input
                id="make"
                required
                type="text"
                name="make"
                className="form-input"
                value={formData.make}
                onChange={handleChange}
                placeholder="e.g. Colt, Sig Sauer, Smith & Wesson"
              />
            </div>

            <div className="form-group">
              <label htmlFor="model">Model</label>
              <input
                id="model"
                required
                type="text"
                name="model"
                className="form-input"
                value={formData.model}
                onChange={handleChange}
                placeholder="e.g. M4A1, P320-M17, Model 29"
              />
            </div>

            <div className="form-group">
              <label htmlFor="serial_number">Serial Number</label>
              <input
                id="serial_number"
                type="text"
                name="serial_number"
                className="form-input"
                value={formData.serial_number}
                onChange={handleChange}
                placeholder="e.g. W123456"
              />
            </div>
          </div>

          <div className="form-grid-4col">
            <div className="form-group">
              <label htmlFor="caliber">Caliber</label>
              <AutocompleteInput
                id="caliber"
                name="caliber"
                value={formData.caliber || ''}
                onChange={handleChange}
                onBlur={(e) =>
                  setFormData((prev) => ({ ...prev, caliber: formatCaliber(e.target.value) }))
                }
                options={CALIBER_OPTIONS}
                placeholder="e.g. 5.56x45mm NATO, 9mm"
              />
            </div>

            <div className="form-group">
              <label htmlFor="firearm_type">Type</label>
              <AutocompleteInput
                id="firearm_type"
                name="firearm_type"
                value={formData.firearm_type || ''}
                onChange={handleChange}
                options={TYPE_OPTIONS}
                placeholder="e.g. Rifle, Handgun, Shotgun"
              />
            </div>

            <div className="form-group">
              <label htmlFor="action_type">Action Mechanism</label>
              <AutocompleteInput
                id="action_type"
                name="action_type"
                value={formData.action_type || ''}
                onChange={handleChange}
                options={ACTION_OPTIONS}
                placeholder="e.g. Semi-Automatic, Bolt Action"
              />
            </div>

            <div className="form-group">
              <label htmlFor="storage_location">Storage Location</label>
              <StorageLocationSelect
                value={storageLocationId}
                onChange={(locId) => setStorageLocationId(locId)}
                locations={locations}
                placeholder="Select Safe / Cabinet..."
              />
            </div>
          </div>
        </div>

        {/* Card 2: Physical Specifications & Condition */}
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="form-section-title-wrap">
              <Package size={18} className="text-accent" />
              <h4 className="form-section-title">Physical Specifications & Grading</h4>
            </div>
            <span className="form-section-desc">Barrel length, metal finish & cosmetic grading</span>
          </div>

          <div className="form-grid-3col">
            <div className="form-group">
              <label htmlFor="barrel_length">Barrel Length</label>
              <input
                id="barrel_length"
                type="text"
                name="barrel_length"
                className="form-input"
                value={formData.barrel_length}
                onChange={handleChange}
                placeholder='e.g. 16.0", 4.25", 20"'
              />
            </div>

            <div className="form-group">
              <label htmlFor="finish">Finish / Coating</label>
              <AutocompleteInput
                id="finish"
                name="finish"
                value={formData.finish || ''}
                onChange={handleChange}
                options={FINISH_OPTIONS}
                placeholder="e.g. Black Nitride, Parkerized, Cerakote"
              />
            </div>

            <div className="form-group">
              <label htmlFor="condition">Condition</label>
              <AutocompleteInput
                id="condition"
                name="condition"
                value={formData.condition || ''}
                onChange={handleChange}
                options={CONDITION_OPTIONS}
                placeholder="e.g. Excellent (98%+), NRA Fine, New"
              />
            </div>
          </div>
        </div>

        {/* Card 3: Acquisition & Provenance */}
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="form-section-title-wrap">
              <DollarSign size={18} className="text-accent" />
              <h4 className="form-section-title">Acquisition & Valuation</h4>
            </div>
            <span className="form-section-desc">Purchase source, acquisition date & financial basis</span>
          </div>

          <div className="form-grid-3col">
            <div className="form-group">
              <label htmlFor="purchase_date">Acquisition Date</label>
              <input
                id="purchase_date"
                type="date"
                name="purchase_date"
                className="form-input"
                value={formData.purchase_date}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label htmlFor="purchased_from">Purchased From / Transferor FFL</label>
              <input
                id="purchased_from"
                type="text"
                name="purchased_from"
                className="form-input"
                value={formData.purchased_from || ''}
                onChange={handleChange}
                placeholder="Dealer Name, CMP, GunBroker, Private"
              />
            </div>

            <div className="form-group">
              <label htmlFor="purchase_price">Purchase Price ($)</label>
              <input
                id="purchase_price"
                type="number"
                step="0.01"
                min="0"
                name="purchase_price"
                className="form-input"
                value={formData.purchase_price || ''}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        {/* Card 4: ATF & NFA Compliance */}
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="form-section-title-wrap">
              <Shield size={18} className="text-warning" />
              <h4 className="form-section-title">NFA ATF Compliance</h4>
            </div>
            <label className="form-checkbox-row">
              <input
                type="checkbox"
                checked={formData.is_nfa || false}
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
                    { value: '', label: 'Select Classification...' },
                    { value: 'SBR', label: 'Short Barreled Rifle (SBR)' },
                    { value: 'SBS', label: 'Short Barreled Shotgun (SBS)' },
                    { value: 'Suppressor', label: 'Silencer / Suppressor' },
                    { value: 'Machine Gun', label: 'Machine Gun' },
                    { value: 'AOW', label: 'Any Other Weapon (AOW)' },
                    { value: 'Destructive Device', label: 'Destructive Device' },
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
                    { value: '', label: 'Select Entity...' },
                    { value: 'Individual', label: 'Individual (Form 1 / 4)' },
                    { value: 'Trust', label: 'Gun Trust' },
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
                    { value: 'Pending', label: 'Pending ATF Processing' },
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
                  <label>Date Stamp Approved</label>
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

        {/* Card 5: Maintenance & Photo Gallery */}
        <div className="form-section-card">
          <div className="form-section-header">
            <div className="form-section-title-wrap">
              <Wrench size={18} className="text-accent" />
              <h4 className="form-section-title">Armorer Log & Maintenance Schedules</h4>
            </div>
            <span className="form-section-desc">Automatic service alerts based on round count or elapsed days</span>
          </div>

          <div className="form-grid-2col">
            <div className="form-group">
              <label>Service Interval (Rounds Fired)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="e.g. 500 rounds"
                value={formData.maintenance_round_threshold || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maintenance_round_threshold: e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined,
                  }))
                }
              />
            </div>

            <div className="form-group">
              <label>Service Interval (Elapsed Days)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="e.g. 90 days"
                value={formData.maintenance_date_threshold_days || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    maintenance_date_threshold_days: e.target.value
                      ? parseInt(e.target.value, 10)
                      : undefined,
                  }))
                }
              />
            </div>
          </div>

          <div className="form-group">
            <label>Firearm History / Notes / Features</label>
            <textarea
              name="notes"
              className="form-input"
              rows={3}
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Markings, factory box, included magazines, trigger pull weight..."
            />
          </div>

          <div className="form-group">
            <label>Photo Gallery</label>
            <div className="photo-grid-tray">
              {previews.map((p, idx) => (
                <div key={idx} className="photo-card-item">
                  <img src={p.url} alt="Firearm Preview" className="photo-card-img" />
                  <button
                    type="button"
                    className="photo-card-delete"
                    onClick={() => removePhoto(idx)}
                    title="Remove photo"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}

              <div
                role="button"
                tabIndex={0}
                className="photo-card-upload-btn"
                onClick={(e) => {
                  e.preventDefault();
                  handlePhotoSelectNative();
                }}
              >
                <div className="photo-card-upload-content">
                  <Upload size={24} />
                  <span>Add Photo</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="form-actions">
          <button type="submit" className="btn-primary">
            <Save size={18} /> {id ? 'Update Firearm' : 'Save Firearm'}
          </button>
        </div>
      </form>
    </div>
  );
};
