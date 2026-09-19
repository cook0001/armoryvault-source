import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  RefreshCw,
  UploadCloud,
  X,
} from 'lucide-react';
import React, { useCallback, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  autoMapHeaders,
  ColumnMapping,
  CsvEntityType,
  detectDelimiter,
  detectEntityType,
  ParsedCsvData,
  parseRawCsv,
  resolveAmmoDuplicates,
  resolveFirearmsDuplicates,
  transformAccessoryRows,
  transformAmmoRows,
  transformComponentRows,
  transformFirearmsRows,
} from '@/utils/csvImport';
import { formatCurrency } from '@/utils/currency';

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete?: () => void;
  initialEntityType?: CsvEntityType;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  initialEntityType = 'firearms',
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [entityType, setEntityType] = useState<CsvEntityType>(initialEntityType);
  const [fileName, setFileName] = useState<string>('');
  const [csvRawText, setCsvRawText] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedCsvData | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [duplicateMode, setDuplicateMode] = useState<'skip' | 'update' | 'import_all'>('skip');

  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState<{
    inserted: number;
    updated: number;
    skipped: number;
  } | null>(null);

  const resetState = useCallback(() => {
    setStep(1);
    setFileName('');
    setCsvRawText('');
    setParsedData(null);
    setMappings([]);
    setDuplicateMode('skip');
    setIsProcessing(false);
    setImportResult(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const processCsvText = useCallback((text: string, name: string) => {
    setFileName(name);
    setCsvRawText(text);
    const parsed = parseRawCsv(text);
    setParsedData(parsed);

    const detected = detectEntityType(parsed.headers);
    setEntityType(detected);

    const initialMappings = autoMapHeaders(parsed.headers, detected);
    setMappings(initialMappings);
    setStep(2);
  }, []);

  const handleFileSelect = async () => {
    if (window.api && window.api.selectCSVFile) {
      const fileData = await window.api.selectCSVFile();
      if (fileData && fileData.content) {
        processCsvText(fileData.content, fileData.name);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        processCsvText(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (text) {
        processCsvText(text, file.name);
      }
    };
    reader.readAsText(file);
  };

  const handleEntityTypeChange = (type: CsvEntityType) => {
    setEntityType(type);
    if (parsedData) {
      const updatedMappings = autoMapHeaders(parsedData.headers, type);
      setMappings(updatedMappings);
    }
  };

  const handleMappingChange = (csvHeader: string, targetField: string) => {
    setMappings((prev) => prev.map((m) => (m.csvHeader === csvHeader ? { ...m, targetField } : m)));
  };

  // Target field options depending on entity type
  const targetFieldOptions = useMemo(() => {
    switch (entityType) {
      case 'firearms':
        return [
          { key: '', label: '— Skip this column —' },
          { key: 'make', label: 'Make / Manufacturer (Required)' },
          { key: 'model', label: 'Model (Required)' },
          { key: 'serial_number', label: 'Serial Number' },
          { key: 'caliber', label: 'Caliber / Gauge' },
          { key: 'firearm_type', label: 'Firearm Type (Pistol, Rifle, etc.)' },
          { key: 'action_type', label: 'Action Type (Semi-Auto, Bolt, etc.)' },
          { key: 'barrel_length', label: 'Barrel Length' },
          { key: 'finish', label: 'Finish / Color' },
          { key: 'condition', label: 'Condition' },
          { key: 'purchase_date', label: 'Purchase / Acquisition Date' },
          { key: 'purchase_price', label: 'Purchase Price / Cost' },
          { key: 'purchased_from', label: 'Purchased From / Dealer / FFL' },
          { key: 'notes', label: 'Notes / Description' },
          { key: 'round_count', label: 'Rounds Fired' },
          { key: 'is_sold', label: 'Is Sold / Disposed (Status)' },
          { key: 'sold_date', label: 'Disposition Date' },
          { key: 'sold_price', label: 'Sale Price' },
          { key: 'sold_to_name', label: 'Disposition To / Buyer' },
          { key: 'is_nfa', label: 'Is NFA Item' },
          { key: 'nfa_type', label: 'NFA Type (SBR, Suppressor, etc.)' },
        ];
      case 'ammo':
        return [
          { key: '', label: '— Skip this column —' },
          { key: 'caliber', label: 'Caliber / Gauge' },
          { key: 'manufacturer', label: 'Manufacturer / Brand' },
          { key: 'type', label: 'Ammo Type (factory / handload)' },
          { key: 'name', label: 'Product Name / Line' },
          { key: 'bullet_type', label: 'Bullet Type (FMJ, HP, etc.)' },
          { key: 'bullet_manufacturer', label: 'Bullet Manufacturer' },
          { key: 'grain_weight', label: 'Grain Weight' },
          { key: 'quantity', label: 'Total Round Count' },
          { key: 'powder', label: 'Powder / Propellant' },
          { key: 'powderCharge', label: 'Powder Charge (grains)' },
          { key: 'primer', label: 'Primer' },
          { key: 'primer_type', label: 'Primer Type / Pocket' },
          { key: 'brass', label: 'Brass / Case' },
          { key: 'oal', label: 'Overall Length (COAL)' },
          { key: 'rounds_per_box', label: 'Rounds Per Box' },
          { key: 'box_price', label: 'Box Price' },
          { key: 'cost_per_round', label: 'Cost Per Round' },
          { key: 'location', label: 'Storage Location' },
          { key: 'lot_number', label: 'Lot / Batch Number' },
          { key: 'notes', label: 'Notes' },
        ];
      case 'components':
        return [
          { key: '', label: '— Skip this column —' },
          { key: 'type', label: 'Component Type (Powder, Primer, Bullet, Brass)' },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'model', label: 'Model / Name' },
          { key: 'caliber', label: 'Caliber / Size' },
          { key: 'quantity', label: 'Quantity / Weight' },
          { key: 'unit', label: 'Unit (grains, lbs, pcs)' },
          { key: 'cost', label: 'Cost / Value' },
          { key: 'location', label: 'Storage Location' },
          { key: 'lot_number', label: 'Lot / Batch Number' },
          { key: 'notes', label: 'Notes' },
        ];
      case 'accessories':
        return [
          { key: '', label: '— Skip this column —' },
          { key: 'name', label: 'Accessory Name' },
          { key: 'type', label: 'Type (Optic, Light, Holster, Suppressor, etc.)' },
          { key: 'manufacturer', label: 'Manufacturer' },
          { key: 'model', label: 'Model' },
          { key: 'serial_number', label: 'Serial Number' },
          { key: 'value', label: 'Value / Purchase Price' },
          { key: 'condition', label: 'Condition' },
          { key: 'location', label: 'Storage Location' },
          { key: 'notes', label: 'Notes' },
        ];
      default:
        return [];
    }
  }, [entityType]);

  // Transformed preview records
  const previewResult = useMemo(() => {
    if (!parsedData) return null;
    const sampleRows = parsedData.rawRows.slice(0, 5);
    if (entityType === 'firearms') {
      return transformFirearmsRows(sampleRows, mappings);
    } else if (entityType === 'ammo') {
      return transformAmmoRows(sampleRows, mappings);
    } else if (entityType === 'components') {
      return transformComponentRows(sampleRows, mappings);
    } else if (entityType === 'accessories') {
      return transformAccessoryRows(sampleRows, mappings);
    }
    return null;
  }, [parsedData, mappings, entityType]);

  // Execute the Batch Import
  const handleExecuteImport = async () => {
    if (!parsedData || !window.api) return;
    setIsProcessing(true);

    try {
      if (entityType === 'firearms') {
        const fullTransform = transformFirearmsRows(parsedData.rawRows, mappings);
        const existing = await window.api.getFirearms();
        const plan = resolveFirearmsDuplicates(fullTransform.valid, existing, duplicateMode);

        if (window.api.importFirearmsBatch) {
          const res = await window.api.importFirearmsBatch(plan.toInsert, plan.toUpdate);
          setImportResult({
            inserted: res.insertedCount,
            updated: res.updatedCount,
            skipped: plan.skippedCount,
          });
        } else {
          // Fallback if IPC batch not available
          let inserted = 0;
          for (const f of plan.toInsert) {
            await window.api.addFirearm(f);
            inserted++;
          }
          for (const u of plan.toUpdate) {
            await window.api.updateFirearm(u.existingId, u.updatedItem as any);
          }
          setImportResult({
            inserted,
            updated: plan.toUpdate.length,
            skipped: plan.skippedCount,
          });
        }
      } else if (entityType === 'ammo') {
        const fullTransform = transformAmmoRows(parsedData.rawRows, mappings);
        const existing = await window.api.getAmmo();
        const plan = resolveAmmoDuplicates(fullTransform.valid, existing, duplicateMode);

        if (window.api.importAmmoBatch) {
          const res = await window.api.importAmmoBatch(plan.toInsert, plan.toUpdate);
          setImportResult({
            inserted: res.insertedCount,
            updated: res.updatedCount,
            skipped: plan.skippedCount,
          });
        } else {
          let inserted = 0;
          for (const a of plan.toInsert) {
            await window.api.addAmmo(a);
            inserted++;
          }
          for (const u of plan.toUpdate) {
            await window.api.updateAmmo(u.existingId, u.updatedItem as any);
          }
          setImportResult({
            inserted,
            updated: plan.toUpdate.length,
            skipped: plan.skippedCount,
          });
        }
      } else if (entityType === 'components') {
        const fullTransform = transformComponentRows(parsedData.rawRows, mappings);
        if (window.api.importComponentsBatch) {
          const res = await window.api.importComponentsBatch(fullTransform.valid);
          setImportResult({
            inserted: res.insertedCount,
            updated: 0,
            skipped: 0,
          });
        } else {
          let inserted = 0;
          for (const c of fullTransform.valid) {
            await window.api.addComponent(c);
            inserted++;
          }
          setImportResult({ inserted, updated: 0, skipped: 0 });
        }
      } else if (entityType === 'accessories') {
        const fullTransform = transformAccessoryRows(parsedData.rawRows, mappings);
        if (window.api.importAccessoriesBatch) {
          const res = await window.api.importAccessoriesBatch(fullTransform.valid);
          setImportResult({
            inserted: res.insertedCount,
            updated: 0,
            skipped: 0,
          });
        } else {
          let inserted = 0;
          for (const acc of fullTransform.valid) {
            await window.api.addAccessory(acc);
            inserted++;
          }
          setImportResult({ inserted, updated: 0, skipped: 0 });
        }
      }

      setStep(3);
      if (onImportComplete) onImportComplete();
      window.dispatchEvent(new Event('armoryvault-reload'));
    } catch (err: any) {
      console.error('Import execution error:', err);
      alert(`Import failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="modal-overlay"
      onClick={handleClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: step === 2 ? '900px' : '680px',
          width: '92%',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--card-bg)',
          border: '1px solid var(--border-light)',
          borderRadius: '16px',
          padding: '1.5rem',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          overflowY: 'auto',
          transition: 'max-width 0.25s ease',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '1.25rem',
            borderBottom: '1px solid var(--border-light)',
            paddingBottom: '0.85rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <FileSpreadsheet className="text-accent" size={24} style={{ color: 'var(--accent)' }} />
            <div>
              <h2 style={{ margin: 0, padding: 0, fontSize: '1.35rem', fontWeight: 600 }}>
                Import Inventory from CSV
              </h2>
              <p
                style={{
                  margin: '0.15rem 0 0',
                  color: 'var(--text-secondary)',
                  fontSize: '0.82rem',
                }}
              >
                Migrate firearms, ammo, and gear from GunSafe, GunLog, MyGunDB, or custom
                spreadsheets.
              </p>
            </div>
          </div>
          <button className="btn-icon" onClick={handleClose} title="Close Import">
            <X size={18} />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            marginBottom: '1.5rem',
            fontSize: '0.85rem',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: step >= 1 ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: step === 1 ? 600 : 400,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: step >= 1 ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                color: step >= 1 ? '#000' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              1
            </span>
            Upload File
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: step >= 2 ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: step === 2 ? 600 : 400,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: step >= 2 ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                color: step >= 2 ? '#000' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              2
            </span>
            Map Columns & Preview
          </div>
          <ChevronRight size={14} style={{ color: 'var(--text-secondary)' }} />
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              color: step === 3 ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: step === 3 ? 600 : 400,
            }}
          >
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '22px',
                height: '22px',
                borderRadius: '50%',
                background: step === 3 ? 'var(--accent)' : 'rgba(255,255,255,0.1)',
                color: step === 3 ? '#000' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: 700,
              }}
            >
              3
            </span>
            Complete
          </div>
        </div>

        {/* STEP 1: Upload / Drop File */}
        {step === 1 && (
          <div>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              style={{
                border: '2px dashed var(--border-light)',
                borderRadius: '12px',
                padding: '2.5rem 1.5rem',
                textAlign: 'center',
                background: 'rgba(255, 255, 255, 0.015)',
                cursor: 'pointer',
                marginBottom: '1.25rem',
                transition: 'border-color 0.2s ease',
              }}
              onClick={handleFileSelect}
            >
              <UploadCloud size={44} style={{ color: 'var(--accent)', margin: '0 auto 0.75rem' }} />
              <h3 style={{ margin: '0 0 0.4rem', fontSize: '1.1rem', fontWeight: 600 }}>
                Drop your CSV or TSV file here
              </h3>
              <p
                style={{ margin: '0 0 1rem', color: 'var(--text-secondary)', fontSize: '0.85rem' }}
              >
                Supports standard CSV, TSV, JSON, and LoadBench Handload Cards (.avr, .loadbench, .ldb).
              </p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
                <button
                  className="btn-primary"
                  type="button"
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleFileSelect();
                  }}
                >
                  <FileText size={16} /> Browse File...
                </button>
                <label
                  className="btn-secondary"
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  Choose From Disk
                  <input
                    type="file"
                    accept=".csv,.tsv,.txt,.json,.avr,.loadbench,.ldb"
                    onChange={handleFileInputChange}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            </div>

            <div
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid var(--border-light)',
                borderRadius: '10px',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  marginBottom: '0.4rem',
                }}
              >
                <HelpCircle size={15} style={{ color: 'var(--accent)' }} />
                Supported Competitor Exports & Formats
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: '1.25rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '0.35rem',
                }}
              >
                <li>GunSafe exports (.csv)</li>
                <li>GunLog / GunLogPro exports</li>
                <li>MyGunDB database exports</li>
                <li>ATF Bound Book / FFL records</li>
                <li>ArmoryVault native CSV exports</li>
                <li>Excel / Google Sheets CSV & TSV</li>
              </ul>
            </div>
          </div>
        )}

        {/* STEP 2: Column Mapping & Preview */}
        {step === 2 && parsedData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Header info bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '0.75rem',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '0.75rem 1rem',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div>
                <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{fileName}</span>
                <span
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    marginLeft: '0.5rem',
                  }}
                >
                  ({parsedData.rows.length} rows &bull; {parsedData.headers.length} columns &bull;{' '}
                  {parsedData.delimiter === '\t'
                    ? 'Tab'
                    : parsedData.delimiter === ';'
                      ? 'Semicolon'
                      : 'Comma'}{' '}
                  Delimited)
                </span>
              </div>

              {/* Entity Type Switcher */}
              <div style={{ display: 'flex', gap: '0.35rem' }}>
                {(['firearms', 'ammo', 'components', 'accessories'] as CsvEntityType[]).map(
                  (type) => (
                    <button
                      key={type}
                      type="button"
                      className={entityType === type ? 'btn-primary' : 'btn-secondary'}
                      onClick={() => handleEntityTypeChange(type)}
                      style={{
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        textTransform: 'capitalize',
                      }}
                    >
                      {type === 'components' ? 'Reloading' : type}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Column Mapping Grid */}
            <div
              style={{
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid var(--border-light)',
                borderRadius: '8px',
                padding: '1rem',
                maxHeight: '220px',
                overflowY: 'auto',
              }}
            >
              <h4 style={{ margin: '0 0 0.75rem', fontSize: '0.9rem', fontWeight: 600 }}>
                Column Mapping (CSV Header &rarr; ArmoryVault Field)
              </h4>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '0.65rem',
                }}
              >
                {mappings.map((m) => (
                  <div
                    key={m.csvHeader}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: '0.82rem',
                    }}
                  >
                    <span
                      style={{
                        flex: '1',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: m.targetField ? 'var(--text-primary)' : 'var(--text-secondary)',
                      }}
                      title={m.csvHeader}
                    >
                      {m.csvHeader}
                    </span>
                    <span style={{ color: 'var(--text-secondary)' }}>&rarr;</span>
                    <select
                      value={m.targetField}
                      onChange={(e) => handleMappingChange(m.csvHeader, e.target.value)}
                      style={{
                        flex: '1.2',
                        padding: '0.35rem 0.5rem',
                        background: m.targetField ? 'rgba(59, 130, 246, 0.1)' : 'rgba(0,0,0,0.3)',
                        borderColor: m.targetField ? 'var(--accent)' : 'var(--border-light)',
                        borderRadius: '6px',
                        color: 'var(--text-primary)',
                        fontSize: '0.8rem',
                      }}
                    >
                      {targetFieldOptions.map((opt) => (
                        <option key={opt.key} value={opt.key}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Duplicate Strategy */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                padding: '0.75rem 1rem',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '8px',
                border: '1px solid var(--border-light)',
                fontSize: '0.85rem',
              }}
            >
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                Duplicate Policy:
              </span>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="dupMode"
                  checked={duplicateMode === 'skip'}
                  onChange={() => setDuplicateMode('skip')}
                />
                Skip existing
              </label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="dupMode"
                  checked={duplicateMode === 'update'}
                  onChange={() => setDuplicateMode('update')}
                />
                Update matching records
              </label>
              <label
                style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}
              >
                <input
                  type="radio"
                  name="dupMode"
                  checked={duplicateMode === 'import_all'}
                  onChange={() => setDuplicateMode('import_all')}
                />
                Import all as new
              </label>
            </div>

            {/* Live Preview of first 5 rows */}
            <div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '0.5rem',
                }}
              >
                <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600 }}>
                  Live Preview (First {Math.min(5, parsedData.rows.length)} of{' '}
                  {parsedData.rows.length} rows)
                </h4>
                {previewResult && previewResult.errors.length > 0 && (
                  <span
                    style={{
                      color: '#f87171',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                    }}
                  >
                    <AlertCircle size={14} /> {previewResult.errors.length} row(s) missing required
                    fields
                  </span>
                )}
              </div>

              <div
                style={{
                  overflowX: 'auto',
                  border: '1px solid var(--border-light)',
                  borderRadius: '8px',
                  background: 'rgba(0,0,0,0.25)',
                }}
              >
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead>
                    <tr style={{ background: 'rgba(255,255,255,0.04)', textAlign: 'left' }}>
                      <th
                        style={{
                          padding: '0.5rem 0.75rem',
                          borderBottom: '1px solid var(--border-light)',
                        }}
                      >
                        #
                      </th>
                      {entityType === 'firearms' && (
                        <>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Make
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Model
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Serial #
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Caliber
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Price
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Status
                          </th>
                        </>
                      )}
                      {entityType === 'ammo' && (
                        <>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Caliber
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Manufacturer
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Grain
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Rounds
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Box Price
                          </th>
                        </>
                      )}
                      {entityType === 'components' && (
                        <>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Type
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Manufacturer
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Model
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Qty / Units
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Cost
                          </th>
                        </>
                      )}
                      {entityType === 'accessories' && (
                        <>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Name
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Category
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Manufacturer
                          </th>
                          <th
                            style={{
                              padding: '0.5rem 0.75rem',
                              borderBottom: '1px solid var(--border-light)',
                            }}
                          >
                            Value
                          </th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewResult?.valid.map((item: any, idx: number) => (
                      <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '0.45rem 0.75rem', color: 'var(--text-secondary)' }}>
                          {idx + 1}
                        </td>
                        {entityType === 'firearms' && (
                          <>
                            <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600 }}>
                              {item.make}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>{item.model}</td>
                            <td style={{ padding: '0.45rem 0.75rem', fontFamily: 'monospace' }}>
                              {item.serial_number || '—'}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>{item.caliber || '—'}</td>
                            <td style={{ padding: '0.45rem 0.75rem', color: '#34d399' }}>
                              {item.purchase_price ? formatCurrency(item.purchase_price) : '—'}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>
                              {item.is_sold ? (
                                <span style={{ color: '#f87171' }}>Sold</span>
                              ) : (
                                <span style={{ color: '#34d399' }}>Available</span>
                              )}
                            </td>
                          </>
                        )}
                        {entityType === 'ammo' && (
                          <>
                            <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600 }}>
                              {item.caliber}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>{item.manufacturer}</td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>
                              {item.grain_weight ? `${item.grain_weight} gr` : '—'}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>{item.quantity}</td>
                            <td style={{ padding: '0.45rem 0.75rem', color: '#34d399' }}>
                              {item.box_price ? formatCurrency(item.box_price) : '—'}
                            </td>
                          </>
                        )}
                        {entityType === 'components' && (
                          <>
                            <td style={{ padding: '0.45rem 0.75rem', textTransform: 'capitalize' }}>
                              {item.type}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600 }}>
                              {item.manufacturer}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>{item.model}</td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>
                              {item.quantity} {item.unit}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', color: '#34d399' }}>
                              {item.cost ? formatCurrency(item.cost) : '—'}
                            </td>
                          </>
                        )}
                        {entityType === 'accessories' && (
                          <>
                            <td style={{ padding: '0.45rem 0.75rem', fontWeight: 600 }}>
                              {item.name}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>{item.type}</td>
                            <td style={{ padding: '0.45rem 0.75rem' }}>
                              {item.manufacturer || '—'}
                            </td>
                            <td style={{ padding: '0.45rem 0.75rem', color: '#34d399' }}>
                              {item.value ? formatCurrency(item.value) : '—'}
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '0.75rem',
                borderTop: '1px solid var(--border-light)',
              }}
            >
              <button
                className="btn-secondary"
                type="button"
                onClick={() => setStep(1)}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}
              >
                <ChevronLeft size={16} /> Back to File
              </button>
              <button
                className="btn-primary"
                type="button"
                disabled={isProcessing}
                onClick={handleExecuteImport}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.65rem 1.4rem',
                  fontSize: '0.88rem',
                }}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin" size={16} /> Importing...
                  </>
                ) : (
                  <>
                    <span>Import {parsedData.rows.length} Records</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Complete / Summary */}
        {step === 3 && importResult && (
          <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
            <CheckCircle size={56} style={{ color: '#34d399', margin: '0 auto 1rem' }} />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 600, margin: '0 0 0.5rem' }}>
              Import Completed Successfully!
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: '0 0 1.5rem' }}>
              Your inventory has been safely committed to the encrypted vault.
            </p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '1rem',
                maxWidth: '420px',
                margin: '0 auto 2rem',
                background: 'rgba(255,255,255,0.02)',
                padding: '1rem',
                borderRadius: '10px',
                border: '1px solid var(--border-light)',
              }}
            >
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#34d399' }}>
                  {importResult.inserted}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Imported</div>
              </div>
              <div>
                <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#60a5fa' }}>
                  {importResult.updated}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Updated</div>
              </div>
              <div>
                <div
                  style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-secondary)' }}
                >
                  {importResult.skipped}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Skipped</div>
              </div>
            </div>

            <button
              className="btn-primary"
              type="button"
              onClick={handleClose}
              style={{ padding: '0.65rem 2rem', fontSize: '0.9rem' }}
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
