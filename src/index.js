import { VERSION } from './core.js';
import { LgHero } from './hero.js';
import { LgHeadline } from './headline.js';
import { LgNow } from './now.js';
import { LgRooms, LgRoom } from './rooms.js';
import { LgList } from './list.js';
import { LgStat } from './stat.js';
import { LgNav } from './nav.js';
import { LgColumn } from './column.js';
import { LgAgenda } from './agenda.js';
import { LgIdle } from './idle.js';
import { LgEnergy } from './energy.js';
import { LgParcels } from './parcels.js';
import { LgEditor } from './editor.js';

function define(tag, cls, name, description) {
  if (!customElements.get(tag)) customElements.define(tag, cls);
  window.customCards = window.customCards || [];
  if (!window.customCards.some((card) => card.type === tag)) {
    window.customCards.push({ type: tag, name, description, preview: false });
  }
}

if (!customElements.get('lg-card-editor')) customElements.define('lg-card-editor', LgEditor);

define('lg-hero', LgHero, 'Liquid Glass Hero', 'Clock, date, weather and status chips');
define('lg-headline', LgHeadline, 'Liquid Glass Headline', 'Greeting or one-line status');
define('lg-now', LgNow, 'Liquid Glass Now', 'Up-next list with one action per row');
define('lg-rooms', LgRooms, 'Liquid Glass Rooms', 'Grid of area tiles that switch the lights of an area');
define('lg-room', LgRoom, 'Liquid Glass Room', 'A single area or entity tile');
define('lg-list', LgList, 'Liquid Glass List', 'Glass card with rows');
define('lg-stat', LgStat, 'Liquid Glass Stat', 'One number with a sparkline');
define('lg-nav', LgNav, 'Liquid Glass Nav', 'Bottom bar on phones, pill row on wide screens');
define('lg-column', LgColumn, 'Liquid Glass Column', 'Tall glass panel that holds cards, with cards docked at the bottom');
define('lg-agenda', LgAgenda, 'Liquid Glass Agenda', 'Upcoming calendar events, grouped by day');
define('lg-idle', LgIdle, 'Liquid Glass Idle', 'Wall display behaviour: calm view after inactivity, tap to return, dim at night');
define('lg-energy', LgEnergy, 'Liquid Glass Energy', 'Energy today, this week and this month, with trends');
define('lg-parcels', LgParcels, 'Liquid Glass Parcels', 'Parcels from the Parcel integration: status track, history, add in place');

console.info(`%c LIQUID-GLASS-CARDS %c ${VERSION} `, 'background:#7ab8ff;color:#0b1020;font-weight:700', 'background:#1a2036;color:#f2f4f8');
