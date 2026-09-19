import {
  Barcode,
  Blocks,
  ChevronLeft,
  ChevronRight,
  DownloadCloud,
  Eye,
  EyeOff,
  LayoutDashboard,
  Lock,
  PlusCircle,
  Printer,
  RefreshCw,
  Settings,
  Shield,
  Smartphone,
  Target,
} from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import packageJson from '../../package.json';
import { useModules } from '../modules/registry/ModuleContext';
import { useScrollRestoration } from '../utils/scrollRestoration';
import { applyTheme, getStoredTheme, saveTheme } from '../utils/themeEngine';
import {
  AccessoriesNavIcon,
  BallisticsNavIcon,
  BoundBookNavIcon,
  CartridgesIcon,
  LoadDevNavIcon,
  MaintenanceNavIcon,
  NfaTrackerNavIcon,
  SafeIcon,
  ScopeIcon,
} from './CustomIcons';
import { GlobalFileDropZone } from './sync';

// Lazy-load heavy modals to optimize initial bundle size & dashboard load time
const SettingsModal = React.lazy(() =>
  import('./modals/SettingsModal').then((m) => ({ default: m.SettingsModal }))
);
const SkuManagerModal = React.lazy(() =>
  import('./modals/SkuManagerModal').then((m) => ({ default: m.SkuManagerModal }))
);
const ActivityLogModal = React.lazy(() =>
  import('./modals/ActivityLogModal').then((m) => ({ default: m.ActivityLogModal }))
);
const RangeSessionModal = React.lazy(() =>
  import('./modals/RangeSessionModal').then((m) => ({ default: m.RangeSessionModal }))
);
const ChangePasswordModal = React.lazy(() =>
  import('./modals/ChangePasswordModal').then((m) => ({ default: m.ChangePasswordModal }))
);
const RecoveryKeyModal = React.lazy(() =>
  import('./modals/RecoveryKeyModal').then((m) => ({ default: m.RecoveryKeyModal }))
);
const ModuleCenterModal = React.lazy(() =>
  import('./modals/ModuleCenterModal').then((m) => ({ default: m.ModuleCenterModal }))
);

