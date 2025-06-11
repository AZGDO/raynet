import { useEffect, useState } from 'react';
import { Discovery } from '../../lib/peer';
import { useAuth } from '../auth';

const discovery = new Discovery();

export function useDiscovery() {
  const { state } = useAuth();
  const [found, setFound] = useState<string | null>(null);

  useEffect(() => {
    if (state.user) {
      discovery.advertise(state.user);
    }
  }, [state.user]);

  async function find(username: string) {
    const res = await discovery.query(username);
    setFound(res);
    return res;
  }

  return { found, find };
}
