import React from 'react';
import { TacticalSlingIcon } from '@/components/CustomIcons';
import { Accessory } from '@/types';

interface SlingFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const SlingFormSection: React.FC<SlingFormSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <TacticalSlingIcon size={18} color="var(--accent)" />
          <h4 className="form-section-title">Tactical Sling & Carry Hardware</h4>
        </div>
        <span className="form-section-desc">Attachment swivels, configuration & padding</span>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Sling Configuration</label>
          <select
            className="form-input"
            value={formData.slingPoints || '2-Point'}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                slingPoints: e.target.value as '1-Point' | '2-Point' | '1-to-2 Point Convertible' | '3-Point',
              }))
            }
          >
            <option value="2-Point">2-Point Quick Adjust (Vickers / Slingster / MS1)</option>
            <option value="1-to-2 Point Convertible">1-to-2 Point Convertible (Magpul MS3/MS4)</option>
            <option value="1-Point">1-Point Bungee Sling</option>
            <option value="3-Point">3-Point Tactical Sling</option>
            <option value="Traditional Hunter Carry">Traditional Hunter Carry Strap</option>
          </select>
        </div>

        <div className="form-group">
          <label>Attachment Hardware</label>
          <select
            className="form-input"
            value={formData.attachmentHardware || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, attachmentHardware: e.target.value }))}
          >
            <option value="">Select Hardware...</option>
            <option value="Heavy-Duty Push-Button QD Swivels (Flush Cup)">
              Push-Button QD Swivels (Flush Cup)
            </option>
            <option value="Magpul Paraclip / QDM Swivels">Magpul Paraclip / QDM</option>
            <option value="HK Snap Hooks / Clash Hooks">HK Snap Hooks / Clash Hooks</option>
            <option value="Traditional Uncle Mike's Swivel Studs (1-1/4 in)">
              Traditional Swivel Studs
            </option>
            <option value="Direct Webbing Loop Threading">Direct Webbing Loop Threading</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-checkbox-row">
            <input
              type="checkbox"
              checked={!!formData.isPadded}
              onChange={(e) => setFormData((prev) => ({ ...prev, isPadded: e.target.checked }))}
            />
            <span>Padded Shoulder Section</span>
          </label>
        </div>
      </div>
    </div>
  );
};
