import React from 'react';
import { Target } from 'lucide-react';
import { Accessory } from '@/types';

interface OpticFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const OpticFormSection: React.FC<OpticFormSectionProps> = ({ formData, setFormData }) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <Target size={16} className="text-accent" />
          <h4 className="form-section-title">Optical & Reticle Specifications</h4>
        </div>
        <span className="form-section-desc">Glass, focal plane, magnification & click values</span>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Optic Subtype</label>
          <select
            className="form-input"
            value={formData.opticSubtype || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, opticSubtype: e.target.value }))}
          >
            <option value="">Select Subtype...</option>
            <option value="LPVO (Low Power Variable Optic)">LPVO (Low Power Variable Optic)</option>
            <option value="Precision Rifle Scope">Precision Rifle Scope (High Magnification)</option>
            <option value="Red Dot Sight (Reflex / Enclosed)">Red Dot Sight (Reflex / Enclosed)</option>
            <option value="Holographic Weapon Sight">Holographic Weapon Sight (EOTech / Vortex)</option>
            <option value="Prism Scope">Prism Scope (Fixed 1x, 3x, 5x)</option>
            <option value="Micro Pistol Red Dot">Micro Pistol Red Dot (RMR / EPS / 507K)</option>
            <option value="Magnifier (Flip-to-Side)">Magnifier (Flip-to-Side 3x, 6x)</option>
            <option value="Thermal / Night Vision Scope">Thermal / Night Vision Scope</option>
            <option value="Shotgun / Turkey Bead Sight">Shotgun / Turkey Bead Sight</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Magnification / Reticle</label>
          <input
            type="text"
            className="form-input"
            value={formData.magnification || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, magnification: e.target.value }))}
            placeholder="e.g. 1-6x24, 5-25x56, 2 MOA Red Dot"
          />
        </div>

        <div className="form-group">
          <label>Objective Lens (mm)</label>
          <input
            type="number"
            min="1"
            max="100"
            className="form-input"
            value={formData.objectiveLensMm === undefined ? '' : formData.objectiveLensMm}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                objectiveLensMm: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              }))
            }
            placeholder="e.g. 24, 44, 50, 56"
          />
        </div>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Tube / Body Diameter</label>
          <select
            className="form-input"
            value={formData.tubeDiameter || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, tubeDiameter: e.target.value }))}
          >
            <option value="">Select Diameter...</option>
            <option value="30 mm (Standard Modern Scope)">30 mm (Standard Modern Scope)</option>
            <option value="34 mm (Precision / Long Range)">34 mm (Precision / Long Range)</option>
            <option value='1 Inch / 25.4 mm (Traditional)'>1 Inch / 25.4 mm (Traditional)</option>
            <option value="35 mm (Heavy Tactical)">35 mm (Heavy Tactical)</option>
            <option value="Micro Red Dot Footprint (Direct)">Micro Red Dot Footprint (Direct)</option>
            <option value="Picatinny Integrated Base">Picatinny Integrated Base</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Reticle Focal Plane</label>
          <select
            className="form-input"
            value={formData.reticleFocalPlane || 'N/A'}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                reticleFocalPlane: e.target.value as 'FFP' | 'SFP' | 'N/A',
              }))
            }
          >
            <option value="N/A">N/A (Red Dot / Holographic)</option>
            <option value="FFP">FFP (First Focal Plane - Scales with Zoom)</option>
            <option value="SFP">SFP (Second Focal Plane - Constant Size)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Turret Click Adjustment</label>
          <select
            className="form-input"
            value={formData.turretClickValue || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, turretClickValue: e.target.value }))}
          >
            <option value="">Select Click Value...</option>
            <option value="0.1 MRAD (1 cm @ 100m)">0.1 MRAD (1 cm @ 100m)</option>
            <option value='1/4 MOA (0.26" @ 100 yds)'>1/4 MOA (0.26" @ 100 yds)</option>
            <option value='1/2 MOA (0.52" @ 100 yds)'>1/2 MOA (0.52" @ 100 yds)</option>
            <option value='1/8 MOA (Benchrest)'>1/8 MOA (Benchrest)</option>
            <option value="1 MOA (Capped / Pistol Red Dot)">1 MOA (Capped / Pistol Red Dot)</option>
            <option value="Capped BDC Dial">Capped BDC Dial</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Mounting Footprint / Pattern</label>
          <select
            className="form-input"
            value={formData.mountingSystem || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, mountingSystem: e.target.value }))}
          >
            <option value="">Select Mounting Footprint...</option>
            <option value="MIL-STD-1913 Picatinny Rail">MIL-STD-1913 Picatinny Rail</option>
            <option value="Trijicon RMR / Holosun 407C/507C">Trijicon RMR / Holosun 407C/507C</option>
            <option value="Shield RMSc / Holosun K-Series (Modified)">Shield RMSc / Holosun K-Series</option>
            <option value="Aimpoint Micro (T1/T2 / H1/H2 Footprint)">Aimpoint Micro (T1/T2 / H1/H2)</option>
            <option value="Aimpoint ACRO Footprint">Aimpoint ACRO Footprint</option>
            <option value="Docter / Noblex Footprint">Docter / Noblex Footprint</option>
            <option value="Leupold DeltaPoint Pro (DPP)">Leupold DeltaPoint Pro (DPP)</option>
            <option value="C-More STS Footprint">C-More STS Footprint</option>
            <option value="Traditional Weaver Cross-Slot">Traditional Weaver Cross-Slot</option>
            <option value="T/C Integral Barrel Scope Base">T/C Integral Barrel Scope Base</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Standard Zero Distance (Yards)</label>
          <input
            type="number"
            min="0"
            step="5"
            className="form-input"
            value={formData.zeroDistanceYards === undefined ? '' : formData.zeroDistanceYards}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                zeroDistanceYards: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              }))
            }
            placeholder="e.g. 50 yds, 100 yds, 200 yds"
          />
        </div>
      </div>
    </div>
  );
};
