import { useEffect, useState, useRef } from 'react';
import { db } from '../auth/store';
import { connect, sendMessage, onMessage, Peer } from '../../lib/peer';
import { useAuth } from '../auth';
import { Message } from '../auth/store';

export function useChat(peer: string | null) {
  const { state } = useAuth();
  const username = state.user!;
  const [messages, setMessages] = useState<Message[]>([]);

  const connRef = useRef<Peer | null>(null);

  useEffect(() => {
    if (!peer) return;
    const chatId = `chat-${[username, peer].sort().join('-')}`;
    let stop: (() => void) | null = null;
    connect(username, peer).then(c => {
      connRef.current = c;
      db.messages.where('chatId').equals(chatId).toArray().then(setMessages);
      stop = onMessage(c, (msg: Message) => {
        setMessages(m => [...m, msg]);
        db.messages.add(msg);
      });
    });
    return () => {
      stop && stop();
      connRef.current?.channel.close();
      connRef.current = null;
    };
  }, [username, peer]);

  function send(text: string) {
    if (!peer) return;
    const msg: Message = {
      chatId: `chat-${[username, peer].sort().join('-')}`,
      from: username,
      to: peer,
      text,
      timestamp: Date.now(),
    };
    if (connRef.current) {
      sendMessage(connRef.current, text, username);
    }
    setMessages((m) => [...m, msg]);
    db.messages.add(msg);
  }

  return { messages, send };
}
