import { useEffect, useState } from 'react';
import { Discovery } from '../../lib/peer';
import { useAuth } from '../auth';

const discovery = new Discovery();

export function useDiscovery() {
  const { state } = useAuth();
  const [found, setFound] = useState<string | null>(null);

  useEffect(() => {
    if (state.user) {
      discovery.advertise(state.user, state.code);
    }
  }, [state.user, state.code]);

  async function find(code: string) {
    const res = await discovery.query(code);
    setFound(res);
    return res;
  }

  return { found, find };
}

export { default as SearchUser } from './SearchUser';
