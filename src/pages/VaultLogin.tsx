import React, { useState } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  UploadCloud,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';

interface Props {
  isSetup: boolean;
  onUnlocked: () => void;
}

export const VaultLogin: React.FC<Props> = ({ isSetup, onUnlocked }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [showRecoveryCode, setShowRecoveryCode] = useState(false);
  const [useRecovery, setUseRecovery] = useState(false);

  const handleKeyEvent = (e: React.KeyboardEvent) => {
    setCapsLockActive(e.getModifierState('CapsLock'));
  };

  const handleRestoreDatabase = async () => {
    if (!window.api || !window.api.restoreBackup) return;
    try {
      const res = await window.api.restoreBackup();
      if (res.canceled) return;
      if (res.success) {
        alert(
          res.message ||
            'Database successfully imported! You can now log in with the imported database password.'
        );
        window.location.reload();
      } else {
        setError(res.error || 'Failed to import database.');
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred while importing the database.');
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters long for adequate encryption security.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const code = await window.api.setupVault(password);
      setRecoveryCode(code);
    } catch (_err) {
      setError('Failed to setup vault. Check console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      if (useRecovery) {
        const success = await window.api.unlockWithRecoveryCode(password.trim());
        if (success) {
          onUnlocked();
        } else {
          setError('Invalid recovery code.');
        }
      } else {
        const success = await window.api.unlockVault(password);
        if (success) {
          onUnlocked();
        } else {
          setError('Incorrect password.');
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to unlock vault.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (recoveryCode) {
    return (
      <div className="vault-recovery-screen">
        <div className="bg-mesh" />
        <div className="bg-grid" />
        <div className="vault-icon-badge vault-icon-badge-warning">
          <AlertTriangle size={38} className="vault-recovery-icon" />
        </div>
        <h2 className="vault-recovery-title">Save Your Recovery Code!</h2>
        <p className="vault-recovery-desc">
          Your Vault has been successfully encrypted with military-grade AES-256-GCM.
          If you ever forget your password, your data is mathematically unrecoverable unless you have this code.
          Write it down and store it somewhere safe. <strong>It will never be shown again.</strong>
        </p>

        <div className="vault-recovery-code-box">
          {showRecoveryCode ? recoveryCode : '••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••••'}
          <button
            type="button"
            className="vault-recovery-reveal-btn"
            onClick={() => setShowRecoveryCode(!showRecoveryCode)}
            title={showRecoveryCode ? 'Hide Recovery Code' : 'Reveal Recovery Code'}
          >
            {showRecoveryCode ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        <button
          type="button"
          className="btn-primary vault-recovery-action-btn"
          onClick={onUnlocked}
        >
          <span>I have safely stored my code. Let's Go.</span>
          <ArrowRight size={18} />
        </button>
      </div>
    );
  }

  return (
    <div className="vault-login-screen">
      <div className="bg-mesh" />
      <div className="bg-grid" />
      <div className="card vault-login-card">
        <div className="vault-icon-badge">
          <Shield size={38} />
        </div>

        <h1 className="vault-login-title">ArmoryVault</h1>

        <div className="vault-security-pill">
          <ShieldCheck size={13} />
          <span>AES-256-GCM Zero-at-Rest</span>
        </div>

        <p className="vault-login-subtitle">
          {!isSetup
            ? 'Create a master password to encrypt your local firearm vault.'
            : (useRecovery
              ? 'Enter your 64-character recovery code to unlock your vault.'
              : 'Enter your master password to unlock your vault.')}
        </p>

        <form onSubmit={!isSetup ? handleSetup : handleLogin} className="vault-login-form">
          <div className="vault-input-group">
            <div className="vault-input-icon-slot">
              {useRecovery ? <KeyRound size={20} /> : <Lock size={20} />}
            </div>
            <input
              type={useRecovery || showPassword ? 'text' : 'password'}
              placeholder={useRecovery ? 'Paste 64-character Recovery Code' : 'Master Password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyEvent}
              onKeyUp={handleKeyEvent}
              className="form-input vault-input-padded"
              autoFocus
              autoComplete={!isSetup ? 'new-password' : 'current-password'}
            />
            {!useRecovery && (
              <button
                type="button"
                className="vault-input-toggle-slot"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            )}
          </div>

          {!isSetup && (
            <div className="vault-input-group">
              <div className="vault-input-icon-slot">
                <Lock size={20} />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm Master Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                onKeyDown={handleKeyEvent}
                onKeyUp={handleKeyEvent}
                className="form-input vault-input-padded"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="vault-input-toggle-slot"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                title={showConfirmPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          )}

          {capsLockActive && (
            <div className="vault-caps-warning">
              <AlertCircle size={14} />
              <span>Caps Lock is ON</span>
            </div>
          )}

          {error && <div className="vault-error-alert">{error}</div>}

          <button
            type="submit"
            disabled={isSubmitting || !password.trim()}
            className="btn-primary vault-submit-btn"
          >
            <span>{!isSetup ? 'Encrypt & Create Vault' : 'Unlock'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {isSetup && (
          <div className="vault-alt-toggle-wrap">
            <button
              type="button"
              onClick={() => {
                setUseRecovery(!useRecovery);
                setPassword('');
                setError('');
              }}
              className="vault-alt-toggle"
            >
              {useRecovery ? 'Back to Password Login' : 'Forgot Password? Use Recovery Code'}
            </button>
          </div>
        )}

        <div className="vault-divider">
          <span>OR</span>
        </div>

        <button
          type="button"
          onClick={handleRestoreDatabase}
          className="vault-restore-action-btn"
          title="Import an existing vault or third-party database (.enc, .zip, .sqlite, .json, .csv, .tsv)"
        >
          <UploadCloud size={17} />
          <span>Restore or Import Database</span>
        </button>
        <p className="vault-restore-hint">
          Migrate existing backups, MyGunDB, GunSafe, FastBound, or CSV spreadsheets
        </p>
      </div>
    </div>
  );
};
