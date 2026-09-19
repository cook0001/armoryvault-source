import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Crosshair,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Printer,
  Search,
  Shield,
  Stamp,
  X,
} from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { NfaTrackerNavIcon, SafeIcon, SuppressorIcon } from '../components/CustomIcons';
import type { Accessory, Firearm } from '../types';

type NfaItem = {
  id: number;
  source: 'firearm' | 'accessory';
  name: string;
  serialNumber?: string;
  nfaType?: string;
  registrationType?: string;
  stampStatus?: string;
  stampSubmittedDate?: string;
  stampApprovedDate?: string;
  caliber?: string;
  notes?: string;
};

export const NfaTracker = () => {
  const [items, setItems] = useState<NfaItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'Pending' | 'Approved' | 'Suppressor' | 'SBR'>(
    'all'
  );
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const navigate = useNavigate();

  useEffect(() => {
    loadNfaItems();
    const handleReload = () => loadNfaItems();
    window.addEventListener('armoryvault-reload', handleReload);
    return () => window.removeEventListener('armoryvault-reload', handleReload);
  }, []);

  const loadNfaItems = async () => {
    if (!window.api) return;
    const firearms = await window.api.getFirearms();
    const accessories = await window.api.getAccessories();

    const nfaFirearms: NfaItem[] = (firearms || [])
      .filter((f: Firearm) => f.is_nfa)
      .map((f: Firearm) => ({
        id: f.id!,
        source: 'firearm' as const,
        name: `${f.make} ${f.model}`,
        serialNumber: f.serial_number,
        nfaType: f.nfa_type || 'SBR',
        registrationType: f.registration_type || 'Individual',
        stampStatus: f.stamp_status || 'Approved',
        stampSubmittedDate: f.stamp_submitted_date,
        stampApprovedDate: f.stamp_approved_date,
        caliber: f.caliber,
        notes: f.notes,
      }));

    const nfaAccessories: NfaItem[] = (accessories || [])
      .filter((a: Accessory) => a.is_nfa)
      .map((a: Accessory) => ({
        id: a.id!,
        source: 'accessory' as const,
        name: `${a.manufacturer} ${a.model}`,
        serialNumber: a.serialNumber,
        nfaType: a.nfa_type || 'Suppressor',
        registrationType: a.registration_type || 'Individual',
        stampStatus: a.stamp_status || 'Approved',
        stampSubmittedDate: a.stamp_submitted_date,
        stampApprovedDate: a.stamp_approved_date,
        caliber: a.ratedCalibers || a.caliber,
        notes: a.notes,
      }));

    setItems([...nfaFirearms, ...nfaAccessories]);
  };

  const getDaysWaiting = (submittedDate?: string) => {
    if (!submittedDate) return null;
    const submitted = new Date(submittedDate);
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24)));
  };

  const getDaysTaken = (submittedDate?: string, approvedDate?: string) => {
    if (!submittedDate || !approvedDate) return null;
    const submitted = new Date(submittedDate);
    const approved = new Date(approvedDate);
    return Math.max(
      0,
      Math.floor((approved.getTime() - submitted.getTime()) / (1000 * 60 * 60 * 24))
    );
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = search.toLowerCase();
      const matchesSearch =
        (item.name || '').toLowerCase().includes(q) ||
        (item.serialNumber || '').toLowerCase().includes(q) ||
        (item.caliber || '').toLowerCase().includes(q) ||
        (item.nfaType || '').toLowerCase().includes(q) ||
        (item.registrationType || '').toLowerCase().includes(q);

      let matchesFilter = true;
      if (filter === 'Pending') matchesFilter = item.stampStatus === 'Pending';
      else if (filter === 'Approved') matchesFilter = item.stampStatus === 'Approved';
      else if (filter === 'Suppressor') matchesFilter = item.nfaType === 'Suppressor';
      else if (filter === 'SBR') matchesFilter = item.nfaType === 'SBR' || item.nfaType === 'SBS';

      return matchesSearch && matchesFilter;
    });
  }, [items, search, filter]);

  const pendingCount = items.filter((i) => i.stampStatus === 'Pending').length;
  const approvedCount = items.filter((i) => i.stampStatus === 'Approved').length;
  const suppressorCount = items.filter((i) => i.nfaType === 'Suppressor').length;
  const sbrCount = items.filter((i) => i.nfaType === 'SBR' || i.nfaType === 'SBS').length;

  const avgWaitDays = useMemo(() => {
    const approvedWithDates = items.filter(
      (i) => i.stampStatus === 'Approved' && i.stampSubmittedDate && i.stampApprovedDate
    );
    if (approvedWithDates.length === 0) return null;
    const totalDays = approvedWithDates.reduce(
      (sum, i) => sum + (getDaysTaken(i.stampSubmittedDate, i.stampApprovedDate) || 0),
      0
    );
    return Math.round(totalDays / approvedWithDates.length);
  }, [items]);

  const handlePrintTransportDossier = () => {
    window.print();
  };

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="no-print page-header">
        <div>
          <h1
            style={{
              color: 'var(--text-primary)',
              margin: 0,
              fontSize: '1.6rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <NfaTrackerNavIcon size={24} color="var(--accent)" />
            NFA Tax Stamp Tracker &amp; Dossier
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4, fontSize: '0.85rem' }}>
            ATF Form 1 &amp; Form 4 National Firearms Act portfolio, wait-time analytics, and
            compliance registration
          </p>
        </div>

        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={handlePrintTransportDossier}
            title="Print ATF compliance transport summary for range transport"
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
          >
            <Printer size={16} />
            <span>Print Compliance Dossier</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div
        className="no-print"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem',
        }}
      >
        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                background: 'rgba(59, 130, 246, 0.12)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                padding: '0.75rem',
                borderRadius: '12px',
                color: '#60a5fa',
              }}
            >
              <Stamp size={22} />
            </div>
            <div>
              <div className="stat-label">Total NFA Items</div>
              <div className="stat-val">{items.length}</div>
              <div className="stat-sub">
                {suppressorCount} Suppressors • {sbrCount} SBR/SBS
              </div>
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setFilter(filter === 'Pending' ? 'all' : 'Pending')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                padding: '0.75rem',
                borderRadius: '12px',
                color: '#fbbf24',
              }}
            >
              <Clock size={22} />
            </div>
            <div>
              <div className="stat-label">Pending Approval</div>
              <div className="stat-val" style={{ color: '#fbbf24' }}>
                {pendingCount}
              </div>
              <div className="stat-sub">In ATF Review</div>
            </div>
          </div>
        </div>

        <div
          className="stat-card"
          onClick={() => setFilter(filter === 'Approved' ? 'all' : 'Approved')}
          style={{ cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                padding: '0.75rem',
                borderRadius: '12px',
                color: '#34d399',
              }}
            >
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div className="stat-label">Approved Stamps</div>
              <div className="stat-val" style={{ color: '#34d399' }}>
                {approvedCount}
              </div>
              <div className="stat-sub">Active &amp; In-Hand</div>
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div
              style={{
                background: 'rgba(168, 85, 247, 0.12)',
                border: '1px solid rgba(168, 85, 247, 0.25)',
                padding: '0.75rem',
                borderRadius: '12px',
                color: '#c084fc',
              }}
            >
              <Calendar size={22} />
            </div>
            <div>
              <div className="stat-label">Avg Approval Wait</div>
              <div className="stat-val" style={{ color: '#c084fc' }}>
                {avgWaitDays !== null ? `${avgWaitDays} days` : '—'}
              </div>
              <div className="stat-sub">Form 1 &amp; 4 History</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Deck: Search, Filter Tabs & View Toggle */}
      <div className="no-print dashboard-control-deck" style={{ marginBottom: '1.25rem' }}>
        <div className="filter-chips-bar">
          {[
            {
              key: 'all',
              icon: <NfaTrackerNavIcon size={14} color="var(--accent)" />,
              label: 'All Items',
              count: items.length,
            },
            {
              key: 'Pending',
              icon: <Clock size={13} style={{ color: '#fbbf24' }} />,
              label: 'Pending',
              count: pendingCount,
            },
            {
              key: 'Approved',
              icon: <CheckCircle2 size={13} style={{ color: '#34d399' }} />,
              label: 'Approved',
              count: approvedCount,
            },
            {
              key: 'Suppressor',
              icon: <SuppressorIcon size={13} color="#a78bfa" />,
              label: 'Suppressors',
              count: suppressorCount,
            },
            {
              key: 'SBR',
              icon: <Crosshair size={13} style={{ color: '#60a5fa' }} />,
              label: 'SBR / SBS',
              count: sbrCount,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              className={`filter-chip ${filter === tab.key ? 'active' : ''}`}
              onClick={() => setFilter(tab.key as any)}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span className="filter-chip-count">{tab.count}</span>
            </button>
          ))}
        </div>

        <div
          className="dashboard-control-right"
          style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}
        >
          <div className="search-box">
            <Search size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search serial, model, caliber, trust..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                type="button"
                className="search-clear-btn"
                onClick={() => setSearch('')}
                title="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <div
            style={{
              display: 'flex',
              background: 'rgba(0,0,0,0.3)',
              padding: '2px',
              borderRadius: '8px',
              border: '1px solid var(--border-light)',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'cards' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'cards' ? '#000' : 'var(--text-secondary)',
              }}
            >
              Cards
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              style={{
                padding: '0.35rem 0.65rem',
                fontSize: '0.75rem',
                fontWeight: 600,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: viewMode === 'table' ? 'var(--accent)' : 'transparent',
                color: viewMode === 'table' ? '#000' : 'var(--text-secondary)',
              }}
            >
              Table
            </button>
          </div>
        </div>
      </div>

      {/* Print-Only Transport Header */}
      <div className="print-header" style={{ display: 'none' }}>
        <div
          style={{ borderBottom: '2px solid black', paddingBottom: '8px', marginBottom: '14px' }}
        >
          <h2 style={{ margin: 0, fontSize: '16pt', fontWeight: 'bold' }}>
            NFA TAX STAMP &amp; REGISTRATION PORTFOLIO
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '9pt', color: '#444' }}>
            National Firearms Act (NFA) 26 U.S.C. Chapter 53 Registration Transport Record
          </p>
        </div>
      </div>

      {/* View Mode: Cards */}
      {viewMode === 'cards' && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1rem',
          }}
        >
          {filteredItems.map((item) => {
            const isPending = item.stampStatus === 'Pending';
            const daysWaiting = isPending
              ? getDaysWaiting(item.stampSubmittedDate)
              : getDaysTaken(item.stampSubmittedDate, item.stampApprovedDate);

            return (
              <div
                key={`${item.source}-${item.id}`}
                className="stat-card"
                onClick={() => {
                  if (item.source === 'firearm') navigate(`/details/${item.id}`);
                  else navigate('/accessories');
                }}
                style={{
                  cursor: 'pointer',
                  padding: '1.25rem',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.85rem',
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  border: isPending
                    ? '1px solid rgba(245, 158, 11, 0.35)'
                    : '1px solid var(--border-light)',
                }}
              >
                <div>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '0.5rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: 'rgba(139, 92, 246, 0.15)',
                          color: '#a78bfa',
                          border: '1px solid rgba(139, 92, 246, 0.3)',
                        }}
                      >
                        {item.nfaType || 'NFA'}
                      </span>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.72rem',
                          background: 'rgba(255, 255, 255, 0.05)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        {item.registrationType || 'Individual'}
                      </span>
                    </div>

                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        background: isPending
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(52, 211, 153, 0.15)',
                        color: isPending ? '#f59e0b' : '#34d399',
                        border: isPending
                          ? '1px solid rgba(245, 158, 11, 0.35)'
                          : '1px solid rgba(52, 211, 153, 0.35)',
                      }}
                    >
                      {isPending ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                      {item.stampStatus || 'Approved'}
                    </span>
                  </div>

                  <h3
                    style={{
                      margin: '0 0 0.25rem',
                      fontSize: '1.05rem',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {item.name}
                  </h3>

                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      gap: '0.75rem',
                      marginBottom: '0.65rem',
                    }}
                  >
                    <span>
                      Serial:{' '}
                      <strong style={{ color: '#60a5fa', fontFamily: 'monospace' }}>
                        {item.serialNumber || '—'}
                      </strong>
                    </span>
                    {item.caliber && (
                      <span>
                        Caliber: <strong style={{ color: 'var(--accent)' }}>{item.caliber}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Timeline / Days Elapsed Progress Box */}
                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-light)',
                    fontSize: '0.78rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      marginBottom: '4px',
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)' }}>
                      {isPending ? 'Days in Review:' : 'Approval Time:'}
                    </span>
                    <strong
                      style={{ color: isPending ? '#f59e0b' : '#34d399', fontFamily: 'monospace' }}
                    >
                      {daysWaiting !== null ? `${daysWaiting} days` : '—'}
                    </strong>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                    }}
                  >
                    <span>Submitted: {item.stampSubmittedDate || '—'}</span>
                    <span>Approved: {item.stampApprovedDate || (isPending ? 'Pending' : '—')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Mode: Table */}
      {viewMode === 'table' && (
        <div className="bound-book-table-container">
          <table className="bound-book-table">
            <thead>
              <tr>
                <th style={{ width: '130px' }}>Serial Number</th>
                <th>Item Description</th>
                <th>NFA Type</th>
                <th>Registration</th>
                <th>Status</th>
                <th style={{ width: '105px' }}>Submitted</th>
                <th style={{ width: '105px' }}>Approved</th>
                <th>Wait Duration</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const isPending = item.stampStatus === 'Pending';
                const daysWaiting = isPending
                  ? getDaysWaiting(item.stampSubmittedDate)
                  : getDaysTaken(item.stampSubmittedDate, item.stampApprovedDate);

                return (
                  <tr
                    key={`${item.source}-${item.id}`}
                    onClick={() => {
                      if (item.source === 'firearm') navigate(`/details/${item.id}`);
                      else navigate('/accessories');
                    }}
                    title="Click to view details"
                  >
                    <td>
                      <span className="mono-serial-badge">{item.serialNumber || '—'}</span>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: 2,
                        }}
                      >
                        {item.source === 'firearm' ? (
                          <span
                            style={{
                              color: '#a78bfa',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <SafeIcon size={11} color="#a78bfa" /> Firearm
                          </span>
                        ) : (
                          <span
                            style={{
                              color: '#f59e0b',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 3,
                            }}
                          >
                            <SuppressorIcon size={11} color="#f59e0b" /> Accessory
                          </span>
                        )}
                        {item.caliber && ` • ${item.caliber}`}
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          background: 'rgba(139,92,246,0.15)',
                          color: '#a78bfa',
                        }}
                      >
                        {item.nfaType || '—'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                        }}
                      >
                        {item.registrationType || 'Individual'}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          background: isPending ? 'rgba(245,158,11,0.15)' : 'rgba(52,211,153,0.15)',
                          color: isPending ? '#f59e0b' : '#34d399',
                          border: isPending
                            ? '1px solid rgba(245,158,11,0.35)'
                            : '1px solid rgba(52,211,153,0.35)',
                        }}
                      >
                        {isPending ? <Clock size={11} /> : <CheckCircle2 size={11} />}
                        {item.stampStatus || 'Approved'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {item.stampSubmittedDate || '—'}
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {item.stampApprovedDate || '—'}
                    </td>
                    <td
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontWeight: 600,
                        color: isPending ? '#f59e0b' : '#34d399',
                      }}
                    >
                      {daysWaiting !== null ? `${daysWaiting} days` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {filteredItems.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '3.5rem 1rem',
            background: 'var(--bg-surface)',
            borderRadius: '12px',
            marginTop: '1rem',
          }}
        >
          <FileText size={48} style={{ marginBottom: '0.75rem', opacity: 0.3 }} />
          <h3>No NFA Items Match Your Search or Filter</h3>
          <p style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Mark firearms or suppressors as NFA in their detail pages to track Form 1 / Form 4
            registrations here.
          </p>
          <button
            className="btn-secondary btn-sm"
            onClick={() => {
              setSearch('');
              setFilter('all');
            }}
            style={{ marginTop: '1rem' }}
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );
};
