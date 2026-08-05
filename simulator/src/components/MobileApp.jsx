import React, { useEffect, useRef, useState } from 'react';
import {
  User, ShoppingBag, Plus, MapPin,
  Phone, Send, ArrowLeft, RefreshCw,
  Search, Filter, TrendingUp, TrendingDown, Minus, DollarSign,
  AlertCircle, Check, CheckCheck, WifiOff, Trash2, ChevronRight,
  Camera, Upload, X, Star, Clock, Lightbulb, ChevronDown
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ReferenceDot, BarChart, Bar, Cell, LabelList
} from 'recharts';
import SignUpScreen from './screens/SignUpScreen';
import LoginScreen from './screens/LoginScreen';
import ForgotPasswordRequestScreen from './screens/ForgotPasswordRequestScreen';
import VerifyCodeScreen from './screens/VerifyCodeScreen';
import ResetPasswordScreen from './screens/ResetPasswordScreen';
import ProfileScreen from './screens/ProfileScreen';
import ConversationsScreen from './screens/ConversationsScreen';
import { useProfile } from '../hooks/useProfile';
import { useMarketPrices } from '../hooks/useMarketPrices';
import { buildApiUrl } from '../utils/api';
import { fileToDataUri, estimateBase64Bytes, MAX_PHOTO_BYTES } from '../utils/image';

const TREND_PERIODS = [
  { key: '7d', label: '7D' },
  { key: '30d', label: '30D' },
  { key: '3m', label: '3M' },
  { key: '6m', label: '6M' },
  { key: '1y', label: '1Y' },
];

function formatGHS(value) {
  return typeof value === 'number' ? `GHS ${value.toFixed(2)}/kg` : '—';
}

function TrendBadge({ trend, percentChange, size = 12 }) {
  const color =
    trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--app-text-muted)';
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', color, fontWeight: 700 }}>
      <Icon size={size} />
      {percentChange != null ? `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%` : 'New'}
    </span>
  );
}

// Derives everything "Best Prices Today" needs from the already-fetched
// per crop+market summary rows — no dedicated backend endpoint, since this
// is all a client-side aggregation over GET /api/prices/summary.
function buildBestPrices(summaryRows) {
  const byCrop = summaryRows.reduce((acc, row) => {
    if (!acc[row.crop]) acc[row.crop] = [];
    acc[row.crop].push(row);
    return acc;
  }, {});

  const perCrop = Object.keys(byCrop).map((crop) => {
    const ranked = [...byCrop[crop]].sort((a, b) => a.current - b.current);
    const cheapest = ranked[0];
    const highest = ranked[ranked.length - 1];
    return { crop, ranked, cheapest, highest, difference: highest.current - cheapest.current };
  });

  const bars = perCrop
    .map((c) => ({ crop: c.crop, price: c.cheapest.current, market_name: c.cheapest.market_name, region: c.cheapest.region }))
    .sort((a, b) => a.price - b.price);

  const lowestOverall = bars[0] || null;
  const largestDifference = perCrop.reduce(
    (max, c) => (!max || c.difference > max.difference ? c : max),
    null
  );

  return { perCrop, bars, lowestOverall, largestDifference };
}

function formatLastUpdated(timestamp) {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  const isToday = date.toDateString() === new Date().toDateString();
  const time = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `Today, ${time}` : `${date.toLocaleDateString()}, ${time}`;
}

