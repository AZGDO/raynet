import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Shield, Wifi, WifiOff, ArrowRight, Link, Lock, Zap,
  Settings, Users, MessageSquare, Upload, Download, User,
  Copy, Check, Plus, X, LogOut, Scan, QrCode, Trash2, RefreshCw
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { TerminalButton } from './components/TerminalButton';
import { CodeBlock } from './components/CodeBlock';
import { UserProfile, Contact, ChatMessage, ConnectionStatus, NetworkMessage, MessageStatus } from './types';
import { useNetwork } from './hooks/useNetwork';

// --- Components ---

const QRScanner = ({ onScan, onClose }: { onScan: (data: string) => void, onClose: () => void }) => {
  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      "reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      /* verbose= */ false
    );

    scanner.render((decodedText) => {
      onScan(decodedText);
      scanner.clear().catch(console.error);
    }, (error) => {
      // ignore errors
    });

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [onScan]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-4">
        <h3 className="text-center font-display text-xl text-white">SCAN_UPLINK_CODE</h3>
        <div id="reader" className="w-full bg-black border border-ray-500 overflow-hidden rounded-lg"></div>
        <TerminalButton fullWidth onClick={onClose} variant="danger">ABORT_SCAN</TerminalButton>
      </div>
    </div>
  );
};

// --- Hooks ---

const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore =
        value instanceof Function ? (value as ((val: T) => T))(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
};

// --- Main Component ---

