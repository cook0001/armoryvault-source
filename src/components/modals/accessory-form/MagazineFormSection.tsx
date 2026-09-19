import React from 'react';
import { MagazineIcon } from '@/components/CustomIcons';
import { Accessory } from '@/types';

interface MagazineFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const MagazineFormSection: React.FC<MagazineFormSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <MagazineIcon size={18} color="var(--accent)" />
          <h4 className="form-section-title">Magazine & Feed Device Specifications</h4>
        </div>
        <span className="form-section-desc">Capacity, caliber, body material & follower design</span>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Caliber / Chambering</label>
          <input
            type="text"
            className="form-input"
            value={formData.caliber || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, caliber: e.target.value }))}
            placeholder="e.g. 5.56x45mm NATO, 9x19mm Luger, .308 Win"
          />
        </div>

        <div className="form-group">
          <label>Capacity (Rounds)</label>
          <input
            type="number"
            min="1"
            className="form-input"
            value={formData.capacity === undefined ? '' : formData.capacity}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                capacity: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              }))
            }
            placeholder="e.g. 30, 20, 17, 15, 10"
          />
        </div>

        <div className="form-group">
          <label>Body Material</label>
          <select
            className="form-input"
            value={formData.bodyMaterial || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, bodyMaterial: e.target.value }))}
          >
            <option value="">Select Material...</option>
            <option value="Impact Resistant Polymer (PMAG)">Polymer (PMAG / Lancer Body)</option>
            <option value="Stamped Heat-Treated Steel (Duramag / Surplus)">
              Stamped Steel (Duramag / Surplus)
            </option>
            <option value="T6 Heat-Treated Aluminum (USGI Standard)">
              T6 Aluminum (USGI Standard)
            </option>
            <option value="Translucent Smoked Polymer (ETS / Lancer)">Translucent Polymer</option>
            <option value="Polymer with Steel Feed Lips (Hybrid)">Hybrid Polymer / Steel Lips</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Feed Geometry / Style</label>
          <select
            className="form-input"
            value={formData.feedStyle || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, feedStyle: e.target.value }))}
          >
            <option value="">Select Feed Geometry...</option>
            <option value="Double Stack / Double Feed (Rifle / AR-15 / AK-47)">
              Double Stack / Double Feed (Rifle / AR-15 / AK)
            </option>
            <option value="Double Stack / Single Feed (Pistol / Glock / Sig)">
              Double Stack / Single Feed (Pistol Standard)
            </option>
            <option value="Single Stack (1911 / Slimline)">Single Stack (1911 / Slimline)</option>
            <option value="Rotary Magazine (Ruger 10/22)">Rotary Magazine (Ruger 10/22)</option>
            <option value="Drum Magazine (High Capacity)">Drum Magazine</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Follower Type & Color</label>
          <select
            className="form-input"
            value={formData.followerColor || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, followerColor: e.target.value }))}
          >
            <option value="">Select Follower...</option>
            <option value="High-Visibility Orange (Anti-Tilt)">High-Visibility Orange (Anti-Tilt)</option>
            <option value="High-Visibility Yellow (Anti-Tilt)">High-Visibility Yellow (Anti-Tilt)</option>
            <option value="Foliage Green (USGI Enhanced Anti-Tilt)">Foliage Green (USGI Enhanced)</option>
            <option value="Standard Black">Standard Black</option>
            <option value="Gray / Tan (Magpul Gen M3)">Gray / Tan (Magpul Gen M3)</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>
    </div>
  );
};
