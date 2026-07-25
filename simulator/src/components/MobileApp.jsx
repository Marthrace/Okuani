import React, { useState } from 'react';
import { 
  User, ShoppingBag, Plus, MapPin, 
  Phone, Send, ArrowLeft, RefreshCw, 
  Search, Filter, TrendingUp, DollarSign,
  AlertCircle, Check, CheckCheck, WifiOff
} from 'lucide-react';

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
  addLog,
  syncData
}) {
  
  // New Listing Form States
  const [farmerName, setFarmerName] = useState('Kwame Boateng');
  const [crop, setCrop] = useState('White Maize');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('Bags');
  const [price, setPrice] = useState('');
  const [location, setLocation] = useState('Techiman');
  const [phone, setPhone] = useState('+233244123456');

  // Search/Filter States for Buyer
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLocation, setFilterLocation] = useState('All');

  // Active Chat Message State
  const [chatMessage, setChatMessage] = useState('');

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
          className={`role-card ${activeRole === 'farmer' ? 'active' : ''}`}
          onClick={() => {
            setActiveRole('farmer');
            setCurrentScreen('farmer');
          }}
        >
          <div className="role-icon"><User size={24} /></div>
          <div>
            <div className="role-title">Farmer Portal</div>
            <div className="role-desc">List produce & check regional prices offline</div>
          </div>
        </button>

        <button 
          className={`role-card ${activeRole === 'buyer' ? 'active' : ''}`}
          onClick={() => {
            setActiveRole('buyer');
            setCurrentScreen('buyer');
          }}
        >
          <div className="role-icon"><ShoppingBag size={24} /></div>
          <div>
            <div className="role-title">Buyer Marketplace</div>
            <div className="role-desc">Search crops, check price analytics & chat</div>
          </div>
        </button>
      </div>
    );
  }

  // 2. FARMER PORTAL SCREEN
  if (currentScreen === 'farmer') {
    const handleAddListing = (e) => {
      e.preventDefault();
      if (!crop || !qty || !price || !location) {
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
        synced: false
      };

      setLocalDb(prev => ({
        ...prev,
        listings: [newListing, ...prev.listings]
      }));

      // Reset form fields
      setQty('');
      setPrice('');
      addLog(`Added ${crop} (${qty} ${unit}) to offline cache. Waiting for network to sync.`, 'info');

      // Auto-trigger sync if online
      if (networkStatus === 'online') {
        setTimeout(syncData, 500);
      }
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

    const myListings = localDb.listings.filter(l => !l.deleted && l.farmer_name === farmerName);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Farmer Portal</h2>
          <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setCurrentScreen('welcome')}>
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

          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '6px' }}>
            <Plus size={16} /> Add Listing
          </button>
        </form>

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
    
    // Filter listings based on search query and location select
    const filteredListings = activeListings.filter(l => {
      const matchesSearch = l.crop.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            l.farmer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLocation = filterLocation === 'All' || l.location === filterLocation;
      return matchesSearch && matchesLocation;
    });

    const handleMessageFarmer = (listing) => {
      setChatRecipient(listing);
      setCurrentScreen('chat');
    };

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Buyer Portal</h2>
          <button className="btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => setCurrentScreen('welcome')}>
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
                  
                  <button 
                    onClick={() => handleMessageFarmer(l)}
                    className="btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    <Send size={12} /> Chat
                  </button>
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
    // Custom prices selector (using cached prices or seeded values if empty)
    const displayPrices = localDb.prices && localDb.prices.length > 0 ? localDb.prices : [
      { market_name: 'Makola Market', region: 'Greater Accra', crop: 'White Maize', price_per_kg: 8.50 },
      { market_name: 'Central Market', region: 'Ashanti', crop: 'White Maize', price_per_kg: 7.80 },
      { market_name: 'Techiman Market', region: 'Bono East', crop: 'White Maize', price_per_kg: 6.20 },
      { market_name: 'Tamale Market', region: 'Northern', crop: 'White Maize', price_per_kg: 6.80 }
    ];

    // Filter crop prices to show some analytics
    const cropGrouped = displayPrices.reduce((acc, curr) => {
      if (!acc[curr.crop]) acc[curr.crop] = [];
      acc[curr.crop].push(curr);
      return acc;
    }, {});

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 'bold' }}>Market Dashboard</h2>
          <span style={{ fontSize: '10px', color: 'var(--app-text-muted)' }}>Offline Cached</span>
        </div>

        {/* Dynamic Animated Chart using custom SVG */}
        <div className="chart-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={12} style={{ color: 'var(--primary)' }} /> White Maize Price / Kg (GHS)
            </span>
            <span style={{ fontSize: '9px', color: 'var(--app-text-muted)' }}>Regions: Bono → Ash → Northern → GA</span>
          </div>
          
          <svg className="chart-svg" viewBox="0 0 300 120">
            {/* Grid lines */}
            <line x1="20" y1="20" x2="290" y2="20" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="20" y1="50" x2="290" y2="50" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="20" y1="80" x2="290" y2="80" stroke="#f1f5f9" strokeWidth="1" />
            <line x1="20" y1="110" x2="290" y2="110" stroke="#e2e8f0" strokeWidth="1" />

            {/* Price line path (Techiman=6.2, Kumasi=7.8, Tamale=6.8, Accra=8.5) */}
            {/* Coordinates mapped: 
                Techiman (X: 40, Y: 90) (6.2 GHS)
                Kumasi (X: 110, Y: 60) (7.8 GHS)
                Tamale (X: 180, Y: 80) (6.8 GHS)
                Accra (X: 250, Y: 45) (8.5 GHS)
            */}
            <path 
              d="M 40 90 L 110 60 L 180 80 L 250 45" 
              fill="none" 
              stroke="var(--primary)" 
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Area under the line */}
            <path 
              d="M 40 90 L 110 60 L 180 80 L 250 45 L 250 110 L 40 110 Z" 
              fill="rgba(46, 125, 50, 0.15)"
            />

            {/* Points */}
            <circle cx="40" cy="90" r="4" fill="var(--primary-light)" stroke="var(--primary-dark)" strokeWidth="1.5" />
            <circle cx="110" cy="60" r="4" fill="var(--primary-light)" stroke="var(--primary-dark)" strokeWidth="1.5" />
            <circle cx="180" cy="80" r="4" fill="var(--primary-light)" stroke="var(--primary-dark)" strokeWidth="1.5" />
            <circle cx="250" cy="45" r="4" fill="var(--primary-light)" stroke="var(--primary-dark)" strokeWidth="1.5" />

            {/* Value Labels */}
            <text x="35" y="103" fontSize="8" fill="var(--app-text-muted)" fontWeight="bold">6.2</text>
            <text x="105" y="50" fontSize="8" fill="var(--app-text-muted)" fontWeight="bold">7.8</text>
            <text x="175" y="93" fontSize="8" fill="var(--app-text-muted)" fontWeight="bold">6.8</text>
            <text x="245" y="35" fontSize="8" fill="var(--app-text-muted)" fontWeight="bold">8.5</text>
          </svg>
        </div>

        {/* Crop Price Comparison list */}
        <div>
          <h3 style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>Regional Price Feeds</h3>
          {Object.keys(cropGrouped).length === 0 ? (
            <div className="app-card" style={{ padding: '16px', color: 'var(--app-text-muted)' }}>
              No price bulletins cached. Connect online to fetch latest feeds.
            </div>
          ) : (
            Object.keys(cropGrouped).map(cropName => (
              <div key={cropName} className="app-card" style={{ marginBottom: '10px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--primary)', borderBottom: '1px solid var(--app-border)', paddingBottom: '4px', marginBottom: '6px' }}>
                  {cropName}
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {cropGrouped[cropName].map((p, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                      <span style={{ color: 'var(--app-text-muted)' }}>{p.market_name} ({p.region})</span>
                      <strong style={{ color: 'var(--app-text)' }}>GHS {p.price_per_kg.toFixed(2)}/kg</strong>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // 5. CHAT / MESSAGING SCREEN
  if (currentScreen === 'chat') {
    const chatRecipientId = chatRecipient ? (chatRecipient.phone || chatRecipient.farmer_name) : 'unknown';
    const recipientName = chatRecipient ? chatRecipient.farmer_name : 'Farmer';

    const handleSendMessage = (e) => {
      e.preventDefault();
      if (!chatMessage.trim()) return;

      const newMsg = {
        id: 'msg-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        sender_id: 'local-client', // local simulated buyer
        receiver_id: chatRecipientId,
        content: chatMessage,
        timestamp: Date.now(),
        synced: false
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
      m => (m.sender_id === 'local-client' && m.receiver_id === chatRecipientId) ||
           (m.sender_id === chatRecipientId && m.receiver_id === 'local-client')
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
                className={`message-bubble ${m.sender_id === 'local-client' ? 'message-sent' : 'message-received'}`}
              >
                <div>{m.content}</div>
                <div className="message-meta">
                  {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {m.sender_id === 'local-client' && (
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
