import {
  AlertTriangle,
  BarChart3,
  Beaker,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Download,
  Flame,
  LineChart,
  PlusCircle,
  Printer,
  Ruler,
  Scale,
  Target,
  Trash2,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BrassCaseIcon,
  BulletProjectileIcon,
  CartridgesIcon,
  GunpowderIcon,
  LoadDevNavIcon,
  PrimerIcon,
} from '../components/CustomIcons';
import type { LoadLadderStep, LoadLadderTest } from '../types';

const PRESSURE_COLORS: Record<string, string> = {
  None: '#34d399',
  'Flattened Primer': '#f59e0b',
  'Cratered Primer': '#f97316',
  'Sticky Bolt': '#ef4444',
  'Extractor Mark': '#dc2626',
};

export const LoadDevelopment = () => {
  const [tests, setTests] = useState<LoadLadderTest[]>([]);
  const [selectedTest, setSelectedTest] = useState<LoadLadderTest | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddStepOpen, setIsAddStepOpen] = useState(false);
  const [showCostCalculator, setShowCostCalculator] = useState(false);

  // Component Cost Estimator State
  const [powderPricePerLb, setPowderPricePerLb] = useState('45.00');
  const [primerPricePer1000, setPrimerPricePer1000] = useState('85.00');
  const [bulletPricePer100, setBulletPricePer100] = useState('38.00');
  const [brassPricePer100, setBrassPricePer100] = useState('55.00');
  const [brassReloads, setBrassReloads] = useState('5');
  const [factoryBoxPrice, setFactoryBoxPrice] = useState('32.00'); // 20rd box

  const [form, setForm] = useState<Partial<LoadLadderTest>>({
    caliber: '',
    bulletManufacturer: '',
    bulletName: '',
    bulletGrain: 168,
    bulletType: 'BTHP',
    powderManufacturer: '',
    powderName: '',
    primerType: '',
    brassManufacturer: '',
    distanceYards: 100,
    steps: [],
    date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [stepForm, setStepForm] = useState<LoadLadderStep>({
    chargeGrains: 0,
    seatingDepthOAL: undefined,
    velocityAvg: undefined,
    velocitySD: undefined,
    velocityES: undefined,
    groupSizeInches: undefined,
    groupSizeMOA: undefined,
    pressureSigns: 'None',
    notes: '',
  });

  useEffect(() => {
    loadTests();
  }, []);

  const loadTests = async () => {
    if (window.api?.getLoadLadderTests) {
      const t = await window.api.getLoadLadderTests();
      setTests(t);
      if (t.length > 0 && !selectedTest) {
        setSelectedTest(t[0]);
      }
    }
  };

  const handleSaveTest = async () => {
    if (!form.caliber || !form.powderName) return;
    const test = { ...form, steps: form.steps || [] } as LoadLadderTest;
    if (window.api?.addLoadLadderTest) {
      await window.api.addLoadLadderTest(test);
      await loadTests();
      setIsAddModalOpen(false);
    }
  };

  const handleDeleteTest = async (id: number) => {
    if (!confirm('Delete this load development test?')) return;
    if (window.api?.deleteLoadLadderTest) {
      await window.api.deleteLoadLadderTest(id);
      if (selectedTest?.id === id) setSelectedTest(null);
      await loadTests();
    }
  };

  const handleAddStep = async () => {
    if (!selectedTest?.id || stepForm.chargeGrains <= 0) return;
    const updated = {
      ...selectedTest,
      steps: [...(selectedTest.steps || []), { ...stepForm }].sort(
        (a, b) => a.chargeGrains - b.chargeGrains
      ),
    };
    if (window.api?.updateLoadLadderTest) {
      await window.api.updateLoadLadderTest(selectedTest.id, updated);
      await loadTests();
      const refreshed = (await window.api.getLoadLadderTests()).find(
        (t: LoadLadderTest) => t.id === selectedTest.id
      );
      if (refreshed) setSelectedTest(refreshed);
      setIsAddStepOpen(false);
      setStepForm({ chargeGrains: 0, pressureSigns: 'None' });
    }
  };

  const handleDeleteStep = async (stepIndex: number) => {
    if (!selectedTest?.id) return;
    const updated = {
      ...selectedTest,
      steps: selectedTest.steps.filter((_, i) => i !== stepIndex),
    };
    if (window.api?.updateLoadLadderTest) {
      await window.api.updateLoadLadderTest(selectedTest.id, updated);
      await loadTests();
      const refreshed = (await window.api.getLoadLadderTests()).find(
        (t: LoadLadderTest) => t.id === selectedTest.id
      );
      if (refreshed) setSelectedTest(refreshed);
    }
  };

  // Find the best step (lowest group size with no pressure signs)
  const bestStep = useMemo(() => {
    return selectedTest?.steps.reduce<LoadLadderStep | null>((best, step) => {
      if (step.groupSizeInches === undefined) return best;
      if (step.pressureSigns && step.pressureSigns !== 'None') return best;
      if (!best || step.groupSizeInches < (best.groupSizeInches || Infinity)) return step;
      return best;
    }, null);
  }, [selectedTest]);

  // Cost per round breakdown
  const costBreakdown = useMemo(() => {
    const grains = bestStep?.chargeGrains || selectedTest?.steps[0]?.chargeGrains || 42.0;
    const pPrice = parseFloat(powderPricePerLb) || 45;
    const prPrice = parseFloat(primerPricePer1000) || 85;
    const bPrice = parseFloat(bulletPricePer100) || 38;
    const brPrice = parseFloat(brassPricePer100) || 55;
    const reloads = Math.max(1, parseInt(brassReloads) || 5);
    const fPrice = parseFloat(factoryBoxPrice) || 32;

    const powderCost = (grains / 7000) * pPrice;
    const primerCost = prPrice / 1000;
    const bulletCost = bPrice / 100;
    const brassCost = brPrice / 100 / reloads;
    const totalPerRound = powderCost + primerCost + bulletCost + brassCost;

    const factoryPerRound = fPrice / 20;
    const savingsPer50 = (factoryPerRound - totalPerRound) * 50;

    return {
      powderCost,
      primerCost,
      bulletCost,
      brassCost,
      totalPerRound,
      factoryPerRound,
      savingsPer50,
    };
  }, [
    bestStep,
    selectedTest,
    powderPricePerLb,
    primerPricePer1000,
    bulletPricePer100,
    brassPricePer100,
    brassReloads,
    factoryBoxPrice,
  ]);

  // Ladder Chart Metrics & Coordinates
  const chartData = useMemo(() => {
    if (!selectedTest || selectedTest.steps.length < 2) return null;
    const sorted = [...selectedTest.steps].sort((a, b) => a.chargeGrains - b.chargeGrains);
    const charges = sorted.map((s) => s.chargeGrains);
    const velocities = sorted.map((s) => s.velocityAvg || 0).filter((v) => v > 0);
    const groups = sorted.map((s) => s.groupSizeInches || 0).filter((g) => g > 0);

    const minCharge = Math.min(...charges);
    const maxCharge = Math.max(...charges);
    const minVel = velocities.length > 0 ? Math.min(...velocities) - 50 : 2400;
    const maxVel = velocities.length > 0 ? Math.max(...velocities) + 50 : 3000;
    const minGroup = 0;
    const maxGroup = groups.length > 0 ? Math.max(...groups) * 1.3 : 2.0;

    return {
      sorted,
      minCharge,
      maxCharge,
      minVel,
      maxVel,
      minGroup,
      maxGroup,
    };
  }, [selectedTest]);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="no-print page-header">
        <div>
          <h1
            style={{
              color: 'var(--text-primary)',
              margin: 0,
              fontSize: '1.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <LoadDevNavIcon size={24} color="var(--accent)" />
            Load Development &amp; Ladder Tests
          </h1>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              flexWrap: 'wrap',
              marginTop: 6,
              fontSize: '0.84rem',
              color: 'var(--text-secondary)',
            }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <Scale size={13} color="var(--accent)" />
              Precision Powder Ladder Testing
            </span>
            <span style={{ color: 'var(--border-subtle)', opacity: 0.7 }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <TrendingUp size={13} color="#34d399" />
              Harmonic Node Detection
            </span>
            <span style={{ color: 'var(--border-subtle)', opacity: 0.7 }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <LineChart size={13} color="#38bdf8" />
              Velocity Curves
            </span>
            <span style={{ color: 'var(--border-subtle)', opacity: 0.7 }}>•</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
              <DollarSign size={13} color="#f59e0b" />
              Reloading Economics
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={() => setShowCostCalculator(!showCostCalculator)}
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <DollarSign size={16} />
            <span>Cost Calculator</span>
          </button>
          <button
            className="btn-secondary"
            onClick={() => window.print()}
            title="Print Load Development DOPE Sheet"
            style={{
              padding: '0.55rem 1rem',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <Printer size={16} />
            <span>Print DOPE Sheet</span>
          </button>
          <button
            className="btn-primary"
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '0.55rem 1.15rem',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              whiteSpace: 'nowrap',
              flexShrink: 0,
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={16} />
            <span>New Ladder Test</span>
          </button>
        </div>
      </div>

      {/* Reloading Cost-Per-Round Calculator Deck (Collapsible Global Tool) */}
      {showCostCalculator && (
        <div
          className="no-print"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid rgba(52, 211, 153, 0.3)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1rem',
            }}
          >
            <h3
              style={{
                margin: 0,
                fontSize: '1rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <DollarSign size={18} color="var(--accent)" />
              Handload Cost-Per-Round &amp; Savings Calculator
            </h3>
            <button
              type="button"
              onClick={() => setShowCostCalculator(false)}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '0.2rem',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <X size={16} />
            </button>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '0.75rem',
              marginBottom: '1rem',
            }}
          >
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  marginBottom: 3,
                }}
              >
                Powder ($/lb)
              </label>
              <input
                className="glass-input"
                type="number"
                step="0.5"
                value={powderPricePerLb}
                onChange={(e) => setPowderPricePerLb(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  marginBottom: 3,
                }}
              >
                Primers ($/1000)
              </label>
              <input
                className="glass-input"
                type="number"
                step="1"
                value={primerPricePer1000}
                onChange={(e) => setPrimerPricePer1000(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  marginBottom: 3,
                }}
              >
                Bullets ($/100)
              </label>
              <input
                className="glass-input"
                type="number"
                step="0.5"
                value={bulletPricePer100}
                onChange={(e) => setBulletPricePer100(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  marginBottom: 3,
                }}
              >
                Brass ($/100)
              </label>
              <input
                className="glass-input"
                type="number"
                step="1"
                value={brassPricePer100}
                onChange={(e) => setBrassPricePer100(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  marginBottom: 3,
                }}
              >
                Reloads / Case
              </label>
              <input
                className="glass-input"
                type="number"
                step="1"
                value={brassReloads}
                onChange={(e) => setBrassReloads(e.target.value)}
              />
            </div>
            <div>
              <label
                style={{
                  display: 'block',
                  color: 'var(--text-muted)',
                  fontSize: '0.72rem',
                  marginBottom: 3,
                }}
              >
                Factory Box ($/20)
              </label>
              <input
                className="glass-input"
                type="number"
                step="1"
                value={factoryBoxPrice}
                onChange={(e) => setFactoryBoxPrice(e.target.value)}
              />
            </div>
          </div>

          {/* Results Breakdown */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '0.75rem',
              background: 'rgba(0,0,0,0.25)',
              padding: '0.85rem',
              borderRadius: '8px',
            }}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Powder / Rd:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                ${costBreakdown.powderCost.toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Primer / Rd:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                ${costBreakdown.primerCost.toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Bullet / Rd:</div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                ${costBreakdown.bulletCost.toFixed(3)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Total Cost / Round:
              </div>
              <div style={{ fontWeight: 700, color: 'var(--accent)', fontSize: '1.1rem' }}>
                ${costBreakdown.totalPerRound.toFixed(2)}
              </div>
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                Savings / 50 Rounds:
              </div>
              <div
                style={{
                  fontWeight: 700,
                  color: costBreakdown.savingsPer50 > 0 ? '#34d399' : '#f59e0b',
                  fontSize: '1.1rem',
                }}
              >
                ${costBreakdown.savingsPer50.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Selector Carousel / Cards (When tests exist) */}
      {tests.length > 0 && (
        <div
          className="no-print"
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}
        >
          {tests.map((t) => (
            <div
              key={t.id}
              onClick={() => setSelectedTest(t)}
              style={{
                padding: '0.75rem 1rem',
                background:
                  selectedTest?.id === t.id ? 'rgba(52, 211, 153, 0.15)' : 'var(--card-bg)',
                border:
                  selectedTest?.id === t.id
                    ? '1px solid var(--accent)'
                    : '1px solid var(--border-light)',
                borderRadius: '10px',
                cursor: 'pointer',
                minWidth: '220px',
                transition: 'all 0.2s ease',
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CartridgesIcon size={14} color="#f59e0b" />
                {t.caliber} • {t.bulletGrain}gr {t.bulletType || ''}
              </div>
              <div
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.78rem',
                  marginTop: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <GunpowderIcon size={12} color="#94a3b8" />
                {t.powderName} • {t.steps.length} steps • {t.date}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteTest(t.id!);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  marginTop: 4,
                  padding: 0,
                }}
                title="Delete test"
              >
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty State when no tests exist */}
      {tests.length === 0 && (
        <div
          className="no-print"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--border-light)',
            borderRadius: '16px',
            padding: '3.5rem 2rem',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            style={{
              position: 'absolute',
              top: '-15%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '500px',
              height: '250px',
              background:
                'radial-gradient(ellipse at center, rgba(56, 189, 248, 0.1) 0%, transparent 70%)',
              pointerEvents: 'none',
            }}
          />

          {/* Tactical Icon Badge */}
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '16px',
              background: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.25rem',
            }}
          >
            <LoadDevNavIcon size={32} color="#38bdf8" />
          </div>

          <h2
            style={{
              color: 'var(--text-primary)',
              margin: '0 0 0.5rem 0',
              fontSize: '1.45rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
            }}
          >
            Precision Load Development &amp; Ladder Tests
          </h2>

          <p
            style={{
              color: 'var(--text-secondary)',
              maxWidth: '620px',
              margin: '0 auto 1.75rem auto',
              fontSize: '0.92rem',
              lineHeight: 1.6,
            }}
          >
            Systematically test incremental powder charges, detect barrel harmonic nodes, track
            chronograph velocity spreads, and pinpoint maximum precision with minimal group
            dispersion.
          </p>

          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '0.85rem',
              flexWrap: 'wrap',
              marginBottom: '3rem',
            }}
          >
            <button
              className="btn-primary"
              onClick={() => setIsAddModalOpen(true)}
              style={{
                padding: '0.65rem 1.4rem',
                fontSize: '0.92rem',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <PlusCircle size={17} />
              <span>Start Your First Ladder Test</span>
            </button>
            <button
              className="btn-secondary"
              onClick={() => setShowCostCalculator(true)}
              style={{
                padding: '0.65rem 1.25rem',
                fontSize: '0.92rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                borderRadius: '8px',
                whiteSpace: 'nowrap',
                cursor: 'pointer',
              }}
            >
              <DollarSign size={17} />
              <span>Open Cost Calculator</span>
            </button>
          </div>

          {/* Tactical Feature Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: '1.25rem',
              textAlign: 'left',
              maxWidth: '960px',
              margin: '0 auto',
            }}
          >
            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                <Scale size={18} color="#38bdf8" />
                <span>Incremental Charge Steps</span>
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-muted)',
                  fontSize: '0.83rem',
                  lineHeight: 1.5,
                }}
              >
                Record step-by-step powder increments (0.2–0.5 gr) while monitoring safety pressure
                signs like flattened primers or sticky bolt lift.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                <TrendingUp size={18} color="#34d399" />
                <span>Harmonic Node Detection</span>
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-muted)',
                  fontSize: '0.83rem',
                  lineHeight: 1.5,
                }}
              >
                Pinpoint velocity plateaus where barrel vibration harmonizes, keeping muzzle
                velocities and vertical stringing stable under field conditions.
              </p>
            </div>

            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '12px',
                padding: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  marginBottom: '0.5rem',
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                }}
              >
                <BarChart3 size={18} color="#f59e0b" />
                <span>Velocity &amp; Group Analysis</span>
              </div>
              <p
                style={{
                  margin: 0,
                  color: 'var(--text-muted)',
                  fontSize: '0.83rem',
                  lineHeight: 1.5,
                }}
              >
                Interactive SVG curves plotting Velocity (FPS) &amp; Group Dispersion (MOA/Inches)
                alongside automatic SD and Extreme Spread calculations.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Selected Test Detail */}
      {selectedTest && (
        <>
          {/* Recipe Info Bar */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem',
              padding: '1rem',
              background: 'var(--card-bg)',
              borderRadius: '10px',
              border: '1px solid var(--border-light)',
              alignItems: 'center',
            }}
          >
            {[
              {
                icon: <CartridgesIcon size={15} color="#f59e0b" />,
                label: 'Caliber',
                value: selectedTest.caliber,
              },
              {
                icon: <BulletProjectileIcon size={15} color="#f97316" />,
                label: 'Bullet',
                value:
                  `${selectedTest.bulletManufacturer || ''} ${selectedTest.bulletName || ''} ${selectedTest.bulletGrain}gr ${selectedTest.bulletType || ''}`.trim(),
              },
              {
                icon: <GunpowderIcon size={15} color="#f59e0b" />,
                label: 'Powder',
                value: `${selectedTest.powderManufacturer || ''} ${selectedTest.powderName}`.trim(),
              },
              {
                icon: <Ruler size={15} />,
                label: 'Distance',
                value: `${selectedTest.distanceYards || 100} yds`,
              },
            ].map((item, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: '0.85rem',
                }}
              >
                <span>{item.icon}</span>
                <span style={{ color: 'var(--text-muted)' }}>{item.label}:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{item.value}</strong>
              </div>
            ))}

            <button
              className="btn-secondary no-print"
              onClick={() => setIsAddStepOpen(true)}
              style={{ marginLeft: 'auto', padding: '0.4rem 0.85rem', fontSize: '0.82rem' }}
            >
              <PlusCircle size={14} /> Add Charge Step
            </button>
          </div>

          {/* Best Node Highlight */}
          {bestStep && (
            <div
              style={{
                padding: '0.85rem 1.25rem',
                marginBottom: '1rem',
                borderRadius: '10px',
                background: 'rgba(52, 211, 153, 0.1)',
                border: '1px solid rgba(52, 211, 153, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
                <span style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                  <strong>Harmonic Accuracy Node:</strong> {bestStep.chargeGrains} gr →{' '}
                  <strong style={{ color: 'var(--accent)' }}>{bestStep.groupSizeInches}"</strong>{' '}
                  group (
                  {bestStep.groupSizeMOA ||
                    (bestStep.groupSizeInches
                      ? (bestStep.groupSizeInches * 0.955).toFixed(2)
                      : '—')}{' '}
                  MOA)
                  {bestStep.velocityAvg !== undefined && ` • ${bestStep.velocityAvg} fps`}
                  {bestStep.velocitySD !== undefined && ` • SD: ${bestStep.velocitySD} fps`}
                </span>
              </div>
              <span
                style={{
                  color: '#34d399',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <CheckCircle2 size={13} color="#34d399" /> Safe Pressure Node
              </span>
            </div>
          )}

          {/* Interactive Ladder Graph (Charge Weight vs Velocity & Group Size) */}
          {chartData && chartData.sorted.length >= 2 && (
            <div
              className="no-print"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-light)',
                borderRadius: '12px',
                padding: '1.25rem',
                marginBottom: '1.25rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: '0.95rem',
                    color: 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <LineChart size={16} color="var(--accent)" />
                  Ladder Curve: Velocity (FPS) &amp; Group Size (in) vs. Powder Charge (gr)
                </h3>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                  <span
                    style={{ color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span style={{ width: 10, height: 2, background: '#38bdf8' }} /> Velocity (FPS)
                  </span>
                  <span
                    style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <span style={{ width: 10, height: 2, background: '#f59e0b' }} /> Group Size (in)
                  </span>
                </div>
              </div>

              {/* Responsive SVG Chart */}
              <div style={{ width: '100%', height: '220px', position: 'relative' }}>
                <svg
                  viewBox="0 0 600 200"
                  style={{ width: '100%', height: '100%', overflow: 'visible' }}
                >
                  {/* Grid Lines */}
                  <line
                    x1="40"
                    y1="20"
                    x2="560"
                    y2="20"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="40"
                    y1="65"
                    x2="560"
                    y2="65"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="3,3"
                  />
                  <line
                    x1="40"
                    y1="110"
                    x2="560"
                    y2="110"
                    stroke="rgba(255,255,255,0.05)"
                    strokeDasharray="3,3"
                  />
                  <line x1="40" y1="155" x2="560" y2="155" stroke="rgba(255,255,255,0.1)" />

                  {/* Velocity Line & Points */}
                  {(() => {
                    const points = chartData.sorted
                      .filter((s) => (s.velocityAvg || 0) > 0)
                      .map((s) => {
                        const chargeSpan = Math.max(0.1, chartData.maxCharge - chartData.minCharge);
                        const x = 50 + ((s.chargeGrains - chartData.minCharge) / chargeSpan) * 500;
                        const velSpan = Math.max(1, chartData.maxVel - chartData.minVel);
                        const y = 155 - (((s.velocityAvg || 0) - chartData.minVel) / velSpan) * 135;
                        return { x, y, val: s.velocityAvg, charge: s.chargeGrains };
                      });

                    if (points.length < 2) return null;
                    const pathD = points.reduce(
                      (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
                      ''
                    );

                    return (
                      <g>
                        <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="4.5"
                              fill="#38bdf8"
                              stroke="#0f172a"
                              strokeWidth="1.5"
                            />
                            <text
                              x={p.x}
                              y={p.y - 8}
                              fill="#38bdf8"
                              fontSize="10"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {p.val}
                            </text>
                            <text x={p.x} y="175" fill="#94a3b8" fontSize="10" textAnchor="middle">
                              {p.charge}gr
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}

                  {/* Group Size Line & Points */}
                  {(() => {
                    const points = chartData.sorted
                      .filter((s) => (s.groupSizeInches || 0) > 0)
                      .map((s) => {
                        const chargeSpan = Math.max(0.1, chartData.maxCharge - chartData.minCharge);
                        const x = 50 + ((s.chargeGrains - chartData.minCharge) / chargeSpan) * 500;
                        const grpSpan = Math.max(0.1, chartData.maxGroup - chartData.minGroup);
                        const y =
                          155 - (((s.groupSizeInches || 0) - chartData.minGroup) / grpSpan) * 135;
                        return { x, y, val: s.groupSizeInches };
                      });

                    if (points.length < 2) return null;
                    const pathD = points.reduce(
                      (acc, p, idx) => `${acc} ${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
                      ''
                    );

                    return (
                      <g>
                        <path
                          d={pathD}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="2"
                          strokeDasharray="4,4"
                        />
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <rect x={p.x - 3.5} y={p.y - 3.5} width="7" height="7" fill="#f59e0b" />
                            <text
                              x={p.x}
                              y={p.y + 16}
                              fill="#f59e0b"
                              fontSize="9.5"
                              fontWeight="bold"
                              textAnchor="middle"
                            >
                              {p.val}"
                            </text>
                          </g>
                        ))}
                      </g>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* Ladder Data Table */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-light)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}
          >
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.3)' }}>
                    {[
                      'Charge (gr)',
                      'OAL (in)',
                      'Avg Vel (fps)',
                      'SD',
                      'ES',
                      'Group (in)',
                      'Group (MOA)',
                      'Pressure Signs',
                      'Notes',
                      '',
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: '0.65rem 0.75rem',
                          textAlign: 'center',
                          color: 'var(--text-muted)',
                          fontWeight: 600,
                          fontSize: '0.75rem',
                          borderBottom: '1px solid var(--border-light)',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {selectedTest.steps.map((step, i) => {
                    const isBest = bestStep === step;
                    const hasPressure = step.pressureSigns && step.pressureSigns !== 'None';
                    return (
                      <tr
                        key={i}
                        style={{
                          background: isBest
                            ? 'rgba(52,211,153,0.08)'
                            : hasPressure
                              ? 'rgba(239,68,68,0.06)'
                              : i % 2 === 0
                                ? 'transparent'
                                : 'rgba(255,255,255,0.02)',
                          borderBottom: '1px solid var(--border-light)',
                        }}
                      >
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: isBest ? 'var(--accent)' : 'var(--text-primary)',
                          }}
                        >
                          {step.chargeGrains}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {step.seatingDepthOAL || '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            color: 'var(--text-primary)',
                          }}
                        >
                          {step.velocityAvg || '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            color:
                              (step.velocitySD || 0) <= 10
                                ? '#34d399'
                                : (step.velocitySD || 0) <= 20
                                  ? '#f59e0b'
                                  : '#ef4444',
                          }}
                        >
                          {step.velocitySD ?? '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {step.velocityES ?? '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            fontWeight: 600,
                            color: isBest ? 'var(--accent)' : 'var(--text-primary)',
                          }}
                        >
                          {step.groupSizeInches ?? '—'}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            fontFamily: 'monospace',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {step.groupSizeMOA ?? '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          {hasPressure ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.72rem',
                                fontWeight: 600,
                                background: `${PRESSURE_COLORS[step.pressureSigns!]}22`,
                                color: PRESSURE_COLORS[step.pressureSigns!],
                              }}
                            >
                              <AlertTriangle size={11} /> {step.pressureSigns}
                            </span>
                          ) : (
                            <span
                              style={{
                                color: '#34d399',
                                fontSize: '0.78rem',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 3,
                              }}
                            >
                              <CheckCircle2 size={12} color="#34d399" /> None
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: '0.5rem 0.75rem',
                            textAlign: 'center',
                            color: 'var(--text-muted)',
                            fontSize: '0.78rem',
                            maxWidth: '140px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {step.notes || '—'}
                        </td>
                        <td style={{ padding: '0.5rem 0.75rem', textAlign: 'center' }}>
                          <button
                            onClick={() => handleDeleteStep(i)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--danger)',
                              cursor: 'pointer',
                            }}
                            title="Delete step"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {selectedTest.steps.length === 0 && (
            <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No charge data recorded yet. Click "Add Charge Step" to start building your ladder.
            </div>
          )}
        </>
      )}

      {/* New Ladder Test Modal */}
      {isAddModalOpen &&
        createPortal(
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '560px',
                maxHeight: '80vh',
                overflow: 'auto',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                  New Ladder Test
                </h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Caliber', key: 'caliber', type: 'text' },
                  { label: 'Distance (yds)', key: 'distanceYards', type: 'number' },
                  { label: 'Bullet Manufacturer', key: 'bulletManufacturer', type: 'text' },
                  { label: 'Bullet Name', key: 'bulletName', type: 'text' },
                  { label: 'Bullet Weight (gr)', key: 'bulletGrain', type: 'number' },
                  { label: 'Bullet Type', key: 'bulletType', type: 'text' },
                  { label: 'Powder Manufacturer', key: 'powderManufacturer', type: 'text' },
                  { label: 'Powder Name', key: 'powderName', type: 'text' },
                  { label: 'Primer Type', key: 'primerType', type: 'text' },
                  { label: 'Brass Manufacturer', key: 'brassManufacturer', type: 'text' },
                  { label: 'Date', key: 'date', type: 'date' },
                ].map((field) => (
                  <div key={field.key}>
                    <label
                      style={{
                        display: 'block',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                        marginBottom: 4,
                      }}
                    >
                      {field.label}
                    </label>
                    <input
                      className="glass-input"
                      type={field.type}
                      value={(form as any)[field.key] ?? ''}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          [field.key]:
                            field.type === 'number' ? Number(e.target.value) : e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <label
                  style={{
                    display: 'block',
                    color: 'var(--text-muted)',
                    fontSize: '0.78rem',
                    marginBottom: 4,
                  }}
                >
                  Notes
                </label>
                <textarea
                  className="glass-input"
                  rows={2}
                  value={form.notes || ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1.25rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button className="btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleSaveTest}>
                  Create Test
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* Add Charge Step Modal */}
      {isAddStepOpen &&
        createPortal(
          <div
            className="modal-overlay"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(16px)',
            }}
          >
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '480px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '1rem',
                }}
              >
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                  Add Charge Data
                </h2>
                <button
                  onClick={() => setIsAddStepOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Charge Weight (gr)', key: 'chargeGrains', type: 'number', step: '0.1' },
                  {
                    label: 'OAL / Seating Depth (in)',
                    key: 'seatingDepthOAL',
                    type: 'number',
                    step: '0.001',
                  },
                  { label: 'Avg Velocity (fps)', key: 'velocityAvg', type: 'number' },
                  { label: 'Std Dev (fps)', key: 'velocitySD', type: 'number', step: '0.1' },
                  { label: 'Extreme Spread (fps)', key: 'velocityES', type: 'number' },
                  {
                    label: 'Group Size (in)',
                    key: 'groupSizeInches',
                    type: 'number',
                    step: '0.01',
                  },
                  { label: 'Group Size (MOA)', key: 'groupSizeMOA', type: 'number', step: '0.01' },
                ].map((field) => (
                  <div key={field.key}>
                    <label
                      style={{
                        display: 'block',
                        color: 'var(--text-muted)',
                        fontSize: '0.78rem',
                        marginBottom: 4,
                      }}
                    >
                      {field.label}
                    </label>
                    <input
                      className="glass-input"
                      type={field.type}
                      step={(field as any).step}
                      value={(stepForm as any)[field.key] ?? ''}
                      onChange={(e) =>
                        setStepForm((f) => ({
                          ...f,
                          [field.key]: e.target.value ? Number(e.target.value) : undefined,
                        }))
                      }
                    />
                  </div>
                ))}
                <div style={{ gridColumn: 'span 2' }}>
                  <label
                    style={{
                      display: 'block',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      marginBottom: 4,
                    }}
                  >
                    Pressure Signs
                  </label>
                  <select
                    className="glass-input"
                    value={stepForm.pressureSigns || 'None'}
                    onChange={(e) =>
                      setStepForm((f) => ({ ...f, pressureSigns: e.target.value as any }))
                    }
                  >
                    <option value="None">None</option>
                    <option value="Flattened Primer">Flattened Primer</option>
                    <option value="Cratered Primer">Cratered Primer</option>
                    <option value="Sticky Bolt">Sticky Bolt</option>
                    <option value="Extractor Mark">Extractor Mark</option>
                  </select>
                </div>
                <div style={{ gridColumn: 'span 2' }}>
                  <label
                    style={{
                      display: 'block',
                      color: 'var(--text-muted)',
                      fontSize: '0.78rem',
                      marginBottom: 4,
                    }}
                  >
                    Notes
                  </label>
                  <input
                    className="glass-input"
                    value={stepForm.notes || ''}
                    onChange={(e) => setStepForm((f) => ({ ...f, notes: e.target.value }))}
                  />
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  marginTop: '1.25rem',
                  justifyContent: 'flex-end',
                }}
              >
                <button className="btn-secondary" onClick={() => setIsAddStepOpen(false)}>
                  Cancel
                </button>
                <button className="btn-primary" onClick={handleAddStep}>
                  Add Charge
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
