import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BlePairingModal } from './BlePairingModal';

describe('BlePairingModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).api = {
      isBluetoothAvailable: vi.fn().mockResolvedValue(true),
      scanBleCompanions: vi.fn().mockResolvedValue([
        {
          id: 'dev_pixel_7',
          name: 'Pixel 7 Pro (ArmoryVault)',
          rssi: -54,
          is_armoryvault: true,
        },
      ]),
      pairBleCompanion: vi.fn().mockResolvedValue({
        success: true,
        deviceName: 'Pixel 7 Pro (ArmoryVault)',
        deviceId: 'dev_pixel_7',
      }),
    };
  });

  it('renders modal and starts scanning when open and Bluetooth is available', async () => {
    render(
      <BlePairingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    expect(screen.getByText(/Bluetooth LE Companion Pairing/i)).toBeInTheDocument();
    expect((window as any).api.isBluetoothAvailable).toHaveBeenCalled();

    await waitFor(() => {
      expect((window as any).api.scanBleCompanions).toHaveBeenCalledWith(6);
      expect(screen.getByText('Pixel 7 Pro (ArmoryVault)')).toBeInTheDocument();
      expect(screen.getByText(/-54 dBm/i)).toBeInTheDocument();
    });
  });

  it('handles device selection and transitions to PIN verification screen', async () => {
    render(
      <BlePairingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pixel 7 Pro (ArmoryVault)')).toBeInTheDocument();
    });

    const pairBtn = screen.getByRole('button', { name: /Pair Device/i });
    fireEvent.click(pairBtn);

    expect(screen.getByText(/Enter the/i)).toBeInTheDocument();
    expect(screen.getByText(/6-digit confirmation PIN/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••')).toBeInTheDocument();
  });

  it('validates 6-digit PIN and performs pairing handshake', async () => {
    render(
      <BlePairingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pixel 7 Pro (ArmoryVault)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Pair Device/i }));

    const pinInput = screen.getByPlaceholderText('••••••');
    fireEvent.change(pinInput, { target: { value: '492015' } });

    const confirmBtn = screen.getByRole('button', { name: /Confirm & Pair/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect((window as any).api.pairBleCompanion).toHaveBeenCalledWith('dev_pixel_7', '492015');
      expect(screen.getByText(/Successfully Paired!/i)).toBeInTheDocument();
    });
  });

  it('shows error banner when PIN is less than 6 digits', async () => {
    render(
      <BlePairingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Pixel 7 Pro (ArmoryVault)')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /Pair Device/i }));

    const pinInput = screen.getByPlaceholderText('••••••');
    fireEvent.change(pinInput, { target: { value: '123' } });

    // Try submitting form
    const form = pinInput.closest('form');
    if (form) {
      fireEvent.submit(form);
    }

    expect(screen.getByText(/Please enter the 6-digit PIN/i)).toBeInTheDocument();
  });

  it('displays hardware unavailable banner when Bluetooth is off or unsupported', async () => {
    (window as any).api.isBluetoothAvailable = vi.fn().mockResolvedValue(false);

    render(
      <BlePairingModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Bluetooth Adapter Not Found or Powered Off/i)
      ).toBeInTheDocument();
    });
  });
});
