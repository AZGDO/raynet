import { showOnboarding } from './components/Onboarding.js';
import { Sidebar } from './components/Sidebar.js';
import { ChatWindow } from './components/ChatWindow.js';

const routes = {
  '/onboarding': showOnboarding,
};

function render(path) {
  const app = document.getElementById('app');
  app.innerHTML = '';
  if (path.startsWith('/chat/')) {
    const peerId = path.split('/').pop();
    app.appendChild(Sidebar());
    app.appendChild(ChatWindow(peerId));
    return;
  }
  const handler = routes[path] || showOnboarding;
  handler(app);
}

function navigate(path) {
  history.pushState({}, '', path);
  render(path);
}

window.addEventListener('popstate', () => render(location.pathname));
window.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (a && a.href.startsWith(location.origin)) {
    e.preventDefault();
    navigate(a.pathname);
  }
});

document.addEventListener('DOMContentLoaded', () => {
  render(location.pathname);
});

export { navigate };
