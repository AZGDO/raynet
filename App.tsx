import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Send, Shield, Wifi, WifiOff, ArrowRight, Link, Lock, Zap,
  Settings, Users, MessageSquare, Upload, Download, User,
  Copy, Check, Plus, X, LogOut, Scan, QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { TerminalButton } from './components/TerminalButton';
import { CodeBlock } from './components/CodeBlock';
import { UserProfile, Contact, ChatMessage, ConnectionStatus, NetworkMessage } from './types';

// --- Constants & Utils ---

const STUN_SERVERS = {
  iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
};

const generateId = () => crypto.randomUUID().split('-')[0];
const encodeData = (data: any) => btoa(JSON.stringify(data));
const decodeData = (str: string) => {
  try { return JSON.parse(atob(str)); } catch { return null; }
};

const waitForIceGathering = (pc: RTCPeerConnection) => {
  return new Promise<void>(resolve => {
    if (pc.iceGatheringState === 'complete') {
      resolve();
      return;
    }

    const check = () => {
      if (pc.iceGatheringState === 'complete') {
        pc.removeEventListener('icegatheringstatechange', check);
        resolve();
      }
    };

    pc.addEventListener('icegatheringstatechange', check);
    setTimeout(() => {
      pc.removeEventListener('icegatheringstatechange', check);
      resolve();
    }, 5000);
  });
};

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
      // scanner.clear() is handled by unmount or we can do it here if we want to stop immediately
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
  const [view, setView] = useState<'onboarding' | 'contacts' | 'chat' | 'connect' | 'settings'>('contacts');
  const [activePeerId, setActivePeerId] = useState<string | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [showScanner, setShowScanner] = useState(false);

  // WebRTC State
  const [connectionMode, setConnectionMode] = useState<'host' | 'join' | null>(null);
  const [sdpData, setSdpData] = useState<{ local: string; remote: string }>({ local: '', remote: '' });

  // Refs
  const pc = useRef<RTCPeerConnection | null>(null);
  const dc = useRef<RTCDataChannel | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Lifecycle ---

  useEffect(() => {
    if (!profile) setView('onboarding');
  }, [profile]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, activePeerId, view]);

  // --- WebRTC Logic ---

  const cleanupConnection = () => {
    if (dc.current) dc.current.close();
    if (pc.current) pc.current.close();
    pc.current = null;
    dc.current = null;
    setStatus('idle');
    setConnectionMode(null);
    setSdpData({ local: '', remote: '' });
    setShowScanner(false);
  };

  const setupPeerConnection = useCallback(() => {
    if (pc.current) pc.current.close();
    const newPc = new RTCPeerConnection(STUN_SERVERS);

    newPc.oniceconnectionstatechange = () => {
      if (newPc.iceConnectionState === 'disconnected' || newPc.iceConnectionState === 'failed') {
        setStatus('disconnected');
        if (activePeerId) addSystemMessage(activePeerId, 'UPLINK_LOST');
      } else if (newPc.iceConnectionState === 'connected') {
        setStatus('connected');
      }
    };

    pc.current = newPc;
    return newPc;
  }, [activePeerId]);

  const handleDataChannel = (channel: RTCDataChannel) => {
    channel.onopen = () => {
      setStatus('connected');
      // Send Handshake
      if (profile) {
        const msg: NetworkMessage = { type: 'HANDSHAKE', payload: profile };
        channel.send(JSON.stringify(msg));
      }
    };

    channel.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as NetworkMessage;

        if (msg.type === 'HANDSHAKE') {
          const peer = msg.payload;
          // Save contact
          setContacts(prev => ({
            ...prev,
            [peer.id]: {
              id: peer.id,
              username: peer.username,
              bio: peer.bio,
              lastConnected: Date.now()
            }
          }));
          setActivePeerId(peer.id);
          setView('chat');
          addSystemMessage(peer.id, `SECURE_UPLINK_ESTABLISHED: ${peer.username}`);
        } else if (msg.type === 'CHAT') {
          if (!activePeerId) {
            // Fallback if handshake hasn't processed fully or race condition
            // In a real app, we'd handle this better.
          }
          addMessage(activePeerId || 'unknown', msg.payload.content, 'peer');
        }
      } catch (e) {
        console.error('Failed to parse message', e);
      }
    };

    dc.current = channel;
  };

  // --- Actions ---

  const addMessage = (peerId: string, content: string, sender: 'me' | 'peer' | 'system') => {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      senderId: sender === 'me' ? 'me' : sender === 'system' ? 'system' : peerId,
      content,
      timestamp: Date.now(),
      type: sender === 'system' ? 'system' : 'text'
    };

    setChatHistory(prev => ({
      ...prev,
      [peerId]: [...(prev[peerId] || []), msg]
    }));
  };

  const addSystemMessage = (peerId: string, content: string) => {
    addMessage(peerId, content, 'system');
  };

  const sendMessage = (text: string) => {
    if (!activePeerId || !dc.current || dc.current.readyState !== 'open') return;

    const payload = { id: crypto.randomUUID(), content: text, timestamp: Date.now() };
    const msg: NetworkMessage = { type: 'CHAT', payload };

    dc.current.send(JSON.stringify(msg));
    addMessage(activePeerId, text, 'me');

    // Update last seen
    setContacts(prev => ({
      ...prev,
      [activePeerId]: { ...prev[activePeerId], lastConnected: Date.now() }
    }));
  };

  const hostSession = async () => {
    cleanupConnection();
    setConnectionMode('host');
    setStatus('host-generating');

    const connection = setupPeerConnection();
    const channel = connection.createDataChannel("raynet");
    handleDataChannel(channel);

    try {
      const offer = await connection.createOffer();
      await connection.setLocalDescription(offer);

      // Wait for ICE
      await waitForIceGathering(connection);

      setSdpData(prev => ({ ...prev, local: encodeData(connection.localDescription) }));
      setStatus('host-waiting');
    } catch (e) {
      console.error(e);
      setStatus('failed');
    }
  };

  const handleHostFinalize = async () => {
    if (!sdpData.remote || !pc.current) return;
    const answer = decodeData(sdpData.remote);
    if (answer) {
      await pc.current.setRemoteDescription(answer);
    }
  };

  const joinSession = async () => {
    cleanupConnection();
    setConnectionMode('join');
    setStatus('join-input');
  };

  const handleJoinGenerate = async () => {
    if (!sdpData.remote) return;
    const offer = decodeData(sdpData.remote);
    if (!offer) return;

    setStatus('join-generating');
    const connection = setupPeerConnection();

    connection.ondatachannel = (e) => handleDataChannel(e.channel);

    try {
      await connection.setRemoteDescription(offer);
      const answer = await connection.createAnswer();
      await connection.setLocalDescription(answer);

      // Wait for ICE
      await waitForIceGathering(connection);

      setSdpData(prev => ({ ...prev, local: encodeData(connection.localDescription) }));
    } catch (e) {
      console.error(e);
      setStatus('failed');
    }
  };

  const handleScan = (data: string) => {
    setShowScanner(false);
    setSdpData(prev => ({ ...prev, remote: data }));
    // Auto-trigger next steps if possible
    if (connectionMode === 'join' && status === 'join-input') {
      // We just scanned the host's offer, wait for user to click generate or auto-click?
      // Let's just set the data for now, user can click generate.
      // Actually, better UX:
      // If we are joining, we scanned the offer.
    }
  };

  // --- File Operations ---

  const exportData = () => {
    const data = { profile, contacts, chatHistory, version: 1, exportedAt: Date.now() };
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
                setProfile({ id: generateId(), username, bio, created: Date.now() });
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
            <button onClick={() => setView('connect')} className={`w-full flex items-center gap-3 p-3 rounded hover:bg-ray-900 transition-colors ${view === 'connect' ? 'bg-ray-900 text-ray-500' : 'text-slate-400'}`}>
              <Wifi size={20} />
              <span className="hidden md:block font-mono text-sm">NEW_UPLINK</span>
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
            {view === 'connect' && 'ESTABLISH_UPLINK'}
            {view === 'settings' && 'SYSTEM_CONFIG'}
            {view === 'chat' && (contacts[activePeerId || '']?.username || 'UNKNOWN_PEER')}
          </h2>

          {view === 'chat' && (
            <div className="flex items-center gap-2 text-xs font-mono">
              <div className={`w-2 h-2 rounded-full ${status === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-red-500'}`} />
              <span className={status === 'connected' ? 'text-green-500' : 'text-red-500'}>{status === 'connected' ? 'SECURE' : 'OFFLINE'}</span>
              {status === 'disconnected' && (
                <button onClick={() => setView('connect')} className="ml-2 underline hover:text-white">RECONNECT</button>
              )}
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
                  <button onClick={() => setView('connect')} className="mt-4 text-ray-500 hover:text-ray-400 font-mono text-xs underline">INITIALIZE_NEW_CONNECTION</button>
                </div>
              ) : (
                Object.values(contacts).map(contact => (
                  <div key={contact.id}
                    onClick={() => { setActivePeerId(contact.id); setView('chat'); }}
                    className="bg-ray-900/20 border border-ray-800 hover:border-ray-500/50 p-4 cursor-pointer transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-white group-hover:text-ray-400 transition-colors">{contact.username}</span>
                      <span className="text-[10px] font-mono text-slate-600">{new Date(contact.lastConnected).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono truncate">{contact.bio || 'NO_BIO'}</p>
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

          {view === 'connect' && (
            <div className="p-6 max-w-3xl mx-auto">
              {!connectionMode ? (
                <div className="grid md:grid-cols-2 gap-8 mt-12">
                  <button onClick={hostSession} className="group bg-ray-900/20 border border-ray-800 hover:bg-ray-900/40 hover:border-ray-500 p-8 text-left transition-all">
                    <div className="w-12 h-12 bg-ray-900 rounded-full flex items-center justify-center mb-6 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      <Wifi size={24} className="text-ray-500" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">HOST_UPLINK</h3>
                    <p className="text-sm text-slate-500 font-mono">Generate a secure frequency for a peer to join.</p>
                  </button>
                  <button onClick={joinSession} className="group bg-black border border-slate-800 hover:bg-slate-900 hover:border-slate-600 p-8 text-left transition-all">
                    <div className="w-12 h-12 bg-slate-900 rounded-full flex items-center justify-center mb-6">
                      <Link size={24} className="text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-200 mb-2">JOIN_UPLINK</h3>
                    <p className="text-sm text-slate-500 font-mono">Connect using a frequency code provided by host.</p>
                  </button>
                </div>
              ) : (
                <div className="bg-black border border-ray-900 p-6 relative">
                  <button onClick={cleanupConnection} className="absolute top-4 right-4 text-slate-600 hover:text-ray-500"><X size={20} /></button>

                  {/* Stepper UI */}
                  <div className="flex items-center justify-center mb-8 space-x-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${sdpData.local ? 'bg-ray-500 text-black' : 'bg-ray-900 text-white'}`}>1</div>
                    <div className="w-12 h-px bg-ray-900"></div>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${sdpData.remote ? 'bg-ray-500 text-black' : 'bg-ray-900 text-white'}`}>2</div>
                  </div>

                  {connectionMode === 'host' ? (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-ray-400 text-sm font-mono mb-2">STEP 1: SHARE FREQUENCY</h3>
                        {status === 'host-generating' ? (
                          <div className="h-24 flex items-center justify-center text-ray-500 animate-pulse font-mono text-xs">GENERATING_KEYS...</div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto">
                              <QRCodeSVG value={sdpData.local} size={200} />
                            </div>
                            <CodeBlock label="YOUR_OFFER" value={sdpData.local} readOnly />
                          </div>
                        )}
                      </div>
                      {status === 'host-waiting' && (
                        <div className="pt-6 border-t border-ray-900">
                          <h3 className="text-ray-400 text-sm font-mono mb-2">STEP 2: INPUT PEER RESPONSE</h3>
                          <div className="mb-4">
                            <TerminalButton fullWidth icon={Scan} onClick={() => setShowScanner(true)}>SCAN_PEER_RESPONSE</TerminalButton>
                          </div>
                          <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-ray-900"></div>
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                              <span className="bg-black px-2 text-slate-500">OR_MANUAL_ENTRY</span>
                            </div>
                          </div>
                          <CodeBlock
                            label="PEER_ANSWER"
                            value={sdpData.remote}
                            onChange={(v) => setSdpData(p => ({ ...p, remote: v }))}
                            placeholder="PASTE_RESPONSE_HERE"
                          />
                          <div className="mt-4">
                            <TerminalButton fullWidth onClick={handleHostFinalize} disabled={!sdpData.remote}>ESTABLISH_LINK</TerminalButton>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-ray-400 text-sm font-mono mb-2">STEP 1: INPUT HOST FREQUENCY</h3>
                        <div className="mb-4">
                          <TerminalButton fullWidth icon={Scan} onClick={() => setShowScanner(true)}>SCAN_HOST_OFFER</TerminalButton>
                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-ray-900"></div>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-black px-2 text-slate-500">OR_MANUAL_ENTRY</span>
                          </div>
                        </div>
                        <CodeBlock
                          label="HOST_OFFER"
                          value={sdpData.remote}
                          onChange={(v) => setSdpData(p => ({ ...p, remote: v }))}
                          placeholder="PASTE_OFFER_HERE"
                        />
                        <div className="mt-2">
                          <TerminalButton fullWidth onClick={handleJoinGenerate} disabled={!sdpData.remote || status === 'join-generating'}>
                            {status === 'join-generating' ? 'COMPUTING...' : 'GENERATE_RESPONSE'}
                          </TerminalButton>
                        </div>
                      </div>
                      {sdpData.local && (
                        <div className="pt-6 border-t border-ray-900">
                          <h3 className="text-ray-400 text-sm font-mono mb-2">STEP 2: SHARE RESPONSE</h3>
                          <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto mb-4">
                            <QRCodeSVG value={sdpData.local} size={200} />
                          </div>
                          <CodeBlock label="YOUR_ANSWER" value={sdpData.local} readOnly />
                          <div className="mt-4 p-3 bg-ray-900/50 border border-ray-800 text-xs text-ray-400 flex gap-2">
                            <Lock size={14} className="shrink-0 mt-0.5" />
                            <span>WAITING FOR HOST TO CONFIRM...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
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
                      <div className={`max-w-[80%] ${msg.senderId === 'me' ? 'bg-ray-900/80 border border-ray-800 text-slate-200' : 'bg-black border border-slate-800 text-slate-300'} p-3 rounded-sm`}>
                        <p className="text-sm font-mono whitespace-pre-wrap break-words">{msg.content}</p>
                        <div className="text-[10px] text-slate-600 mt-1 text-right opacity-70">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
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
                  disabled={status !== 'connected'}
                  placeholder={status === 'connected' ? "TRANSMIT_DATA..." : "UPLINK_OFFLINE"}
                  className="flex-1 bg-ray-950 border border-ray-900 p-3 text-white font-mono focus:border-ray-500 outline-none disabled:opacity-50"
                />
                <TerminalButton type="submit" disabled={status !== 'connected'}>
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