import React, { useState, useEffect, useCallback } from 'react';
import { 
  Wifi, WifiOff, Database, RefreshCw, 
  Smartphone, Bell, Trash2, ShieldCheck, 
  Layers, LogOut, Server, CheckCheck
} from 'lucide-react';
import MobileApp from './components/MobileApp';
import SyncEngineInspector from './components/SyncEngineInspector';
import RetroUSSDSimulator from './components/RetroUSSDSimulator';
import { buildApiUrl } from './utils/api';

const SERVER_URL = buildApiUrl('');

const formatTimestamp = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleTimeString();
};

function App() {
  // Network and Dashboard States
  const [networkStatus, setNetworkStatus] = useState('online'); // 'online' | 'offline'
  const [syncLogs, setSyncLogs] = useState([]);
  const [serverDbState, setServerDbState] = useState({ listings: [], messages: [], prices: [] });
  const [serverOnline, setServerOnline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Local Storage DB Mock (Simulating WatermelonDB)
  const [localDb, setLocalDb] = useState(() => {
    const saved = localStorage.getItem('okuani_local_db');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse local DB, initializing empty", e);
      }
    }
    return {
      listings: [],
      messages: [],
      prices: []
    };
  });

  const [lastSyncTime, setLastSyncTime] = useState(() => {
    const saved = localStorage.getItem('okuani_last_sync');
    return saved ? parseInt(saved, 10) : 0;
  });

  // App Client Navigation States
  const [currentScreen, setCurrentScreen] = useState('welcome'); // 'welcome', 'farmer', 'buyer', 'prices', 'chat'
  const [activeRole, setActiveRole] = useState(null); // 'farmer' | 'buyer'
  const [chatRecipient, setChatRecipient] = useState(null); // Farmer listing object or Buyer ID
  const [smsAlert, setSmsAlert] = useState(null);

  // Sync Logger helper
  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setSyncLogs(prev => [{ time: timestamp, text: message, type }, ...prev].slice(0, 100));
  }, []);

  // Save local db changes
  useEffect(() => {
    localStorage.setItem('okuani_local_db', JSON.stringify(localDb));
  }, [localDb]);

  useEffect(() => {
    localStorage.setItem('okuani_last_sync', lastSyncTime.toString());
  }, [lastSyncTime]);

  // Fetch SQLite Server Database State (for Control Panel Monitor)
  const fetchServerDb = useCallback(async () => {
    if (networkStatus === 'offline') {
      setServerOnline(false);
      return;
    }
    try {
      const res = await fetch(`${SERVER_URL}/api/db-state`);
      if (res.ok) {
        const data = await res.json();
        setServerDbState(data);
        setServerOnline(true);
      } else {
        setServerOnline(false);
      }
    } catch (e) {
      setServerOnline(false);
    }
  }, [networkStatus]);

  // Trigger db pull on network status change or load
  useEffect(() => {
    fetchServerDb();
    const interval = setInterval(fetchServerDb, 5000);
    return () => clearInterval(interval);
  }, [fetchServerDb]);

  // Seed local prices from server if online
  const cachePricesLocally = useCallback(async () => {
    if (networkStatus === 'offline') return;
    try {
      const res = await fetch(`${SERVER_URL}/api/prices`);
      if (res.ok) {
        const data = await res.json();
        setLocalDb(prev => ({
          ...prev,
          prices: data
        }));
        addLog(`Cached ${data.length} market price entries from server to local storage`, 'success');
      }
    } catch (e) {
      addLog('Failed to pre-fetch price dashboard. Offline cache will be used.', 'warning');
    }
  }, [networkStatus, addLog]);

  useEffect(() => {
    if (networkStatus === 'online') {
      cachePricesLocally();
    }
  }, [networkStatus, cachePricesLocally]);

  // The Offline-First Sync Core Mechanism
  const syncData = useCallback(async () => {
    if (networkStatus === 'offline') {
      addLog('Synchronization aborted: Device is in OFFLINE mode.', 'error');
      return;
    }
    setIsSyncing(true);
    addLog('Beginning local database synchronization...', 'info');

    // 1. Gather all local unsynced records
    const unsyncedListings = localDb.listings.filter(l => !l.synced);
    const unsyncedMessages = localDb.messages.filter(m => !m.synced);

    addLog(`Scanning local outbox: ${unsyncedListings.length} listing(s), ${unsyncedMessages.length} message(s) queued.`, 'info');

    try {
      // 2. Perform Sync API Call
      const response = await fetch(`${SERVER_URL}/api/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lastSync: lastSyncTime,
          changes: {
            listings: unsyncedListings,
            messages: unsyncedMessages
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      const syncResult = await response.json();
      const { serverTime, changes, logs: serverLogs } = syncResult;

      // Log server sync decisions
      if (serverLogs && serverLogs.length > 0) {
        serverLogs.forEach(log => addLog(log, 'warning'));
      }

      setLocalDb(prev => {
        // Merge Server Listings into Local listings
        let updatedListings = [...prev.listings];
        
        // Mark all pushed listings as synced
        updatedListings = updatedListings.map(item => {
          if (unsyncedListings.some(ul => ul.id === item.id)) {
            return { ...item, synced: true };
          }
          return item;
        });

        // Add or merge received listings from server
        if (changes.listings && changes.listings.length > 0) {
          changes.listings.forEach(serverItem => {
            const localIndex = updatedListings.findIndex(li => li.id === serverItem.id);
            if (localIndex > -1) {
              const localItem = updatedListings[localIndex];
              // Resolve conflict: If local is modified and not synced, compare timestamps
              if (!localItem.synced) {
                if (localItem.updated_at >= serverItem.updated_at) {
                  // Local is newer, keep local (it will sync on next run)
                  addLog(`Sync merge conflict for listing ${serverItem.crop}: keeping local version (newer).`, 'warning');
                } else {
                  // Server is newer, overwrite local
                  updatedListings[localIndex] = { ...serverItem, synced: true };
                  addLog(`Sync merge conflict for listing ${serverItem.crop}: server version overwrote local (older local).`, 'warning');
                }
              } else {
                // Already synced, overwrite safely
                updatedListings[localIndex] = { ...serverItem, synced: true };
              }
            } else {
              // New listing from another client
              updatedListings.push({ ...serverItem, synced: true });
            }
          });
        }

        // Merge Server Messages
        let updatedMessages = [...prev.messages];

        // Mark pushed messages as synced
        updatedMessages = updatedMessages.map(msg => {
          if (unsyncedMessages.some(um => um.id === msg.id)) {
            return { ...msg, synced: true };
          }
          return msg;
        });

        // Add received messages
        if (changes.messages && changes.messages.length > 0) {
          changes.messages.forEach(serverMsg => {
            const exists = updatedMessages.some(um => um.id === serverMsg.id);
            if (!exists) {
              updatedMessages.push({ ...serverMsg, synced: true });
              
              // Trigger a simulated SMS alert if the active screen is not Chat and we receive a message
              if (currentScreen !== 'chat') {
                setSmsAlert({
                  text: `New Buyer Message: "${serverMsg.content.substring(0, 30)}..."`
                });
              }
            }
          });
        }

        return {
          ...prev,
          listings: updatedListings,
          messages: updatedMessages
        };
      });

      // Update sync time
      setLastSyncTime(serverTime);
      addLog(`Sync successful. Database synchronized with server at ${new Date(serverTime).toLocaleTimeString()}`, 'success');
      
      // Update monitor DB view
      fetchServerDb();
    } catch (err) {
      addLog(`Sync failed: Backend unreachable. Changes kept in offline queue.`, 'error');
      console.error(err);
    } finally {
      setIsSyncing(false);
    }
  }, [networkStatus, localDb, lastSyncTime, currentScreen, addLog, fetchServerDb]);

  // Auto-sync when toggling network back online
  useEffect(() => {
    if (networkStatus === 'online') {
      syncData();
    }
  }, [networkStatus]);

  // Custom function to reset simulation databases (local and server)
  const handleResetAll = async () => {
    // Clear local storage
    localStorage.removeItem('okuani_local_db');
    localStorage.removeItem('okuani_last_sync');
    setLocalDb({ listings: [], messages: [], prices: [] });
    setLastSyncTime(0);
    setSyncLogs([]);
    addLog('Local client database wiped clean.', 'info');

    // Wipe server database
    if (networkStatus === 'online') {
      try {
        const res = await fetch(`${SERVER_URL}/api/db-reset`, { method: 'POST' });
        if (res.ok) {
          addLog('SQLite server database successfully reset and re-seeded.', 'success');
          fetchServerDb();
          cachePricesLocally();
        }
      } catch (e) {
        addLog('Failed to reach backend to reset server DB.', 'error');
      }
    }
  };

  return (
    <div className="workspace-container">
      {/* LEFT COLUMN: INTERACTIVE SMARTPHONE SIMULATOR */}
      <div className="simulator-panel">
        <div className="smartphone-shell">
          <div className="smartphone-notch">
            <div className="smartphone-camera"></div>
            <div className="smartphone-speaker"></div>
          </div>
          
          <div className="smartphone-screen">
            {/* Network Indicator / Header Inside Phone Screen */}
            <div className="app-header">
              <div className="app-brand">
                OKUANI <span>OFFLINE-1ST</span>
              </div>
              <div className="app-header-icons">
                {networkStatus === 'online' ? (
                  <Wifi size={16} className="status-synced" title="Network Connected" />
                ) : (
                  <WifiOff size={16} className="status-pending" title="No Network Connection" />
                )}
                {localDb.listings.some(l => !l.synced) || localDb.messages.some(m => !m.synced) ? (
                  <Database size={16} className="status-pending" title="Offline updates waiting to sync" />
                ) : (
                  <CheckCheck size={16} className="status-synced" title="All changes synced" />
                )}
              </div>
            </div>

            {/* App Internal SMS Alert Banner */}
            {smsAlert && (
              <div className="sms-notification-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Bell size={14} style={{ color: 'var(--accent)' }} />
                  <span>{smsAlert.text}</span>
                </div>
                <button 
                  onClick={() => setSmsAlert(null)} 
                  style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '10px' }}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Screen Content Wrapper */}
            <div className="app-content">
              <MobileApp 
                currentScreen={currentScreen} 
                setCurrentScreen={setCurrentScreen} 
                activeRole={activeRole} 
                setActiveRole={setActiveRole}
                localDb={localDb}
                setLocalDb={setLocalDb}
                networkStatus={networkStatus}
                chatRecipient={chatRecipient}
                setChatRecipient={setChatRecipient}
                addLog={addLog}
                syncData={syncData}
              />
            </div>

            {/* App Navigation (Hidden on welcome screen) */}
            {currentScreen !== 'welcome' && (
              <div className="app-nav">
                <button 
                  className={`nav-item ${activeRole === 'farmer' && currentScreen === 'farmer' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRole('farmer');
                    setCurrentScreen('farmer');
                  }}
                >
                  <Smartphone />
                  <span>Farmer Port</span>
                </button>
                <button 
                  className={`nav-item ${activeRole === 'buyer' && currentScreen === 'buyer' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveRole('buyer');
                    setCurrentScreen('buyer');
                  }}
                >
                  <Layers />
                  <span>Buyer Port</span>
                </button>
                <button 
                  className={`nav-item ${currentScreen === 'prices' ? 'active' : ''}`}
                  onClick={() => setCurrentScreen('prices')}
                >
                  <RefreshSlant />
                  <span>Market Prices</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: DEVELOPER CONSOLE & MONITORS */}
      <div className="console-panel">
        <div className="console-header">
          <div className="console-title">
            <Server size={22} />
            <span>OKUANI Project Defense Control Panel</span>
          </div>
          
          <div className={`network-badge-dash ${networkStatus === 'online' ? 'badge-online' : 'badge-offline'}`}>
            {networkStatus === 'online' ? (
              <>
                <Wifi size={14} /> Network Connected (Online)
              </>
            ) : (
              <>
                <WifiOff size={14} /> Network Interrupted (Offline)
              </>
            )}
          </div>
        </div>

        <div className="console-grid">
          {/* Console Top Area: Simulated controls + USSD keypad */}
          <div className="console-top">
            <div className="controls-card">
              <h3 style={{ fontSize: '15px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={16} style={{ color: 'var(--primary-light)' }} /> Network Link Simulation
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--dash-text-muted)', lineHeight: '1.4' }}>
                Toggle network connectivity to test the <strong>offline-first design</strong>. Add crop listings or send messages while <strong>Offline</strong> inside the app. Switch back to <strong>Online</strong> to see background auto-sync trigger.
              </p>

              <div className="network-toggle-buttons">
                <button 
                  className={`net-btn ${networkStatus === 'online' ? 'active-online' : ''}`}
                  onClick={() => setNetworkStatus('online')}
                >
                  <Wifi size={16} /> Connect Online
                </button>
                <button 
                  className={`net-btn ${networkStatus === 'offline' ? 'active-offline' : ''}`}
                  onClick={() => setNetworkStatus('offline')}
                >
                  <WifiOff size={16} /> Simulate Offline
                </button>
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                <button 
                  onClick={syncData} 
                  disabled={isSyncing || networkStatus === 'offline'}
                  className="btn-primary" 
                  style={{ padding: '8px 12px', fontSize: '12px', flex: 1 }}
                >
                  <RefreshCw size={14} className={isSyncing ? 'spin-icon' : ''} /> Force Trigger Sync
                </button>
                <button 
                  onClick={handleResetAll} 
                  className="btn-outline" 
                  style={{ padding: '8px 12px', fontSize: '12px', borderColor: 'var(--danger)', color: 'var(--danger)' }}
                >
                  <Trash2 size={14} style={{ marginRight: '6px' }} /> Clear DBs
                </button>
              </div>
            </div>

            {/* Retro Nokia USSD Dialer Section */}
            <div className="nokia-panel">
              <RetroUSSDSimulator 
                serverUrl={SERVER_URL} 
                networkStatus={networkStatus} 
                addLog={addLog}
                fetchServerDb={fetchServerDb}
              />
            </div>
          </div>

          {/* Console Bottom Area: Server DB + Client Sync Engine Logs */}
          <div className="console-bottom">
            {/* Server DB Monitor */}
            <div className="card-inspector">
              <div className="inspector-header">
                <div className="inspector-title">
                  <Database size={16} style={{ color: 'var(--success)' }} />
                  <span>SQLite Server Database Monitor</span>
                </div>
                <span style={{ fontSize: '10px', color: serverOnline ? 'var(--success)' : 'var(--danger)' }}>
                  {serverOnline ? 'Connected (Active)' : 'Offline'}
                </span>
              </div>
              <div className="inspector-content">
                <div className="db-stat-row">
                  <div className="db-stat-card">
                    <div className="db-stat-num">{serverDbState.listings.filter(l => !l.deleted).length}</div>
                    <div className="db-stat-lbl">Listings</div>
                  </div>
                  <div className="db-stat-card">
                    <div className="db-stat-num">{serverDbState.messages.length}</div>
                    <div className="db-stat-lbl">Messages</div>
                  </div>
                  <div className="db-stat-card">
                    <div className="db-stat-num">{serverDbState.prices.length}</div>
                    <div className="db-stat-lbl">Price Feeds</div>
                  </div>
                </div>

                <div className="db-table-wrapper">
                  <h4 style={{ fontSize: '11px', color: 'var(--dash-text-muted)', marginBottom: '6px' }}>LISTINGS TABLE</h4>
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Farmer</th>
                        <th>Crop</th>
                        <th>Qty</th>
                        <th>Price</th>
                        <th>Sync TS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverDbState.listings.length === 0 ? (
                        <tr><td colSpan="6" style={{ textAlign: 'center', color: 'var(--dash-text-muted)' }}>No data in server SQLite</td></tr>
                      ) : (
                        serverDbState.listings.map(l => (
                          <tr key={l.id} style={{ opacity: l.deleted ? 0.4 : 1 }}>
                            <td>{l.id}</td>
                            <td>{l.farmer_name}</td>
                            <td>{l.crop}</td>
                            <td>{l.quantity} {l.unit}</td>
                            <td>GHS {l.price}</td>
                            <td>{formatTimestamp(l.updated_at)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="db-table-wrapper">
                  <h4 style={{ fontSize: '11px', color: 'var(--dash-text-muted)', marginBottom: '6px' }}>MESSAGES TABLE</h4>
                  <table className="db-table">
                    <thead>
                      <tr>
                        <th>Sender</th>
                        <th>Receiver</th>
                        <th>Content</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {serverDbState.messages.length === 0 ? (
                        <tr><td colSpan="4" style={{ textAlign: 'center', color: 'var(--dash-text-muted)' }}>No messages in database</td></tr>
                      ) : (
                        serverDbState.messages.map(m => (
                          <tr key={m.id}>
                            <td>{m.sender_id === 'local-client' ? 'Buyer (App)' : m.sender_id.substring(0,6)}</td>
                            <td>{m.receiver_id === 'local-client' ? 'Buyer (App)' : m.receiver_id.substring(0,6)}</td>
                            <td>{m.content}</td>
                            <td>{formatTimestamp(m.timestamp)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Sync Engine Log Monitor */}
            <div className="card-inspector">
              <div className="inspector-header">
                <div className="inspector-title">
                  <RefreshCw size={16} style={{ color: 'var(--info)' }} />
                  <span>Sync Engine Live Telemetry</span>
                </div>
                <span style={{ fontSize: '10px', color: 'var(--dash-text-muted)' }}>
                  WatermelonDB client protocols
                </span>
              </div>
              <div className="inspector-content" style={{ padding: '12px' }}>
                <SyncEngineInspector logs={syncLogs} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
