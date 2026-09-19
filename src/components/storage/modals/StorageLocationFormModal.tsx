import { Package, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  AmmoCanIcon,
  CabinetIcon,
  GunCaseIcon,
  SafeIcon,
  VehicleVaultIcon,
} from '@/components/CustomIcons';
import type { StorageLocation } from '../../../types';

export interface StorageLocationFormModalProps {
  isOpen: boolean;
  editingLocation: StorageLocation | null;
  defaultType?: StorageLocation['type'];
  onClose: () => void;
  onSave: (formData: Partial<StorageLocation>) => Promise<void> | void;
}

const DEFAULT_FORM: Partial<StorageLocation> = {
  name: '',
  type: 'Safe',
  capacity: undefined,
  capacityMode: undefined,
  notes: '',
  firearmIds: [],
  accessoryIds: [],
  ammoIds: [],
  componentIds: [],
};

export const StorageLocationFormModal: React.FC<StorageLocationFormModalProps> = ({
  isOpen,
  editingLocation,
  defaultType,
  onClose,
  onSave,
}) => {
  const [form, setForm] = useState<Partial<StorageLocation>>(DEFAULT_FORM);

  useEffect(() => {
    if (isOpen) {
      if (editingLocation) {
        setForm({ ...editingLocation });
      } else {
        setForm({
          ...DEFAULT_FORM,
          type: defaultType || 'Safe',
        });
      }
    }
  }, [isOpen, editingLocation, defaultType]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name?.trim()) return;
    await onSave(form);
  };

  const locationTypes: Array<{
    type: StorageLocation['type'];
    label: string;
    icon: React.ReactNode;
  }> = [
    { type: 'Safe', label: 'Gun Safe', icon: <SafeIcon size={16} /> },
    { type: 'Cabinet', label: 'Security Cabinet', icon: <CabinetIcon size={16} /> },
    { type: 'AmmoCan', label: 'Ammo Can / Depot', icon: <AmmoCanIcon size={16} /> },
    { type: 'Case', label: 'Hard Travel Case', icon: <GunCaseIcon size={16} /> },
    { type: 'Vehicle', label: 'Vehicle Safe', icon: <VehicleVaultIcon size={16} /> },
    { type: 'Other', label: 'Other', icon: <Package size={16} /> },
  ];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <SafeIcon size={22} color="var(--accent)" />
            <div className="modal-header-text">
              <h2>{editingLocation ? 'Edit Storage Location' : 'Add Storage Location'}</h2>
              <p>Configure armory containers, capacity modes & access combinations</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Storage Type Segmented Selector */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <SafeIcon size={16} color="var(--accent)" />
                <h4 className="form-section-title">Storage Container Type</h4>
              </div>
            </div>

            <div className="form-type-selector">
              {locationTypes.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  className={`form-type-btn ${form.type === t.type ? 'active' : ''}`}
                  onClick={() => setForm((prev) => ({ ...prev, type: t.type }))}
                >
                  {t.icon}
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Core Location Details */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Package size={16} className="text-accent" />
                <h4 className="form-section-title">Location & Capacity</h4>
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label>Location / Container Name *</label>
                <input
                  required
                  className="form-input"
                  value={form.name || ''}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Master Bedroom Safe, Liberty Colonial 50"
                />
              </div>

              <div className="form-group">
                <label>Capacity Tracking Mode</label>
                <select
                  className="form-input"
                  value={
                    form.capacityMode ||
                    (form.type === 'AmmoCan' ? 'ammo' : form.type === 'Other' ? 'all' : 'firearms')
                  }
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacityMode: e.target.value as 'firearms' | 'ammo' | 'all',
                    }))
                  }
                >
                  <option value="firearms">Firearms Only (Standard for Safes & Cabinets)</option>
                  <option value="ammo">Ammunition Lots / Boxes (Standard for Ammo Cans)</option>
                  <option value="all">All Stored Items Combined (Firearms + Accs + Ammo)</option>
                </select>
                <span className="form-hint">
                  {form.capacityMode === 'all'
                    ? 'Counts all stored firearms, accessories, ammo, and powder canisters.'
                    : form.capacityMode === 'ammo' || form.type === 'AmmoCan'
                      ? 'Counts only ammunition lots/boxes towards the storage limit.'
                      : 'Counts only firearms towards the capacity limit.'}
                </span>
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label>Capacity Limit (Units)</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  value={form.capacity ?? ''}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capacity: e.target.value === '' ? undefined : Number(e.target.value),
                    }))
                  }
                  placeholder={
                    form.capacityMode === 'ammo' || form.type === 'AmmoCan'
                      ? 'e.g. 10 (Ammo Boxes)'
                      : form.capacityMode === 'all'
                        ? 'e.g. 50 (Total Items)'
                        : 'e.g. 24 (Gun Slots)'
                  }
                />
              </div>

              <div className="form-group">
                <label>Notes & Access Details</label>
                <input
                  className="form-input"
                  value={form.notes || ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Key lock, electronic dial, interior shelf layout..."
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingLocation ? 'Update Location' : 'Save Location'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
