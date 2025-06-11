import { useState } from 'react';
import { useAuth } from '../features/auth';
import { useDiscovery } from '../features/discovery';
import { useChat } from '../features/chat';
import Input from '../components/Input';
import Button from '../components/Button';

export default function MainApp() {
  const { state, logout } = useAuth();
  const [peer, setPeer] = useState<string | null>(null);
  const { found, find } = useDiscovery();
  const chat = peer ? useChat(peer) : null;
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (chat && input) {
      chat.send(input);
      setInput('');
    }
  };

  return (
    <div className="h-screen grid md:grid-cols-[250px_1fr]">
      <div className="border-r p-4 space-y-4">
        <div className="flex items-center justify-between">
          <span className="font-bold">{state.user}</span>
          <Button onClick={logout} className="bg-gray-300 text-black dark:bg-gray-700 dark:text-white px-2 py-1">Logout</Button>
        </div>
        <div>
          <Input placeholder="Search user" onKeyDown={async e => {
            if (e.key === 'Enter') {
              const name = (e.target as HTMLInputElement).value;
              const res = await find(name);
              if (res) setPeer(res);
            }
          }} />
          {found && <div className="mt-2 cursor-pointer" onClick={() => setPeer(found)}>{found}</div>}
        </div>
      </div>
      <div className="flex flex-col h-full">
        {peer ? (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {chat?.messages.map(m => (
                <div key={m.timestamp} className={m.from === state.user ? 'text-right' : 'text-left'}>
                  <div className={`inline-block px-3 py-2 rounded-2xl ${m.from === state.user ? 'bg-ray-violet text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-2 border-t flex space-x-2">
              <Input className="flex-1" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} />
              <Button onClick={handleSend} disabled={!input}>Send</Button>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">No chat selected</div>
        )}
      </div>
    </div>
  );
}
