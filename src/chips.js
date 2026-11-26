import { COLORS, h, matches, inWindow, formatState, fill, runAction } from './core.js';

export const CHIP_CSS = `
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  :host([size="large"]) .chips { gap: 10px; }
  .chip {
    display: inline-flex; align-items: center; gap: 8px;
    height: var(--lg-chip-h); padding: 0 calc(var(--lg-chip-h) * 0.38) 0 calc(var(--lg-chip-h) * 0.3);
    border-radius: 999px; font-size: var(--lg-chip-font); font-weight: 500; white-space: nowrap;
    position: relative;
  }
  /* The chip looks compact; its touch target reaches 44px. */
  @media (pointer: coarse) { .chip::after { content: ''; position: absolute; inset: calc((var(--lg-chip-h) - 44px) / 2) 0; } }
  .dot { width: var(--lg-chip-dot); height: var(--lg-chip-dot); border-radius: 50%; flex: none; }
`;

export function validateChips(chips) {
  for (const chip of chips) {
    if (!chip || typeof chip.entity !== 'string') throw new Error('Every chip needs an entity');
  }
}

export function chipSignature(hass, chips) {
  const now = new Date();
  return chips.map((chip) => `${hass.states[chip.entity] ? hass.states[chip.entity].state : '-'}${inWindow(chip, now) ? '' : '!'}`).join(',');
}

export function renderChips(node, hass, chips) {
  const now = new Date();
  const row = h('div', { class: 'chips', role: 'list' });
  for (const chip of chips) {
    const stateObj = hass.states[chip.entity];
    if (!stateObj || !matches(chip.when, stateObj) || !inWindow(chip, now)) continue;
    const name = chip.label !== undefined ? fill(chip.label, hass, stateObj) : stateObj.attributes.friendly_name || chip.entity;
    const text = chip.show_state ? `${name} ${formatState(hass, stateObj)}` : name;
    const button = h(
      'button',
      { class: 'chip glass press', type: 'button', role: 'listitem' },
      h('span', { class: 'dot', style: `background:${COLORS[chip.color] || COLORS.neutral}` }),
      text,
    );
    button.addEventListener('click', () => runAction(node, hass, chip.tap, chip.entity));
    row.append(button);
  }
  return row.childElementCount ? row : null;
}
