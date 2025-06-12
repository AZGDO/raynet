import { navigate } from '../main.js';

export function showOnboarding(root) {
  const container = document.createElement('div');
  container.className = 'onboarding flex flex-col';
  container.innerHTML = `
    <h1>Welcome to raynet</h1>
    <button class="btn" id="guest">Continue as Guest</button>
  `;
  container.querySelector('#guest').addEventListener('click', () => {
    navigate('/chat/demo');
  });
  root.appendChild(container);
}
