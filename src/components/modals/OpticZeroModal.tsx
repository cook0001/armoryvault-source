import { AlertTriangle, CheckCircle, Gauge, Target, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Firearm, OpticZeroRecord } from '@/types';

interface OpticZeroModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  firearm: Firearm;
  existingRecord?: OpticZeroRecord | null;
}

export const OpticZeroModal: React.FC<OpticZeroModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  firearm,
  existingRecord,
}) => {
  const [opticName, setOpticName] = useState('');
  const [ringTorque, setRingTorque] = useState<string>('');
  const [baseTorque, setBaseTorque] = useState<string>('');
  const [actionScrewTorque, setActionScrewTorque] = useState<string>('');
  const [zeroDistanceYards, setZeroDistanceYards] = useState<string>('100');
  const [zeroAmmo, setZeroAmmo] = useState('');
  const [lastZeroDate, setLastZeroDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (existingRecord) {
        setOpticName(existingRecord.opticName || '');
        setRingTorque(
          existingRecord.ringTorqueInLbs !== undefined ? String(existingRecord.ringTorqueInLbs) : ''
        );
        setBaseTorque(
          existingRecord.baseTorqueInLbs !== undefined ? String(existingRecord.baseTorqueInLbs) : ''
        );
        setActionScrewTorque(
          existingRecord.actionScrewTorqueInLbs !== undefined
            ? String(existingRecord.actionScrewTorqueInLbs)
            : ''
        );
        setZeroDistanceYards(
          existingRecord.zeroDistanceYards !== undefined
            ? String(existingRecord.zeroDistanceYards)
            : '100'
        );
        setZeroAmmo(existingRecord.zeroAmmo || '');
        setLastZeroDate(existingRecord.lastZeroDate || new Date().toISOString().split('T')[0]);
        setNotes(existingRecord.notes || '');
      } else {
        setOpticName('');
        setRingTorque('');
        setBaseTorque('');
        setActionScrewTorque('');
        setZeroDistanceYards('100');
        setZeroAmmo('');
        setLastZeroDate(new Date().toISOString().split('T')[0]);
        setNotes('');
      }
    }
  }, [isOpen, existingRecord]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!opticName.trim()) {
      setError('Please provide an optic name or description.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const record: OpticZeroRecord = {
        id: existingRecord?.id || `zero_${Date.now()}`,
        opticName: opticName.trim(),
        ringTorqueInLbs: ringTorque.trim() ? Number.parseFloat(ringTorque) : undefined,
        baseTorqueInLbs: baseTorque.trim() ? Number.parseFloat(baseTorque) : undefined,
        actionScrewTorqueInLbs: actionScrewTorque.trim()
          ? Number.parseFloat(actionScrewTorque)
          : undefined,
        zeroDistanceYards: zeroDistanceYards.trim()
          ? Number.parseInt(zeroDistanceYards, 10)
          : undefined,
        zeroAmmo: zeroAmmo.trim() || undefined,
        lastZeroDate,
        notes: notes.trim() || undefined,
      };

      const existingRecords = firearm.optic_zero_records || [];
      let updatedRecords: OpticZeroRecord[];

      if (existingRecord) {
        updatedRecords = existingRecords.map((r) => (r.id === existingRecord.id ? record : r));
      } else {
        updatedRecords = [...existingRecords, record];
      }

      const updatedFirearm: Firearm = {
        ...firearm,
        optic_zero_records: updatedRecords,
      };

      if (window.api) {
        await window.api.updateFirearm(firearm.id!, updatedFirearm);
        window.dispatchEvent(new CustomEvent('armoryvault-reload'));
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to save optic torque/zero record:', err);
      setError(err?.message || 'Failed to save optic record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <Target size={22} className="text-accent" />
            <div className="modal-header-text">
              <h2>{existingRecord ? 'Edit Zero & Torque Profile' : 'Log Optic Zero & Fastener Torque'}</h2>
              <p>{firearm.make} {firearm.model} ({firearm.caliber})</p>
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
          {/* Optic Name Card */}
          <div className="form-section-card">
            <div className="form-group">
              <label htmlFor="optic-zero-name">Mounted Optic / Sight Name *</label>
              <input
                id="optic-zero-name"
                type="text"
                className="form-input"
                placeholder="e.g. Vortex Razor HD Gen III 1-10x24 / Aimpoint T2"
                value={opticName}
                onChange={(e) => setOpticName(e.target.value)}
                required
              />
            </div>
          </div>

          {/* Torque Specifications Card */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Gauge size={16} className="text-accent" />
                <h4 className="form-section-title">Fastener Torque Specifications (inch-pounds)</h4>
              </div>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label htmlFor="optic-ring-torque">Ring Caps (in-lbs)</label>
                <input
                  id="optic-ring-torque"
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  className="form-input"
                  placeholder="e.g. 15-18"
                  value={ringTorque}
                  onChange={(e) => setRingTorque(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="optic-base-torque">Base Clamp (in-lbs)</label>
                <input
                  id="optic-base-torque"
                  type="number"
                  step="0.5"
                  min="0"
                  max="200"
                  className="form-input"
                  placeholder="e.g. 45-65"
                  value={baseTorque}
                  onChange={(e) => setBaseTorque(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="action-screw-torque">Action Screws (in-lbs)</label>
                <input
                  id="action-screw-torque"
                  type="number"
                  step="0.5"
                  min="0"
                  max="200"
                  className="form-input"
                  placeholder="e.g. 45-55"
                  value={actionScrewTorque}
                  onChange={(e) => setActionScrewTorque(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Zero Verification Card */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Target size={16} className="text-accent" />
                <h4 className="form-section-title">Zero Verification &amp; Ammunition Data</h4>
              </div>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label htmlFor="zero-distance">Zero Distance (Yards)</label>
                <input
                  id="zero-distance"
                  type="number"
                  min="5"
                  max="1000"
                  className="form-input"
                  placeholder="100"
                  value={zeroDistanceYards}
                  onChange={(e) => setZeroDistanceYards(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="zero-ammo">Ammunition Load / Batch</label>
                <input
                  id="zero-ammo"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 77gr Sierra MatchKing OTM"
                  value={zeroAmmo}
                  onChange={(e) => setZeroAmmo(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="zero-date">Confirmation Date</label>
                <input
                  id="zero-date"
                  type="date"
                  className="form-input"
                  value={lastZeroDate}
                  onChange={(e) => setLastZeroDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="optic-zero-notes">Turret Offsets / Reticle &amp; Environmental Notes</label>
              <textarea
                id="optic-zero-notes"
                className="form-input"
                rows={2}
                placeholder="e.g. Turrets zero-stopped. 100yd zero confirmed at 65°F. Paint-penned witness marks on ring screws."
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
              <CheckCircle size={16} />
              {isSubmitting
                ? 'Saving...'
                : existingRecord
                  ? 'Update Record'
                  : 'Save Zero & Torque Spec'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
