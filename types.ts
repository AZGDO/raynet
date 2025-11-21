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
  roomId: string; // Unique room ID for this pair
  lastConnected: number;
}

export type MessageStatus = 'pending' | 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  senderId: string; // 'me' or peerId
  content: string;
  timestamp: number;
  type: 'text' | 'system';
  status?: MessageStatus;
}

export interface ChatSession {
  peerId: string;
  messages: ChatMessage[];
  unreadCount: number;
}

// Data sent over WebRTC (Trystero)
export type NetworkMessage =
  | { type: 'HANDSHAKE'; payload: UserProfile }
  | { type: 'CHAT'; payload: { id: string; content: string; timestamp: number } }
  | { type: 'ACK'; payload: { messageId: string } };

export type ConnectionStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed';
