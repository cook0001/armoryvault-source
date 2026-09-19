import React from 'react';
import { Zap } from 'lucide-react';
import { Accessory } from '@/types';

interface LightFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const LightFormSection: React.FC<LightFormSectionProps> = ({ formData, setFormData }) => {
  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          <Zap size={18} className="text-warning" />
          <h4 className="form-section-title">Weapon Light & Laser Specifications</h4>
        </div>
        <span className="form-section-desc">Lumens, candela beam intensity & battery standard</span>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Light Category / Form Factor</label>
          <select
            className="form-input"
            value={formData.lightType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, lightType: e.target.value }))}
          >
            <option value="">Select Category...</option>
            <option value="Weapon Mounted Light (Long Gun / Scout)">
              Weapon Mounted Light (Long Gun / Scout)
            </option>
            <option value="Handgun Weapon Light (Pistol)">Handgun Weapon Light (Pistol)</option>
            <option value="Sub-Compact / Concealed Carry Light">
              Sub-Compact / Concealed Carry Light
            </option>
            <option value="Laser Aiming Module (LAM / IR Device)">
              Laser Aiming Module (LAM / IR Device)
            </option>
            <option value="Helmet / Utility Light">Helmet / Utility Light</option>
            <option value="Handheld Tactical Flashlight">Handheld Tactical Flashlight</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Light Output (Lumens)</label>
          <input
            type="number"
            min="0"
            className="form-input"
            value={formData.lumens === undefined ? '' : formData.lumens}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                lumens: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              }))
            }
            placeholder="e.g. 1000, 1500, 500"
          />
        </div>

        <div className="form-group">
          <label>Peak Beam Intensity (Candela)</label>
          <input
            type="number"
            min="0"
            className="form-input"
            value={formData.candela === undefined ? '' : formData.candela}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                candela: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              }))
            }
            placeholder="e.g. 50000, 100000"
          />
        </div>
      </div>

      <div className="form-grid-4col">
        <div className="form-group">
          <label>Beam Distance (Meters)</label>
          <input
            type="number"
            min="0"
            className="form-input"
            value={formData.beamDistanceMeters === undefined ? '' : formData.beamDistanceMeters}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                beamDistanceMeters: e.target.value === '' ? undefined : parseInt(e.target.value, 10),
              }))
            }
            placeholder="e.g. 250m"
          />
        </div>

        <div className="form-group">
          <label>Laser / Aiming Module</label>
          <select
            className="form-input"
            value={formData.laserType || 'None'}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                laserType: e.target.value as 'None' | 'Red' | 'Green' | 'IR' | 'Dual (Visible+IR)',
              }))
            }
          >
            <option value="None">None (Light Only)</option>
            <option value="Red">Visible Red Laser</option>
            <option value="Green">Visible Green Laser</option>
            <option value="IR">Infrared (IR) Illuminator & Laser</option>
            <option value="Dual (Visible+IR)">Dual (Visible Green/Red + IR)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Battery Chemistry / Standard</label>
          <select
            className="form-input"
            value={formData.batteryType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, batteryType: e.target.value }))}
          >
            <option value="">Select Battery...</option>
            <option value="CR123A Lithium (x1)">CR123A Lithium (x1)</option>
            <option value="CR123A Lithium (x2)">CR123A Lithium (x2)</option>
            <option value="18650 High-Drain Rechargeable">18650 Rechargeable</option>
            <option value="18350 Compact Rechargeable">18350 Compact Rechargeable</option>
            <option value="AAA / AA Alkaline/Lithium">AAA / AA Standard</option>
            <option value="Integrated USB-C Li-Po Battery">Integrated USB-C Li-Po</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Runtime (Hours)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            className="form-input"
            value={formData.runTimeHours === undefined ? '' : formData.runTimeHours}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                runTimeHours: e.target.value === '' ? undefined : parseFloat(e.target.value),
              }))
            }
            placeholder="e.g. 1.5, 2.0"
          />
        </div>
      </div>
    </div>
  );
};
