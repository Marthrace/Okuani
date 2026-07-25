import React, { useState } from 'react';
import { Phone, PhoneOff, Send, Delete } from 'lucide-react';

export default function RetroUSSDSimulator({ serverUrl, networkStatus, addLog, fetchServerDb }) {
  const [dialInput, setDialInput] = useState('*412#');
  const [ussdActive, setUssdActive] = useState(false);
  const [ussdSessionText, setUssdSessionText] = useState(''); // accumulated input: '', '1', '1*2'
  const [screenText, setScreenText] = useState('Nokia 3310\nReady');
  const [sessionInputVal, setSessionInputVal] = useState(''); // current numeric menu choice
  const [phoneNumber] = useState('+233244998877'); // Simulated feature phone sender
  const [isSessionEnd, setIsSessionEnd] = useState(false);

  // Local fallback mock of USSD menu flow if backend is offline or unreachable
  const getMockUssdResponse = (text) => {
    if (!text) {
      return `CON Welcome to Okuani Services\n1. Check Market Prices\n2. View Local Listings\n3. Register Crop Sale`;
    }
    
    if (text === '1') {
      return `CON Select Crop for Avg Price:\n1. White Maize (GHS 7.3/kg)\n2. Yam (Pona) (GHS 10.1/kg)\n3. Cassava (GHS 3.6/kg)`;
    }
    
    if (text.startsWith('1*')) {
      const parts = text.split('*');
      const selection = parts[1];
      if (selection === '1') {
        return `END White Maize prices per kg:\nMakola Market: GHS 8.5\nCentral Market: GHS 7.8\nTechiman: GHS 6.2`;
      } else if (selection === '2') {
        return `END Yam (Pona) prices per kg:\nMakola: GHS 12.0\nCentral: GHS 10.5\nTechiman: GHS 8.0`;
      } else if (selection === '3') {
        return `END Cassava prices per kg:\nMakola: GHS 4.5\nTechiman: GHS 3.2`;
      }
      return `END Invalid crop selection.`;
    }

    if (text === '2') {
      return `END Okuani currently has 2 active produce listings online.\nVisit the app to view and contact sellers.`;
    }

    if (text === '3') {
      return `CON Enter Crop & Price:\nFormat: Crop*Qty*Price\n(e.g. Maize*10*350)`;
    }

    if (text.startsWith('3*')) {
      const parts = text.split('*');
      if (parts.length === 4) {
        const crop = parts[1];
        const qty = parts[2];
        const price = parts[3];
        return `END Success! Your listing of ${qty} bags of ${crop} for GHS ${price} has been listed via USSD.`;
      }
      return `END Invalid USSD registration format. Please dial *412# to retry.`;
    }

    return `END Invalid input option.\nDial *412# to restart.`;
  };

  const handleDial = async () => {
    if (dialInput !== '*412#') {
      setScreenText('Connection Error\nInvalid Code');
      addLog(`USSD Dial Failed: Code ${dialInput} is not recognized.`, 'error');
      return;
    }

    setUssdActive(true);
    setIsSessionEnd(false);
    setUssdSessionText('');
    setScreenText('Requesting...');
    addLog(`Feature phone dialing USSD code *412#...`, 'info');

    // Fetch initial menu
    await sendUssdRequest('');
  };

  const sendUssdRequest = async (currentSessionPath) => {
    let responseText = '';
    
    if (networkStatus === 'online') {
      try {
        const res = await fetch(`${serverUrl}/api/ussd`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: currentSessionPath,
            phoneNumber
          })
        });
        
        if (res.ok) {
          responseText = await res.text();
          addLog(`USSD Server Outbound: path="${currentSessionPath}"`, 'success');
        } else {
          throw new Error('USSD Server error');
        }
      } catch (err) {
        addLog(`USSD Server unreachable. Falling back to local offline USSD handler.`, 'warning');
        responseText = getMockUssdResponse(currentSessionPath);
      }
    } else {
      responseText = getMockUssdResponse(currentSessionPath);
      addLog(`USSD local processing (Offline fall-back): path="${currentSessionPath}"`, 'info');
    }

    // Parse USSD response (CON ... keep session, END ... close session)
    if (responseText.startsWith('CON ')) {
      setScreenText(responseText.replace('CON ', ''));
      setIsSessionEnd(false);
    } else if (responseText.startsWith('END ')) {
      setScreenText(responseText.replace('END ', ''));
      setIsSessionEnd(true);
    } else {
      setScreenText(responseText);
      setIsSessionEnd(true);
    }

    // Refresh database view in case listing was created via USSD
    if (currentSessionPath.startsWith('3*') && responseText.includes('Success')) {
      fetchServerDb();
    }
  };

  const handleSendOption = async () => {
    if (!ussdActive || isSessionEnd) return;
    if (!sessionInputVal) return;

    const nextPath = ussdSessionText ? `${ussdSessionText}*${sessionInputVal}` : sessionInputVal;
    setUssdSessionText(nextPath);
    setScreenText('Sending...');
    setSessionInputVal('');

    await sendUssdRequest(nextPath);
  };

  const handleEndSession = () => {
    setUssdActive(false);
    setIsSessionEnd(false);
    setUssdSessionText('');
    setSessionInputVal('');
    setDialInput('*412#');
    setScreenText('Nokia 3310\nReady');
    addLog(`USSD session closed by user.`, 'info');
  };

  const handleKeyPress = (char) => {
    if (!ussdActive) {
      if (dialInput === 'Nokia 3310\nReady' || dialInput === 'Connection Error\nInvalid Code') {
        setDialInput(char);
      } else {
        setDialInput(prev => prev + char);
      }
    } else {
      if (!isSessionEnd) {
        setSessionInputVal(prev => prev + char);
      }
    }
  };

  const handleBackspace = () => {
    if (!ussdActive) {
      setDialInput(prev => prev.slice(0, -1));
    } else {
      setSessionInputVal(prev => prev.slice(0, -1));
    }
  };

  return (
    <div>
      <h3 style={{ fontSize: '13px', color: 'white', marginBottom: '8px', textAlign: 'center' }}>
        Retro USSD/SMS Fallback
      </h3>
      
      <div className="nokia-phone">
        {/* Nokia LCD Screen */}
        <div className="nokia-screen-wrapper">
          <div className="nokia-screen-content">
            {!ussdActive ? dialInput : (
              <>
                <div>{screenText}</div>
                {!isSessionEnd && (
                  <div style={{ marginTop: '8px', borderTop: '1px dashed #1e293b', paddingTop: '2px' }}>
                    Input: <strong style={{ textDecoration: 'underline' }}>{sessionInputVal}</strong>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="nokia-screen-actions">
            {ussdActive ? (
              <>
                <span onClick={handleEndSession} style={{ cursor: 'pointer' }}>[EXIT]</span>
                {!isSessionEnd && <span onClick={handleSendOption} style={{ cursor: 'pointer' }}>[SEND]</span>}
              </>
            ) : (
              <>
                <span>[MENU]</span>
                <span onClick={handleDial} style={{ cursor: 'pointer' }}>[DIAL]</span>
              </>
            )}
          </div>
        </div>

        {/* Nokia Plastic Keypad */}
        <div className="nokia-keypad">
          <button className="nokia-btn nokia-btn-large" onClick={ussdActive ? handleEndSession : handleBackspace}>
            {ussdActive ? 'END SESSION' : 'CLEAR / BACKSPACE'}
          </button>

          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].map(key => (
            <button key={key} className="nokia-btn" onClick={() => handleKeyPress(key)}>
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
