import { BookOpen, Download, UploadCloud } from 'lucide-react';
import React from 'react';
import { exportToCSV } from '@/utils/csvExport';

interface ReportsSettingsSectionProps {
  onOpenCsvImport: () => void;
}

export const ReportsSettingsSection: React.FC<ReportsSettingsSectionProps> = ({
  onOpenCsvImport,
}) => {
  const handleGenerateReport = async () => {
    if (window.api && window.api.generateInsuranceReport) {
      try {
        const firearms = await window.api.getFirearms();
        const accessories = await window.api.getAccessories();
        const totalValue =
          firearms.reduce((sum, f) => sum + (Number(f.purchase_price) || 0), 0) +
          accessories.reduce(
            (sum, a) => sum + (Number(a.value) || 0) * (Number(a.quantity) || 1),
            0
          );

        const reportPath = await window.api.generateInsuranceReport({
          firearms,
          accessories,
          totalValue,
        });

        if (reportPath) {
          alert(`Report generated successfully at:\n${reportPath}`);
        }
      } catch (e) {
        console.error('Failed to generate report', e);
        alert('An error occurred while generating the report.');
      }
    }
  };

  const handleExportCSV = async () => {
    if (window.api && window.api.getFirearms && window.api.exportData) {
      try {
        const firearms = await window.api.getFirearms();
        const csvString = exportToCSV(firearms);
        await window.api.exportData(csvString, 'firearms_inventory.csv');
      } catch (e) {
        console.error('Failed to export CSV', e);
        alert('An error occurred while exporting CSV.');
      }
    }
  };

  return (
    <div className="settings-section-card">
      <div className="settings-section-header">
        <BookOpen size={18} className="settings-section-icon" />
        <h3 className="settings-section-title">Insurance & Reports</h3>
      </div>
      <p className="settings-section-desc">
        Generate comprehensive documentation of your firearms and accessories for insurance or recordkeeping.
      </p>
      <div className="settings-action-grid">
        <button
          type="button"
          className="btn-secondary settings-btn-inner"
          onClick={handleGenerateReport}
        >
          <BookOpen size={16} />
          <span>Insurance Report (PDF)</span>
        </button>
        <button
          type="button"
          className="btn-secondary settings-btn-inner"
          onClick={handleExportCSV}
        >
          <Download size={16} />
          <span>Export Firearms (CSV)</span>
        </button>
        <button
          type="button"
          className="btn-primary settings-btn-inner"
          onClick={onOpenCsvImport}
        >
          <UploadCloud size={16} />
          <span>Import Data (CSV)</span>
        </button>
      </div>
    </div>
  );
};