export const Layout = ({ onLockVault }: { onLockVault?: () => void }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainContentRef = useRef<HTMLElement | null>(null);

  // Manage automatic scroll position restoration across route navigation
  useScrollRestoration(mainContentRef);

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'downloading' | 'ready'>('idle');
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [platform, setPlatform] = useState('');

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [isRangeModalOpen, setIsRangeModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isRecoveryKeyModalOpen, setIsRecoveryKeyModalOpen] = useState(false);
  const [isSkuManagerOpen, setIsSkuManagerOpen] = useState(false);
  const [isActivityLogOpen, setIsActivityLogOpen] = useState(false);
  const {
    isInstalled,
    isModuleCenterOpen,
    openModuleCenter,
    closeModuleCenter,
    targetModuleId,
    activeNavItems,
  } = useModules();

  useEffect(() => {
    let unsubSync: (() => void) | undefined;
    let unsubUpdate: (() => void) | undefined;

    if (window.api && window.api.onUpdateMessage) {
      unsubUpdate = window.api.onUpdateMessage((msg: any) => {
        if (msg.type === 'update-available') {
          setUpdateStatus('downloading');
          setDownloadProgress(0);
        } else if (msg.type === 'download-progress') {
          setUpdateStatus('downloading');
          setDownloadProgress(Math.round(msg.data.percent || 0));
        } else if (msg.type === 'update-downloaded') {
          setUpdateStatus('ready');
        }
      });
    }
    if (window.api && window.api.getPlatform) {
      setPlatform(window.api.getPlatform());
    }
    if (window.api && window.api.onSyncReceived) {
      unsubSync = window.api.onSyncReceived(() => {
        loadSyncQueue();
      });
    }
    loadSyncQueue();

    const handleOpenActivityLog = () => setIsActivityLogOpen(true);
    window.addEventListener('armoryvault-open-activity-log', handleOpenActivityLog);

    // Theme Engine initialization and dynamic event listener
    const initialTheme = getStoredTheme();
    applyTheme(initialTheme);
    setPrivacyMode(initialTheme.privacyMode);

    if (
      location.pathname === '/' &&
      initialTheme.startupRoute &&
      initialTheme.startupRoute !== '/'
    ) {
      navigate(initialTheme.startupRoute, { replace: true });
    }

    const handleThemeEvent = (e: any) => {
      if (e?.detail) {
        setPrivacyMode(!!e.detail.privacyMode);
      }
    };
    window.addEventListener('armoryvault-theme-change', handleThemeEvent);

    return () => {
      if (unsubSync) unsubSync();
      if (unsubUpdate) unsubUpdate();
      window.removeEventListener('armoryvault-open-activity-log', handleOpenActivityLog);
      window.removeEventListener('armoryvault-theme-change', handleThemeEvent);
    };
  }, []);

  useEffect(() => {
    loadSyncQueue();
  }, [location.pathname]);

  const [privacyMode, setPrivacyMode] = useState<boolean>(() => {
    return getStoredTheme().privacyMode;
  });

  const handleTogglePrivacy = async () => {
    const next = !privacyMode;
    setPrivacyMode(next);
    await saveTheme({ privacyMode: next });
  };

  const loadSyncQueue = async () => {
    if (window.api && window.api.getSyncQueue) {
      const queue = await window.api.getSyncQueue();
      setSyncQueueCount(queue?.length || 0);
    }
  };

  const handleRestart = () => {
    if (window.api && window.api.restartApp) {
      window.api.restartApp();
    }
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return '';
    if (path !== '/' && location.pathname.startsWith(path)) return 'active';
    if (path === '/' && location.pathname === '/') return 'active';
    return '';
  };

  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('av_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });

  const toggleSidebar = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    try {
      localStorage.setItem('av_sidebar_collapsed', String(next));
    } catch {}
  };

  interface LayoutNavItem {
    path: string;
    icon: React.ReactNode;
    label: string;
    activePaths?: string[];
  }

  const vaultNavItems = useMemo<LayoutNavItem[]>(() => {
    const isReloading = isInstalled('reloading');
    const items: LayoutNavItem[] = [
      { path: '/', icon: <LayoutDashboard size={18} />, label: 'Dashboard' },
      {
        path: '/ammo',
        icon: <CartridgesIcon size={18} />,
        label: isReloading ? 'Ammo & Reloading' : 'Ammunition',
        activePaths: isReloading ? ['/ammo', '/components'] : ['/ammo'],
      },
      {
        path: '/accessories',
        icon: <AccessoriesNavIcon size={18} />,
        label: 'Accessories',
      },
      {
        path: '/storage',
        icon: <SafeIcon size={18} />,
        label: 'Storage',
      },
    ];
    return items;
  }, [isInstalled]);

  const modulesNavItems = useMemo<LayoutNavItem[]>(() => {
    const items: LayoutNavItem[] = [];
    if (isInstalled('maintenance')) {
      items.push({
        path: '/maintenance',
        icon: <MaintenanceNavIcon size={18} />,
        label: 'Maintenance',
      });
    }
    if (isInstalled('boundbook')) {
      items.push({
        path: '/bound-book',
        icon: <BoundBookNavIcon size={18} />,
        label: 'Bound Book',
      });
    }
    if (isInstalled('ballistics')) {
      items.push({
        path: '/ballistics',
        icon: <BallisticsNavIcon size={18} />,
        label: 'Ballistics',
      });
    }
    if (isInstalled('reloading')) {
      items.push({
        path: '/load-development',
        icon: <LoadDevNavIcon size={18} />,
        label: 'Load Dev',
      });
    }
    if (isInstalled('nfa')) {
      items.push({
        path: '/nfa-tracker',
        icon: <NfaTrackerNavIcon size={18} />,
        label: 'NFA Tracker',
      });
    }
    if (isInstalled('optics')) {
      items.push({
        path: '/optics',
        icon: <ScopeIcon size={18} />,
        label: 'Optics Vault',
      });
    }
    if (isInstalled('ranges')) {
      items.push({
        path: '/ranges',
        icon: <Target size={18} />,
        label: 'Range Finder',
      });
    }
    if (isInstalled('labels')) {
      items.push({
        path: '/labels',
        icon: <Printer size={18} />,
        label: 'Label Studio',
      });
    }

    // Dynamic modules installed from disk/remote not in static paths
    const staticPaths = new Set([
      '/',
      '/ammo',
      '/accessories',
      '/storage',
      '/maintenance',
      '/bound-book',
      '/ballistics',
      '/load-development',
      '/nfa-tracker',
      '/optics',
      '/ranges',
      '/labels',
    ]);

    activeNavItems.forEach((nav) => {
      if (!staticPaths.has(nav.path) && isInstalled(nav.path.replace(/^\//, ''))) {
        items.push({
          path: nav.path,
          icon: <Blocks size={18} />,
          label: nav.label,
        });
      }
    });

    return items;
  }, [isInstalled, activeNavItems]);

  return (
    <GlobalFileDropZone>
      <div className={`app-layout ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      {/* Ambient background mesh & grid */}
      <div className="bg-mesh" aria-hidden="true"></div>
      <div className="bg-grid" aria-hidden="true"></div>

      {/* ─── Collapsible Sidebar ─── */}
      <aside className={`app-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Sidebar Brand */}
        <div className="sidebar-brand" onClick={() => navigate('/')}>
          <div className="topbar-brand-icon">
            <Shield size={20} className="text-accent-color" />
          </div>
          {!sidebarCollapsed && (
            <div className="sidebar-brand-text">
              <span>ArmoryVault</span>
              <span className="topbar-version-tag">v{packageJson.version}</span>
            </div>
          )}
        </div>

        {/* Primary Nav Group */}
        <nav className="sidebar-nav">
          <div className="sidebar-nav-group">
            {!sidebarCollapsed && <div className="sidebar-group-label">Vault</div>}
            {vaultNavItems.map((item) => (
              <button
                key={item.path}
                className={`sidebar-nav-link ${
                  item.activePaths
                    ? item.activePaths.some((p) => isActive(p))
                      ? 'active'
                      : ''
                    : isActive(item.path)
                }`}
                onClick={() => navigate(item.path)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}
          </div>

          <div className="sidebar-nav-divider" />

          {/* Modules Nav Group */}
          <div className="sidebar-nav-group">
            {!sidebarCollapsed ? (
              <div className="sidebar-group-label sidebar-group-header">
                <span>Modules</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    openModuleCenter();
                  }}
                  title="Open Module Center"
                  className="sidebar-group-btn"
                >
                  <PlusCircle size={14} />
                </button>
              </div>
            ) : null}

            {modulesNavItems.map((item) => (
              <button
                key={item.path}
                className={`sidebar-nav-link ${isActive(item.path)}`}
                onClick={() => navigate(item.path)}
                title={sidebarCollapsed ? item.label : undefined}
              >
                {item.icon}
                {!sidebarCollapsed && <span>{item.label}</span>}
              </button>
            ))}

            {modulesNavItems.length === 0 && (
              <button
                type="button"
                className="sidebar-nav-link sidebar-add-modules-dashed"
                onClick={() => openModuleCenter()}
                title="Browse & Install Modules"
              >
                <PlusCircle size={16} />
                {!sidebarCollapsed && <span>Add Modules...</span>}
              </button>
            )}
          </div>
        </nav>

        {/* Sidebar Footer — Collapse Toggle + Sync + Modules + Settings */}
        <div className="sidebar-footer">
          <button
            className={`sidebar-nav-link pos-relative ${isActive('/sync') ? 'active' : ''}`}
            onClick={() => navigate('/sync')}
            title={sidebarCollapsed ? 'Mobile Sync' : undefined}
          >
            <Smartphone size={18} />
            {!sidebarCollapsed && <span>Mobile Sync</span>}
            {syncQueueCount > 0 && <span className="sidebar-badge">{syncQueueCount}</span>}
          </button>
          <button
            className="sidebar-nav-link"
            onClick={() => openModuleCenter()}
            title={sidebarCollapsed ? 'Modules' : undefined}
          >
            <Blocks size={18} />
            {!sidebarCollapsed && <span>Modules</span>}
          </button>
          <button
            className="sidebar-nav-link"
            onClick={() => setIsSkuManagerOpen(true)}
            title={sidebarCollapsed ? 'SKU & Barcodes' : undefined}
          >
            <Barcode size={18} />
            {!sidebarCollapsed && <span>SKUs & Barcodes</span>}
          </button>
          <button
            className="sidebar-nav-link"
            onClick={() => setIsSettingsOpen(true)}
            title={sidebarCollapsed ? 'Settings' : undefined}
          >
            <Settings size={18} />
            {!sidebarCollapsed && <span>Settings</span>}
          </button>
          <button
            className="sidebar-collapse-btn"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* ─── Main Area (Topbar + Content) ─── */}
      <div className="app-main-area">
        <header className="app-topbar">
          {/* Slim topbar — just actions */}
          <div className="topbar-actions topbar-actions-right">
            {/* Privacy / Discretion Shield Mode Button */}
            <button
              className={`btn-secondary btn-topbar-privacy ${privacyMode ? 'privacy-active-badge' : ''}`}
              onClick={handleTogglePrivacy}
              title={
                privacyMode
                  ? 'Privacy Shield Active: Serials, valuations, and safe locations masked. Click to unmask.'
                  : 'Public / Privacy Shield: Click to mask sensitive serials, safe names, and valuations.'
              }
            >
              {privacyMode ? (
                <EyeOff size={16} className="text-danger-color" />
              ) : (
                <Eye size={16} className="text-muted-color" />
              )}
              <span>{privacyMode ? 'Privacy ON' : 'Privacy'}</span>
            </button>

            <button
              className="btn-secondary btn-topbar-action"
              onClick={() => setIsRangeModalOpen(true)}
              title="Quickly log rounds fired and deduct ammo in one action"
            >
              <Target size={16} className="text-accent-color" />
              <span>Log Range Trip</span>
            </button>

            <button
              onClick={() => navigate('/add')}
              className="btn-primary btn-topbar-primary"
            >
              <PlusCircle size={16} />
              <span>Add Firearm</span>
            </button>

            {onLockVault && (
              <button
                className="btn-icon text-warning-color"
                onClick={onLockVault}
                title="Lock Vault"
              >
                <Lock size={18} />
              </button>
            )}
          </div>
        </header>

        <main className="main-content" ref={mainContentRef}>
          {updateStatus !== 'idle' && (
            <div className="banner-update">
              <div className="banner-update-content">
                {updateStatus === 'downloading' ? (
                  <DownloadCloud className="text-accent-color" size={24} />
                ) : (
                  <RefreshCw className="text-success-color" size={24} />
                )}
                <div>
                  <strong className="banner-update-title">
                    {updateStatus === 'downloading' ? 'Downloading Update...' : 'Update Ready'}
                  </strong>
                  <span className="banner-update-desc">
                    {updateStatus === 'downloading'
                      ? `A new version of ArmoryVault is downloading (${downloadProgress}%).`
                      : 'A new version has been downloaded and is ready to install.'}
                  </span>
                </div>
              </div>
              {updateStatus === 'downloading' && (
                <div className="banner-update-progress-track">
                  <div
                    className="banner-update-progress-fill"
                    style={{
                      width: `${downloadProgress}%`,
                    }}
                  ></div>
                </div>
              )}
              {updateStatus === 'ready' && (
                <div className="banner-update-actions">
                  {platform !== 'darwin' && (
                    <button
                      className="btn-primary btn-update-banner"
                      onClick={handleRestart}
                      title="Restart to install the update automatically"
                    >
                      Restart & Install
                    </button>
                  )}
                  {platform === 'darwin' && (
                    <button
                      className="btn-primary btn-update-banner"
                      onClick={() => {
                        if (window.api && window.api.openUrl) {
                          window.api.openUrl(
                            'https://github.com/cook0001/ArmoryVault/releases/latest'
                          );
                        }
                      }}
                      title="Download the newest installer from GitHub"
                    >
                      Download Mac Update
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          <Outlet />
        </main>
      </div>

      {/* ─── Modals (Lazy Loaded & Isolated) ─── */}
      <React.Suspense fallback={null}>
        {isSettingsOpen && (
          <SettingsModal
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            onLockVault={onLockVault}
            onOpenChangePassword={() => setIsChangePasswordOpen(true)}
            onOpenRecoveryKey={() => setIsRecoveryKeyModalOpen(true)}
            onOpenActivityLog={() => setIsActivityLogOpen(true)}
            onSettingsSaved={() => {
              loadSyncQueue();
              window.dispatchEvent(new Event('armoryvault-reload'));
            }}
          />
        )}

        {isSkuManagerOpen && (
          <SkuManagerModal isOpen={isSkuManagerOpen} onClose={() => setIsSkuManagerOpen(false)} />
        )}

        {isActivityLogOpen && (
          <ActivityLogModal
            isOpen={isActivityLogOpen}
            onClose={() => setIsActivityLogOpen(false)}
          />
        )}

        {isRangeModalOpen && (
          <RangeSessionModal
            isOpen={isRangeModalOpen}
            onClose={() => setIsRangeModalOpen(false)}
            onSaved={() => {
              loadSyncQueue();
              window.dispatchEvent(new Event('armoryvault-reload'));
            }}
          />
        )}

        {isChangePasswordOpen && (
          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
          />
        )}

        {isRecoveryKeyModalOpen && (
          <RecoveryKeyModal
            isOpen={isRecoveryKeyModalOpen}
            onClose={() => setIsRecoveryKeyModalOpen(false)}
          />
        )}

        {isModuleCenterOpen && (
          <ModuleCenterModal
            isOpen={isModuleCenterOpen}
            onClose={closeModuleCenter}
            targetModuleId={targetModuleId}
          />
        )}
      </React.Suspense>
      </div>
    </GlobalFileDropZone>
  );
};
