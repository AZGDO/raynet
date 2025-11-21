import { useEffect, useRef, useState, useCallback } from 'react';
import { joinRoom, Room } from 'trystero/torrent';
import { UserProfile, Contact, NetworkMessage, ChatMessage, ConnectionStatus } from '../types';

// We use a fixed "app ID" for Trystero to find peers, but unique "room IDs" for private chats.
const APP_ID = 'raynet-messenger-v1';

interface UseNetworkProps {
    profile: UserProfile | null;
    contacts: Record<string, Contact>;
    onMessageReceived: (peerId: string, message: any) => void;
    onPeerConnected: (peerId: string) => void;
    onPeerDisconnected: (peerId: string) => void;
    onHandshakeReceived: (peer: UserProfile, roomId: string) => void;
}

export const useNetwork = ({ profile, contacts, onMessageReceived, onPeerConnected, onPeerDisconnected, onHandshakeReceived }: UseNetworkProps) => {
    const [status, setStatus] = useState<Record<string, ConnectionStatus>>({});
    const rooms = useRef<Record<string, Room>>({});
    const pendingMessages = useRef<Record<string, any[]>>({});

    // Helper to setup room events
    const setupRoom = useCallback((roomId: string, expectedPeerId?: string) => {
        if (rooms.current[roomId]) return rooms.current[roomId];

        const room = joinRoom({ appId: APP_ID }, roomId);
        rooms.current[roomId] = room;

        room.onPeerJoin((peerId) => {
            console.log(`Peer ${peerId} joined room ${roomId}`);
            // If we know who we expect (existing contact), set status
            if (expectedPeerId) {
                setStatus(prev => ({ ...prev, [expectedPeerId]: 'connecting' }));
            }

            // Always send handshake on join/peer-join to ensure exchange
            if (profile) {
                const [sendHandshake] = room.makeAction('handshake');
                sendHandshake({ type: 'HANDSHAKE', payload: profile as any });
            }
        });

        room.onPeerLeave((peerId) => {
            console.log(`Peer ${peerId} left room ${roomId}`);
            if (expectedPeerId) {
                setStatus(prev => ({ ...prev, [expectedPeerId]: 'disconnected' }));
                onPeerDisconnected(expectedPeerId);
            }
        });

        const [sendHandshake, getHandshake] = room.makeAction('handshake');
        const [sendChat, getChat] = room.makeAction('chat');
        const [sendAck, getAck] = room.makeAction('ack');

        getHandshake((data, peerId) => {
            const msg = data as NetworkMessage;
            if (msg.type === 'HANDSHAKE') {
                const peerProfile = msg.payload as UserProfile;

                // If this is a known contact, update status
                if (expectedPeerId && peerProfile.id === expectedPeerId) {
                    setStatus(prev => ({ ...prev, [expectedPeerId]: 'connected' }));
                    onPeerConnected(expectedPeerId);
                }

                // Notify app of handshake (handles new contacts)
                onHandshakeReceived(peerProfile, roomId);
            }
        });

        getChat((data, peerId) => {
            const msg = data as NetworkMessage;
            if (msg.type === 'CHAT') {
                // We need to know which contact sent this.
                // If it's a temp room, we might not have a contact yet.
                // But we only chat AFTER handshake.
                // Let's pass the roomId to onMessageReceived so App can lookup
                // But the signature is (peerId, msg).
                // We'll fix this by finding the contact by roomId in the App,
                // OR we just pass the expectedPeerId if we have it.
                if (expectedPeerId) {
                    onMessageReceived(expectedPeerId, msg);
                    sendAck({ type: 'ACK', payload: { messageId: msg.payload.id } });
                }
            }
        });

        getAck((data, peerId) => {
            const msg = data as NetworkMessage;
            if (msg.type === 'ACK' && expectedPeerId) {
                onMessageReceived(expectedPeerId, msg);
            }
        });

        return room;
    }, [profile, onPeerConnected, onPeerDisconnected, onHandshakeReceived, onMessageReceived]);

    // Join all contact rooms
    useEffect(() => {
        if (!profile) return;

        Object.values(contacts).forEach(contact => {
            if (!contact.roomId) return;
            setupRoom(contact.roomId, contact.id);
        });

        // Cleanup
        return () => {
            // Ideally we don't leave rooms on every render, but for now this is fine
            // In a real app we'd diff the contacts list.
        };
    }, [contacts, profile, setupRoom]); // Re-run if contacts change

    const sendMessage = (contactId: string, content: string) => {
        const contact = contacts[contactId];
        if (!contact || !rooms.current[contact.roomId]) return false;

        const room = rooms.current[contact.roomId];
        const [sendChat] = room.makeAction('chat');

        // Polyfill UUID if needed (handled in App, but good to have here too if we move logic)
        // We'll assume App passes valid content, but we generate ID here?
        // The previous code generated ID in App. Let's stick to that.
        const msgId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

        const payload = { id: msgId, content, timestamp: Date.now() };
        const msg: NetworkMessage = { type: 'CHAT', payload };

        // Trystero doesn't throw on send, but we can check if we have peers
        const peers = room.getPeers();
        if (Object.keys(peers).length > 0) {
            sendChat(msg);
            return { id: msgId, status: 'sent' };
        } else {
            // Queue message (not implemented in this simplified hook, handled by App state)
            return { id: msgId, status: 'pending' };
        }
    };

    // Function to create a new room for a new contact
    const createRoomId = () => {
        return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + Math.random().toString();
    };

    const joinTemporaryRoom = (roomId: string) => {
        setupRoom(roomId);
    };

    return {
        status,
        sendMessage,
        joinTemporaryRoom,
        createRoomId
    };
};
