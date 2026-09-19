import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Crosshair,
  DollarSign,
  FileText,
  MapPin,
  Target,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { Ammo, Firearm } from '@/types';
import { RangePickerModal } from './RangePickerModal';

interface RangeSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedFirearmId?: number;
  onSaved?: () => void;
}

export const RangeSessionModal: React.FC<RangeSessionModalProps> = ({
  isOpen,
  onClose,
  preselectedFirearmId,
  onSaved,
}) => {
  const [firearms, setFirearms] = useState<Firearm[]>([]);
  const [ammoList, setAmmoList] = useState<Ammo[]>([]);

  const [selectedFirearmId, setSelectedFirearmId] = useState<number | ''>('');
  const [selectedAmmoId, setSelectedAmmoId] = useState<number | ''>('');
  const [roundsFired, setRoundsFired] = useState<number | ''>(50);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [cost, setCost] = useState<string>('');
  const [notes, setNotes] = useState('');

  const [isRangePickerOpen, setIsRangePickerOpen] = useState(false);
  const [showAllAmmo, setShowAllAmmo] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (preselectedFirearmId) {
      setSelectedFirearmId(preselectedFirearmId);
    }
  }, [preselectedFirearmId]);

  const loadData = async () => {
    if (window.api) {
      try {
        const f = await window.api.getFirearms();
        const availableFirearms = f.filter((item) => !item.is_sold);
        setFirearms(availableFirearms);
        if (preselectedFirearmId) {
          setSelectedFirearmId(preselectedFirearmId);
        } else if (availableFirearms.length > 0 && selectedFirearmId === '') {
          setSelectedFirearmId(availableFirearms[0].id || '');
        }

        const a = await window.api.getAmmo();
        setAmmoList(a);
      } catch (err) {
        console.error('Failed to load firearms/ammo for range session:', err);
      }
    }
  };

  if (!isOpen) return null;

  const currentFirearm = firearms.find((f) => f.id === Number(selectedFirearmId));

  const filteredAmmo = ammoList.filter((a) => {
    if (showAllAmmo || !currentFirearm) return true;
    const firearmCal = (currentFirearm.caliber || '').toLowerCase().trim();
    const ammoCal = (a.caliber || '').toLowerCase().trim();
    return ammoCal.includes(firearmCal) || firearmCal.includes(ammoCal);
  });

  const selectedAmmo = ammoList.find((a) => a.id === Number(selectedAmmoId));

  const addQuickRounds = (amount: number) => {
    const current = typeof roundsFired === 'number' ? roundsFired : 0;
    setRoundsFired(current + amount);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirearmId) {
      setError('Please select a firearm.');
      return;
    }
    const rounds = Number(roundsFired);
    if (!rounds || rounds <= 0) {
      setError('Please enter a valid round count greater than 0.');
      return;
    }

    if (selectedAmmo && selectedAmmo.count < rounds) {
      const confirmExceed = window.confirm(
        `You entered ${rounds} rounds, but you only have ${selectedAmmo.count} rounds of this ammo in stock.\n\n` +
          `This will reduce stock to 0. Do you want to proceed?`
      );
      if (!confirmExceed) return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (window.api && window.api.logRangeSession) {
        const res = await window.api.logRangeSession({
          firearm_id: Number(selectedFirearmId),
          ammo_id: selectedAmmoId ? Number(selectedAmmoId) : undefined,
          rounds_fired: rounds,
          date,
          location: location.trim() || undefined,
          notes: notes.trim() || undefined,
          cost: cost ? parseFloat(cost) : undefined,
        });

        if (!res.success) {
          throw new Error(res.error || 'Failed to log range trip');
        }
      }

      window.dispatchEvent(new CustomEvent('armoryvault-reload'));
      if (onSaved) onSaved();
      onClose();
    } catch (err: any) {
      console.error('Failed to log range session:', err);
      setError(err?.message || 'Failed to record range session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container modal-container-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <Crosshair size={22} className="text-accent" />
            <div className="modal-header-text">
              <h2>Log Range Session</h2>
              <p>Deduct fired rounds from inventory & increment firearm barrel round counts</p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close dialog">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="notification-banner notification-banner-danger mx-6 mt-4">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Firearm & Ammo Section */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Target size={16} className="text-accent" />
                <h4 className="form-section-title">Weapon &amp; Ammunition Selection</h4>
              </div>
              <label className="form-checkbox-row">
                <input
                  type="checkbox"
                  checked={showAllAmmo}
                  onChange={(e) => setShowAllAmmo(e.target.checked)}
                />
                <span>Show all calibers</span>
              </label>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label>Target Firearm *</label>
                <AutocompleteInput
                  mode="select"
                  name="firearmId"
                  value={String(selectedFirearmId)}
                  onChange={(e) => {
                    setSelectedFirearmId(e.target.value ? Number(e.target.value) : '');
                    setSelectedAmmoId('');
                  }}
                  options={[
                    { value: '', label: '-- Choose Firearm --' },
                    ...firearms.map((f) => ({
                      value: String(f.id),
                      label: `${f.make} ${f.model} (${f.caliber})${f.serial_number ? ` • SN: ${f.serial_number}` : ''}`,
                    })),
                  ]}
                  required
                />
              </div>

              <div className="form-group">
                <label>Ammunition Expended (Deducts from Depot)</label>
                <AutocompleteInput
                  mode="select"
                  name="ammoId"
                  value={String(selectedAmmoId)}
                  onChange={(e) => setSelectedAmmoId(e.target.value ? Number(e.target.value) : '')}
                  options={[
                    { value: '', label: '-- No depot deduction (Range / Surplus ammo) --' },
                    ...filteredAmmo.map((a) => ({
                      value: String(a.id),
                      label: `${a.type === 'factory' ? a.manufacturer || 'Factory' : 'Custom Handload'} • ${a.caliber} ${a.grain ? `${a.grain}gr ` : ''}${a.projectile || ''} — [In Stock: ${a.count} rds]`,
                    })),
                  ]}
                />
                {selectedAmmo && (
                  <div className="form-hint text-sky-400 flex items-center gap-1 mt-1">
                    <CheckCircle size={14} className="shrink-0" />
                    <span>
                      Will deduct {roundsFired || 0} rounds from {selectedAmmo.count} rounds currently in stock.
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Rounds Fired & Quick Increments */}
            <div className="form-subcard mt-3">
              <div className="form-grid-2col">
                <div className="form-group">
                  <label>Rounds Fired *</label>
                  <input
                    type="number"
                    min="1"
                    className="form-input"
                    value={roundsFired}
                    onChange={(e) =>
                      setRoundsFired(e.target.value === '' ? '' : parseInt(e.target.value, 10) || 0)
                    }
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Quick Quantity Increments</label>
                  <div className="barcode-lookup-tray">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => addQuickRounds(25)}
                    >
                      +25
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => addQuickRounds(50)}
                    >
                      +50
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => addQuickRounds(100)}
                    >
                      +100
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Facility Location, Date & Cost */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Calendar size={16} className="text-accent" />
                <h4 className="form-section-title">Session Logistics &amp; Facility</h4>
              </div>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsRangePickerOpen(true)}
              >
                <MapPin size={14} /> Browse Facilities
              </button>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label>Date Fired *</label>
                <input
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Range Facility / Location</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Red Rock Gun Club, BLM Public Land"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Range Fee / Lane Cost ($)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Session Notes / Groupings / Malfunctions</label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="Zero confirmed at 50 yds, chronographed 10-shot string, zero stoppages..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          {/* Modal Footer */}
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              <Crosshair size={16} />
              {isSubmitting ? 'Logging...' : 'Save & Log Range Trip'}
            </button>
          </div>
        </form>
      </div>

      <RangePickerModal
        isOpen={isRangePickerOpen}
        onClose={() => setIsRangePickerOpen(false)}
        onSelect={(range) => {
          setLocation(`${range.name} (${range.city}, ${range.state})`);
          if (range.lane_fee != null && !cost) {
            setCost(String(range.lane_fee));
          }
        }}
      />
    </div>,
    document.body
  );
};
