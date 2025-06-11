import { useState } from 'react';
import { useAuth } from '../features/auth';
import { useDiscovery, SearchUser } from '../features/discovery';
import { useChat } from '../features/chat';
import Input from '../components/Input';
import Button from '../components/Button';
import ProfileCard from '../components/ProfileCard';
import ProfilePage from './ProfilePage';
import { AnimatePresence, motion } from 'framer-motion';

export default function MainApp() {
  const { state, logout } = useAuth();
  const [peer, setPeer] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const { find } = useDiscovery();
  const chat = useChat(peer);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (chat && input) {
      chat.send(input);
      setInput('');
    }
  };

  return (
    <div className="h-screen flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b">
        <span className="font-recursive text-2xl text-ray-violet">raynet</span>
        <Button onClick={logout} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white px-2 py-1">Logout</Button>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden md:block w-64 border-r p-4 space-y-4">
          <ProfileCard username={state.user!} displayName={state.displayName} status={state.status} onEdit={() => setShowProfile(true)} />
          <SearchUser onSelect={setPeer} />
        </aside>
        <main className="flex-1 flex flex-col">
          <div className="p-2 border-b md:hidden">
            <ProfileCard username={state.user!} displayName={state.displayName} status={state.status} onEdit={() => setShowProfile(true)} />
          </div>
          <AnimatePresence>
            {peer && (
              <motion.button
                key="back"
                className="md:hidden text-sm text-gray-500 flex items-center space-x-1 px-2 py-1"
                initial={{ x: '-100%', opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '-100%', opacity: 0 }}
                transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
                onClick={() => setPeer(null)}
              >
                Previous
              </motion.button>
            )}
          </AnimatePresence>
          {peer ? (
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {chat.messages.map(m => (
                  <div key={m.timestamp} className={m.from === state.user ? 'text-right' : 'text-left'}>
                    <div className={`inline-block px-3 py-2 rounded-2xl ${m.from == state.user ? 'bg-ray-violet text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="p-2 border-t flex space-x-2">
                <Input className="flex-1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
                <Button onClick={handleSend} disabled={!input}>Send</Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-500">Select or search a user</div>
          )}
        </main>
      </div>
      <ProfilePage open={showProfile} onClose={() => setShowProfile(false)} />
    </div>
  );
}
