import {
  AlertCircle,
  Bluetooth,
  CheckCircle,
  Lock,
  RefreshCw,
  Shield,
  Smartphone,
  Wifi,
  X,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import type { DiscoveredCompanion } from '../../../types';

export interface BlePairingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (deviceName: string) => void;
}

export const BlePairingModal: React.FC<BlePairingModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [devices, setDevices] = useState<DiscoveredCompanion[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<DiscoveredCompanion | null>(null);
  const [pin, setPin] = useState('');
  const [isPairing, setIsPairing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successDevice, setSuccessDevice] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSelectedDevice(null);
      setPin('');
      setSuccessDevice(null);
      checkAvailabilityAndScan();
    }
  }, [isOpen]);

  const checkAvailabilityAndScan = async () => {
    if (!window.api || !window.api.isBluetoothAvailable) {
      setIsSupported(false);
      return;
    }

    try {
      const available = await window.api.isBluetoothAvailable();
      setIsSupported(available);
      if (available) {
        startScan();
      }
    } catch (err: any) {
      console.error('[BlePairingModal] Failed to check Bluetooth availability:', err);
      setIsSupported(false);
    }
  };

  const startScan = async () => {
    if (!window.api || !window.api.scanBleCompanions) return;
    setIsScanning(true);
    setError(null);
    try {
      const results = await window.api.scanBleCompanions(6);
      setDevices(results || []);
    } catch (err: any) {
      console.error('[BlePairingModal] Scan error:', err);
      setError(err?.message || 'Bluetooth scan failed. Ensure Bluetooth is enabled.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeviceSelect = (device: DiscoveredCompanion) => {
    setSelectedDevice(device);
    setPin('');
    setError(null);
  };

  const handlePairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDevice || !window.api || !window.api.pairBleCompanion) return;

    const cleanPin = pin.trim();
    if (cleanPin.length !== 6 || !/^\d{6}$/.test(cleanPin)) {
      setError('Please enter the 6-digit PIN shown on your companion device.');
      return;
    }

    setIsPairing(true);
    setError(null);

    try {
      const res = await window.api.pairBleCompanion(selectedDevice.id, cleanPin);
      if (res && res.success) {
        setSuccessDevice(res.deviceName || selectedDevice.name);
        setTimeout(() => {
          onSuccess(res.deviceName || selectedDevice.name);
          onClose();
        }, 1600);
      } else {
        setError('Pairing handshake failed. Please verify the PIN and retry.');
      }
    } catch (err: any) {
      console.error('[BlePairingModal] Pairing error:', err);
      setError(
        typeof err === 'string'
          ? err
          : err?.message || 'Failed to complete Bluetooth pairing. Verify PIN and proximity.'
      );
    } finally {
      setIsPairing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-header-left">
            <div className="modal-header-icon-badge">
              <Bluetooth size={18} color="#60a5fa" />
            </div>
            <div>
              <h2 className="modal-title">Bluetooth LE Companion Pairing</h2>
              <p className="modal-subtitle">
                Zero-camera wireless device discovery &amp; encrypted handshake
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="ble-modal-body">
          {/* Hardware Unsupported View */}
          {isSupported === false && (
            <div className="card" style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  background: 'rgba(239, 68, 68, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <AlertCircle size={24} color="#ef4444" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Bluetooth Adapter Not Found or Powered Off
              </h3>
              <p style={{ margin: '0 0 1.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                Ensure your computer's Bluetooth is turned on and authorized in system settings,
                or use standard QR code pairing over local Wi-Fi.
              </p>
              <button
                type="button"
                className="btn-secondary"
                onClick={checkAvailabilityAndScan}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
              >
                <RefreshCw size={15} /> Retry Hardware Check
              </button>
            </div>
          )}

          {/* Success State */}
          {successDevice && (
            <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  background: 'rgba(16, 185, 129, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem auto',
                }}
              >
                <CheckCircle size={28} color="#34d399" />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-primary)' }}>
                Successfully Paired!
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                <strong>{successDevice}</strong> is registered in your vault. Ready for automatic sync.
              </p>
            </div>
          )}

          {/* Active Flow: Device Scanner or PIN Entry */}
          {isSupported !== false && !successDevice && (
            <>
              {!selectedDevice ? (
                <>
                  {/* Radar Visual */}
                  <div className="ble-radar-wrapper">
                    <div className="ble-radar-visual">
                      <div className="ble-radar-ring ble-radar-ring-1" />
                      <div className="ble-radar-ring ble-radar-ring-2" />
                      <div className="ble-radar-ring ble-radar-ring-3" />
                      <div className="ble-radar-center-icon">
                        <Bluetooth size={22} color="#ffffff" />
                      </div>
                    </div>
                    <h3 className="ble-radar-title">
                      {isScanning ? 'Scanning for Companions...' : 'Nearby Devices'}
                    </h3>
                    <p className="ble-radar-subtitle">
                      Open ArmoryVault Companion on your mobile device and tap "Pair via Bluetooth"
                      to broadcast pairing availability.
                    </p>
                  </div>

                  {/* Discovered Device List */}
                  {devices.length > 0 && (
                    <div className="ble-device-list">
                      {devices.map((dev) => (
                        <div
                          key={dev.id}
                          className="ble-device-card"
                          onClick={() => handleDeviceSelect(dev)}
                        >
                          <div className="ble-device-info">
                            <div className="ble-device-icon">
                              <Smartphone size={20} />
                            </div>
                            <div>
                              <p className="ble-device-name">{dev.name}</p>
                              <div className="ble-device-meta">
                                <span>Bluetooth LE</span>
                                {dev.rssi !== undefined && (
                                  <span className="ble-signal-badge">
                                    <Wifi size={11} /> {dev.rssi} dBm
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '0.45rem 0.9rem', fontSize: '0.85rem' }}
                          >
                            Pair Device
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state when scan completes with no devices */}
                  {!isScanning && devices.length === 0 && (
                    <div
                      style={{
                        padding: '1rem',
                        textAlign: 'center',
                        color: 'var(--text-secondary)',
                        fontSize: '0.85rem',
                      }}
                    >
                      No nearby companion devices detected. Make sure the phone screen is on
                      and Bluetooth broadcast is active.
                    </div>
                  )}

                  {error && (
                    <div className="sync-reject-banner" style={{ marginTop: '0.5rem' }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}
                </>
              ) : (
                /* PIN Verification View */
                <form onSubmit={handlePairSubmit} className="ble-pin-card">
                  <div className="ble-device-info" style={{ width: '100%', justifyContent: 'center' }}>
                    <div className="ble-device-icon">
                      <Smartphone size={20} />
                    </div>
                    <div>
                      <p className="ble-device-name" style={{ textAlign: 'left' }}>
                        {selectedDevice.name}
                      </p>
                      <p className="modal-subtitle" style={{ margin: 0, textAlign: 'left' }}>
                        Ready for secure cryptographic handshake
                      </p>
                    </div>
                  </div>

                  <p className="ble-pin-instruction">
                    Enter the <strong>6-digit confirmation PIN</strong> currently displayed on your
                    companion phone screen:
                  </p>

                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    autoFocus
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="••••••"
                    className="ble-pin-input-field"
                    disabled={isPairing}
                  />

                  <div className="ble-security-banner">
                    <Shield size={14} />
                    <span>AES-256-GCM End-to-End Encrypted Tunnel</span>
                  </div>

                  {error && (
                    <div className="sync-reject-banner" style={{ width: '100%' }}>
                      <AlertCircle size={16} />
                      <span>{error}</span>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setSelectedDevice(null)}
                      disabled={isPairing}
                      style={{ flex: 1 }}
                    >
                      Back to Devices
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isPairing || pin.length !== 6}
                      style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                      {isPairing ? (
                        <>
                          <RefreshCw size={15} className="spin" /> Verifying...
                        </>
                      ) : (
                        <>
                          <Lock size={15} /> Confirm &amp; Pair
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
          <div>
            {isSupported !== false && !selectedDevice && (
              <button
                type="button"
                className="btn-secondary"
                onClick={startScan}
                disabled={isScanning}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
              >
                <RefreshCw size={14} className={isScanning ? 'spin' : ''} />
                {isScanning ? 'Scanning...' : 'Rescan Bluetooth'}
              </button>
            )}
          </div>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
