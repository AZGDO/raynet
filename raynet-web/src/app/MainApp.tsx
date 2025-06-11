import { useState, useEffect } from 'react';
import { useAuth } from '../features/auth';
import { SearchUser } from '../features/discovery';
import { useChat } from '../features/chat';
import RequestList from '../features/requests';
import { sendConnectRequest } from '../lib/peer';
import { db } from '../features/auth/store';
import Input from '../components/Input';
import Button from '../components/Button';
import ProfileCard from '../components/ProfileCard';
import ProfilePage from './ProfilePage';
import PeerProfile from './PeerProfile';
import { AnimatePresence, motion } from 'framer-motion';

export default function MainApp() {
  const { state, logout } = useAuth();
  const [peer, setPeer] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [viewUser, setViewUser] = useState<string | null>(null);
  const [peerDisplay, setPeerDisplay] = useState<string>('');
  const chat = useChat(peer);
  const [input, setInput] = useState('');

  useEffect(() => {
    if (!peer) return;
    db.users.get(peer).then(u => setPeerDisplay(u?.displayName || peer));
  }, [peer]);

  const handleSend = () => {
    if (chat && input) {
      chat.send(input);
      setInput('');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <span className="font-recursive text-2xl text-black dark:text-white">raynet</span>
        <Button onClick={logout} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white px-2 py-1">Logout</Button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block w-64 border-r p-4 space-y-4">
          <ProfileCard username={state.user!} displayName={state.displayName} status={state.status} code={state.code} onEdit={() => setShowProfile(true)} />
          <RequestList onSelect={setPeer} onView={setViewUser} />
          <SearchUser onRequest={(name) => sendConnectRequest({ username: state.user!, displayName: state.displayName, status: state.status, code: state.code }, name)} />
        </aside>
        <main className="flex-1 relative">
          <div className="p-2 border-b md:hidden">
            <ProfileCard username={state.user!} displayName={state.displayName} status={state.status} code={state.code} onEdit={() => setShowProfile(true)} />
            <div className="mt-2 space-y-2">
              <RequestList onSelect={setPeer} onView={setViewUser} />
              <SearchUser onRequest={(name) => sendConnectRequest({ username: state.user!, displayName: state.displayName, status: state.status, code: state.code }, name)} />
            </div>
          </div>
          <div className="h-full flex items-center justify-center text-gray-500">Select or search a user</div>
          <AnimatePresence>
            {peer && (
              <motion.aside
                key="chat"
                className="absolute inset-y-0 right-0 w-full md:w-2/3 bg-white dark:bg-gray-900 border-l flex flex-col shadow-lg"
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
              >
                <div className="border-b p-2 flex items-center justify-between">
                  <div className="cursor-pointer" onClick={() => setViewUser(peer!)}>
                    <div className="font-medium">{peerDisplay}</div>
                    <div className="text-xs text-gray-500">{peer}</div>
                  </div>
                  <Button onClick={() => setPeer(null)} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white px-2 py-1">Close</Button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {chat.messages.map(m => (
                    <div key={m.timestamp} className={m.from === state.user ? 'text-right' : 'text-left'}>
                      <div className={`inline-block px-3 py-2 rounded-2xl ${m.from == state.user ? 'bg-black text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{m.text}</div>
                    </div>
                  ))}
                </div>
                <div className="p-2 border-t flex space-x-2">
                  <Input className="flex-1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                  <Button onClick={handleSend} disabled={!input}>Send</Button>
                </div>
              </motion.aside>
            )}
          </AnimatePresence>
        </main>
      </div>
      <ProfilePage open={showProfile} onClose={() => setShowProfile(false)} />
      <PeerProfile open={!!viewUser} username={viewUser || ''} onClose={() => setViewUser(null)} />
    </div>
  );
}
