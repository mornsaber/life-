/**
 * The sandbox (life/Scenarios.js): edit a sandbox life as you play.
 */
import { button, card } from '../Components.js';

export function sandboxCard(state) {
  if (!state.flags?.sandbox) return '';
  return card('Sandbox', `<p class="fine">A sandbox life: change what you like. It won't go in the Hall of Fame.</p><div class="action-grid">
    ${button('💰 +$1 million', 'scenarios.sandbox', { arg: 'money', variant: 'small' })}
    ${button('📈 Every stat up', 'scenarios.sandbox', { arg: 'stats', variant: 'small' })}
    ${button('❤️ Fully healed', 'scenarios.sandbox', { arg: 'heal', variant: 'small' })}
    ${button('🧽 A clean record', 'scenarios.sandbox', { arg: 'record', variant: 'small' })}
  </div>`, { icon: '🧪' });
}
