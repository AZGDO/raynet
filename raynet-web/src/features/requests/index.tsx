import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { onConnectRequest, sendAcceptRequest, onAccept } from '../../lib/peer';

export function useRequests(onOpenChat: (peer: string) => void) {
  const { state } = useAuth();
  const [requests, setRequests] = useState<string[]>([]);

  useEffect(() => {
    if (!state.user) return;
    const stopReq = onConnectRequest(state.user, (from) => {
      setRequests((r) => r.includes(from) ? r : [...r, from]);
    });
    const stopAcc = onAccept(state.user, (from) => {
      onOpenChat(from);
    });
    return () => { stopReq(); stopAcc(); };
  }, [state.user, onOpenChat]);

  function accept(user: string) {
    if (!state.user) return;
    sendAcceptRequest(state.user, user);
    setRequests((r) => r.filter(u => u !== user));
    onOpenChat(user);
  }

  function decline(user: string) {
    setRequests((r) => r.filter(u => u !== user));
  }

  return { requests, accept, decline };
}

export default function RequestList({ onSelect }: { onSelect(peer: string): void }) {
  const { requests, accept, decline } = useRequests(onSelect);
  if (!requests.length) return null;
  return (
    <div className="space-y-2">
      {requests.map(r => (
        <div key={r} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
          <span>{r} wants to connect</span>
          <div className="space-x-2">
            <button className="text-green-600" onClick={() => accept(r)}>Accept</button>
            <button className="text-red-600" onClick={() => decline(r)}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}
