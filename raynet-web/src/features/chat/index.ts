import { useEffect, useState } from 'react';
import { db } from '../auth/store';
import { openChatChannel } from '../../lib/peer';
import { useAuth } from '../auth';
import { Message } from '../auth/store';

export function useChat(peer: string | null) {
  const { state } = useAuth();
  const username = state.user!;
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    if (!peer) return;
    const chatId = `chat-${[username, peer].sort().join('-')}`;
    const channel = openChatChannel(username, peer);
    db.messages.where('chatId').equals(chatId).toArray().then(setMessages);
    channel.onmessage = (ev) => {
      const msg = ev.data as Message;
      setMessages((m) => [...m, msg]);
      db.messages.add(msg);
    };
    return () => channel.close();
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
    const channel = openChatChannel(username, peer);
    channel.postMessage(msg);
    setMessages((m) => [...m, msg]);
    db.messages.add(msg);
    channel.close();
  }

  return { messages, send };
}
