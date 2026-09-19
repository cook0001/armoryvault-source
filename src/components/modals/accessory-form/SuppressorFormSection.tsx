import React from 'react';
import { SuppressorIcon } from '@/components/CustomIcons';
import { Accessory } from '@/types';

interface SuppressorFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const SuppressorFormSection: React.FC<SuppressorFormSectionProps> = ({
  formData,
  setFormData,
}) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <SuppressorIcon size={18} color="var(--accent)" />
          <h4 className="form-section-title">Suppressor & Silencer Specifications</h4>
        </div>
        <span className="form-section-desc">Caliber rating, thread mounting interface & materials</span>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Rated Calibers / Max Caliber</label>
          <input
            type="text"
            className="form-input"
            value={formData.ratedCalibers || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, ratedCalibers: e.target.value }))}
            placeholder="e.g. Up to .300 Win Mag, 5.56 NATO, 9mm Luger, .45 ACP"
          />
        </div>

        <div className="form-group">
          <label>Thread Pitch / Mounting Interface</label>
          <select
            className="form-input"
            value={formData.threadPitch || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, threadPitch: e.target.value }))}
          >
            <option value="">Select Thread Interface...</option>
            <option value='1/2"-28 UNEF (Standard 5.56 / 9mm / .22 LR)'>
              1/2"-28 UNEF (Standard 5.56 / 9mm / .22 LR)
            </option>
            <option value='5/8"-24 UNEF (Standard .308 / 300 BLK / 6.5 CM)'>
              5/8"-24 UNEF (Standard .308 / 300 BLK / 6.5 CM)
            </option>
            <option value="Dead Air KeyMo Quick Detach">Dead Air KeyMo Quick Detach</option>
            <option value="Plan B / Rearden / Q Cherry Bomb Taper">Plan B / Rearden Taper</option>
            <option value="SilencerCo ASR Mount">SilencerCo ASR Mount</option>
            <option value="HK 3-Lug (9mm Tri-Lug QD)">HK 3-Lug (9mm Tri-Lug QD)</option>
            <option value='.578"-28 (.45 ACP Pistol Thread)'>.578"-28 (.45 ACP Pistol)</option>
            <option value="M13.5x1 LH (European 9mm Metric)">M13.5x1 LH (European 9mm Metric)</option>
            <option value="Direct Hub 1.375x24 Bravo Adapter">Hub 1.375x24 Bravo / Universal</option>
            <option value="Direct Thread Fixed">Direct Thread Fixed</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Sound Suppression (dB Rating)</label>
          <input
            type="number"
            min="50"
            max="180"
            className="form-input"
            value={formData.decibelRating === undefined ? '' : formData.decibelRating}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                decibelRating: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              }))
            }
            placeholder="e.g. 132 dB"
          />
        </div>

        <div className="form-group">
          <label>Baffle & Tube Construction</label>
          <select
            className="form-input"
            value={formData.baffleMaterial || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, baffleMaterial: e.target.value }))}
          >
            <option value="">Select Material...</option>
            <option value="Grade 5 Titanium (Ti-6Al-4V)">Grade 5 Titanium (Ti-6Al-4V)</option>
            <option value="Inconel 718 Superalloy (High Temp)">Inconel 718 Superalloy</option>
            <option value="17-4 PH Stainless Steel (Heat Treated)">17-4 PH Stainless Steel</option>
            <option value="Stellite / Cobalt-6 Baffle Stack">Stellite / Cobalt-6 Baffle Stack</option>
            <option value="7075-T6 Hardcoat Anodized Aluminum (.22 LR)">7075-T6 Aluminum (Rimfire)</option>
            <option value="Hybrid (Titanium Tube / Inconel Blast Baffle)">Hybrid Titanium / Inconel</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-checkbox-row">
            <input
              type="checkbox"
              checked={!!formData.isFullAutoRated}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isFullAutoRated: e.target.checked }))
              }
            />
            <span>Full-Auto Duty Rated</span>
          </label>
        </div>
      </div>
    </div>
  );
};
