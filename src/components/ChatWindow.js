export function ChatWindow(peerId) {
  const container = document.createElement('div');
  container.className = 'chat-window flex flex-col h-full';
  container.innerHTML = `
    <div class="chat-messages flex-1 overflow-auto"></div>
    <form class="chat-input flex">
      <input class="flex-1" aria-label="Message">
      <button class="btn">Send</button>
    </form>
  `;
  container.querySelector('form').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = container.querySelector('input');
    if (!input.value) return;
    const msg = document.createElement('div');
    msg.className = 'msg msg--outgoing';
    msg.textContent = input.value;
    container.querySelector('.chat-messages').appendChild(msg);
    input.value = '';
  });
  return container;
}
