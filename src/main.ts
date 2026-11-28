import './styles/main.css';
import './styles/menu.css';
import './styles/hud.css';
import './styles/effects.css';

import { Game } from './core/Game';
import { UIManager } from './ui/UIManager';

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) {
    throw new Error('Application mount element #app not found.');
  }

  const shell = document.createElement('main');
  shell.className = 'game-shell';

  const canvasViewport = document.createElement('div');
  canvasViewport.className = 'viewport-canvas';
  canvasViewport.setAttribute('aria-label', 'Asphalt Rush 3D Racing Viewport');

  const uiLayer = document.createElement('div');
  uiLayer.className = 'ui-layer';

  shell.append(canvasViewport, uiLayer);
  root.appendChild(shell);

  try {
    const game = new Game(canvasViewport);
    const ui = new UIManager(uiLayer, game);

    window.addEventListener('beforeunload', () => {
      ui.dispose();
      game.dispose();
    });
  } catch {
    const fallbackBanner = document.createElement('div');
    fallbackBanner.className = 'webgl-error-banner';
    fallbackBanner.textContent =
      'WebGL 2 graphics could not start in this browser. Enable hardware acceleration or try a modern browser.';
    uiLayer.appendChild(fallbackBanner);
  }
}

bootstrap();
