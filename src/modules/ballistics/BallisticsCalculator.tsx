import {
  Activity,
  Crosshair,
  Eye,
  FileText,
  Gauge,
  Hash,
  Layers,
  Maximize2,
  PlusCircle,
  Printer,
  Radio,
  Sliders,
  Sparkles,
  Target,
  Thermometer,
  Trash2,
  TrendingUp,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BallisticsNavIcon,
  BulletProjectileIcon,
  CartridgesIcon,
  ScopeIcon,
} from '@/components/CustomIcons';
import type { BallisticProfile, BallisticSolution } from '@/types';
import { BallisticPreset, COMMON_CALIBER_PRESETS, solveTrajectory } from './ballisticsEngine';

export const BallisticsCalculator = () => {
  const [profiles, setProfiles] = useState<BallisticProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<BallisticProfile | null>(null);
  const [solutions, setSolutions] = useState<BallisticSolution[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [maxRange, setMaxRange] = useState(1000);
  const [stepYards, setStepYards] = useState(25);
  const [turretUnit, setTurretUnit] = useState<'moa' | 'mil'>('moa');

  // Chronograph & Optics Vault Integration
  const [chronoStrings, setChronoStrings] = useState<any[]>([]);
  const [opticsList, setOpticsList] = useState<any[]>([]);
  const [selectedOpticId, setSelectedOpticId] = useState<string | null>(null);

  // DOPE Card Modal
  const [isDopeModalOpen, setIsDopeModalOpen] = useState(false);
  const [dopeCardType, setDopeCardType] = useState<'standard' | 'stock' | 'armband'>('stock');

  // Reticle Simulation HUD
  const [showReticleSim, setShowReticleSim] = useState(false);
  const [simDistance, setSimDistance] = useState(300);
  const [simWindMph, setSimWindMph] = useState(10);

  // Form state
  const [form, setForm] = useState<Partial<BallisticProfile>>({
    name: '',
    caliber: '',
    bulletWeight: 168,
    ballisticCoefficient: 0.462,
    dragModel: 'G1',
    muzzleVelocity: 2700,
    zeroRange: 100,
    sightHeight: 1.5,
    windSpeed: 10,
    windAngle: 90,
    temperature: 59,
    altitude: 0,
  });

  useEffect(() => {
    loadProfiles();
    loadVaultData();
  }, []);

  const loadVaultData = async () => {
    try {
      if ((window as any).api?.getChronoStrings) {
        const cs = await (window as any).api.getChronoStrings();
        if (Array.isArray(cs)) setChronoStrings(cs);
      } else {
        const local = localStorage.getItem('chrono_strings_cache');
        if (local) setChronoStrings(JSON.parse(local));
      }
    } catch {}

    try {
      if ((window as any).api?.getConfig) {
        const opts = await (window as any).api.getConfig('optics_vault_inventory');
        if (Array.isArray(opts)) setOpticsList(opts);
      } else {
        const local = localStorage.getItem('optics_vault_inventory');
        if (local) setOpticsList(JSON.parse(local));
      }
    } catch {}
  };

  const simSolution = useMemo(() => {
    if (!selectedProfile) return null;
    const tempProfile: BallisticProfile = {
      ...selectedProfile,
      windSpeed: simWindMph,
    };
    const s = solveTrajectory(tempProfile, simDistance, simDistance);
    return s.find((item) => item.range === simDistance) || s[s.length - 1] || null;
  }, [selectedProfile, simDistance, simWindMph]);

  const loadProfiles = async () => {
    if (window.api?.getBallisticProfiles) {
      const p = await window.api.getBallisticProfiles();
      setProfiles(p);
      if (p.length > 0 && !selectedProfile) {
        setSelectedProfile(p[0]);
        setSolutions(solveTrajectory(p[0], maxRange, stepYards));
      }
    }
  };

  const handleProfileSelect = (profile: BallisticProfile) => {
    setSelectedProfile(profile);
    setSolutions(solveTrajectory(profile, maxRange, stepYards));
  };

  const handleRecalculate = () => {
    if (selectedProfile) {
      setSolutions(solveTrajectory(selectedProfile, maxRange, stepYards));
    }
  };

  const handleSaveProfile = async () => {
    if (!form.name || !form.caliber) return;
    const profile = form as BallisticProfile;
    if (window.api?.addBallisticProfile) {
      await window.api.addBallisticProfile(profile);
      await loadProfiles();
      setIsAddModalOpen(false);
      setForm({
        name: '',
        caliber: '',
        bulletWeight: 168,
        ballisticCoefficient: 0.462,
        dragModel: 'G1',
        muzzleVelocity: 2700,
        zeroRange: 100,
        sightHeight: 1.5,
        windSpeed: 10,
        windAngle: 90,
        temperature: 59,
        altitude: 0,
      });
    }
  };

  const handleDeleteProfile = async (id: number) => {
    if (!confirm('Delete this ballistic profile?')) return;
    if (window.api?.deleteBallisticProfile) {
      await window.api.deleteBallisticProfile(id);
      if (selectedProfile?.id === id) {
        setSelectedProfile(null);
        setSolutions([]);
      }
      await loadProfiles();
    }
  };

  const handleApplyPreset = (preset: BallisticPreset) => {
    setForm({
      name: preset.name,
      caliber: preset.caliber,
      bulletWeight: preset.bulletWeight,
      ballisticCoefficient: preset.ballisticCoefficient,
      dragModel: preset.dragModel,
      muzzleVelocity: preset.muzzleVelocity,
      zeroRange: preset.zeroRange,
      sightHeight: preset.sightHeight,
      windSpeed: 10,
      windAngle: 90,
      temperature: 59,
      altitude: 0,
    });
  };

  const handleInstantPresetCalculate = (preset: BallisticPreset) => {
    const tempProfile: BallisticProfile = {
      name: preset.name,
      caliber: preset.caliber,
      bulletWeight: preset.bulletWeight,
      ballisticCoefficient: preset.ballisticCoefficient,
      dragModel: preset.dragModel,
      muzzleVelocity: preset.muzzleVelocity,
      zeroRange: preset.zeroRange,
      sightHeight: preset.sightHeight,
      windSpeed: 10,
      windAngle: 90,
      temperature: 59,
      altitude: 0,
    };
    setSelectedProfile(tempProfile);
    setSolutions(solveTrajectory(tempProfile, maxRange, stepYards));
  };

  const handlePrintDopeCard = (format: 'standard' | 'stock' | 'armband' = 'standard') => {
    if (!selectedProfile || solutions.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const unit = turretUnit.toUpperCase();
    const dropKey = turretUnit === 'moa' ? 'dropMOA' : 'dropMIL';
    const driftKey = turretUnit === 'moa' ? 'windDriftMOA' : 'windDriftMIL';

    if (format === 'stock') {
      // Compact Rifle Stock / Scope Cap Card (High contrast 2-column tactical card)
      printWindow.document.write(`
        <html><head><title>Stock DOPE — ${selectedProfile.name}</title>
        <style>
          @page { size: 3.5in 2.5in; margin: 0.1in; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #000; margin: 0; padding: 6px; }
          .card { border: 2.5pt solid #000; border-radius: 6px; padding: 6px; height: 100%; box-sizing: border-box; }
          .title { font-size: 10pt; font-weight: 900; text-transform: uppercase; text-align: center; border-bottom: 1.5pt solid #000; padding-bottom: 3px; margin-bottom: 4px; }
          .sub { font-size: 6.5pt; font-weight: bold; text-align: center; color: #333; margin-bottom: 5px; }
          .grid { display: flex; gap: 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 7.5pt; font-weight: bold; text-align: center; }
          th { background: #000; color: #fff; padding: 2px 3px; font-size: 6.5pt; }
          td { border-bottom: 1px solid #ccc; padding: 2px 3px; }
          .clicks { color: #b91c1c; font-weight: 900; }
          @media print { body { margin: 0; } }
        </style></head><body>
        <div class="card">
          <div class="title">${selectedProfile.name} • ${selectedProfile.caliber}</div>
          <div class="sub">${selectedProfile.bulletWeight}gr • MV ${selectedProfile.muzzleVelocity} fps • Zero ${selectedProfile.zeroRange}y • ${unit}</div>
          <div class="grid">
            <table>
              <tr><th>YDS</th><th>${unit}</th><th>CLICKS</th><th>WIND</th></tr>
              ${solutions
                .slice(0, Math.ceil(solutions.length / 2))
                .map((s) => {
                  const drop = (s as any)[dropKey];
                  const drift = (s as any)[driftKey];
                  const clicks =
                    turretUnit === 'moa' ? Math.round(s.dropMOA * 4) : Math.round(s.dropMIL * 10);
                  return `<tr><td>${s.range}</td><td>${drop}</td><td class="clicks">${clicks}</td><td>${drift}</td></tr>`;
                })
                .join('')}
            </table>
            <table>
              <tr><th>YDS</th><th>${unit}</th><th>CLICKS</th><th>WIND</th></tr>
              ${solutions
                .slice(Math.ceil(solutions.length / 2))
                .map((s) => {
                  const drop = (s as any)[dropKey];
                  const drift = (s as any)[driftKey];
                  const clicks =
                    turretUnit === 'moa' ? Math.round(s.dropMOA * 4) : Math.round(s.dropMIL * 10);
                  return `<tr><td>${s.range}</td><td>${drop}</td><td class="clicks">${clicks}</td><td>${drift}</td></tr>`;
                })
                .join('')}
            </table>
          </div>
        </div>
        </body></html>
      `);
    } else if (format === 'armband') {
      // 3-Column Quarterback Wrist / Armband Card
      printWindow.document.write(`
        <html><head><title>Armband DOPE — ${selectedProfile.name}</title>
        <style>
          @page { size: 2.2in 4.5in; margin: 0.1in; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #fff; color: #000; margin: 0; padding: 4px; }
          .card { border: 2pt solid #111; border-radius: 4px; padding: 4px; }
          .hdr { font-size: 8pt; font-weight: 800; text-align: center; border-bottom: 1.5pt solid #000; padding-bottom: 2px; }
          .meta { font-size: 6pt; text-align: center; color: #444; margin: 2px 0 4px 0; }
          table { width: 100%; border-collapse: collapse; font-size: 7.5pt; text-align: center; }
          th { background: #111; color: #fff; padding: 2px 1px; font-size: 6pt; }
          td { border-bottom: 0.5pt solid #bbb; padding: 2px 1px; font-weight: 600; }
          .dial { color: #dc2626; font-weight: 900; }
          @media print { body { margin: 0; } }
        </style></head><body>
        <div class="card">
          <div class="hdr">${selectedProfile.name} (${unit})</div>
          <div class="meta">${selectedProfile.caliber} • ${selectedProfile.bulletWeight}gr • Zero ${selectedProfile.zeroRange}y</div>
          <table>
            <tr><th>YARDS</th><th>ELEV DIAL</th><th>10MPH WIND</th></tr>
            ${solutions
              .map((s) => {
                const drop = (s as any)[dropKey];
                const drift = (s as any)[driftKey];
                const clicks =
                  turretUnit === 'moa' ? Math.round(s.dropMOA * 4) : Math.round(s.dropMIL * 10);
                return `<tr><td><strong>${s.range}y</strong></td><td class="dial">+${drop} (${clicks}c)</td><td>${drift} (${unit})</td></tr>`;
              })
              .join('')}
          </table>
        </div>
        </body></html>
      `);
    } else {
      // Standard Tabular Report
      printWindow.document.write(`
        <html><head><title>DOPE Card — ${selectedProfile.name}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; color: #000; }
          h1 { font-size: 16px; margin-bottom: 4px; }
          .meta { font-size: 11px; color: #555; margin-bottom: 12px; }
          table { border-collapse: collapse; width: 100%; font-size: 11px; }
          th, td { border: 1px solid #333; padding: 3px 6px; text-align: center; }
          th { background: #222; color: #fff; }
          tr:nth-child(even) { background: #f0f0f0; }
          @media print { body { margin: 0; } }
        </style></head><body>
        <h1>DOPE CARD — ${selectedProfile.name}</h1>
        <div class="meta">
          ${selectedProfile.caliber} | ${selectedProfile.bulletWeight}gr | BC ${selectedProfile.ballisticCoefficient} (${selectedProfile.dragModel}) |
          MV ${selectedProfile.muzzleVelocity} fps | Zero ${selectedProfile.zeroRange} yds |
          Wind ${selectedProfile.windSpeed || 0} mph @ ${selectedProfile.windAngle || 90}°
        </div>
        <table>
          <tr><th>Range (yds)</th><th>Drop (${unit})</th><th>Clicks</th><th>Drift (${unit})</th><th>Vel (fps)</th><th>Energy (ft-lbs)</th><th>TOF (s)</th></tr>
          ${solutions
            .map((s) => {
              const clicks =
                turretUnit === 'moa' ? Math.round(s.dropMOA * 4) : Math.round(s.dropMIL * 10);
              return `
            <tr>
              <td>${s.range}</td>
              <td>${(s as any)[dropKey]}</td>
              <td>${clicks}</td>
              <td>${(s as any)[driftKey]}</td>
              <td>${s.velocity}</td>
              <td>${s.energy}</td>
              <td>${s.timeOfFlight}</td>
            </tr>
          `;
            })
            .join('')}
        </table>
        <div class="meta" style="margin-top: 8px;">Generated by ArmoryVault • ${new Date().toLocaleDateString()}</div>
        </body></html>
      `);
    }

    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
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
            <BallisticsNavIcon size={24} color="var(--accent)" />
            Ballistics Calculator & DOPE Cards
          </h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
            G1/G7 point-mass trajectory solver with comprehensive caliber ballistic library
          </p>
        </div>
        <button className="btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <PlusCircle size={16} /> New Profile
        </button>
      </div>

      {/* Quick Caliber Presets Library */}
      <div
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid var(--border-light)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '0.6rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: 'var(--accent)',
              fontSize: '0.82rem',
              fontWeight: 600,
            }}
          >
            <Sparkles size={14} /> Quick Common Caliber Library
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            Click any preset to calculate instant ballistics
          </span>
        </div>
        <div style={{ display: 'flex', gap: '0.45rem', overflowX: 'auto', paddingBottom: '4px' }}>
          {COMMON_CALIBER_PRESETS.slice(0, 8).map((cp) => (
            <button
              key={cp.name}
              onClick={() => handleInstantPresetCalculate(cp)}
              style={{
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '0.35rem 0.65rem',
                cursor: 'pointer',
                color: 'var(--text-primary)',
                fontSize: '0.75rem',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
              }}
            >
              <CartridgesIcon size={12} color="#f59e0b" />
              <span>
                {cp.name.split(' ')[0]} {cp.bulletWeight}gr
              </span>
            </button>
          ))}
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              background: 'rgba(52, 211, 153, 0.1)',
              border: '1px solid rgba(52, 211, 153, 0.3)',
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
              cursor: 'pointer',
              color: '#34d399',
              fontSize: '0.75rem',
              whiteSpace: 'nowrap',
              fontWeight: 600,
            }}
          >
            + View All {COMMON_CALIBER_PRESETS.length} Calibers
          </button>
        </div>
      </div>

      {/* Profile Selector Cards */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {profiles.map((p) => (
          <div
            key={p.id}
            onClick={() => handleProfileSelect(p)}
            style={{
              padding: '0.75rem 1rem',
              background:
                selectedProfile?.id === p.id ? 'rgba(52, 211, 153, 0.15)' : 'var(--card-bg)',
              border:
                selectedProfile?.id === p.id
                  ? '1px solid var(--accent)'
                  : '1px solid var(--border-light)',
              borderRadius: '10px',
              cursor: 'pointer',
              minWidth: '180px',
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
              <CartridgesIcon size={13} color="#f59e0b" />
              {p.name}
            </div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 2 }}>
              {p.caliber} • {p.bulletWeight}gr • {p.muzzleVelocity} fps
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteProfile(p.id!);
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--danger)',
                cursor: 'pointer',
                marginTop: 4,
                padding: 0,
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {profiles.length === 0 && (
          <div
            style={{
              color: 'var(--text-muted)',
              padding: '1rem',
              textAlign: 'center',
              width: '100%',
              fontSize: '0.85rem',
            }}
          >
            Select a common preset above or click "New Profile" to create a custom profile.
          </div>
        )}
      </div>

      {/* Controls Row */}
      {selectedProfile && (
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            padding: '1rem',
            background: 'var(--card-bg)',
            borderRadius: '10px',
            border: '1px solid var(--border-light)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Max Range</label>
            <input
              type="number"
              value={maxRange}
              onChange={(e) => setMaxRange(Number(e.target.value))}
              style={{ width: 80 }}
              className="glass-input"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Step</label>
            <select
              value={stepYards}
              onChange={(e) => setStepYards(Number(e.target.value))}
              className="glass-input"
              style={{ width: 80 }}
            >
              <option value={25}>25 yds</option>
              <option value={50}>50 yds</option>
              <option value={100}>100 yds</option>
            </select>
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.25rem',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '8px',
              padding: '2px',
            }}
          >
            <button
              onClick={() => setTurretUnit('moa')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: turretUnit === 'moa' ? 'var(--accent)' : 'transparent',
                color: turretUnit === 'moa' ? '#000' : 'var(--text-muted)',
              }}
            >
              MOA (1/4 click)
            </button>
            <button
              onClick={() => setTurretUnit('mil')}
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.78rem',
                fontWeight: 600,
                background: turretUnit === 'mil' ? 'var(--accent)' : 'transparent',
                color: turretUnit === 'mil' ? '#000' : 'var(--text-muted)',
              }}
            >
              MIL (0.1 click)
            </button>
          </div>
          <button
            className="btn-secondary"
            onClick={handleRecalculate}
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem' }}
          >
            <TrendingUp size={14} /> Recalculate
          </button>
          <button
            className="btn-secondary"
            onClick={() => setIsDopeModalOpen(true)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.82rem',
              background: 'rgba(56, 189, 248, 0.12)',
              borderColor: 'rgba(56, 189, 248, 0.35)',
              color: '#38bdf8',
            }}
          >
            <Printer size={14} /> DOPE Card Studio
          </button>
          <button
            className="btn-secondary"
            onClick={() => setShowReticleSim(!showReticleSim)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.82rem',
              background: showReticleSim ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              borderColor: showReticleSim ? '#22c55e' : 'var(--border-light)',
              color: showReticleSim ? '#22c55e' : 'var(--text-primary)',
            }}
          >
            <Crosshair size={14} /> Reticle Holdover HUD
          </button>
        </div>
      )}

      {/* Interactive Reticle Holdover Simulator HUD */}
      {selectedProfile && showReticleSim && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(2, 6, 23, 0.98))',
            border: '1px solid rgba(56, 189, 248, 0.35)',
            borderRadius: '16px',
            padding: '1.5rem',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ScopeIcon size={20} color="#38bdf8" />
              <div>
                <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.1rem' }}>
                  Reticle Holdover Simulator ({turretUnit.toUpperCase()})
                </h3>
                <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.8rem' }}>
                  Real-time trajectory drop and crosswind deflection projected onto a tactical optic
                  reticle
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Range:</span>
              <span
                style={{
                  fontSize: '1.1rem',
                  fontWeight: 'bold',
                  color: '#38bdf8',
                  minWidth: '60px',
                }}
              >
                {simDistance} yds
              </span>
            </div>
          </div>

          {/* Interactive Sliders */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: '1rem',
              marginBottom: '1.5rem',
            }}
          >
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.8rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}
              >
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Distance</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#38bdf8' }}>
                  {simDistance} Yards
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={maxRange}
                step={25}
                value={simDistance}
                onChange={(e) => setSimDistance(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8' }}
              />
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '0.8rem 1rem',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
              }}
            >
              <div
                style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}
              >
                <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Crosswind (Full 90° Value)
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fbbf24' }}>
                  {simWindMph} MPH
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={30}
                step={1}
                value={simWindMph}
                onChange={(e) => setSimWindMph(Number(e.target.value))}
                style={{ width: '100%', accentColor: '#fbbf24' }}
              />
            </div>
          </div>

          {/* Reticle Canvas + Telemetry Cards Grid */}
          <div
            style={{
              display: 'flex',
              gap: '2rem',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* SVG Tactical Reticle */}
            <div
              style={{
                width: '320px',
                height: '320px',
                borderRadius: '50%',
                background: '#020617',
                border: '3px solid #334155',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8), 0 0 25px rgba(56, 189, 248, 0.2)',
              }}
            >
              <svg width="320" height="320" viewBox="0 0 320 320">
                {/* Outer Field of View Ring */}
                <circle cx="160" cy="160" r="156" fill="none" stroke="#1e293b" strokeWidth="2" />
                <circle cx="160" cy="160" r="150" fill="none" stroke="#0f172a" strokeWidth="1" />

                {/* Primary Crosshair Lines */}
                <line x1="160" y1="10" x2="160" y2="310" stroke="#334155" strokeWidth="1.5" />
                <line x1="10" y1="160" x2="310" y2="160" stroke="#334155" strokeWidth="1.5" />

                {/* Center Aim Point Dot */}
                <circle cx="160" cy="160" r="2.5" fill="#38bdf8" />

                {/* Subtension Hash Marks (1 to 10 scale) */}
                {[-8, -6, -4, -2, 2, 4, 6, 8].map((unit) => {
                  const y = 160 + unit * 14;
                  return (
                    <g key={`y-${unit}`}>
                      <line x1="152" y1={y} x2="168" y2={y} stroke="#475569" strokeWidth="1" />
                      <text x="172" y={y + 3} fill="#64748b" fontSize="8" fontFamily="monospace">
                        {Math.abs(unit)}
                      </text>
                    </g>
                  );
                })}
                {[-8, -6, -4, -2, 2, 4, 6, 8].map((unit) => {
                  const x = 160 + unit * 14;
                  return (
                    <g key={`x-${unit}`}>
                      <line x1={x} y1="152" x2={x} y2="168" stroke="#475569" strokeWidth="1" />
                      {unit !== 0 && (
                        <text
                          x={x}
                          y="178"
                          fill="#64748b"
                          fontSize="8"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          {Math.abs(unit)}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Bullet Impact Holdover Point (Dynamic Calculated) */}
                {(() => {
                  if (!simSolution) return null;
                  const dropVal = turretUnit === 'moa' ? simSolution.dropMOA : simSolution.dropMIL;
                  const driftVal =
                    turretUnit === 'moa' ? simSolution.windDriftMOA : simSolution.windDriftMIL;
                  const impactY = Math.min(305, Math.max(15, 160 + dropVal * 14));
                  const impactX = Math.min(305, Math.max(15, 160 + driftVal * 14));

                  return (
                    <g>
                      <line
                        x1="160"
                        y1="160"
                        x2={impactX}
                        y2={impactY}
                        stroke="rgba(239, 68, 68, 0.4)"
                        strokeWidth="1.5"
                        strokeDasharray="3,3"
                      />
                      <circle
                        cx={impactX}
                        cy={impactY}
                        r="7"
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth="1.5"
                      />
                      <circle cx={impactX} cy={impactY} r="3" fill="#ef4444" />
                      <line
                        x1={impactX - 10}
                        y1={impactY}
                        x2={impactX + 10}
                        y2={impactY}
                        stroke="#ef4444"
                        strokeWidth="1"
                      />
                      <line
                        x1={impactX}
                        y1={impactY - 10}
                        x2={impactX}
                        y2={impactY + 10}
                        stroke="#ef4444"
                        strokeWidth="1"
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Tactical Dial Telemetry Card */}
            {simSolution &&
              (() => {
                const dropVal = turretUnit === 'moa' ? simSolution.dropMOA : simSolution.dropMIL;
                const driftVal =
                  turretUnit === 'moa' ? simSolution.windDriftMOA : simSolution.windDriftMIL;
                const elevClicks =
                  turretUnit === 'moa' ? Math.round(dropVal * 4) : Math.round(dropVal * 10);
                const windClicks =
                  turretUnit === 'moa' ? Math.round(driftVal * 4) : Math.round(driftVal * 10);

                return (
                  <div
                    style={{
                      flex: 1,
                      minWidth: '280px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.75rem',
                    }}
                  >
                    <div
                      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}
                    >
                      <div
                        style={{
                          background: 'rgba(56, 189, 248, 0.1)',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                          borderRadius: '10px',
                          padding: '0.8rem',
                        }}
                      >
                        <div style={{ color: '#38bdf8', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          ▲ ELEVATION HOLD
                        </div>
                        <div
                          style={{
                            color: '#fff',
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            margin: '2px 0',
                          }}
                        >
                          +{dropVal.toFixed(1)} {turretUnit.toUpperCase()}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                          Dial {elevClicks} Clicks UP ({simSolution.drop.toFixed(1)}" Drop)
                        </div>
                      </div>

                      <div
                        style={{
                          background: 'rgba(251, 191, 36, 0.1)',
                          border: '1px solid rgba(251, 191, 36, 0.3)',
                          borderRadius: '10px',
                          padding: '0.8rem',
                        }}
                      >
                        <div style={{ color: '#fbbf24', fontSize: '0.75rem', fontWeight: 'bold' }}>
                          ► WIND DEFLECTION
                        </div>
                        <div
                          style={{
                            color: '#fff',
                            fontSize: '1.25rem',
                            fontWeight: 'bold',
                            fontFamily: 'monospace',
                            margin: '2px 0',
                          }}
                        >
                          {driftVal.toFixed(1)} {turretUnit.toUpperCase()}
                        </div>
                        <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
                          Hold {windClicks} Clicks RIGHT ({simSolution.windDrift.toFixed(1)}" Drift)
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '0.5rem',
                        background: 'rgba(0,0,0,0.3)',
                        padding: '0.75rem',
                        borderRadius: '10px',
                        border: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>TERMINAL VEL</div>
                        <div
                          style={{
                            color: '#f8fafc',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {simSolution.velocity} fps
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>ENERGY</div>
                        <div
                          style={{
                            color: '#f8fafc',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {simSolution.energy} ft-lbs
                        </div>
                      </div>
                      <div>
                        <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>FLIGHT TIME</div>
                        <div
                          style={{
                            color: '#f8fafc',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            fontFamily: 'monospace',
                          }}
                        >
                          {simSolution.timeOfFlight} s
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
          </div>
        </div>
      )}

      {/* Profile Quick Stats */}
      {selectedProfile && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          {[
            {
              icon: <Zap size={16} />,
              label: 'Muzzle Velocity',
              value: `${selectedProfile.muzzleVelocity} fps`,
            },
            {
              icon: <Hash size={16} />,
              label: 'Bullet Weight',
              value: `${selectedProfile.bulletWeight} gr`,
            },
            {
              icon: <Activity size={16} />,
              label: 'BC',
              value: `${selectedProfile.ballisticCoefficient} (${selectedProfile.dragModel})`,
            },
            {
              icon: <Target size={16} />,
              label: 'Zero Range',
              value: `${selectedProfile.zeroRange} yds`,
            },
            {
              icon: <Gauge size={16} />,
              label: 'Sight Height',
              value: `${selectedProfile.sightHeight}"`,
            },
            {
              icon: <Wind size={16} />,
              label: 'Wind',
              value: `${selectedProfile.windSpeed || 0} mph @ ${selectedProfile.windAngle || 90}°`,
            },
            {
              icon: <Thermometer size={16} />,
              label: 'Temp',
              value: `${selectedProfile.temperature || 59}°F`,
            },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem',
              }}
            >
              <div
                style={{
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: '0.75rem',
                }}
              >
                {stat.icon} {stat.label}
              </div>
              <div
                style={{
                  color: 'var(--text-primary)',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  fontFamily: 'monospace',
                }}
              >
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Trajectory Table */}
      {solutions.length > 0 && (
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
                    'Range (yds)',
                    `Drop (${turretUnit.toUpperCase()})`,
                    'Turret Clicks',
                    'Drop (in)',
                    `Drift (${turretUnit.toUpperCase()})`,
                    'Drift (in)',
                    'Velocity (fps)',
                    'Energy (ft-lbs)',
                    'TOF (s)',
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '0.65rem 0.75rem',
                        textAlign: 'center',
                        color: 'var(--text-muted)',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        letterSpacing: '0.03em',
                        borderBottom: '1px solid var(--border-light)',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {solutions.map((s, i) => {
                  const isZero = s.range === selectedProfile?.zeroRange;
                  const clicks =
                    turretUnit === 'moa' ? Math.round(s.dropMOA * 4) : Math.round(s.dropMIL * 10);
                  return (
                    <tr
                      key={i}
                      style={{
                        background: isZero
                          ? 'rgba(52,211,153,0.08)'
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
                          fontWeight: isZero ? 700 : 500,
                          color: isZero ? 'var(--accent)' : 'var(--text-primary)',
                          fontFamily: 'monospace',
                        }}
                      >
                        {s.range}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          fontWeight: 600,
                          color: s.drop > 0 ? '#4ade80' : '#f87171',
                        }}
                      >
                        {turretUnit === 'moa' ? s.dropMOA : s.dropMIL}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          color: 'var(--accent)',
                          fontWeight: 700,
                        }}
                      >
                        {clicks > 0 ? `+${clicks}` : clicks}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {s.drop}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          color: '#60a5fa',
                        }}
                      >
                        {turretUnit === 'moa' ? s.windDriftMOA : s.windDriftMIL}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {s.windDrift}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {s.velocity}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {s.energy}
                      </td>
                      <td
                        style={{
                          padding: '0.5rem 0.75rem',
                          textAlign: 'center',
                          fontFamily: 'monospace',
                          color: 'var(--text-muted)',
                        }}
                      >
                        {s.timeOfFlight}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Profile Modal */}
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
                maxWidth: '620px',
                maxHeight: '85vh',
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
                  New Ballistic Profile
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

              {/* Quick Preset Selector inside modal */}
              <div
                style={{
                  marginBottom: '1.25rem',
                  padding: '0.75rem',
                  background: 'rgba(52, 211, 153, 0.08)',
                  border: '1px solid rgba(52, 211, 153, 0.25)',
                  borderRadius: '10px',
                }}
              >
                <label
                  style={{
                    display: 'block',
                    color: 'var(--accent)',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  Auto-Fill from Common Caliber Library:
                </label>
                <select
                  className="glass-input"
                  onChange={(e) => {
                    const p = COMMON_CALIBER_PRESETS.find((x) => x.name === e.target.value);
                    if (p) handleApplyPreset(p);
                  }}
                  defaultValue=""
                >
                  <option value="" disabled>
                    -- Select a Factory Caliber Preset --
                  </option>
                  {['Rifle', 'Handgun', 'Rimfire', 'Shotgun'].map((cat) => (
                    <optgroup key={cat} label={`── ${cat} ──`}>
                      {COMMON_CALIBER_PRESETS.filter((p) => p.category === cat).map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.name} ({p.muzzleVelocity} fps • BC {p.ballisticCoefficient})
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              {/* Chrono & Optics Auto-Fill integration */}
              {(chronoStrings.length > 0 || opticsList.length > 0) && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.75rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  {chronoStrings.length > 0 && (
                    <div
                      style={{
                        padding: '0.65rem',
                        background: 'rgba(96, 165, 250, 0.08)',
                        border: '1px solid rgba(96, 165, 250, 0.25)',
                        borderRadius: '10px',
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          color: '#60a5fa',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Import Chrono Velocity:
                      </label>
                      <select
                        className="glass-input"
                        onChange={(e) => {
                          const idx = Number(e.target.value);
                          const c = chronoStrings[idx];
                          if (c) {
                            const avgVel =
                              c.averageVelocity ||
                              c.average_velocity ||
                              (c.shotVelocities
                                ? Math.round(
                                    c.shotVelocities.reduce((a: any, b: any) => a + b, 0) /
                                      c.shotVelocities.length
                                  )
                                : null);
                            if (avgVel) {
                              setForm((prev) => ({
                                ...prev,
                                muzzleVelocity: avgVel,
                                name: prev.name || c.ammoLabel || 'Chrono Load',
                              }));
                            }
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          -- Pick Shot String --
                        </option>
                        {chronoStrings.map((c, idx) => (
                          <option key={idx} value={idx}>
                            {c.ammoLabel || `String #${idx + 1}`} (
                            {c.averageVelocity || c.average_velocity} fps)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {opticsList.length > 0 && (
                    <div
                      style={{
                        padding: '0.65rem',
                        background: 'rgba(56, 189, 248, 0.08)',
                        border: '1px solid rgba(56, 189, 248, 0.25)',
                        borderRadius: '10px',
                      }}
                    >
                      <label
                        style={{
                          display: 'block',
                          color: '#38bdf8',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          marginBottom: 4,
                        }}
                      >
                        Link Mounted Optic:
                      </label>
                      <select
                        className="glass-input"
                        onChange={(e) => {
                          const o = opticsList.find((opt) => opt.id === e.target.value);
                          if (o) {
                            setSelectedOpticId(o.id);
                            const cv = (o.clickValue || '').toUpperCase();
                            if (cv.includes('MRAD') || cv.includes('MIL')) {
                              setTurretUnit('mil');
                            } else {
                              setTurretUnit('moa');
                            }
                            setForm((prev) => ({
                              ...prev,
                              zeroRange: o.zeroDistance || prev.zeroRange || 100,
                              sightHeight: 1.5,
                            }));
                          }
                        }}
                        defaultValue=""
                      >
                        <option value="" disabled>
                          -- Select Optic Profile --
                        </option>
                        {opticsList.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name || `${o.manufacturer} ${o.model}`} ({o.clickValue})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                {[
                  { label: 'Profile Name', key: 'name', type: 'text', span: 2 },
                  { label: 'Caliber', key: 'caliber', type: 'text' },
                  { label: 'Drag Model', key: 'dragModel', type: 'select', options: ['G1', 'G7'] },
                  { label: 'Bullet Weight (gr)', key: 'bulletWeight', type: 'number' },
                  {
                    label: 'Ballistic Coefficient',
                    key: 'ballisticCoefficient',
                    type: 'number',
                    step: '0.001',
                  },
                  { label: 'Muzzle Velocity (fps)', key: 'muzzleVelocity', type: 'number' },
                  { label: 'Zero Range (yds)', key: 'zeroRange', type: 'number' },
                  { label: 'Sight Height (in)', key: 'sightHeight', type: 'number', step: '0.1' },
                  { label: 'Wind Speed (mph)', key: 'windSpeed', type: 'number' },
                  { label: 'Wind Angle (°)', key: 'windAngle', type: 'number' },
                  { label: 'Temperature (°F)', key: 'temperature', type: 'number' },
                  { label: 'Altitude (ft)', key: 'altitude', type: 'number' },
                ].map((field) => (
                  <div
                    key={field.key}
                    style={{ gridColumn: (field as any).span === 2 ? 'span 2' : undefined }}
                  >
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
                    {field.type === 'select' ? (
                      <select
                        className="glass-input"
                        value={(form as any)[field.key] || ''}
                        onChange={(e) => setForm((f) => ({ ...f, [field.key]: e.target.value }))}
                      >
                        {field.options?.map((o) => (
                          <option key={o} value={o}>
                            {o}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        className="glass-input"
                        type={field.type}
                        step={(field as any).step}
                        value={(form as any)[field.key] ?? ''}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            [field.key]:
                              field.type === 'number' ? Number(e.target.value) : e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                ))}
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
                <button className="btn-primary" onClick={handleSaveProfile}>
                  Save Profile
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

      {/* DOPE Card Studio Modal */}
      {isDopeModalOpen &&
        selectedProfile &&
        createPortal(
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1rem',
            }}
          >
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-light)',
                borderRadius: '16px',
                padding: '1.5rem',
                width: '100%',
                maxWidth: '640px',
                maxHeight: '90vh',
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Printer size={20} color="#38bdf8" />
                  <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.15rem' }}>
                    DOPE Card Studio — {selectedProfile.name}
                  </h2>
                </div>
                <button
                  onClick={() => setIsDopeModalOpen(false)}
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

              <p
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.84rem',
                  marginTop: 0,
                  marginBottom: '1.25rem',
                }}
              >
                Select physical card format tailored for long-range field engagement, sniper stocks,
                or quarterback wrist sleeves.
              </p>

              {/* Format Cards Selector */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1.5rem',
                }}
              >
                {[
                  {
                    type: 'stock',
                    title: 'Stock / Scope Cap',
                    desc: '2.5"×3.5" or circular cap for Butler Creek lids / buttstocks',
                    icon: (
                      <Target size={18} color={dopeCardType === 'stock' ? '#38bdf8' : '#94a3b8'} />
                    ),
                  },
                  {
                    type: 'armband',
                    title: 'Forearm Sleeve',
                    desc: 'Narrow 3-col format for quarterback wrist playbooks',
                    icon: (
                      <Layers
                        size={18}
                        color={dopeCardType === 'armband' ? '#38bdf8' : '#94a3b8'}
                      />
                    ),
                  },
                  {
                    type: 'standard',
                    title: 'Full Bench Sheet',
                    desc: 'Full trajectory sheet with energy, velocity, and flight time',
                    icon: (
                      <FileText
                        size={18}
                        color={dopeCardType === 'standard' ? '#38bdf8' : '#94a3b8'}
                      />
                    ),
                  },
                ].map((fmt) => (
                  <div
                    key={fmt.type}
                    onClick={() => setDopeCardType(fmt.type as any)}
                    style={{
                      padding: '0.85rem',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border:
                        dopeCardType === fmt.type
                          ? '2px solid #38bdf8'
                          : '1px solid var(--border-light)',
                      background:
                        dopeCardType === fmt.type
                          ? 'rgba(56, 189, 248, 0.12)'
                          : 'rgba(255, 255, 255, 0.02)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: 4 }}
                    >
                      {fmt.icon}
                      <span
                        style={{
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          color: dopeCardType === fmt.type ? '#38bdf8' : 'var(--text-primary)',
                        }}
                      >
                        {fmt.title}
                      </span>
                    </div>
                    <div
                      style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: 1.3 }}
                    >
                      {fmt.desc}
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview Box */}
              <div
                style={{
                  background: '#f8fafc',
                  color: '#0f172a',
                  borderRadius: '8px',
                  padding: '1rem',
                  marginBottom: '1.25rem',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  border: '2px dashed #94a3b8',
                  maxHeight: '220px',
                  overflow: 'auto',
                }}
              >
                <div
                  style={{
                    fontWeight: 'bold',
                    textAlign: 'center',
                    borderBottom: '1px solid #cbd5e1',
                    paddingBottom: 4,
                    marginBottom: 6,
                  }}
                >
                  PRINT PREVIEW: {dopeCardType.toUpperCase()} FORMAT
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '0.75rem',
                    marginBottom: 4,
                  }}
                >
                  <span>
                    {selectedProfile.name} • {selectedProfile.caliber}
                  </span>
                  <span>
                    MV {selectedProfile.muzzleVelocity} fps | {turretUnit.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.75rem', color: '#475569', marginBottom: 8 }}>
                  Zero: {selectedProfile.zeroRange}y | Wind: {selectedProfile.windSpeed || 10}mph
                  full value
                </div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
                    gap: '4px',
                  }}
                >
                  {solutions.slice(0, 8).map((s) => (
                    <div
                      key={s.range}
                      style={{
                        background: '#e2e8f0',
                        padding: '3px 6px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                      }}
                    >
                      <strong>{s.range}y:</strong> +{turretUnit === 'moa' ? s.dropMOA : s.dropMIL} (
                      {turretUnit === 'moa'
                        ? Math.round(s.dropMOA * 4)
                        : Math.round(s.dropMIL * 10)}
                      c)
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button className="btn-secondary" onClick={() => setIsDopeModalOpen(false)}>
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    handlePrintDopeCard(dopeCardType);
                    setIsDopeModalOpen(false);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Printer size={15} /> Print{' '}
                  {dopeCardType === 'stock'
                    ? 'Stock Card'
                    : dopeCardType === 'armband'
                      ? 'Armband Sleeve'
                      : 'DOPE Sheet'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
