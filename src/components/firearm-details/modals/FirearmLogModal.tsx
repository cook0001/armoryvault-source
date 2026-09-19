import {
  Calendar,
  DollarSign,
  FileText,
  Hammer,
  Image as ImageIcon,
  Sparkles,
  Target,
  Wrench,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Ammo, Firearm, MaintenanceLog } from '../../../types';
import { AutocompleteInput } from '../../AutocompleteInput';

interface FirearmLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  firearm: Firearm;
  inventoryAmmo: Ammo[];
  editingLogId: number | null;
  initialLogForm?: Partial<MaintenanceLog>;
  onLogSaved: (updatedFirearm: Firearm) => void;
  getAmmoString?: (ammo: Ammo) => string;
}

const LOG_TYPES = [
  { type: 'Range', label: 'Range Session', icon: Target },
  { type: 'Cleaning', label: 'Cleaning', icon: Sparkles },
  { type: 'Modification', label: 'Modification', icon: Hammer },
  { type: 'Repair', label: 'Repair', icon: Wrench },
  { type: 'Other', label: 'Other', icon: FileText },
] as const;

const defaultGetAmmoString = (a: Ammo): string => {
  const isShotgun =
    a.caliber?.toLowerCase().includes('gauge') ||
    a.caliber?.toLowerCase().includes('ga') ||
    a.caliber?.includes('.410');
  const payloadStr = a.oz_payload
    ? ` (${a.oz_payload.toLowerCase().includes('oz') ? a.oz_payload : a.oz_payload + ' oz'})`
    : a.pellet_count
      ? ` (${a.pellet_count} pellets)`
      : '';
  const shellStr = a.shell_length
    ? `${a.shell_length.includes('"') || a.shell_length.toLowerCase().includes('in') ? a.shell_length : a.shell_length + '"'} `
    : '';
  if (a.type === 'factory') {
    if (isShotgun) {
      return `[Factory] ${a.manufacturer || 'Unknown'} ${a.caliber} - ${shellStr}${a.shot_size || 'Unknown Shot'}${payloadStr} (${a.count} in stock)`;
    }
    return `[Factory] ${a.manufacturer || 'Unknown'} ${a.caliber} - ${a.grain}gr (${a.count} in stock)`;
  }
  if (isShotgun) {
    return `[Handload] ${a.caliber} - ${shellStr}${a.shot_size || 'Unknown Shot'}${payloadStr} (${a.count} in stock)`;
  }
  return `[Handload] ${a.caliber} - ${a.powder} (${a.count} in stock)`;
};

