export interface UserProfile {
  id: string;
  username: string;
  bio: string;
  created: number;
}

export interface Contact {
  id: string;
  username: string;
  bio: string;
  lastConnected: number;
}

export interface ChatMessage {
  id: string;
  senderId: string; // 'me' or peerId
  content: string;
  timestamp: number;
  type: 'text' | 'system';
}

export interface ChatSession {
  peerId: string;
  messages: ChatMessage[];
  unreadCount: number;
}

// Data sent over WebRTC
export type NetworkMessage = 
  | { type: 'HANDSHAKE'; payload: UserProfile }
  | { type: 'CHAT'; payload: { id: string; content: string; timestamp: number } };

export type ConnectionStatus = 
  | 'idle' 
  | 'host-generating' 
  | 'host-waiting' 
  | 'join-input' 
  | 'join-generating' 
  | 'connected' 
  | 'disconnected'
  | 'failed';
