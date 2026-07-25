import { useEffect, useState } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Tracks real device connectivity via NetInfo, but also exposes a manual
 * "simulate offline" override so offline-first behaviour can be demonstrated
 * on demand during testing / project defense, per the proposal's §3.2/§5.3
 * requirement for a built-in simulated offline mode.
 */
export function useNetworkStatus() {
  const [deviceOnline, setDeviceOnline] = useState(true);
  const [simulateOffline, setSimulateOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setDeviceOnline(Boolean(state.isConnected && state.isInternetReachable !== false));
    });
    return () => unsubscribe();
  }, []);

  const networkStatus = !simulateOffline && deviceOnline ? 'online' : 'offline';

  return {
    networkStatus,
    deviceOnline,
    simulateOffline,
    setSimulateOffline,
  };
}