export const FirearmLogModal: React.FC<FirearmLogModalProps> = ({
  isOpen,
  onClose,
  firearm,
  inventoryAmmo,
  editingLogId,
  initialLogForm,
  onLogSaved,
  getAmmoString = defaultGetAmmoString,
}) => {
  const [logForm, setLogForm] = useState<Partial<MaintenanceLog>>({
    date: new Date().toISOString().split('T')[0],
    type: 'Range',
    notes: '',
    rounds_fired: '' as any,
    ammo_used: '',
    malfunctions: '' as any,
    repaired_part: '',
    part_manufacturer: '',
    installed_part_details: '',
    cost: '' as any,
    image_path: '',
  });

  useEffect(() => {
    if (isOpen) {
      if (initialLogForm) {
        setLogForm(initialLogForm);
      } else {
        setLogForm({
          date: new Date().toISOString().split('T')[0],
          type: 'Range',
          notes: '',
          rounds_fired: '' as any,
          ammo_used: '',
          malfunctions: '' as any,
          repaired_part: '',
          part_manufacturer: '',
          installed_part_details: '',
          cost: '' as any,
          image_path: '',
        });
      }
    }
  }, [isOpen, initialLogForm]);

  if (!isOpen) return null;

  const handleLogImage = async () => {
    if (window.api && window.api.selectAndSavePhoto) {
      const paths = await window.api.selectAndSavePhoto();
      if (paths && paths.length > 0) {
        setLogForm((prev) => ({ ...prev, image_path: paths[0] }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let updatedLogs: MaintenanceLog[] = [];
    if (editingLogId) {
      updatedLogs =
        firearm.logs?.map((l) =>
          l.id === editingLogId ? ({ ...logForm, id: editingLogId } as MaintenanceLog) : l
        ) || [];
    } else {
      const newLog = { ...logForm, id: Date.now() } as MaintenanceLog;
      updatedLogs = [...(firearm.logs || []), newLog];
    }
    const updated = { ...firearm, logs: updatedLogs };
    await window.api.updateFirearm(firearm.id!, updated);

    if (
      !editingLogId &&
      logForm.type === 'Range' &&
      logForm.rounds_fired &&
      logForm.rounds_fired > 0 &&
      logForm.ammo_used
    ) {
      const allAmmo = await window.api.getAmmo();
      const matched = allAmmo.find((a: Ammo) => getAmmoString(a) === logForm.ammo_used);

      if (matched) {
        if (matched.count >= logForm.rounds_fired) {
          matched.count -= logForm.rounds_fired;
          await window.api.updateAmmo(matched.id!, matched);
          alert(`Smart Ammo Tracker: Deducted ${logForm.rounds_fired} rounds from your inventory.`);
        } else {
          alert(
            `Smart Ammo Tracker: Not enough inventory to deduct ${logForm.rounds_fired} rounds! Log saved without deducting.`
          );
        }
      }
    }

    onLogSaved(updated);
    onClose();
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-container-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="modal-header-icon-badge">
              <FileText size={20} className="text-sky-400" />
            </div>
            <div>
              <h2 className="modal-title">
                {editingLogId ? 'Edit Log Entry' : 'Add Maintenance / Range Log'}
              </h2>
              <p className="modal-subtitle">
                {firearm.make} {firearm.model} {firearm.caliber ? `(${firearm.caliber})` : ''}
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="modal-body flex flex-col gap-4">
          {/* Service / Log Type Segmented Selector */}
          <div className="form-type-selector">
            {LOG_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                type="button"
                className={`form-type-btn ${logForm.type === type ? 'active' : ''}`}
                onClick={() => setLogForm({ ...logForm, type: type as any })}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </div>

          <div className="form-section-card">
            <div className="form-grid-2col">
              <div className="form-group">
                <label className="form-label flex items-center gap-1.5">
                  <Calendar size={14} className="text-slate-400" />
                  Date
                </label>
                <input
                  required
                  type="date"
                  className="form-input"
                  value={logForm.date}
                  onChange={(e) => setLogForm({ ...logForm, date: e.target.value })}
                />
              </div>

              {(logForm.type === 'Modification' ||
                logForm.type === 'Repair' ||
                logForm.type === 'Other') && (
                <div className="form-group">
                  <label className="form-label flex items-center gap-1.5">
                    <DollarSign size={14} className="text-slate-400" />
                    Cost ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="form-input"
                    value={logForm.cost === undefined ? '' : logForm.cost}
                    onChange={(e) =>
                      setLogForm({
                        ...logForm,
                        cost: e.target.value === '' ? ('' as any) : parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              )}
            </div>

            {/* Range Specific Telemetry */}
            {logForm.type === 'Range' && (
              <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-white/5">
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label">Rounds Fired</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="e.g. 150"
                      className="form-input"
                      value={logForm.rounds_fired === undefined ? '' : logForm.rounds_fired}
                      onChange={(e) =>
                        setLogForm({
                          ...logForm,
                          rounds_fired:
                            e.target.value === '' ? ('' as any) : parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Malfunctions (FTF / FTE)</label>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="form-input"
                      value={logForm.malfunctions === undefined ? '' : logForm.malfunctions}
                      onChange={(e) =>
                        setLogForm({
                          ...logForm,
                          malfunctions:
                            e.target.value === '' ? ('' as any) : parseInt(e.target.value),
                        })
                      }
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Ammo Used (Smart Inventory Deduction)</label>
                  <AutocompleteInput
                    name="ammo_used"
                    value={logForm.ammo_used || ''}
                    onChange={(e) => setLogForm({ ...logForm, ammo_used: e.target.value })}
                    options={inventoryAmmo
                      .filter((ammo) => {
                        if (!firearm?.caliber || !ammo.caliber) return true;
                        const gunCal = firearm.caliber.toLowerCase().replace(/[^a-z0-9]/g, '');
                        const ammoCal = ammo.caliber.toLowerCase().replace(/[^a-z0-9]/g, '');
                        return gunCal.includes(ammoCal) || ammoCal.includes(gunCal);
                      })
                      .map((ammo) => getAmmoString(ammo))}
                    placeholder="Select from inventory to auto-deduct, or enter custom"
                  />
                </div>
              </div>
            )}

            {/* Repair / Modification Specific Fields */}
            {(logForm.type === 'Repair' || logForm.type === 'Modification') && (
              <div className="flex flex-col gap-3 mt-3 pt-3 border-t border-white/5">
                {logForm.type === 'Repair' && (
                  <div className="form-group">
                    <label className="form-label">Part Changed / Repaired</label>
                    <AutocompleteInput
                      name="repaired_part"
                      value={logForm.repaired_part || ''}
                      onChange={(e) => setLogForm({ ...logForm, repaired_part: e.target.value })}
                      options={[
                        'Springs',
                        'Firing Pin / Striker',
                        'Extractor',
                        'Ejector',
                        'Barrel',
                        'Trigger Group',
                        'Sights',
                        'Gas System',
                        'Magazine',
                        'Stock / Furniture',
                        'Bolt / Carrier',
                        'Other',
                      ]}
                      placeholder="Select common part or type custom"
                    />
                  </div>
                )}
                <div className="form-grid-2col">
                  <div className="form-group">
                    <label className="form-label">Part Manufacturer</label>
                    <input
                      type="text"
                      className="form-input"
                      value={logForm.part_manufacturer || ''}
                      onChange={(e) =>
                        setLogForm({ ...logForm, part_manufacturer: e.target.value })
                      }
                      placeholder="e.g. Apex Tactical, Wilson Combat"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Installed Part Details</label>
                    <input
                      type="text"
                      className="form-input"
                      value={logForm.installed_part_details || ''}
                      onChange={(e) =>
                        setLogForm({ ...logForm, installed_part_details: e.target.value })
                      }
                      placeholder="e.g. Heavy Duty Extractor, Flat Trigger"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="form-group mt-3">
              <label className="form-label">Notes & Observations</label>
              <textarea
                rows={3}
                className="form-input"
                placeholder="Log notes, cleaning solvents used, target observations..."
                value={logForm.notes}
                onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })}
              />
            </div>

            {/* Photo Attachment */}
            <div className="form-group mt-3">
              <label className="form-label">Photo Attachment</label>
              <div className="flex gap-3 items-center">
                <button
                  type="button"
                  className="btn-secondary flex items-center gap-1.5 py-1.5 px-3 text-xs"
                  onClick={handleLogImage}
                >
                  <ImageIcon size={15} /> Select Photo
                </button>
                {logForm.image_path && (
                  <span className="text-xs text-emerald-400 font-medium">
                    Photo attached
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              {editingLogId ? 'Save Changes' : 'Save Log Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