export default function App() {
  // Persistent State
  const [profile, setProfile] = useLocalStorage<UserProfile | null>('raynet_profile', null);
  const [contacts, setContacts] = useLocalStorage<Record<string, Contact>>('raynet_contacts', {});
  const [chatHistory, setChatHistory] = useLocalStorage<Record<string, ChatMessage[]>>('raynet_history', {});

  // Session State
  const [view, setView] = useState<'onboarding' | 'contacts' | 'chat' | 'add-contact' | 'settings'>('contacts');
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Network Logic ---

  const handleMessageReceived = useCallback((peerId: string, msg: NetworkMessage) => {
    if (msg.type === 'CHAT') {
      const chatMsg: ChatMessage = {
        id: generateId(),
        senderId: peerId,
        content: msg.payload.content,
        timestamp: msg.payload.timestamp,
        type: 'text',
        status: 'read' // If we received it, we read it (simplified)
      };
      setChatHistory(prev => ({
        ...prev,
        [peerId]: [...(prev[peerId] || []), chatMsg]
      }));
    } else if (msg.type === 'ACK') {
      // Update message status to delivered
      setChatHistory(prev => {
        const history = prev[peerId] || [];
        return {
          ...prev,
          [peerId]: history.map(m => m.id === msg.payload.messageId ? { ...m, status: 'delivered' } : m)
        };
      });
    }
  }, [setChatHistory]);

  const handlePeerConnected = useCallback((peerId: string) => {
    setContacts(prev => ({
      ...prev,
      [peerId]: { ...prev[peerId], lastConnected: Date.now() }
    }));
  }, [setContacts]);

  const handlePeerDisconnected = useCallback((peerId: string) => {
    // Optional: Update UI to show disconnected
  }, []);

  const handleHandshakeReceived = useCallback((peer: UserProfile, roomId: string) => {
    // Check if we already have this contact
    setContacts(prev => {
      if (prev[peer.id]) return prev; // Already have them

      // New contact!
      const newContact: Contact = {
        id: peer.id,
        username: peer.username,
        bio: peer.bio,
        roomId: roomId,
        lastConnected: Date.now()
      };

      // If we are currently in "add-contact" view, switch to chat
      // We can't easily check "view" here due to closure, but we can check if we are activePeerId
      // Actually, let's just alert and switch if we can, or let the user navigate.
      // Better: If we generated the invite, we are waiting.

      return { ...prev, [peer.id]: newContact };
    });

    // We can also auto-switch to chat if we were waiting
    // But we need to be careful not to disrupt if user is doing something else.
    // For now, just adding them is enough. The UI will show them in contacts.
    // We can show a notification.
    // alert(`NEW_UPLINK_ESTABLISHED: ${peer.username}`); // Alert is annoying, maybe just let UI update
  }, [setContacts]);

  const { status: peerStatus, sendMessage: netSendMessage, createRoomId, joinTemporaryRoom } = useNetwork({
    profile,
    contacts,
    onMessageReceived: handleMessageReceived,
    onPeerConnected: handlePeerConnected,
    onPeerDisconnected: handlePeerDisconnected,
    onHandshakeReceived: handleHandshakeReceived
  });

  // --- Lifecycle ---

  useEffect(() => {
    if (!profile) setView('onboarding');
  }, [profile]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activePeerId, view]);

  // --- Actions ---

  const sendMessage = (text: string) => {
    if (!activePeerId) return;

    const result = netSendMessage(activePeerId, text);
    if (!result) return; // Failed to send (no room?)

    const msg: ChatMessage = {
      id: result.id,
      senderId: 'me',
      content: text,
      timestamp: Date.now(),
      type: 'text',
      status: result.status as MessageStatus
    };

    setChatHistory(prev => ({
      ...prev,
      [activePeerId]: [...(prev[activePeerId] || []), msg]
    }));
  };

  const generateInvite = () => {
    const roomId = createRoomId();
    const invite = JSON.stringify({ type: 'invite', roomId, host: profile });
    setInviteCode(invite);
    // Host joins the room immediately to listen for scanner
    joinTemporaryRoom(roomId);
  };

  const generateId = () => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    try {
      const invite = JSON.parse(data);
      if (invite.type === 'invite' && invite.roomId && invite.host) {
        // Add contact
        const newContact: Contact = {
          id: invite.host.id,
          username: invite.host.username,
          bio: invite.host.bio,
          roomId: invite.roomId,
          lastConnected: Date.now()
        };
        setContacts(prev => ({ ...prev, [newContact.id]: newContact }));
        setActivePeerId(newContact.id);
        setView('chat');
        alert(`CONTACT_ADDED: ${newContact.username}`);
      } else {
        alert('INVALID_INVITE_CODE');
      }
    } catch (e) {
      alert('SCAN_ERROR');
    }
  };

  const deleteContact = (id: string) => {
    if (confirm('CONFIRM_DELETION?')) {
      setContacts(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      if (activePeerId === id) {
        setActivePeerId(null);
        setView('contacts');
      }
    }
  };

  // --- File Operations ---

  const exportData = () => {
    const data = { profile, contacts, chatHistory, version: 2, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `raynet_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (data.profile) setProfile(data.profile);
        if (data.contacts) setContacts(data.contacts);
        if (data.chatHistory) setChatHistory(data.chatHistory);
        alert('SYSTEM_RESTORE_COMPLETE');
      } catch {
        alert('DATA_CORRUPTION_DETECTED');
      }
    };
    reader.readAsText(file);
  };

  // --- Renderers ---

  if (view === 'onboarding') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-display font-bold text-white mb-2 tracking-widest">RAY<span className="text-ray-500">NET</span></h1>
            <p className="text-slate-500 font-mono text-sm">SERVERLESS_ENCRYPTED_MESH</p>
          </div>
          <div className="bg-ray-900 border border-ray-800 p-8 space-y-6 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-ray-500"></div>
            <h2 className="text-xl text-white font-display">INITIALIZE_IDENTITY</h2>

            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const username = formData.get('username') as string;
              const bio = formData.get('bio') as string;
              if (username) {
                setProfile({ id: generateId().split('-')[0], username, bio, created: Date.now() });
                setView('contacts');
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-ray-500 mb-1">CODENAME</label>
                <input name="username" required maxLength={20} className="w-full bg-black border border-ray-800 p-3 text-white font-mono focus:border-ray-500 outline-none" placeholder="ENTER_ALIAS" />
              </div>
              <div>
                <label className="block text-xs font-mono text-ray-500 mb-1">SIGNATURE (OPTIONAL)</label>
                <input name="bio" maxLength={50} className="w-full bg-black border border-ray-800 p-3 text-white font-mono focus:border-ray-500 outline-none" placeholder="STATUS_MESSAGE" />
              </div>
              <TerminalButton type="submit" fullWidth>INITIALIZE_SYSTEM</TerminalButton>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-black text-slate-200 overflow-hidden">
      {showScanner && <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />}

      {/* Sidebar */}
      <div className="w-16 md:w-64 flex-shrink-0 bg-ray-950 border-r border-ray-900 flex flex-col justify-between">
        <div>
          <div className="p-4 flex items-center gap-3 border-b border-ray-900">
            <div className="w-8 h-8 bg-ray-900 flex items-center justify-center text-ray-500 font-bold">R</div>
            <span className="hidden md:block font-display font-bold tracking-wider">RAY<span className="text-ray-500">NET</span></span>
          </div>

          <nav className="p-2 space-y-1 mt-4">
            <button onClick={() => setView('contacts')} className={`w-full flex items-center gap-3 p-3 rounded hover:bg-ray-900 transition-colors ${view === 'contacts' ? 'bg-ray-900 text-ray-500' : 'text-slate-400'}`}>
              <Users size={20} />
              <span className="hidden md:block font-mono text-sm">CONTACTS</span>
            </button>
            <button onClick={() => { setView('add-contact'); setInviteCode(null); }} className={`w-full flex items-center gap-3 p-3 rounded hover:bg-ray-900 transition-colors ${view === 'add-contact' ? 'bg-ray-900 text-ray-500' : 'text-slate-400'}`}>
              <Plus size={20} />
              <span className="hidden md:block font-mono text-sm">ADD_CONTACT</span>
            </button>
            <button onClick={() => setView('settings')} className={`w-full flex items-center gap-3 p-3 rounded hover:bg-ray-900 transition-colors ${view === 'settings' ? 'bg-ray-900 text-ray-500' : 'text-slate-400'}`}>
              <Settings size={20} />
              <span className="hidden md:block font-mono text-sm">SYSTEM</span>
            </button>
          </nav>
        </div>

        {/* User Mini Profile */}
        <div className="p-4 border-t border-ray-900 hidden md:block">
          <div className="text-xs font-mono text-ray-500 mb-1">OPERATOR</div>
          <div className="font-bold truncate">{profile?.username}</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-ray-900/20 via-black to-black">
        {/* Header */}
        <header className="h-16 border-b border-ray-900 flex items-center justify-between px-6 bg-black/50 backdrop-blur">
          <h2 className="font-display font-bold text-lg uppercase tracking-widest">
            {view === 'contacts' && 'DIRECTORY'}
            {view === 'add-contact' && 'SECURE_HANDSHAKE'}
            {view === 'settings' && 'SYSTEM_CONFIG'}
            {view === 'chat' && (contacts[activePeerId || '']?.username || 'UNKNOWN_PEER')}
          </h2>

          {view === 'chat' && activePeerId && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className={`w-2 h-2 rounded-full ${peerStatus[activePeerId] === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
              <span className={peerStatus[activePeerId] === 'connected' ? 'text-green-500' : 'text-red-500'}>
                {peerStatus[activePeerId] === 'connected' ? 'SECURE_LINK' : 'SEARCHING...'}
              </span>
            </div>
          )}
        </header>

        {/* Views */}
        <main className="flex-1 overflow-y-auto p-0 relative">
          {view === 'contacts' && (
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.values(contacts).length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center h-64 text-slate-600">
                  <Users size={48} strokeWidth={1} className="mb-4" />
                  <p className="font-mono text-sm">NO_CONTACTS_FOUND</p>
                  <button onClick={() => setView('add-contact')} className="mt-4 text-ray-500 hover:text-ray-400 font-mono text-xs underline">INITIALIZE_NEW_CONNECTION</button>
                </div>
              ) : (
                Object.values(contacts).map(contact => (
                  <div key={contact.id}
                    onClick={() => { setActivePeerId(contact.id); setView('chat'); }}
                    className="bg-ray-900/20 border border-ray-800 hover:border-ray-500/50 p-4 cursor-pointer transition-all group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-white group-hover:text-ray-400 transition-colors">{contact.username}</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${peerStatus[contact.id] === 'connected' ? 'bg-green-500' : 'bg-slate-700'}`} />
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">{contact.bio || 'NO_BIO'}</p>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteContact(contact.id); }}
                      className="absolute bottom-2 right-2 text-slate-700 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {view === 'settings' && (
            <div className="p-6 max-w-2xl mx-auto space-y-8">
              <div className="bg-ray-900/30 border border-ray-800 p-6">
                <h3 className="text-ray-500 font-mono text-sm mb-6 uppercase flex items-center gap-2">
                  <User size={16} /> Identity Management
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm font-mono mb-6">
                  <div className="text-slate-500">UID</div>
                  <div className="text-white">{profile?.id}</div>
                  <div className="text-slate-500">ALIAS</div>
                  <div className="text-white">{profile?.username}</div>
                </div>
                <TerminalButton onClick={() => {
                  setProfile(null); // Will trigger onboarding
                  setContacts({});
                  setChatHistory({});
                }} variant="danger">NUKE_IDENTITY</TerminalButton>
              </div>

              <div className="bg-ray-900/30 border border-ray-800 p-6">
                <h3 className="text-ray-500 font-mono text-sm mb-6 uppercase flex items-center gap-2">
                  <Upload size={16} /> Data Persistence
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TerminalButton onClick={exportData} icon={Download}>EXPORT_ARCHIVE</TerminalButton>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".json"
                      ref={fileInputRef}
                      onChange={importData}
                      className="hidden"
                    />
                    <TerminalButton fullWidth onClick={() => fileInputRef.current?.click()} variant="secondary" icon={Upload}>IMPORT_ARCHIVE</TerminalButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'add-contact' && (
            <div className="p-6 max-w-3xl mx-auto">
              <div className="grid md:grid-cols-2 gap-8 mt-12">
                <div className="space-y-6">
                  <div className="bg-ray-900/20 border border-ray-800 p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><QrCode size={20} /> SHARE_IDENTITY</h3>
                    <p className="text-slate-500 text-sm mb-6">Generate a secure invite code for a peer to scan.</p>

                    {!inviteCode ? (
                      <TerminalButton fullWidth onClick={generateInvite}>GENERATE_INVITE</TerminalButton>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto">
                          <QRCodeSVG value={inviteCode} size={200} />
                        </div>
                        <p className="text-center text-xs text-ray-500 font-mono">SCAN_TO_CONNECT</p>
                        <TerminalButton fullWidth variant="secondary" onClick={() => setInviteCode(null)}>RESET</TerminalButton>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-black border border-slate-800 p-6">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2"><Scan size={20} /> SCAN_IDENTITY</h3>
                    <p className="text-slate-500 text-sm mb-6">Scan a peer's invite code to establish a secure link.</p>
                    <TerminalButton fullWidth icon={Scan} onClick={() => setShowScanner(true)}>ACTIVATE_SCANNER</TerminalButton>
                  </div>
                </div>
              </div>
            </div>
          )}

          {view === 'chat' && activePeerId && (
            <div className="flex flex-col h-full">
              <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
                {(chatHistory[activePeerId] || []).map(msg => (
                  <div key={msg.id} className={`flex ${msg.senderId === 'me' ? 'justify-end' : msg.senderId === 'system' ? 'justify-center' : 'justify-start'}`}>
                    {msg.senderId === 'system' ? (
                      <span className="text-[10px] text-ray-500 font-mono py-1 px-2 border border-ray-900 bg-black/50">{msg.content}</span>
                    ) : (
                      <div className={`max-w-[80%] ${msg.senderId === 'me' ? 'bg-ray-900/80 border border-ray-800 text-slate-200' : 'bg-black border border-slate-800 text-slate-300'} p-3 rounded-sm relative group`}>
                        <p className="text-sm font-mono whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="flex items-center justify-end gap-1 mt-1 opacity-70">
                          <span className="text-[10px] text-slate-600">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {msg.senderId === 'me' && (
                            <span className="text-ray-500">
                              {msg.status === 'pending' && <RefreshCw size={10} className="animate-spin" />}
                              {msg.status === 'sent' && <Check size={10} />}
                              {msg.status === 'delivered' && <div className="flex"><Check size={10} /><Check size={10} className="-ml-1" /></div>}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={chatBottomRef} />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); const txt = fd.get('text') as string; if (txt.trim()) { sendMessage(txt); e.currentTarget.reset(); } }}
                className="p-4 bg-black border-t border-ray-900 flex gap-2"
              >
                <input
                  name="text"
                  autoComplete="off"
                  placeholder="TRANSMIT_DATA..."
                  className="flex-1 bg-ray-950 border border-ray-900 p-3 text-white font-mono focus:border-ray-500 outline-none"
                />
                <TerminalButton type="submit">
                  <Send size={18} />
                </TerminalButton>
              </form>
            </div>
          )}
        </main>
      </div>

      {/* CRT Effect */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.15] mix-blend-overlay" style={{ background: 'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))', backgroundSize: '100% 2px, 3px 100%' }}></div>
    </div>
  );
}