export default function MobileApp({
  currentScreen,
  setCurrentScreen,
  activeRole,
  setActiveRole,
  localDb,
  setLocalDb,
  networkStatus,
  chatRecipient,
  setChatRecipient,
  trendProduct,
  setTrendProduct,
  addLog,
  syncData,
  auth,
  resetContext,
  setResetContext,
  onAuthSuccess,
  onContinueAsGuest,
  onCancelAuth,
  openAuthScreen,
  onViewProfile,
  viewedProfileId,
  onProfileBack,
  onLogout,
  onShareProfile,
  onConversationsBack
}) {
  // New Listing Form States
  const [farmerName, setFarmerName] = useState(auth?.user?.name || '');

  // The lazy useState initializer above only runs once at mount, so it never
  // picks up a later identity change — e.g. logging out and continuing as
  // guest left the previous account's name sitting in this field. Reset it
  // whenever the signed-in identity actually changes (not on every render,
  // and not while the user is just editing the field).
  useEffect(() => {
    setFarmerName(auth?.user?.name || '');
  }, [auth?.user?.name]);
  const [crop, setCrop] = useState('White Maize');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('Bags');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Techiman');
  const [phone, setPhone] = useState('+233244123456');
  const [photoDataUri, setPhotoDataUri] = useState(null);

  // Search/Filter States for Buyer
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('All');
  const [showMoreFilters, setShowMoreFilters] = useState(false);
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minQuantity, setMinQuantity] = useState('');

  // Active Chat Message State
  const [chatMessage, setChatMessage] = useState('');

  // "Buyers who contacted you" (Farmer Portal)
  const profileApi = useProfile(auth || {});
  const [contacts, setContacts] = useState([]);

  useEffect(() => {
    if (!auth?.token) return;
    profileApi
      .getContacts()
      .then(setContacts)
      .catch(() => setContacts([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth?.token]);

  // Product Price Trend screen state (period filter + fetched history series)
  const marketApi = useMarketPrices();
  const [trendPeriod, setTrendPeriod] = useState('30d');
  const [trendHistory, setTrendHistory] = useState(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState(null);

  // Redirect back to the dashboard if this screen is reached without a
  // selected product (e.g. stale nav state) — done as an effect, not inline
  // during render, since setCurrentScreen updates a different component
  // (App)'s state and mustn't be called mid-render.
  useEffect(() => {
    if (currentScreen === 'productTrend' && !trendProduct) {
      setCurrentScreen('prices');
    }
  }, [currentScreen, trendProduct, setCurrentScreen]);

  // Tracks the previously-viewed product so a product switch can reset the
  // period AND fetch with that reset period in the same effect run — doing
  // this as two separate effects (reset, then fetch) meant the fetch effect
  // still closed over the stale pre-reset period for one wasted request.
  const prevTrendProductKeyRef = useRef(null);

  useEffect(() => {
    if (currentScreen !== 'productTrend' || !trendProduct) return;

    const productKey = `${trendProduct.crop}|${trendProduct.market_name}`;
    const isNewProduct = productKey !== prevTrendProductKeyRef.current;
    prevTrendProductKeyRef.current = productKey;
    const effectivePeriod = isNewProduct ? '30d' : trendPeriod;
    if (isNewProduct && trendPeriod !== '30d') {
      setTrendPeriod('30d');
    }

    if (networkStatus === 'offline') {
      setTrendHistory(null);
      setTrendError('offline');
      return;
    }
    let cancelled = false;
    setTrendLoading(true);
    setTrendError(null);
    marketApi
      .getHistory({ crop: trendProduct.crop, marketName: trendProduct.market_name, period: effectivePeriod })
      .then((data) => {
        if (cancelled) return;
        setTrendHistory(data);
        setTrendLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setTrendError(err.message || 'Failed to load price history');
        setTrendLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, trendProduct, trendPeriod, networkStatus]);

  // Marking a thread read when the chat screen is open. Kept as an
  // unconditional top-level effect (guarded internally by currentScreen)
  // rather than inside the `if (currentScreen === 'chat')` block below,
  // since that block early-returns on other screens and a conditionally-
  // called hook would violate the Rules of Hooks across screen navigations.
  // Runs for both entry points — the buyer's "Chat" button and the
  // conversations list — so mark-read isn't duplicated in either. The
  // header's unread badge is derived live from localDb.messages, so this
  // updates it immediately.
  useEffect(() => {
    const ownerId = auth?.ownerId;
    const chatRecipientId = chatRecipient ? (chatRecipient.owner_id || chatRecipient.phone || chatRecipient.farmer_name) : null;
    if (currentScreen !== 'chat' || !ownerId || !chatRecipientId) return;

    const hasUnread = localDb.messages.some(
      (m) => m.sender_id === chatRecipientId && m.receiver_id === ownerId && !m.read
    );
    if (!hasUnread) return;

    setLocalDb((prev) => ({
      ...prev,
      messages: prev.messages.map((m) =>
        m.sender_id === chatRecipientId && m.receiver_id === ownerId && !m.read
          ? { ...m, read: 1, synced: false }
          : m
      ),
    }));
    if (networkStatus === 'online') {
      setTimeout(syncData, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentScreen, chatRecipient, auth?.ownerId, localDb.messages]);

  // Shared by the buyer marketplace's "Chat" button and the conversations
  // list screen, so both entry points open the exact same single-thread chat.
  const openChatWith = (recipient) => {
    setChatRecipient(recipient);
    setCurrentScreen('chat');
  };

  // 0. AUTH SCREENS (sign up / login / forgot password flow)
  if (currentScreen === 'signup') {
    return (
      <SignUpScreen
        auth={auth}
        onSuccess={onAuthSuccess}
        onNavigateLogin={() => setCurrentScreen('login')}
        onContinueGuest={onContinueAsGuest}
        onBack={onCancelAuth}
      />
    );
  }
  if (currentScreen === 'login') {
    return (
      <LoginScreen
        auth={auth}
        onSuccess={onAuthSuccess}
        onNavigateSignUp={() => setCurrentScreen('signup')}
        onNavigateForgot={() => setCurrentScreen('forgot-request')}
        onContinueGuest={onContinueAsGuest}
        onBack={onCancelAuth}
      />
    );
  }
  if (currentScreen === 'forgot-request') {
    return (
      <ForgotPasswordRequestScreen
        auth={auth}
        onCodeSent={(data) => {
          setResetContext(data);
          setCurrentScreen('forgot-verify');
        }}
        onBack={() => setCurrentScreen('login')}
      />
    );
  }
  if (currentScreen === 'forgot-verify') {
    return (
      <VerifyCodeScreen
        auth={auth}
        resetContext={resetContext}
        addLog={addLog}
        onVerified={(resetToken) => {
          setResetContext((prev) => ({ ...prev, resetToken }));
          setCurrentScreen('forgot-reset');
        }}
        onBack={() => setCurrentScreen('forgot-request')}
      />
    );
  }
  if (currentScreen === 'forgot-reset') {
    return (
      <ResetPasswordScreen
        auth={auth}
        resetContext={resetContext}
        onSuccess={onAuthSuccess}
        onBack={() => setCurrentScreen('forgot-verify')}
      />
    );
  }
  if (currentScreen === 'profile') {
    return (
      <ProfileScreen
        auth={auth}
        profileUserId={viewedProfileId || auth?.user?.id}
        onBack={onProfileBack}
        onLogout={onLogout}
        onShare={onShareProfile}
      />
    );
  }
  if (currentScreen === 'conversations') {
    return (
      <ConversationsScreen
        auth={auth}
        localDb={localDb}
        onOpenChat={openChatWith}
        onBack={onConversationsBack}
      />
    );
  }

  // 1. WELCOME SCREEN
  if (currentScreen === 'welcome') {
    return (
      <div className="welcome-screen">
        <div className="welcome-logo">
          <ShoppingBag size={40} />
        </div>
        <h2 className="welcome-title">OKUANI</h2>
        <p className="welcome-subtitle">
          Direct agricultural trade & regional price transparency, designed for rural offline access.
        </p>

        <div className="app-card" style={{ width: '100%', padding: '12px', textAlign: 'left', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', marginBottom: '4px' }}>Professional Demo Ready</div>
          <div style={{ fontSize: '12px', color: 'var(--app-text-muted)', lineHeight: 1.5 }}>
            Offline-first sync, buyer marketplace flows, market dashboards, and USSD fallback are now integrated into a more complete project experience.
          </div>
        </div>

        <button
          className="btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
          onClick={() => openAuthScreen('login')}
        >
          Continue
        </button>
      </div>
    );
  }

  // 2. FARMER PORTAL SCREEN
  if (currentScreen === 'farmer') {
    const handleAddListing = (e) => {
      e.preventDefault();
      if (!farmerName.trim() || !crop || !qty || !price || !location) {
        alert('Please fill in all listing details.');
        return;
      }

      const newListing = {
        id: 'list-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        farmer_name: farmerName,
        crop,
        quantity: parseFloat(qty),
        unit,
        price: parseFloat(price),
        location,
        phone,
        deleted: 0,
        updated_at: Date.now(),
        synced: false,
        owner_id: auth?.ownerId,
        image_base64: photoDataUri || null
      };

      setLocalDb(prev => ({
        ...prev,
        listings: [newListing, ...prev.listings]
      }));

      // Reset form fields
      setQty('');
      setPrice('');
      setPhotoDataUri(null);
      addLog(`Added ${crop} (${qty} ${unit}) to offline cache. Waiting for network to sync.`, 'info');

      // Auto-trigger sync if online
      if (networkStatus === 'online') {
        setTimeout(syncData, 500);
      }
    };

    const handlePickListingPhoto = async (e) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;

      const dataUri = await fileToDataUri(file);
      if (estimateBase64Bytes(dataUri) > MAX_PHOTO_BYTES) {
        alert('Image too large. Please choose a photo under 5MB.');
        return;
      }
      setPhotoDataUri(dataUri);
    };

    const handleDeleteListing = (id) => {
      setLocalDb(prev => ({
        ...prev,
        listings: prev.listings.map(l => {
          if (l.id === id) {
            return { ...l, deleted: 1, updated_at: Date.now(), synced: false };
          }
          return l;
        })
      }));
      addLog(`Marked listing ${id} as deleted in local cache. Sync pending.`, 'warning');
      if (networkStatus === 'online') {
        setTimeout(syncData, 500);
      }
    };

    const myListings = localDb.listings.filter(l => !l.deleted && l.owner_id === auth?.ownerId);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Farmer Portal</h2>
          <button
            className="btn-outline"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={() => {
              setActiveRole('buyer');
              setCurrentScreen('buyer');
            }}
          >
            Switch Role
          </button>
        </div>

        {/* Form to Add Listing */}
        <form onSubmit={handleAddListing} className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '4px', borderBottom: '1px solid var(--app-border)', paddingBottom: '4px' }}>
            List New Produce
          </h3>

          <div className="row-grid">
            <div className="input-group">
              <label>Farmer Name</label>
              <input className="input-control" placeholder="Your name" value={farmerName} onChange={e => setFarmerName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Phone</label>
              <input className="input-control" placeholder="+233244123456" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="row-grid">
            <div className="input-group">
              <label>Crop Type</label>
              <select className="input-control" value={crop} onChange={e => setCrop(e.target.value)}>
                <option value="White Maize">White Maize</option>
                <option value="Yam (Pona)">Yam (Pona)</option>
                <option value="Cassava">Cassava</option>
                <option value="Plantain (Apem)">Plantain (Apem)</option>
                <option value="Rice (Local)">Rice (Local)</option>
              </select>
            </div>
            <div className="input-group">
              <label>Location</label>
              <select className="input-control" value={location} onChange={e => setLocation(e.target.value)}>
                <option value="Techiman">Techiman</option>
                <option value="Kumasi">Kumasi</option>
                <option value="Tamale">Tamale</option>
                <option value="Accra">Accra</option>
              </select>
            </div>
          </div>

          <div className="row-grid">
            <div className="input-group">
              <label>Quantity</label>
              <input type="number" placeholder="e.g. 50" className="input-control" value={qty} onChange={e => setQty(e.target.value)} required />
            </div>
            <div className="input-group">
              <label>Unit</label>
              <select className="input-control" value={unit} onChange={e => setUnit(e.target.value)}>
                <option value="Bags">Bags</option>
                <option value="Tubers">Tubers</option>
                <option value="Tons">Tons</option>
                <option value="Crates">Crates</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Price per unit (GHS)</label>
            <input type="number" placeholder="GHS 350.00" className="input-control" value={price} onChange={e => setPrice(e.target.value)} required />
          </div>

          <div className="input-group">
            <label>Product Photo (optional)</label>
            {photoDataUri ? (
              <div style={{ position: 'relative' }}>
                <img src={photoDataUri} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
                <button
                  type="button"
                  onClick={() => setPhotoDataUri(null)}
                  style={{
                    position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: '50%',
                    backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: 8 }}>
                <label className="btn-outline" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', padding: '8px' }}>
                  <Camera size={14} /> Take Photo
                  <input type="file" accept="image/*" capture="environment" hidden onChange={handlePickListingPhoto} />
                </label>
                <label className="btn-outline" style={{ flex: 1, justifyContent: 'center', cursor: 'pointer', padding: '8px' }}>
                  <Upload size={14} /> Upload Photo
                  <input type="file" accept="image/*" hidden onChange={handlePickListingPhoto} />
                </label>
              </div>
            )}
          </div>

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '6px' }}>
            <Plus size={16} /> Add Listing
          </button>
        </form>

        {contacts.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '8px 0' }}>Buyers who contacted you</h3>
            <div className="app-card" style={{ padding: 0 }}>
              {contacts.map((c, i) => (
                <div
                  key={c.id}
                  onClick={() => onViewProfile?.(c.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: i < contacts.length - 1 ? '1px solid var(--app-border)' : 'none',
                  }}
                >
                  {c.avatarUrl ? (
                    <img src={buildApiUrl(c.avatarUrl)} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: 34, height: 34, borderRadius: '50%', backgroundColor: 'var(--primary-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={14} color="var(--primary)" />
                    </div>
                  )}
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                  <ChevronRight size={14} color="var(--app-text-muted)" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Farmer Listings Directory */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', margin: '8px 0' }}>My Crop Listings ({myListings.length})</h3>
          {myListings.length === 0 ? (
            <div className="app-card" style={{ textAlign: 'center', padding: '24px', color: 'var(--app-text-muted)' }}>
              No crops listed yet. Use the form above to add a listing.
            </div>
          ) : (
            myListings.map(l => (
              <div key={l.id} className="app-card" style={{ marginBottom: '10px' }}>
                {(l.image_path || l.image_base64) && (
                  <img
                    src={l.image_path ? buildApiUrl(l.image_path) : l.image_base64}
                    alt=""
                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 8 }}
                  />
                )}
                <div className="listing-header">
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{l.crop}</span>
                  <div className="listing-sync-status">
                    {l.synced ? (
                      <span className="status-synced" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <CheckCheck size={12} /> Synced
                      </span>
                    ) : (
                      <span className="status-pending" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <WifiOff size={10} /> Sync Queue
                      </span>
                    )}
                  </div>
                </div>

                <div className="listing-details">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> <span>{l.location}</span>
                  </div>
                  <div>Quantity: <strong>{l.quantity} {l.unit}</strong></div>
                </div>

                <div className="listing-price-row">
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>Asking Price</span>
                    <div className="price-value">GHS {l.price}</div>
                  </div>
                  <button 
                    onClick={() => handleDeleteListing(l.id)} 
                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 3. BUYER MARKETPLACE SCREEN
  if (currentScreen === 'buyer') {
    const activeListings = localDb.listings.filter(l => !l.deleted);

    const minPriceNum = parseFloat(minPrice);
    const maxPriceNum = parseFloat(maxPrice);
    const minQuantityNum = parseFloat(minQuantity);
    const hasMoreFiltersApplied = minPrice !== '' || maxPrice !== '' || minQuantity !== '';

    // Filter listings based on search query, location select, price range, and quantity
    const filteredListings = activeListings.filter(l => {
      const matchesSearch = l.crop.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            l.farmer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = filterLocation === 'All' || l.location === filterLocation;
      const matchesMinPrice = Number.isNaN(minPriceNum) || l.price >= minPriceNum;
      const matchesMaxPrice = Number.isNaN(maxPriceNum) || l.price <= maxPriceNum;
      const matchesQuantity = Number.isNaN(minQuantityNum) || l.quantity >= minQuantityNum;
      return matchesSearch && matchesLocation && matchesMinPrice && matchesMaxPrice && matchesQuantity;
    });

    const handleMessageFarmer = (listing) => openChatWith(listing);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Buyer Portal</h2>
          <button
            className="btn-outline"
            style={{ padding: '4px 8px', fontSize: '11px' }}
            onClick={() => {
              setActiveRole('farmer');
              setCurrentScreen('farmer');
            }}
          >
            Switch Role
          </button>
        </div>

        {/* Search Bar & Location Filter */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--app-text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search crop or farmer..." 
              className="input-control" 
              style={{ width: '100%', paddingLeft: '32px' }}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={14} style={{ color: 'var(--app-text-muted)' }} />
            <span style={{ fontSize: '12px', color: 'var(--app-text-muted)' }}>Location:</span>
            <select 
              className="input-control" 
              style={{ flex: 1, padding: '4px 8px', fontSize: '12px' }}
              value={filterLocation}
              onChange={e => setFilterLocation(e.target.value)}
            >
              <option value="All">All Regions</option>
              <option value="Techiman">Techiman</option>
              <option value="Kumasi">Kumasi</option>
              <option value="Tamale">Tamale</option>
              <option value="Accra">Accra</option>
            </select>
          </div>

          <button
            className="more-filters-toggle"
            onClick={() => setShowMoreFilters(v => !v)}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {showMoreFilters ? 'Hide price & quantity filters' : 'Price & quantity filters'}
              {hasMoreFiltersApplied && <span className="filter-active-dot" />}
            </span>
            <ChevronDown size={14} style={{ transform: showMoreFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }} />
          </button>

          {showMoreFilters && (
            <div className="more-filters-panel">
              <label className="more-filters-label">Price range (GHS)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  className="input-control"
                  style={{ flex: 1 }}
                  placeholder="Min"
                  value={minPrice}
                  onChange={e => setMinPrice(e.target.value)}
                />
                <span style={{ color: 'var(--app-text-muted)' }}>–</span>
                <input
                  type="number"
                  className="input-control"
                  style={{ flex: 1 }}
                  placeholder="Max"
                  value={maxPrice}
                  onChange={e => setMaxPrice(e.target.value)}
                />
              </div>
              <label className="more-filters-label" style={{ marginTop: '6px' }}>Minimum quantity available</label>
              <input
                type="number"
                className="input-control"
                style={{ width: '100%' }}
                placeholder="e.g. 50"
                value={minQuantity}
                onChange={e => setMinQuantity(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Marketplace Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold' }}>Available Produce ({filteredListings.length})</h3>
          
          {filteredListings.length === 0 ? (
            <div className="app-card" style={{ textAlign: 'center', padding: '24px', color: 'var(--app-text-muted)' }}>
              No crops found matching criteria.
            </div>
          ) : (
            filteredListings.map(l => (
              <div key={l.id} className="app-card">
                {l.image_path && (
                  <img
                    src={buildApiUrl(l.image_path)}
                    alt=""
                    style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)', marginBottom: 8 }}
                  />
                )}
                <div className="listing-header">
                  <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{l.crop}</span>
                  <span className="listing-badge">{l.quantity} {l.unit}</span>
                </div>

                <div className="listing-details">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={12} /> <span>{l.location}</span>
                  </div>
                  <div style={{ fontSize: '12px' }}>Listed by: <strong>{l.farmer_name}</strong></div>
                  <div style={{ fontSize: '12px' }}>Phone: <strong>{l.phone}</strong></div>
                </div>

                <div className="listing-price-row">
                  <div>
                    <span style={{ fontSize: '11px', color: 'var(--app-text-muted)' }}>Price per unit</span>
                    <div className="price-value">GHS {l.price}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {l.owner_id && onViewProfile && (
                      <button
                        onClick={() => onViewProfile(l.owner_id)}
                        className="btn-outline"
                        style={{ padding: '6px 10px', fontSize: '12px' }}
                      >
                        Profile
                      </button>
                    )}
                    <button
                      onClick={() => handleMessageFarmer(l)}
                      className="btn-primary"
                      style={{ padding: '6px 12px', fontSize: '12px' }}
                    >
                      <Send size={12} /> Chat
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 4. MARKET PRICE DASHBOARD SCREEN
  if (currentScreen === 'prices') {
    // Trend-annotated rows (current/previous/change/%/trend), cached the
    // same offline-first way as localDb.prices. Falls back to a small
    // placeholder (no trend data available yet) when nothing is cached.
    const displaySummary = localDb.priceSummary && localDb.priceSummary.length > 0
      ? localDb.priceSummary
      : (localDb.prices || []).map((p) => ({
          crop: p.crop,
          market_name: p.market_name,
          region: p.region,
          unit: 'kg',
          current: p.price_per_kg,
          previous: null,
          change: null,
          percentChange: null,
          trend: 'stable',
        }));

    const cropGrouped = displaySummary.reduce((acc, curr) => {
      if (!acc[curr.crop]) acc[curr.crop] = [];
      acc[curr.crop].push(curr);
      return acc;
    }, {});

    const openTrend = (row) => {
      setTrendProduct({ crop: row.crop, market_name: row.market_name, region: row.region });
      setCurrentScreen('productTrend');
    };

    const bestPrices = displaySummary.length > 0 ? buildBestPrices(displaySummary) : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Market Dashboard</h2>
          <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>Offline Cached</span>
        </div>

        {/* Best Prices Today: a single-series, low-to-high bar chart of each
            product's cheapest price across markets, tap a bar to drill in. */}
        {bestPrices && (
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '2px' }}>Best Prices Today</h3>
            <p style={{ fontSize: '10px', color: 'var(--app-text-muted)', marginTop: 0, marginBottom: '8px' }}>
              Lowest available market price by product — today
            </p>

            <div className="chart-container" style={{ height: Math.max(60, bestPrices.bars.length * 34) }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={bestPrices.bars}
                  layout="vertical"
                  margin={{ top: 4, right: 52, left: 4, bottom: 4 }}
                  barCategoryGap={8}
                >
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="crop"
                    type="category"
                    tick={{ fontSize: 10 }}
                    width={90}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(value, _name, item) => [formatGHS(value), item.payload.market_name]}
                    cursor={{ fill: 'var(--primary-soft)' }}
                  />
                  <Bar
                    dataKey="price"
                    fill="var(--primary)"
                    radius={[4, 4, 4, 4]}
                    maxBarSize={20}
                    onClick={(item) => openTrend(item.payload)}
                    style={{ cursor: 'pointer' }}
                  >
                    <LabelList
                      dataKey="price"
                      position="right"
                      formatter={(v) => formatGHS(v)}
                      style={{ fontSize: 10, fill: 'var(--app-text)', fontWeight: 700 }}
                    />
                    {bestPrices.bars.map((entry, idx) => (
                      <Cell key={idx} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-hint">
              <Lightbulb size={12} />
              <span>Tap on any product to see market comparison and price trends</span>
            </div>

            <div className="stat-tile-grid">
              <div className="stat-tile" style={{ backgroundColor: 'var(--primary-soft)' }}>
                <span className="stat-tile-icon"><DollarSign size={13} color="var(--primary-dark)" /></span>
                <span className="stat-tile-label">Today's Lowest Price</span>
                <strong className="stat-tile-value">{formatGHS(bestPrices.lowestOverall?.price)}</strong>
              </div>
              <div className="stat-tile" style={{ backgroundColor: 'var(--accent-light)' }}>
                <span className="stat-tile-icon"><Star size={13} color="var(--warning)" /></span>
                <span className="stat-tile-label">Most Affordable Product</span>
                <strong className="stat-tile-value">{bestPrices.lowestOverall?.crop || '—'}</strong>
              </div>
              <div className="stat-tile" style={{ backgroundColor: 'var(--info-soft)' }}>
                <span className="stat-tile-icon"><TrendingUp size={13} color="var(--info)" /></span>
                <span className="stat-tile-label">Largest Price Difference</span>
                <strong className="stat-tile-value">
                  {bestPrices.largestDifference
                    ? `${bestPrices.largestDifference.crop} — GHS ${bestPrices.largestDifference.difference.toFixed(2)} difference`
                    : '—'}
                </strong>
              </div>
              <div className="stat-tile" style={{ backgroundColor: 'var(--violet-soft)' }}>
                <span className="stat-tile-icon"><Clock size={13} color="var(--violet)" /></span>
                <span className="stat-tile-label">Last Updated</span>
                <strong className="stat-tile-value">{formatLastUpdated(localDb.priceSummaryFetchedAt)}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Crop Price Comparison list, now trend-aware. Tap a market row to
            open its full Product Price Trend chart. */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Regional Price Feeds</h3>
          {Object.keys(cropGrouped).length === 0 ? (
            <div className="app-card" style={{ padding: '16px', color: 'var(--app-text-muted)' }}>
              No price bulletins cached. Connect online to fetch latest feeds.
            </div>
          ) : (
            Object.keys(cropGrouped).map(cropName => (
              <div key={cropName} className="app-card" style={{ marginBottom: '10px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: '800', color: 'var(--primary-dark)', marginBottom: '8px' }}>
                  {cropName}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cropGrouped[cropName].map((p) => (
                    <button
                      key={p.market_name}
                      onClick={() => openTrend(p)}
                      className="price-row-btn"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        fontSize: '12px',
                        backgroundColor: 'var(--primary-soft)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '8px 10px',
                        border: 'none',
                        width: '100%',
                        textAlign: 'left',
                        cursor: 'pointer',
                      }}
                    >
                      <span style={{ color: 'var(--app-text)', fontWeight: 600 }}>{p.market_name} ({p.region})</span>
                      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <strong style={{ color: 'var(--primary-dark)' }}>{formatGHS(p.current)}</strong>
                        <span style={{ fontSize: '10px' }}>
                          <TrendBadge trend={p.trend} percentChange={p.percentChange} size={10} />
                        </span>
                      </span>
                      <ChevronRight size={14} style={{ color: 'var(--app-text-muted)', marginLeft: '4px' }} />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 4b. PRODUCT PRICE TREND SCREEN
  if (currentScreen === 'productTrend') {
    const backToPrices = () => setCurrentScreen('prices');

    if (!trendProduct) {
      // The effect above redirects back to the dashboard on the next tick;
      // render nothing for this frame rather than call setState mid-render.
      return null;
    }

    const cropSummaryRows = (localDb.priceSummary || []).filter((row) => row.crop === trendProduct.crop);
    const priceComparison = cropSummaryRows.length > 0
      ? (() => {
          const ranked = [...cropSummaryRows].sort((a, b) => a.current - b.current);
          const cheapest = ranked[0];
          const highest = ranked[ranked.length - 1];
          return { ranked, cheapest, highest, difference: highest.current - cheapest.current };
        })()
      : null;

    const points = (trendHistory?.points || []).map((pt) => ({ ...pt, label: pt.date.slice(5) }));
    const trend = trendHistory?.trend || 'stable';
    const interpretation = trendHistory
      ? `${trendProduct.crop} prices have ${
          trend === 'up' ? 'generally increased' : trend === 'down' ? 'generally decreased' : 'stayed relatively stable'
        } over the selected period.`
      : null;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={backToPrices} className="chat-back-btn" aria-label="Back to Market Dashboard">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: 'bold', lineHeight: 1.2 }}>{trendProduct.crop}</h2>
            <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>
              {trendProduct.market_name} ({trendProduct.region})
            </span>
          </div>
        </div>

        {/* Current Price Comparison: every market carrying this crop today,
            ranked cheapest to most expensive. Tapping a row also switches
            which market's historical chart is shown below. */}
        {priceComparison && priceComparison.ranked.length > 1 && (
          <div>
            <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '6px' }}>Current Price Comparison</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--app-text-muted)', marginBottom: '8px' }}>
              <span>Cheapest: <strong style={{ color: 'var(--app-text)' }}>{formatGHS(priceComparison.cheapest.current)}</strong></span>
              <span>Highest: <strong style={{ color: 'var(--app-text)' }}>{formatGHS(priceComparison.highest.current)}</strong></span>
              <span>Difference: <strong style={{ color: 'var(--app-text)' }}>GHS {priceComparison.difference.toFixed(2)}</strong></span>
            </div>
            <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {priceComparison.ranked.map((row, idx) => (
                <button
                  key={row.market_name}
                  onClick={() => setTrendProduct({ crop: trendProduct.crop, market_name: row.market_name, region: row.region })}
                  className="price-row-btn"
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '12px',
                    backgroundColor: row.market_name === trendProduct.market_name ? 'var(--primary-soft)' : 'transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 10px',
                    border: 'none',
                    width: '100%',
                    textAlign: 'left',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ color: 'var(--app-text)', fontWeight: 600 }}>
                    {idx + 1}. {row.market_name} ({row.region})
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <strong style={{ color: 'var(--primary-dark)' }}>{formatGHS(row.current)}</strong>
                    {idx === 0 && <span className="best-price-tag">Best Price</span>}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Period selector */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {TREND_PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setTrendPeriod(p.key)}
              className={`period-pill ${trendPeriod === p.key ? 'active' : ''}`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {networkStatus === 'offline' ? (
          <div className="app-card" style={{ padding: '16px', color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <WifiOff size={16} /> Price history needs a connection. Reconnect to view trends.
          </div>
        ) : trendLoading ? (
          <div className="app-card" style={{ padding: '16px', color: 'var(--app-text-muted)' }}>
            Loading price history…
          </div>
        ) : trendError ? (
          <div className="app-card" style={{ padding: '16px', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} /> Couldn't load price history. Please try again.
          </div>
        ) : points.length === 0 ? (
          <div className="app-card" style={{ padding: '16px', color: 'var(--app-text-muted)' }}>
            No price records for this period yet.
          </div>
        ) : (
          <>
            {/* Trend summary */}
            <div className="app-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <span style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary-dark)' }}>
                  {formatGHS(trendHistory.current)}
                </span>
                <TrendBadge trend={trend} percentChange={trendHistory.percentChange} size={14} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--app-text-muted)' }}>
                <span>Highest: <strong style={{ color: 'var(--app-text)' }}>{formatGHS(trendHistory.highest)}</strong></span>
                <span>Lowest: <strong style={{ color: 'var(--app-text)' }}>{formatGHS(trendHistory.lowest)}</strong></span>
              </div>
              {interpretation && (
                <p style={{ fontSize: '11px', color: 'var(--app-text)', margin: 0, lineHeight: 1.4 }}>
                  {interpretation}
                </p>
              )}
            </div>

            {/* Line chart */}
            <div className="chart-container" style={{ height: '200px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={points} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--app-border)" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} minTickGap={20} />
                  <YAxis tick={{ fontSize: 9 }} domain={['auto', 'auto']} width={40} />
                  <Tooltip
                    formatter={(value) => [formatGHS(value), trendProduct.crop]}
                    labelFormatter={(label, payload) => payload?.[0]?.payload?.date || label}
                  />
                  <Line
                    type="monotone"
                    dataKey="price"
                    stroke="var(--primary)"
                    strokeWidth={2.5}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                  {points.map((pt, idx) =>
                    pt.price === trendHistory.highest || pt.price === trendHistory.lowest ? (
                      <ReferenceDot
                        key={idx}
                        x={pt.label}
                        y={pt.price}
                        r={4}
                        fill={pt.price === trendHistory.highest ? 'var(--success)' : 'var(--danger)'}
                        stroke="none"
                      />
                    ) : null
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

          </>
        )}
      </div>
    );
  }

  // 5. CHAT / MESSAGING SCREEN
  if (currentScreen === 'chat') {
    // owner_id is the seller's stable account id — prefer it so review gating
    // (checked against the messages table by account id) works correctly.
    // Falls back to phone/name only for the two ownerless seed listings.
    const chatRecipientId = chatRecipient ? (chatRecipient.owner_id || chatRecipient.phone || chatRecipient.farmer_name) : 'unknown';
    const recipientName = chatRecipient ? chatRecipient.farmer_name : 'Farmer';

    const handleSendMessage = (e) => {
      e.preventDefault();
      if (!chatMessage.trim()) return;

      const newMsg = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        sender_id: auth?.ownerId,
        receiver_id: chatRecipientId,
        content: chatMessage,
        timestamp: Date.now(),
        synced: false,
        owner_id: auth?.ownerId
      };

      setLocalDb(prev => ({
        ...prev,
        messages: [...prev.messages, newMsg]
      }));

      addLog(`Sent chat to local queue for ${recipientName}. Sync pending.`, 'info');
      setChatMessage('');

      // Auto-trigger sync if online
      if (networkStatus === 'online') {
        setTimeout(syncData, 500);
      }
    };

    // Filter messages for this chat session
    const currentChatMessages = localDb.messages.filter(
      m => (m.sender_id === auth?.ownerId && m.receiver_id === chatRecipientId) ||
           (m.sender_id === chatRecipientId && m.receiver_id === auth?.ownerId)
    );

    return (
      <div className="chat-container">
        <div className="chat-header">
          <button onClick={() => setCurrentScreen('buyer')} className="chat-back-btn">
            <ArrowLeft size={20} />
          </button>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '15px' }}>{recipientName}</div>
            <div style={{ fontSize: '11px', color: 'var(--app-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Phone size={10} /> {chatRecipientId}
            </div>
          </div>
          {chatRecipient?.owner_id && onViewProfile && (
            <button
              className="btn-outline"
              style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: '11px' }}
              onClick={() => onViewProfile(chatRecipient.owner_id)}
            >
              Profile
            </button>
          )}
        </div>

        <div className="chat-messages">
          {currentChatMessages.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--app-text-muted)', fontSize: '12px' }}>
              No messages yet. Send a message to start bargaining.
            </div>
          ) : (
            currentChatMessages.map(m => (
              <div
                key={m.id}
                className={`message-bubble ${m.sender_id === auth?.ownerId ? 'message-sent' : 'message-received'}`}
              >
                <div>{m.content}</div>
                <div className="message-meta">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {m.sender_id === auth?.ownerId && (
                    <span style={{ marginLeft: '4px' }}>
                      {m.synced ? <CheckCheck size={10} style={{ display: 'inline' }} /> : <WifiOff size={10} style={{ display: 'inline' }} />}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="chat-input-area">
          <input 
            type="text" 
            placeholder="Type message..." 
            className="chat-input"
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
          />
          <button type="submit" className="chat-send-btn">
            <Send size={16} />
          </button>
        </form>
      </div>
    );
  }

  return null;
}
