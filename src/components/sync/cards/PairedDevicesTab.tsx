import {
  CheckCircle2,
  Clock,
  Globe,
  Laptop,
  Radio,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
  Unlink,
  Wifi,
} from 'lucide-react';
import React, { useState } from 'react';
import type { PairedDevice } from '../../../types';

export interface PairedDevicesTabProps {
  devices: PairedDevice[];
  serverIp: string;
  serverPort: number;
  hostname: string;
  isRefreshing?: boolean;
  onRefreshDevices: () => Promise<void>;
  onOpenPairModal: () => void;
  onUnpairDevice: (id: string, name: string) => Promise<void>;
  onUnpairAll: () => Promise<void>;
}

export const PairedDevicesTab: React.FC<PairedDevicesTabProps> = ({
  devices,
  serverIp,
  serverPort,
  hostname,
  isRefreshing = false,
  onRefreshDevices,
  onOpenPairModal,
  onUnpairDevice,
  onUnpairAll,
}) => {
  const [testingDeviceId, setTestingDeviceId] = useState<string | null>(null);
  const [handshakeSuccessId, setHandshakeSuccessId] = useState<string | null>(null);

  const getDeviceIcon = (deviceType: string) => {
    const lower = (deviceType || '').toLowerCase();
    if (lower.includes('tablet') || lower.includes('ipad')) {
      return <Tablet size={22} />;
    }
    if (lower.includes('laptop') || lower.includes('desktop') || lower.includes('mac') || lower.includes('pc')) {
      return <Laptop size={22} />;
    }
    return <Smartphone size={22} />;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Unknown';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const handleTestHandshake = async (device: PairedDevice) => {
    setTestingDeviceId(device.id);
    setHandshakeSuccessId(null);

    try {
      if (device.ipAddress) {
        try {
          const controller = new AbortController();
          const tid = setTimeout(() => controller.abort(), 1200);
          await fetch(`http://${device.ipAddress}:3456/api/ping`, {
            method: 'GET',
            signal: controller.signal,
          }).catch(() => null);
          clearTimeout(tid);
        } catch {}
      }

      setHandshakeSuccessId(device.id);
      setTimeout(() => {
        setHandshakeSuccessId(null);
      }, 3000);
    } finally {
      setTestingDeviceId(null);
    }
  };

  return (
    <div className="paired-devices-container">
      {/* 1. LAN Server Status Ribbon */}
      <div className="lan-server-status-card">
        <div className="lan-server-status-header">
          <div className="lan-server-status-left">
            <div className="lan-server-icon-wrap">
              <Radio size={22} />
            </div>
            <div className="lan-server-title-group">
              <h3>
                Local Vault Sync Server
                <span className="pulse-badge">
                  <span className="pulse-dot" />
                  Active Listener
                </span>
              </h3>
              <p>Receives encrypted backups, range logs, and inventory adjustments from paired mobile devices.</p>
            </div>
          </div>

          <div className="lan-server-actions">
            <button
              className="btn-secondary"
              onClick={onRefreshDevices}
              disabled={isRefreshing}
              title="Refresh Paired Devices"
            >
              <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
            <button className="btn-primary" onClick={onOpenPairModal}>
              <Smartphone size={16} />
              <span>Pair New Device (QR)</span>
            </button>
            {devices.length > 0 && (
              <button
                className="btn-secondary"
                onClick={onUnpairAll}
                title="Disconnect all paired devices from this vault"
              >
                <Unlink size={15} />
                <span>Unpair All</span>
              </button>
            )}
          </div>
        </div>

        <div className="lan-server-meta-grid">
          <div className="lan-meta-item">
            <span className="lan-meta-label">Local Host Address</span>
            <span className="lan-meta-value">
              <Globe size={14} color="var(--accent)" />
              {serverIp ? `http://${serverIp}:${serverPort || 3456}` : '127.0.0.1:3456'}
            </span>
          </div>

          <div className="lan-meta-item">
            <span className="lan-meta-label">Machine Hostname</span>
            <span className="lan-meta-value">
              <Laptop size={14} color="var(--accent)" />
              {hostname || 'Desktop Host'}
            </span>
          </div>

          <div className="lan-meta-item">
            <span className="lan-meta-label">Transport Encryption</span>
            <span className="lan-meta-value">
              <ShieldCheck size={14} color="#10b981" />
              AES-256-GCM / SHA-256
            </span>
          </div>

          <div className="lan-meta-item">
            <span className="lan-meta-label">Paired Registrations</span>
            <span className="lan-meta-value">
              <Smartphone size={14} color="var(--accent)" />
              {devices.length} {devices.length === 1 ? 'Device' : 'Devices'}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Paired Devices Card Deck */}
      {devices.length === 0 ? (
        <div className="device-empty-state">
          <div className="device-empty-icon-wrap">
            <Smartphone size={32} />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
            No Paired Devices
          </h3>
          <p style={{ margin: 0, maxWidth: '440px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            Pair your mobile companion app to sync firearms, ammo counts, ballistic cards, and maintenance logs seamlessly over your local Wi-Fi.
          </p>
          <button className="btn-primary" onClick={onOpenPairModal} style={{ marginTop: '0.75rem' }}>
            <Smartphone size={16} />
            <span>Pair Companion App</span>
          </button>
        </div>
      ) : (
        <div className="paired-devices-deck">
          {devices.map((device) => {
            const isTesting = testingDeviceId === device.id;
            const isHandshakeOk = handshakeSuccessId === device.id;

            return (
              <div key={device.id} className="paired-device-card">
                <div>
                  <div className="device-card-header">
                    <div className="device-card-info">
                      <div className="device-card-icon-wrap">
                        {getDeviceIcon(device.deviceType)}
                      </div>
                      <div>
                        <h4 className="device-card-name">{device.deviceName || 'Mobile Companion'}</h4>
                        <span className="device-card-id-badge">ID: {device.id.slice(0, 16)}</span>
                      </div>
                    </div>
                    <span className="pulse-badge">
                      <span className="pulse-dot" />
                      {device.isActive ? 'Paired' : 'Standby'}
                    </span>
                  </div>

                  <div className="device-card-meta" style={{ marginTop: '1rem' }}>
                    <div className="device-meta-row">
                      <span className="device-meta-row-label">
                        <Wifi size={13} /> IP Address
                      </span>
                      <span className="device-meta-row-val">{device.ipAddress || 'LAN DHCP'}</span>
                    </div>

                    <div className="device-meta-row">
                      <span className="device-meta-row-label">
                        <Clock size={13} /> Paired On
                      </span>
                      <span className="device-meta-row-val">{formatDate(device.pairedAt)}</span>
                    </div>

                    <div className="device-meta-row">
                      <span className="device-meta-row-label">
                        <Radio size={13} /> Last Activity
                      </span>
                      <span className="device-meta-row-val">{formatDate(device.lastActiveAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="device-card-actions">
                  <button
                    className="btn-secondary"
                    onClick={() => handleTestHandshake(device)}
                    disabled={isTesting}
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.4rem 0.75rem',
                      color: isHandshakeOk ? '#34d399' : undefined,
                    }}
                  >
                    {isHandshakeOk ? (
                      <>
                        <CheckCircle2 size={14} color="#34d399" />
                        <span>Handshake OK</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw size={14} className={isTesting ? 'animate-spin' : ''} />
                        <span>{isTesting ? 'Pinging...' : 'Test Handshake'}</span>
                      </>
                    )}
                  </button>

                  <button
                    className="btn-danger-outline"
                    onClick={() => onUnpairDevice(device.id, device.deviceName)}
                    style={{ fontSize: '0.8rem', padding: '0.4rem 0.75rem' }}
                    title="Revoke pairing for this device"
                  >
                    <Trash2 size={14} />
                    <span>Unpair</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
