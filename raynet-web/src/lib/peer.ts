export class Discovery {
  private channel = new BroadcastChannel('raynet-discovery');
  private username: string | null = null;
  private code: string | null = null;
  constructor() {
    this.channel.onmessage = (ev) => {
      const data = ev.data as any;
      if (data.type === 'query' && this.code && data.code === this.code) {
        this.channel.postMessage({ type: 'found', to: data.id, username: this.username });
      }
    };
  }
  advertise(username: string, code: string) {
    this.username = username;
    this.code = code;
  }
  async query(code: string): Promise<string | null> {
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
      this.channel.postMessage({ type: 'query', code, id });
      setTimeout(() => {
        this.channel.removeEventListener('message', handler);
        resolve(null);
      }, 1000);
    });
  }
}

const requestChannel = new BroadcastChannel('raynet-requests');

export function sendConnectRequest(from: string, to: string) {
  requestChannel.postMessage({ type: 'request', from, to });
}

export function sendAcceptRequest(from: string, to: string) {
  requestChannel.postMessage({ type: 'accept', from, to });
}

export function onConnectRequest(username: string, handler: (from: string) => void) {
  const listener = (ev: MessageEvent) => {
    const data = ev.data as any;
    if (data.type === 'request' && data.to === username) {
      handler(data.from);
    }
  };
  requestChannel.addEventListener('message', listener);
  return () => requestChannel.removeEventListener('message', listener);
}

export function onAccept(username: string, handler: (from: string) => void) {
  const listener = (ev: MessageEvent) => {
    const data = ev.data as any;
    if (data.type === 'accept' && data.to === username) {
      handler(data.from);
    }
  };
  requestChannel.addEventListener('message', listener);
  return () => requestChannel.removeEventListener('message', listener);
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
