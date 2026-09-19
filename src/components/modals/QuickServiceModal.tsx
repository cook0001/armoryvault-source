import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  DollarSign,
  FileText,
  Hammer,
  ShieldCheck,
  Sparkles,
  Tag,
  Wrench,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Firearm, MaintenanceLog, MaintenanceScheduleItem } from '@/types';

interface QuickServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  firearms: Firearm[];
  initialFirearmId?: number;
  initialTaskId?: string;
  initialTaskName?: string;
}

const COMMON_TASKS = [
  'Field Strip, Clean & Lubricate',
  'Deep Ultrasonic Clean',
  'Bore Cleaning & Carbon Removal',
  'Recoil Spring Replacement',
  'Extractor & Ejector Service',
  'Action Screws Torque Check',
  'Optic Mount Torque Check',
  'Trigger Assembly Inspection & Lube',
  'Gas Rings & Gas Key Inspection',
  'Magazine Springs Replacement',
  'Sight Alignment & Zero Verification',
];

export const QuickServiceModal: React.FC<QuickServiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  firearms,
  initialFirearmId,
  initialTaskId,
  initialTaskName,
}) => {
  const [selectedFirearmId, setSelectedFirearmId] = useState<number | ''>(() => {
    if (initialFirearmId) return initialFirearmId;
    return firearms.length > 0 ? firearms[0].id || '' : '';
  });
  const [selectedTaskId, setSelectedTaskId] = useState<string>(() => initialTaskId || '');
  const [taskName, setTaskName] = useState<string>(() => initialTaskName || COMMON_TASKS[0]);
  const [serviceType, setServiceType] = useState<'Cleaning' | 'Repair' | 'Modification' | 'Other'>(
    'Cleaning'
  );
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [actionDetails, setActionDetails] = useState<string>('');
  const [cost, setCost] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (initialFirearmId) {
        setSelectedFirearmId(initialFirearmId);
      } else if (firearms.length > 0 && selectedFirearmId === '') {
        setSelectedFirearmId(firearms[0].id || '');
      }

      if (initialTaskId) {
        setSelectedTaskId(initialTaskId);
        setTaskName(initialTaskName || '');
      } else if (!initialTaskName) {
        setSelectedTaskId('');
        setTaskName(COMMON_TASKS[0]);
      }
    }
  }, [isOpen, initialFirearmId, initialTaskId, initialTaskName]);

  if (!isOpen) return null;

  const currentFirearm = firearms.find((f) => f.id === Number(selectedFirearmId));
  const schedules: MaintenanceScheduleItem[] = currentFirearm?.maintenance_schedules || [];

  const handleFirearmChange = (firearmId: number) => {
    setSelectedFirearmId(firearmId);
    setSelectedTaskId('');
    const target = firearms.find((f) => f.id === firearmId);
    if (target?.maintenance_schedules && target.maintenance_schedules.length > 0) {
      setSelectedTaskId(target.maintenance_schedules[0].id);
      setTaskName(target.maintenance_schedules[0].task_name);
    } else {
      setTaskName(COMMON_TASKS[0]);
    }
  };

  const handleTaskSelection = (value: string) => {
    if (value.startsWith('sched:')) {
      const sId = value.replace('sched:', '');
      setSelectedTaskId(sId);
      const sched = schedules.find((s) => s.id === sId);
      if (sched) {
        setTaskName(sched.task_name);
        setActionDetails(`Completed scheduled service: ${sched.task_name}`);
      }
    } else {
      setSelectedTaskId('');
      setTaskName(value);
      setActionDetails(value);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFirearmId) {
      setError('Please select a target firearm.');
      return;
    }
    if (!taskName.trim()) {
      setError('Please enter or select a procedure name.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const targetFirearm = firearms.find((f) => f.id === Number(selectedFirearmId));
      if (!targetFirearm) {
        throw new Error('Firearm record not found.');
      }

      const logEntry: MaintenanceLog = {
        id: Date.now(),
        date,
        type: serviceType,
        installed_part_details: actionDetails ? `${taskName}: ${actionDetails}` : taskName,
        cost: cost ? parseFloat(cost) : undefined,
        notes,
      };

      const updatedLogs = [...(targetFirearm.logs || []), logEntry];
      let updatedSchedules = targetFirearm.maintenance_schedules || [];

      if (selectedTaskId) {
        const currentRoundCount = targetFirearm.round_count || 0;
        updatedSchedules = updatedSchedules.map((s) => {
          if (s.id === selectedTaskId) {
            return {
              ...s,
              last_performed_rounds: currentRoundCount,
              last_performed_date: date,
            };
          }
          return s;
        });
      }

      const updatedFirearm: Firearm = {
        ...targetFirearm,
        logs: updatedLogs,
        maintenance_schedules: updatedSchedules,
      };

      if (selectedTaskId && window.api && window.api.completeMaintenanceTask) {
        await window.api.completeMaintenanceTask(targetFirearm.id!, selectedTaskId, {
          date,
          type: serviceType,
          action_performed: actionDetails || taskName,
          part_details: actionDetails,
          notes,
          cost: cost ? parseFloat(cost) : undefined,
        });
      } else if (window.api && window.api.updateFirearm) {
        await window.api.updateFirearm(targetFirearm.id!, updatedFirearm);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to log service:', err);
      setError(err?.message || 'Failed to save service entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const serviceCategories: Array<{
    type: 'Cleaning' | 'Repair' | 'Modification' | 'Other';
    label: string;
    icon: React.ReactNode;
  }> = [
    { type: 'Cleaning', label: 'Clean & Lube', icon: <Sparkles size={16} /> },
    { type: 'Repair', label: 'Repair / Parts', icon: <Wrench size={16} /> },
    { type: 'Modification', label: 'Upgrade / Mod', icon: <Hammer size={16} /> },
    { type: 'Other', label: 'Armorer Inspection', icon: <ShieldCheck size={16} /> },
  ];

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-container"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-header-title">
            <Wrench size={22} className="text-accent" />
            <div className="modal-header-text">
              <h2>Log Armorer Service</h2>
              <p>Record maintenance actions, parts replacements & complete schedules</p>
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
          {/* Target Firearm & Procedure Card */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Wrench size={16} className="text-accent" />
                <h4 className="form-section-title">Firearm &amp; Procedure Selection</h4>
              </div>
            </div>

            <div className="form-grid-2col">
              <div className="form-group">
                <label htmlFor="quick-service-firearm">Target Firearm *</label>
                <select
                  id="quick-service-firearm"
                  className="form-input"
                  value={selectedFirearmId}
                  onChange={(e) => handleFirearmChange(Number(e.target.value))}
                  required
                >
                  <option value="" disabled>
                    Select a firearm...
                  </option>
                  {firearms.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.make} {f.model} ({f.caliber}) — SN: {f.serial_number || 'N/A'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="quick-service-task">Maintenance Task / Schedule *</label>
                <select
                  id="quick-service-task"
                  className="form-input"
                  value={selectedTaskId ? `sched:${selectedTaskId}` : taskName}
                  onChange={(e) => handleTaskSelection(e.target.value)}
                  required
                >
                  {schedules.length > 0 && (
                    <optgroup label="Firearm Scheduled Intervals">
                      {schedules.map((s) => (
                        <option key={s.id} value={`sched:${s.id}`}>
                          {s.task_name} (Every {s.interval_rounds.toLocaleString()} rds
                          {s.interval_days ? ` / ${s.interval_days} days` : ''})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Standard Armorer & Cleaning Procedures">
                    {COMMON_TASKS.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>
            </div>

            {!selectedTaskId && (
              <div className="form-group">
                <label htmlFor="quick-service-custom-task">Custom Procedure Title</label>
                <input
                  id="quick-service-custom-task"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Polished feed ramp, replaced gas rings"
                  value={taskName}
                  onChange={(e) => setTaskName(e.target.value)}
                  required
                />
              </div>
            )}
          </div>

          {/* Service Category Selector Card */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Tag size={16} className="text-accent" />
                <h4 className="form-section-title">Service Classification</h4>
              </div>
            </div>

            <div className="form-type-selector">
              {serviceCategories.map((cat) => (
                <button
                  key={cat.type}
                  type="button"
                  className={`form-type-btn ${serviceType === cat.type ? 'active' : ''}`}
                  onClick={() => setServiceType(cat.type)}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Execution Details & Financials */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <Calendar size={16} className="text-accent" />
                <h4 className="form-section-title">Service Details &amp; Parts Cost</h4>
              </div>
            </div>

            <div className="form-grid-3col">
              <div className="form-group">
                <label htmlFor="quick-service-date">Date Completed *</label>
                <input
                  id="quick-service-date"
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="quick-service-parts">Installed Parts / Replaced Details</label>
                <input
                  id="quick-service-parts"
                  type="text"
                  className="form-input"
                  placeholder="e.g. OEM Glock 18lb recoil spring"
                  value={actionDetails}
                  onChange={(e) => setActionDetails(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="quick-service-cost">Cost ($) (Optional)</label>
                <input
                  id="quick-service-cost"
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
              <label htmlFor="quick-service-notes">Armorer Notes &amp; Observations</label>
              <textarea
                id="quick-service-notes"
                className="form-input"
                rows={2}
                placeholder="Bore scoped clean, headspace verified with go-gauge, function test passed..."
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
              {isSubmitting ? 'Recording...' : 'Record Service & Complete'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
