import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { onConnectRequest, sendAcceptRequest, onAccept, UserProfile } from '../../lib/peer';
import { db } from '../auth/store';

export interface RequestInfo extends UserProfile {}

export function useRequests(onOpenChat: (peer: string) => void, onView: (user: string) => void) {
  const { state } = useAuth();
  const [requests, setRequests] = useState<RequestInfo[]>([]);

  useEffect(() => {
    if (!state.user) return;
    const stopReq = onConnectRequest(state.user, (from) => {
      setRequests((r) => r.some(x => x.username === from.username) ? r : [...r, from]);
      db.users.put({ username: from.username, displayName: from.displayName, status: from.status, code: from.code });
    });
    const stopAcc = onAccept(state.user, (from) => {
      db.users.put({ username: from.username, displayName: from.displayName, status: from.status, code: from.code });
      onOpenChat(from.username);
    });
    return () => { stopReq(); stopAcc(); };
  }, [state.user, onOpenChat]);

  function accept(user: RequestInfo) {
    if (!state.user) return;
    const self: UserProfile = { username: state.user, displayName: state.displayName, status: state.status, code: state.code };
    sendAcceptRequest(self, user.username);
    setRequests((r) => r.filter(u => u.username !== user.username));
    onOpenChat(user.username);
  }

  function decline(user: RequestInfo) {
    setRequests((r) => r.filter(u => u.username !== user.username));
  }

  return { requests, accept, decline };
}

export default function RequestList({ onSelect, onView }: { onSelect(peer: string): void; onView(user: string): void }) {
  const { requests, accept, decline } = useRequests(onSelect, onView);
  if (!requests.length) return null;
  return (
    <div className="space-y-2">
      {requests.map(r => (
        <div key={r.username} className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700 rounded">
          <span className="flex flex-col">
            <span className="font-medium">{r.displayName}</span>
            <span className="text-xs font-mono text-gray-500">{r.username}</span>
          </span>
          <div className="space-x-2">
            <button className="text-sm underline" onClick={() => onView(r.username)}>View</button>
            <button className="text-green-600" onClick={() => accept(r)}>Accept</button>
            <button className="text-red-600" onClick={() => decline(r)}>Decline</button>
          </div>
        </div>
      ))}
    </div>
  );
}
