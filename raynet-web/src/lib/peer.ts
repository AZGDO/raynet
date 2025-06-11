export class Discovery {
  private channel = new BroadcastChannel('raynet-discovery');
  private username: string | null = null;
  constructor() {
    this.channel.onmessage = (ev) => {
      const data = ev.data as any;
      if (data.type === 'query' && this.username && data.username === this.username) {
        this.channel.postMessage({ type: 'found', to: data.id, username: this.username });
      }
    };
  }
  advertise(username: string) {
    this.username = username;
  }
  async query(username: string): Promise<string | null> {
    const id = crypto.randomUUID();
    return new Promise((resolve) => {
      const handler = (ev: MessageEvent) => {
        const data = ev.data as any;
        if (data.type === 'found' && data.to === id) {
          this.channel.removeEventListener('message', handler);
          resolve(data.username);
        }
      };
      this.channel.addEventListener('message', handler);
      this.channel.postMessage({ type: 'query', username, id });
      setTimeout(() => {
        this.channel.removeEventListener('message', handler);
        resolve(null);
      }, 1000);
    });
  }
}

export function openChatChannel(a: string, b: string) {
  const name = `chat-${[a, b].sort().join('-')}`;
  const channel = new BroadcastChannel(name);
  return channel;
}

export interface Peer {
  username: string;
  channel: BroadcastChannel;
}

export async function connect(local: string, remote: string): Promise<Peer> {
  const channel = openChatChannel(local, remote);
  return { username: remote, channel };
}

export async function sendMessage(peer: Peer, text: string, from: string): Promise<void> {
  peer.channel.postMessage({ from, to: peer.username, text, timestamp: Date.now() });
}

export function onMessage(peer: Peer, handler: (msg: any) => void) {
  const listener = (ev: MessageEvent) => handler(ev.data);
  peer.channel.addEventListener('message', listener);
  return () => peer.channel.removeEventListener('message', listener);
}
