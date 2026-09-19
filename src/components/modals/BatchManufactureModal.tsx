import { AlertTriangle, CheckCircle, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import {
  BrassCaseIcon,
  BulletProjectileIcon,
  GunpowderIcon,
  PrimerIcon,
} from '@/components/CustomIcons';
import { Ammo, ReloadingComponent } from '@/types';
import { formatPowderMultiUnit, toGrains } from '@/utils/powderUnits';

interface BatchManufactureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  ammo: Ammo;
}

export const BatchManufactureModal: React.FC<BatchManufactureModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  ammo,
}) => {
  const [batchQuantity, setBatchQuantity] = useState<number>(100);
  const [components, setComponents] = useState<ReloadingComponent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Selected Component IDs for deduction
  const [selectedPowderId, setSelectedPowderId] = useState<number | ''>('');
  const [selectedPrimerId, setSelectedPrimerId] = useState<number | ''>('');
  const [selectedBrassId, setSelectedBrassId] = useState<number | ''>('');
  const [selectedBulletId, setSelectedBulletId] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      loadComponents();
    }
  }, [isOpen, ammo]);

  const loadComponents = async () => {
    setLoading(true);
    try {
      if (window.api && window.api.getComponents) {
        const comps = await window.api.getComponents();
        setComponents(comps || []);
        autoMatchComponents(comps || []);
      }
    } catch (e) {
      console.error('Failed to load reloading components:', e);
    } finally {
      setLoading(false);
    }
  };

  const autoMatchComponents = (comps: ReloadingComponent[]) => {
    // 1. Powder match
    if (ammo.powder) {
      const powderQuery = ammo.powder.toLowerCase().trim();
      const powder = comps.find(
        (c) =>
          c.type === 'Powder' &&
          `${c.manufacturer || ''} ${c.name || ''} ${c.caliber || ''}`
            .toLowerCase()
            .includes(powderQuery)
      );
      if (powder?.id) setSelectedPowderId(powder.id);
    }

    // 2. Primer match
    const primerStr = `${ammo.primer || ''} ${ammo.primer_type || ''}`.toLowerCase().trim();
    if (primerStr) {
      const tokens = primerStr.split(/\s+/).filter((t) => t.length >= 3);
      const primer = comps.find((c) => {
        if (c.type !== 'Primer') return false;
        const compStr =
          `${c.manufacturer || ''} ${c.name || ''} ${c.primerType || ''} ${c.caliber || ''}`.toLowerCase();
        if (compStr.includes(primerStr) || primerStr.includes(compStr)) return true;
        if (ammo.primer_type && compStr.includes(ammo.primer_type.toLowerCase())) return true;
        return tokens.some((tok) => compStr.includes(tok));
      });
      if (primer?.id) setSelectedPrimerId(primer.id);
    }

    // 3. Brass match
    if (ammo.caliber) {
      const calQuery = ammo.caliber.toLowerCase().trim();
      const brass = comps.find(
        (c) =>
          c.type === 'Brass' &&
          (c.caliber?.toLowerCase().includes(calQuery) ||
            calQuery.includes(c.caliber?.toLowerCase() || ''))
      );
      if (brass?.id) setSelectedBrassId(brass.id);
    }

    // 4. Bullet match
    if (ammo.caliber) {
      const calQuery = ammo.caliber.toLowerCase().trim();
      const bullet = comps.find(
        (c) =>
          c.type === 'Bullet' &&
          (c.caliber?.toLowerCase().includes(calQuery) ||
            calQuery.includes(c.caliber?.toLowerCase() || '')) &&
          (!ammo.grain ||
            String(c.grain || '') === String(ammo.grain) ||
            String(c.name || '').includes(String(ammo.grain)))
      );
      if (bullet?.id) setSelectedBulletId(bullet.id);
    }
  };

  if (!isOpen) return null;

  // Powder calculations
  const powderComp = components.find((c) => c.id === selectedPowderId);
  const chargeGrains = Number(ammo.powderCharge) || 0;
  const totalGrainsNeeded = chargeGrains * batchQuantity;

  let powderNeededDisplay = '';
  let powderHasShortage = false;
  let powderAvailableGrains = 0;

  if (powderComp) {
    powderAvailableGrains = toGrains(powderComp.quantity || 0, powderComp.weightUnit);
  }

  if (chargeGrains > 0) {
    const lbsNeeded = Number((totalGrainsNeeded / 7000).toFixed(3));
    const ozNeeded = Number((totalGrainsNeeded / 437.5).toFixed(2));
    powderNeededDisplay = `${totalGrainsNeeded.toLocaleString()} gr (${lbsNeeded} lbs / ${ozNeeded} oz)`;
    if (powderComp) {
      powderHasShortage = powderAvailableGrains < totalGrainsNeeded;
    }
  }

  // Primer calculations
  const primerComp = components.find((c) => c.id === selectedPrimerId);
  const primerHasShortage = primerComp ? (primerComp.quantity || 0) < batchQuantity : false;

  // Brass calculations
  const brassComp = components.find((c) => c.id === selectedBrassId);
  const brassHasShortage = brassComp ? (brassComp.quantity || 0) < batchQuantity : false;

  // Bullet calculations
  const bulletComp = components.find((c) => c.id === selectedBulletId);
  const bulletHasShortage = bulletComp ? (bulletComp.quantity || 0) < batchQuantity : false;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchQuantity <= 0) return;

    setIsSubmitting(true);
    try {
      if (window.api && window.api.manufactureHandloadBatch) {
        const deductions: any = {};

        if (selectedPowderId && chargeGrains > 0) {
          deductions.powderId = Number(selectedPowderId);
          deductions.powderAmountGrains = chargeGrains;
        }
        if (selectedPrimerId) {
          deductions.primerId = Number(selectedPrimerId);
          deductions.primerCount = batchQuantity;
        }
        if (selectedBrassId) {
          deductions.brassId = Number(selectedBrassId);
          deductions.brassCount = batchQuantity;
        }
        if (selectedBulletId) {
          deductions.bulletId = Number(selectedBulletId);
          deductions.bulletCount = batchQuantity;
        }

        const res = await window.api.manufactureHandloadBatch(ammo.id!, batchQuantity, deductions);
        if (res && res.success) {
          onSuccess();
          onClose();
        } else {
          alert(`Failed to manufacture batch: ${res?.error || 'Unknown error'}`);
        }
      }
    } catch (err) {
      console.error('Error manufacturing batch:', err);
      alert('Failed to manufacture handload batch.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container modal-container-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="flex items-center gap-3">
            <div className="modal-header-icon-badge">
              <Sparkles size={20} className="text-amber-400" />
            </div>
            <div>
              <h2 className="modal-title">Assemble Handload Batch</h2>
              <p className="modal-subtitle">
                {ammo.caliber} &bull; {ammo.grain ? `${ammo.grain}gr ` : ''}
                {ammo.projectile || 'Bullet'} ({ammo.powder || 'Powder'}{' '}
                {ammo.powderCharge ? `${ammo.powderCharge}gr` : ''})
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} title="Close">
            <X size={20} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="modal-body flex flex-col gap-4">
          {/* Batch Quantity Selector Banner */}
          <div className="batch-qty-banner">
            <div>
              <label className="batch-qty-title">
                Batch Quantity (Rounds to Assemble)
              </label>
              <div className="batch-qty-sub">
                Will add +{batchQuantity} rounds to finished stock and deduct required components.
              </div>
            </div>
            <div className="batch-qty-controls">
              {[50, 100, 250, 500].map((qty) => (
                <button
                  key={qty}
                  type="button"
                  onClick={() => setBatchQuantity(qty)}
                  className={`batch-qty-btn ${batchQuantity === qty ? 'active' : ''}`}
                >
                  {qty}
                </button>
              ))}
              <input
                type="number"
                min="1"
                step="1"
                className="form-input batch-qty-input"
                value={batchQuantity}
                onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                required
              />
            </div>
          </div>

          {/* Component Inventory Depletion Breakdown Section */}
          <div className="form-section-card">
            <div className="form-section-header">
              <div className="form-section-title-wrap">
                <h3 className="form-section-title">Component Inventory Depletion Breakdown</h3>
                <p className="form-section-desc">
                  Select and verify components to be consumed from your stock
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {/* 1. Powder */}
              <div className={`batch-comp-card ${powderHasShortage ? 'shortage' : ''}`}>
                <div className="batch-comp-header">
                  <div className="batch-comp-title-wrap">
                    <GunpowderIcon size={18} color="#fbbf24" />
                    <span className="batch-comp-name">
                      Gunpowder: {ammo.powder || 'N/A'}
                    </span>
                  </div>
                  {chargeGrains > 0 && (
                    <span className={`batch-comp-req ${powderHasShortage ? 'shortage' : ''}`}>
                      Need: {powderNeededDisplay}
                    </span>
                  )}
                </div>
                <div className="batch-comp-grid">
                  <AutocompleteInput
                    mode="select"
                    name="powderCompId"
                    value={String(selectedPowderId)}
                    onChange={(e) =>
                      setSelectedPowderId(e.target.value ? Number(e.target.value) : '')
                    }
                    options={[
                      { value: '', label: '-- Do not deduct powder --' },
                      ...components
                        .filter((c) => c.type === 'Powder')
                        .map((c) => ({
                          value: String(c.id),
                          label: `${c.manufacturer} ${c.name || ''} (In Stock: ${formatPowderMultiUnit(c.quantity || 0, c.weightUnit).summary})`,
                        })),
                    ]}
                  />
                  <div className="batch-comp-status">
                    {powderComp ? (
                      powderHasShortage ? (
                        <span className="batch-comp-status shortage">
                          <AlertTriangle size={14} /> Shortage (Have{' '}
                          {
                            formatPowderMultiUnit(powderComp.quantity || 0, powderComp.weightUnit)
                              .compound
                          }
                          )
                        </span>
                      ) : (
                        <span className="batch-comp-status ok">
                          <CheckCircle size={14} /> In Stock (
                          {
                            formatPowderMultiUnit(powderComp.quantity || 0, powderComp.weightUnit)
                              .compound
                          }
                          )
                        </span>
                      )
                    ) : (
                      'No powder selected'
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Primers */}
              <div className={`batch-comp-card ${primerHasShortage ? 'shortage' : ''}`}>
                <div className="batch-comp-header">
                  <div className="batch-comp-title-wrap">
                    <PrimerIcon size={18} color="#38bdf8" />
                    <span className="batch-comp-name">
                      Primers: {ammo.primer || ammo.primer_type || 'N/A'}
                    </span>
                  </div>
                  <span className={`batch-comp-req ${primerHasShortage ? 'shortage' : ''}`}>
                    Need: {batchQuantity.toLocaleString()} primers
                  </span>
                </div>
                <div className="batch-comp-grid">
                  <AutocompleteInput
                    mode="select"
                    name="primerCompId"
                    value={String(selectedPrimerId)}
                    onChange={(e) =>
                      setSelectedPrimerId(e.target.value ? Number(e.target.value) : '')
                    }
                    options={[
                      { value: '', label: '-- Do not deduct primers --' },
                      ...components
                        .filter((c) => c.type === 'Primer')
                        .map((c) => ({
                          value: String(c.id),
                          label: `${c.manufacturer} ${c.name || ''} ${c.primerType || ''} (In Stock: ${c.quantity || 0})`,
                        })),
                    ]}
                  />
                  <div className="batch-comp-status">
                    {primerComp ? (
                      primerHasShortage ? (
                        <span className="batch-comp-status shortage">
                          <AlertTriangle size={14} /> Shortage (Have {primerComp.quantity || 0})
                        </span>
                      ) : (
                        <span className="batch-comp-status ok">
                          <CheckCircle size={14} /> In Stock ({primerComp.quantity || 0})
                        </span>
                      )
                    ) : (
                      'No primer selected'
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Brass / Cases */}
              <div className={`batch-comp-card ${brassHasShortage ? 'shortage' : ''}`}>
                <div className="batch-comp-header">
                  <div className="batch-comp-title-wrap">
                    <BrassCaseIcon size={18} color="#c084fc" />
                    <span className="batch-comp-name">
                      Brass / Cases: {ammo.brass || ammo.caliber}
                    </span>
                  </div>
                  <span className={`batch-comp-req ${brassHasShortage ? 'shortage' : ''}`}>
                    Need: {batchQuantity.toLocaleString()} cases
                  </span>
                </div>
                <div className="batch-comp-grid">
                  <AutocompleteInput
                    mode="select"
                    name="brassCompId"
                    value={String(selectedBrassId)}
                    onChange={(e) =>
                      setSelectedBrassId(e.target.value ? Number(e.target.value) : '')
                    }
                    options={[
                      { value: '', label: '-- Do not deduct brass --' },
                      ...components
                        .filter((c) => c.type === 'Brass')
                        .map((c) => ({
                          value: String(c.id),
                          label: `${c.manufacturer} ${c.caliber} (In Stock: ${c.quantity || 0})`,
                        })),
                    ]}
                  />
                  <div className="batch-comp-status">
                    {brassComp ? (
                      brassHasShortage ? (
                        <span className="batch-comp-status shortage">
                          <AlertTriangle size={14} /> Shortage (Have {brassComp.quantity || 0})
                        </span>
                      ) : (
                        <span className="batch-comp-status ok">
                          <CheckCircle size={14} /> In Stock ({brassComp.quantity || 0})
                        </span>
                      )
                    ) : (
                      'No brass selected'
                    )}
                  </div>
                </div>
              </div>

              {/* 4. Bullets / Projectiles */}
              <div className={`batch-comp-card ${bulletHasShortage ? 'shortage' : ''}`}>
                <div className="batch-comp-header">
                  <div className="batch-comp-title-wrap">
                    <BulletProjectileIcon size={18} color="#f59e0b" />
                    <span className="batch-comp-name">
                      Projectiles: {ammo.bullet_manufacturer ? `${ammo.bullet_manufacturer} ` : ''}
                      {ammo.grain ? `${ammo.grain}gr ` : ''}
                      {ammo.projectile || ''}
                    </span>
                  </div>
                  <span className={`batch-comp-req ${bulletHasShortage ? 'shortage' : ''}`}>
                    Need: {batchQuantity.toLocaleString()} bullets
                  </span>
                </div>
                <div className="batch-comp-grid">
                  <AutocompleteInput
                    mode="select"
                    name="bulletCompId"
                    value={String(selectedBulletId)}
                    onChange={(e) =>
                      setSelectedBulletId(e.target.value ? Number(e.target.value) : '')
                    }
                    options={[
                      { value: '', label: '-- Do not deduct bullets --' },
                      ...components
                        .filter((c) => c.type === 'Bullet')
                        .map((c) => ({
                          value: String(c.id),
                          label: `${c.manufacturer} ${c.caliber} ${c.grain ? `${c.grain}gr ` : ''}${c.name || ''} (In Stock: ${c.quantity || 0})`,
                        })),
                    ]}
                  />
                  <div className="batch-comp-status">
                    {bulletComp ? (
                      bulletHasShortage ? (
                        <span className="batch-comp-status shortage">
                          <AlertTriangle size={14} /> Shortage (Have {bulletComp.quantity || 0})
                        </span>
                      ) : (
                        <span className="batch-comp-status ok">
                          <CheckCircle size={14} /> In Stock ({bulletComp.quantity || 0})
                        </span>
                      )
                    ) : (
                      'No bullets selected'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Footer */}
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
              className="btn-primary flex items-center gap-2"
              disabled={isSubmitting || batchQuantity <= 0}
            >
              <Sparkles size={16} />
              {isSubmitting ? 'Assembling...' : `Manufacture Batch (+${batchQuantity} Rds)`}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
