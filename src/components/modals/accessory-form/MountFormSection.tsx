import React from 'react';
import { PicatinnyMountIcon } from '@/components/CustomIcons';
import { Accessory } from '@/types';

interface MountFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const MountFormSection: React.FC<MountFormSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <PicatinnyMountIcon size={18} color="var(--accent)" />
          <h4 className="form-section-title">Mounting Platform & Hardware</h4>
        </div>
        <span className="form-section-desc">Optic rings, cantilevers, risers & rail adapters</span>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Mount Subtype</label>
          <select
            className="form-input"
            value={formData.mountType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, mountType: e.target.value }))}
          >
            <option value="">Select Subtype...</option>
            <option value="One-Piece Cantilever Scope Mount">One-Piece Cantilever Scope Mount</option>
            <option value="Precision Scope Rings (Pair)">Precision Scope Rings (Pair)</option>
            <option value="Micro Red Dot Riser / High Mount">Micro Red Dot Riser / High Mount</option>
            <option value="Offset 45° Backup Sight / Optic Mount">Offset 45° Backup Mount</option>
            <option value="M-LOK to Picatinny Adapter Section">M-LOK to Picatinny Rail Section</option>
            <option value="Arca-Swiss Precision Tripod Rail">Arca-Swiss Tripod Adapter</option>
            <option value="QD Weapon Light / Laser Mount">QD Weapon Light / Laser Mount</option>
            <option value="T/C Contender / Encore Scope Base">T/C Contender / Encore Scope Base</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Rail Interface Standard</label>
          <select
            className="form-input"
            value={formData.railInterface || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, railInterface: e.target.value }))}
          >
            <option value="">Select Interface...</option>
            <option value="MIL-STD-1913 Picatinny Rail">MIL-STD-1913 Picatinny Rail</option>
            <option value="M-LOK Direct Attachment">M-LOK Direct Attachment</option>
            <option value="Arca-Swiss 38mm Dovetail">Arca-Swiss 38mm Dovetail</option>
            <option value="Weaver Cross-Slot">Weaver Cross-Slot</option>
            <option value="KeyMod Modular Interface">KeyMod Interface</option>
            <option value="Direct Receiver Tap & Screw">Direct Receiver Tap & Screw</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Ring Diameter / Clamping Size</label>
          <select
            className="form-input"
            value={formData.ringDiameter || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, ringDiameter: e.target.value }))}
          >
            <option value="">Select Ring Diameter...</option>
            <option value="30 mm">30 mm</option>
            <option value="34 mm">34 mm</option>
            <option value='1 Inch / 25.4 mm'>1 Inch / 25.4 mm</option>
            <option value="35 mm">35 mm</option>
            <option value="N/A (Direct Plate / Non-Ring Mount)">N/A (Direct Plate / Non-Ring)</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Mount Height / Optical Centerline</label>
          <select
            className="form-input"
            value={formData.mountHeight || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, mountHeight: e.target.value }))}
          >
            <option value="">Select Height...</option>
            <option value='Absolute Co-Witness (1.41" / 36mm)'>Absolute Co-Witness (1.41" / 36mm)</option>
            <option value='Lower 1/3 Co-Witness (1.57" / 40mm)'>Lower 1/3 Co-Witness (1.57" / 40mm)</option>
            <option value='1.93" Tall High-Rise Mount'>1.93" High-Rise Mount</option>
            <option value='2.04" - 2.26" Unity FAST Height'>2.04" - 2.26" Unity FAST Height</option>
            <option value='Low Hunting Scope Height (0.85" - 0.95")'>Low Hunting Scope Rings</option>
            <option value='Medium Scope Height (1.00" - 1.15")'>Medium Scope Rings</option>
            <option value='High Scope Height (1.25" - 1.40")'>High Scope Rings</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
};
