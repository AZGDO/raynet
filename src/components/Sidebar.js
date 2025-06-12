import { navigate } from '../main.js';

export function Sidebar() {
  const nav = document.createElement('nav');
  nav.className = 'sidebar flex flex-col';
  nav.innerHTML = `
    <header class="sidebar__header">
      <span class="sidebar__user">guest</span>
      <a href="/settings" class="btn" aria-label="Settings">⚙️</a>
    </header>
    <section class="sidebar__groups">
      <ul class="sidebar__list">
        <li><a href="/chat/demo">Demo Chat</a></li>
      </ul>
    </section>
  `;
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (a) {
      e.preventDefault();
      navigate(a.getAttribute('href'));
    }
  });
  return nav;
}
