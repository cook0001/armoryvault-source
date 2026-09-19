import React from 'react';
import { GunBeltIcon } from '@/components/CustomIcons';
import { Accessory } from '@/types';

interface BeltFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const BeltFormSection: React.FC<BeltFormSectionProps> = ({ formData, setFormData }) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <GunBeltIcon size={18} color="var(--accent)" />
          <h4 className="form-section-title">Gun Belt &amp; Tactical Rig Specifications</h4>
        </div>
        <span className="form-section-desc">Western drop loops, cartridge loops, battle belts & stiffeners</span>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Belt Subtype / Rig Style</label>
          <select
            className="form-input"
            value={formData.beltType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, beltType: e.target.value }))}
          >
            <option value="">Select Subtype...</option>
            <option value="Western Buscadero Drop Belt (Single/Double)">
              Western Buscadero Drop Belt (Hunter 150/155, Triple K)
            </option>
            <option value="Straight Western Cartridge Belt">
              Straight Western Cartridge Belt (Hunter 158, Kirkpatrick)
            </option>
            <option value="Cross-Chest Bandolier / Cartridge Belt">
              Cross-Chest Bandolier / Ammo Belt (Triple K, Galco)
            </option>
            <option value="Folded Leather Money Belt / Prairie Belt">
              Folded Leather Money Belt / Prairie Belt (SASS / Frontier)
            </option>
            <option value="Two-Piece MOLLE Battle Belt">
              Two-Piece MOLLE Battle Belt (Blue Alpha, AWS, Ronin)
            </option>
            <option value="EDC Concealed Carry Ratchet Belt">
              EDC Concealed Carry Ratchet Belt (Kore, Nexbelt)
            </option>
            <option value="Low-Profile EDC Nylon Belt">
              Low-Profile EDC Nylon Belt (Tenicor Zero, Blue Alpha)
            </option>
            <option value="Reinforced Leather Gun Belt (Steel/Poly Core)">
              Reinforced Leather Gun Belt (Daltech Steel Core, Bigfoot)
            </option>
            <option value="Competition Rig (USPSA / IPSC / 3-Gun)">
              Competition Rig (DAA Lynx, Safariland ELS)
            </option>
            <option value="Duty / Law Enforcement Belt">
              Duty / Law Enforcement Belt (Safariland 7920, Bianchi)
            </option>
            <option value="Padded War Belt / Sleeve">
              Padded War Belt / Sleeve (HSGI, Viking Tactics)
            </option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Belt Width</label>
          <select
            className="form-input"
            value={formData.beltWidth || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, beltWidth: e.target.value }))}
          >
            <option value="">Select Width...</option>
            <option value='1.5" (Standard EDC / Concealed Carry)'>
              1.5" (Standard EDC / Concealed Carry)
            </option>
            <option value='1.75" (Tactical / Battle Belt / Riggers)'>
              1.75" (Tactical / Battle Belt / Riggers)
            </option>
            <option value='2.0" (Heavy Duty / Western Cartridge)'>
              2.0" (Heavy Duty / Western Cartridge)
            </option>
            <option value='2.25" (Standard Duty / Police / LE)'>
              2.25" (Standard Duty / Police / LE)
            </option>
            <option value='2.75" - 3.0" (Western Buscadero Drop Belt)'>
              2.75" - 3.0" (Western Buscadero Drop Belt)
            </option>
            <option value='1.25" (Dress / Low-Profile EDC)'>
              1.25" (Dress / Low-Profile EDC)
            </option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Western Drop Loop</label>
          <select
            className="form-input"
            value={formData.dropLoopType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, dropLoopType: e.target.value }))}
          >
            <option value="">N/A / Standard Straight</option>
            <option value="Single Drop (Right-Hand Strong Side)">
              Single Drop (Right-Hand Strong Side)
            </option>
            <option value="Single Drop (Left-Hand Strong Side)">
              Single Drop (Left-Hand Strong Side)
            </option>
            <option value="Double Drop (Dual Strong / Cross Draw)">
              Double Drop (Dual Strong / Cross Draw)
            </option>
            <option value="Straight Non-Drop / Standard Rise">
              Straight Non-Drop / Standard Rise
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Cartridge Loops (Caliber &amp; Count)</label>
          <div className="form-grid-2col">
            <select
              className="form-input"
              value={formData.cartridgeLoopCaliber || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, cartridgeLoopCaliber: e.target.value }))
              }
            >
              <option value="">None / Smooth Leather</option>
              <option value=".22 LR / .22 WMR">.22 LR / .22 WMR</option>
              <option value=".38 Special / .357 Magnum">.38 Special / .357 Magnum</option>
              <option value=".44 Special / .44 Magnum / .45 Colt">
                .44 Special / .44 Magnum / .45 Colt
              </option>
              <option value=".45-70 Government / Big Bore Rifle">
                .45-70 Government / Big Bore Rifle
              </option>
              <option value="12 Gauge / 20 Gauge Shotshells">
                12 Gauge / 20 Gauge Shotshells
              </option>
              <option value="Multi-Caliber / Elastic Loops">
                Multi-Caliber / Elastic Loops
              </option>
            </select>
            <input
              type="number"
              min="0"
              className="form-input"
              value={
                formData.cartridgeLoopCount === undefined ? '' : formData.cartridgeLoopCount
              }
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  cartridgeLoopCount:
                    e.target.value === '' ? undefined : parseInt(e.target.value, 10),
                }))
              }
              placeholder="Qty (e.g. 25)"
              title="Number of ammunition loops"
            />
          </div>
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Buckle Mechanism</label>
          <select
            className="form-input"
            value={formData.buckleType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, buckleType: e.target.value }))}
          >
            <option value="">Select Buckle...</option>
            <option value="AustriAlpin Cobra Quick-Release">
              AustriAlpin Cobra Quick-Release (Alloy/D-Ring)
            </option>
            <option value='Micro-Adjustable Ratchet / Track (1/4" Steps)'>
              Micro-Adjustable Ratchet / Track (1/4" Steps)
            </option>
            <option value="Classic Western Clipped-Corner / Nickel Buckle">
              Classic Western Clipped-Corner / Nickel Buckle
            </option>
            <option value="Classic Dual-Prong Roller Buckle">
              Classic Dual-Prong Roller Buckle
            </option>
            <option value="Single-Prong Solid Brass / Steel Buckle">
              Single-Prong Solid Brass / Steel Buckle
            </option>
            <option value="Low-Profile Friction / G-Hook">
              Low-Profile Friction / G-Hook
            </option>
            <option value="Modular Interlock Links (DAA Lynx)">
              Modular Interlock Links (DAA Lynx)
            </option>
            <option value="Hook-and-Loop Overlap">Hook-and-Loop Overlap</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Internal Stiffener Core</label>
          <select
            className="form-input"
            value={formData.stiffenerCore || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, stiffenerCore: e.target.value }))}
          >
            <option value="">Select Stiffener...</option>
            <option value="Tegris / Curv Thermoplastic Composite">
              Tegris / Curv Thermoplastic Composite
            </option>
            <option value="Reinforced Polymer (Power-Core / HDPE)">
              Reinforced Polymer (Power-Core / HDPE)
            </option>
            <option value="Dual-Layer Spring Steel Core">
              Dual-Layer Spring Steel Core
            </option>
            <option value="Double-Layer Heavy Saddle Leather">
              Double-Layer Heavy Saddle Leather
            </option>
            <option value="Double-Layer Scuba Webbing">Double-Layer Scuba Webbing</option>
            <option value="Multi-Layer Ballistic Nylon">Multi-Layer Ballistic Nylon</option>
            <option value="None / Flexible Unlined">None / Flexible Unlined</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Attachment System / Interface</label>
          <select
            className="form-input"
            value={formData.attachmentSystem || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, attachmentSystem: e.target.value }))}
          >
            <option value="">Select Attachment...</option>
            <option value="Integrated Western Drop Slot (Hunter 1060/1100/2200 Holsters)">
              Integrated Western Drop Slot (Hunter 1060/1100/2200)
            </option>
            <option value="Laser-Cut Micro-MOLLE / PALS Slots">
              Laser-Cut Micro-MOLLE / PALS Slots
            </option>
            <option value='Standard 1/2" Tactical MOLLE Webbing'>
              Standard 1/2" Tactical MOLLE Webbing
            </option>
            <option value="Safariland ELS / QLS Fork Mounting Plate">
              Safariland ELS / QLS Fork Mounting Plate
            </option>
            <option value='Direct Holster Clip / 1.5"-1.75" Loops'>
              Direct Holster Clip / 1.5"-1.75" Loops
            </option>
            <option value="Inner Loop / Hook Velcro (2-Piece)">
              Inner Loop / Hook Velcro (2-Piece)
            </option>
            <option value="Belt Keepers (4-Point Duty)">Belt Keepers (4-Point Duty)</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Waist Sizing Range</label>
          <input
            type="text"
            className="form-input"
            value={formData.waistSize || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, waistSize: e.target.value }))}
            placeholder='e.g. 32" - 36" (Size M), 40" - 44" (Western Hip)'
          />
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Inner Belt System</label>
          <select
            className="form-input"
            value={formData.innerBeltType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, innerBeltType: e.target.value }))}
          >
            <option value="">Select Inner Belt...</option>
            <option value='Loop Inner Belt (Standard 1.5" Loop Velcro)'>
              Loop Inner Belt (Standard 1.5" Loop)
            </option>
            <option value="Hook Inner Belt (Outer has Loop)">
              Hook Inner Belt (Outer has Loop)
            </option>
            <option value="Low-Profile EDC / G-Hook Inner Belt">
              Low-Profile EDC / G-Hook Inner
            </option>
            <option value="Padded Non-Slip Neoprene Grip Pad">
              Padded Non-Slip Neoprene Grip Pad
            </option>
            <option value="Not Applicable / Single-Belt System">
              Not Applicable / Single-Belt System
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Color / Pattern / Tooling</label>
          <input
            type="text"
            className="form-input"
            value={formData.colorPattern || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, colorPattern: e.target.value }))}
            placeholder="e.g. Chestnut Brown Leather, Antique Floral Tooled, Multicam"
          />
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Material &amp; Construction</label>
          <input
            type="text"
            className="form-input"
            value={formData.material || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
            placeholder="e.g. Full-Grain Saddle Leather, 1000D Cordura + Tegris"
          />
        </div>

        <div className="form-group">
          <label>Component Weight</label>
          <input
            type="text"
            className="form-input"
            value={formData.weight || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
            placeholder="e.g. 18.5 oz, 11.2 oz"
          />
        </div>
      </div>
    </div>
  );
};
