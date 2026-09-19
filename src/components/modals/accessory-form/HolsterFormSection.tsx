import React from 'react';
import { HolsterIcon } from '@/components/CustomIcons';
import { Accessory } from '@/types';

interface HolsterFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const HolsterFormSection: React.FC<HolsterFormSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <HolsterIcon size={18} color="var(--accent)" />
          <h4 className="form-section-title">Holster & Carry Rig Specifications</h4>
        </div>
        <span className="form-section-desc">Carry configuration, retention level & weapon attachments</span>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Supported Handgun Platform / Models</label>
          <input
            type="text"
            className="form-input"
            value={formData.supportedModels || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, supportedModels: e.target.value }))}
            placeholder="e.g. Glock 19/19X/45, SIG P365-XMacro, T/C Contender 10in"
          />
        </div>

        <div className="form-group">
          <label>Holster Carry Style</label>
          <select
            className="form-input"
            value={formData.holsterStyle || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, holsterStyle: e.target.value }))}
          >
            <option value="">Select Carry Style...</option>
            <option value="IWB (Inside the Waistband)">IWB (Inside the Waistband)</option>
            <option value="AIWB (Appendix Inside Waistband)">AIWB (Appendix Inside Waistband)</option>
            <option value="OWB Concealment (Pancake / Paddle)">OWB Concealment (Pancake / Paddle)</option>
            <option value="Western Buscadero Drop Holster">Western Buscadero Drop Holster</option>
            <option value="Western Straight / Cross Draw Holster">Western Straight / Cross Draw</option>
            <option value="Tactical Duty / Mid-Ride (Safariland)">Tactical Duty / Mid-Ride (Safariland)</option>
            <option value="Chest / Field Hunting Rig (Kenai / Denali)">Chest / Field Hunting Rig</option>
            <option value="Drop-Leg / Thigh Rig">Drop-Leg / Thigh Rig</option>
            <option value="Pocket Holster">Pocket Holster</option>
            <option value="Shoulder Holster Rig">Shoulder Holster Rig</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Handedness</label>
          <select
            className="form-input"
            value={formData.handedness || 'Right'}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                handedness: e.target.value as 'Right' | 'Left' | 'Ambidextrous',
              }))
            }
          >
            <option value="Right">Right Hand (Strong Side)</option>
            <option value="Left">Left Hand (Southpaw)</option>
            <option value="Ambidextrous">Ambidextrous / Dual Hand</option>
          </select>
        </div>

        <div className="form-group">
          <label>Retention Level</label>
          <select
            className="form-input"
            value={formData.retentionLevel || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, retentionLevel: e.target.value }))}
          >
            <option value="">Select Retention...</option>
            <option value="Level 1 (Passive Friction Only)">Level 1 (Passive Friction Only)</option>
            <option value="Level 2 (Active Mechanical - ALS / Thumb Break)">
              Level 2 (Active Mechanical - ALS / Hood)
            </option>
            <option value="Level 3 (Duty Dual Lock - SLS Hood + ALS)">
              Level 3 (Duty Dual Lock - SLS + ALS)
            </option>
            <option value="Level 4 (High Security Duty)">Level 4 (High Security Duty)</option>
            <option value="Western Hammer Thong / Leather Loop">
              Western Hammer Thong / Leather Loop
            </option>
          </select>
        </div>

        <div className="form-group">
          <label>Light Channel Compatibility</label>
          <select
            className="form-input"
            value={formData.lightCompatible || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, lightCompatible: e.target.value }))}
          >
            <option value="">None / Slick (No Light)</option>
            <option value="Streamlight TLR-7 / TLR-7A / TLR-7 Sub">Streamlight TLR-7 / TLR-7A</option>
            <option value="SureFire X300 Ultra / Turbo (A/B)">SureFire X300 Ultra / Turbo</option>
            <option value="Streamlight TLR-1 HL">Streamlight TLR-1 HL</option>
            <option value="Modlite PL350">Modlite PL350</option>
            <option value="Olight Valkyrie / Baldr">Olight Valkyrie / Baldr</option>
            <option value="Universal Light Bearing">Universal Light Bearing</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Belt Attachment / Interface</label>
          <select
            className="form-input"
            value={formData.beltAttachment || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, beltAttachment: e.target.value }))}
          >
            <option value="">Select Attachment...</option>
            <option value='1.5" Discreet Carry Concepts (DCC) Monoblock'>
              1.5" DCC Monoblock / Metal Clips
            </option>
            <option value='1.5" - 1.75" Polymer FOMI / Overhook Clips'>
              1.5" - 1.75" Polymer FOMI Clips
            </option>
            <option value="Safariland QLS Quick-Locking Fork">Safariland QLS Fork</option>
            <option value="Blade-Tech Tek-Lok / Duty Loop">Blade-Tech Tek-Lok</option>
            <option value="Integrated Leather Belt Loop / Tunnel">
              Integrated Leather Tunnel / Slotted Loop
            </option>
            <option value="Western Buscadero Drop Slot Hook">
              Western Buscadero Drop Slot
            </option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-checkbox-row">
            <input
              type="checkbox"
              checked={!!formData.isOpticCut}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isOpticCut: e.target.checked }))
              }
            />
            <span>Red Dot / Optic Cut Clearance</span>
          </label>
        </div>
      </div>
    </div>
  );
};
