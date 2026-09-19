import React from 'react';
import { StockIcon, ChassisIcon } from '@/components/CustomIcons';
import { AutocompleteInput } from '@/components/AutocompleteInput';
import { Accessory } from '@/types';

interface StockChassisFormSectionProps {
  formData: Partial<Accessory>;
  setFormData: React.Dispatch<React.SetStateAction<Partial<Accessory>>>;
}

export const StockChassisFormSection: React.FC<StockChassisFormSectionProps> = ({
  formData,
  setFormData,
}) => {
  const isChassis = formData.type === 'Chassis';

  return (
    <div className="form-section-card">
      <div className="form-section-header">
        <div className="form-section-title-wrap">
          {isChassis ? (
            <ChassisIcon size={18} color="var(--accent)" />
          ) : (
            <StockIcon size={18} color="var(--accent)" />
          )}
          <h4 className="form-section-title">
            {isChassis ? 'Precision Chassis Specifications' : 'Stock & Furniture Specifications'}
          </h4>
        </div>
        <span className="form-section-desc">
          {isChassis
            ? 'V-block bedding, action inlet & competition ergonomics'
            : 'Buttstock, forend spacing, grip adapters & materials'}
        </span>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Furniture / Stock Subtype</label>
          <select
            className="form-input"
            value={formData.stockType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, stockType: e.target.value }))}
          >
            <option value="">Select Subtype...</option>
            <option value="Precision Rifle Chassis">
              Precision Rifle Chassis (MDT, KRG, MPA)
            </option>
            <option value="T/C Rifle Buttstock">
              T/C Rifle Buttstock (Encore / Pro Hunter / Contender)
            </option>
            <option value="T/C Pistol Grip / Adapter">
              T/C Pistol Grip / 1913 Adapter (Pachmayr / Sharps Bros)
            </option>
            <option value="T/C Forend (Pistol / Rifle)">
              T/C Forend (10" Bull, Super 14", Heavy Rifle)
            </option>
            <option value="Adjustable Carbine Stock">
              Adjustable Carbine Stock (CTR, B5 Bravo, SOPMOD)
            </option>
            <option value="Precision PRS / DMR Stock">
              Precision PRS / DMR Stock (PRS Gen3, SRS)
            </option>
            <option value="Pistol Stabilizing Brace">
              Pistol Stabilizing Brace (SBA3, SBA4, Tailhook)
            </option>
            <option value="1913 Picatinny Folding Stock">
              1913 Picatinny Folding Stock (SIG Minimalist, MI)
            </option>
            <option value="Traditional / Hunting Stock">
              Traditional / Hunting Stock (McMillan, Manners, Boyd's)
            </option>
            <option value="Shotgun Stock / Adapter">
              Shotgun Stock / Adapter (Magpul SGA)
            </option>
            <option value="Fixed Rifle (A2)">Fixed Rifle (A2 Standard)</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>Action Inlet / Platform Fits</label>
          <AutocompleteInput
            name="actionInlet"
            value={formData.actionInlet || formData.supportedModels || ''}
            onChange={(e) => {
              const val = e.target.value;
              setFormData((prev) => ({ ...prev, actionInlet: val, supportedModels: val }));
            }}
            options={[
              'Thompson/Center Encore / Pro Hunter / Endeavor',
              'Thompson/Center Contender (G1 / Armor Alloy)',
              'Thompson/Center G2 Contender / SSK-50',
              'Remington 700 Short Action',
              'Remington 700 Long Action',
              'Tikka T3 / T3x',
              'Savage 10 / 110 (Short Action)',
              'Savage 110 (Long Action)',
              'Howa 1500 / Weatherby Vanguard',
              'Ruger American (Short Action)',
              'Ruger 10/22',
              'AR-15 / M4 / M16',
              'AR-10 / SR-25 / DPMS .308',
              'Mossberg 500 / 590',
              'Remington 870',
              'AK-47 / AKM (Stamped Trunnion)',
              'SIG MCX / MPX / 1913 Rail',
            ]}
            placeholder="e.g. T/C Encore, Rem 700 SA, AR-15"
          />
        </div>
      </div>

      <div className="form-grid-2col">
        <div className="form-group">
          <label>Mounting Interface / Buffer Standard</label>
          <select
            className="form-input"
            value={formData.bufferTubeType || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, bufferTubeType: e.target.value }))}
          >
            <option value="">Select Interface...</option>
            <option value='Mil-Spec Buffer Tube (1.14" OD)'>
              Mil-Spec Buffer Tube (1.14" OD)
            </option>
            <option value='Commercial Buffer Tube (1.17" OD)'>
              Commercial Buffer Tube (1.17" OD)
            </option>
            <option value="T/C Encore Frame Bolt Interface">
              T/C Encore Frame Bolt Interface
            </option>
            <option value="T/C Contender (G1) Frame Interface">
              T/C Contender (G1) Frame Interface
            </option>
            <option value="T/C G2 / SSK-50 Frame Interface">
              T/C G2 / SSK-50 Frame Interface
            </option>
            <option value="Picatinny 1913 Rail Mount">
              Picatinny 1913 Rail Mount (Sharps / SIG)
            </option>
            <option value="Direct Action V-Block Bedding">
              Direct Action V-Block Bedding (Chassis)
            </option>
            <option value="A2 Fixed Rifle Extension">A2 Fixed Rifle Extension</option>
            <option value="AK Fixed/Folding Trunnion">AK Fixed/Folding Trunnion</option>
            <option value="Shotgun Receiver Adapter">Shotgun Receiver Adapter</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <label>T/C Forend Spacing / Contour</label>
          <select
            className="form-input"
            value={formData.tcForendSpacing || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, tcForendSpacing: e.target.value }))}
          >
            <option value="">N/A or Standard Forend</option>
            <option value="Single Screw (Pistol/Carbine)">Single Screw (Pistol/Carbine)</option>
            <option value="Double Screw (Standard Spacing)">Double Screw (Standard Spacing)</option>
            <option value="Double Screw (Wide Spacing)">Double Screw (Wide Spacing)</option>
            <option value="Heavy / Bull Barrel Contour">Heavy / Bull Barrel Contour</option>
            <option value="Tapered Standard Contour">Tapered Standard Contour</option>
            <option value="Free-Floating Hanger Bar">Free-Floating Hanger Bar (EABCO / Tony's)</option>
            <option value="Muzzleloader (w/ Ramrod Channel)">Muzzleloader (w/ Ramrod Channel)</option>
          </select>
        </div>
      </div>

      <div className="form-grid-3col">
        <div className="form-group">
          <label>Material &amp; Construction</label>
          <input
            type="text"
            className="form-input"
            value={formData.material || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, material: e.target.value }))}
            placeholder="e.g. 6061-T6 Billet Aluminum, Carbon Fiber, Walnut"
          />
        </div>

        <div className="form-group">
          <label>Component Weight</label>
          <input
            type="text"
            className="form-input"
            value={formData.weight || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, weight: e.target.value }))}
            placeholder="e.g. 3.8 lbs, 12.5 oz"
          />
        </div>

        <div className="form-group">
          <label className="form-checkbox-row">
            <input
              type="checkbox"
              checked={!!formData.isFolding}
              onChange={(e) => setFormData((prev) => ({ ...prev, isFolding: e.target.checked }))}
            />
            <span>Side-Folding Stock / Mechanism</span>
          </label>
        </div>
      </div>
    </div>
  );
};
