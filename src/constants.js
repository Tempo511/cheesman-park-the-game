// ============================================================================
// constants.js — pure data: tile ids, palette, weapons, zones, park geometry.
// No DOM, no state. Safe to import anywhere (including headless Node tests).
// ============================================================================

export const T = 16;                 // tile size in pixels
export const MW = 72, MH = 92;       // map width/height in tiles

// Ground tile ids
export const G = {
  GRASS:0, GRASS2:1, DRY:2, PATH:3, ROAD:4, WALK:5, WATER:6, MARBLE:7,
  SAND:8, BED:9, GARDEN:10, EDGE:11, PAVE:12,
};

// Tiles the player/zombies cannot walk onto
export const SOLID_GROUND = new Set([G.WATER, G.ROAD, G.GARDEN]);
// Tiles paths are allowed to stamp over during map generation
export const GRASSY = new Set([G.GRASS, G.GRASS2, G.DRY]);

export const PAL = {
  grass:'#79a251', grass2:'#84ae59', dry:'#a3aa5e', dryDot:'#b7b468',
  pave:'#d3cec0', paveDot:'#c2bdae', paveEdge:'#a8a293',
  path:'#d9c69b', pathDot:'#c9b586', pathEdge:'#ab9668',
  road:'#585a60', roadDark:'#4e5056', dash:'#d8d2be',
  walk:'#bcb5a3', walkLine:'#a49d8b',
  water:'#5f9ec7', waterHi:'#8fc3de', waterLo:'#4b87ad',
  marble:'#efe9da', marbleShade:'#d3cab4', marbleLine:'#c2b89f',
  sand:'#e0cf9d', sandDot:'#cdbb85',
  bed:'#6b4a33', bedDot:'#7d5940',
  garden:'#5d8f46', gardenDark:'#4d7c3a',
  trunk:'#6d4a2e', trunkHi:'#82593a',
  leafD:'#3c6130', leaf:'#4f7d3a', leafHi:'#639347',
  pineD:'#2c4f34', pine:'#39603f', pineHi:'#4a7350',
  ink:'#20281c',
};

// The two lawn loops of the figure-8 carriage drive
export const NLOBE = { cx:31, cy:25, rx:19, ry:13 };
export const SLOBE = { cx:30, cy:64, rx:19, ry:15 };

// Slackline anchor points (north lawn ambient)
export const SLACK = { ax:11*T, bx:17*T, y:40.2*T };

// The Ranger Cart shop position (matches the 'cart' object placed in map.js)
export const SHOP_POS = { x:44*T, y:54.6*T };

// XP required to reach the next level
export const xpNeed = (lv) => Math.round(40 * Math.pow(lv, 1.35));

export const WEAPONS = {
  frisbee:  { name:'Frisbee', price:0, kind:'ranged', style:'disc', dmg:12, rate:.5, spd:190, ttl:.85, size:5, col:'#e5c04b',
    desc:'Trusty 175g park classic. Flies true-ish.' },
  leash:    { name:'Dog Leash', price:60, kind:'melee', style:'whip', dmg:20, rate:.32, range:32, knock:60,
    desc:'26ft retractable. Cracks like a whip.' },
  launcher: { name:'Ball Launcher', price:160, kind:'ranged', style:'ball', dmg:9, rate:.16, spd:250, ttl:.7, size:4, col:'#b7e34b',
    desc:'Chuck-it wrist rocket. Rapid fire.' },
  paddle:   { name:'Pickleball Paddle', price:320, kind:'melee', style:'paddle', dmg:42, rate:.55, range:30, knock:150,
    desc:'Carbon fiber. Huge knockback. 0-0-2!' },
  chile:    { name:'Chile Cannon', price:550, kind:'ranged', style:'pepper', dmg:28, rate:.65, spd:175, ttl:1.05, size:6, col:'#4c9a3f', splash:36,
    desc:'Pueblo-grade splash damage. Roasted fresh.' },
};
export const WEAPON_ORDER = ['frisbee', 'leash', 'launcher', 'paddle', 'chile'];

// Enemy roster. New kinds unlock on later nights (minNight) and are chosen by
// weighted random among those eligible. Behavior flags (fly/weave/lunge/
// lifesteal/blink) drive distinct movement in the simulation. Stats scale with
// the night: hp = hp0 + hpN*night, spd = min(spdMax, spd0 + spdN*night).
export const ENEMY_TYPES = {
  zombie:   { minNight:1, weight:5, hp0:26, hpN:9,  spd0:20, spdN:2,   spdMax:36, dmg:12, xp:8,  coin0:2,  rise:0,   riseSpd:1.1, fly:false,
    spawnCol:'#6b4a33', deathCol:'#7da05f' },
  ghost:    { minNight:1, weight:3, hp0:16, hpN:6,  spd0:30, spdN:2.5, spdMax:48, dmg:9,  xp:10, coin0:4,  rise:0.4, riseSpd:1.6, fly:true, weave:true, super:true,
    spawnCol:'#cfe0ea', deathCol:'#dfe8ee' },
  vampire:  { minNight:4, weight:3, hp0:30, hpN:8,  spd0:46, spdN:2.5, spdMax:80, dmg:14, xp:16, coin0:7,  rise:0.4, riseSpd:1.6, fly:true, lifesteal:true, super:true,
    spawnCol:'#3a2230', deathCol:'#c0303a',
    intro:['🧛 The vampires are up', 'Fast, airborne, and they heal when they bite you.'] },
  werewolf: { minNight:6, weight:2, hp0:60, hpN:14, spd0:34, spdN:3,   spdMax:78, dmg:20, xp:26, coin0:11, rise:0.2, riseSpd:1.1, fly:false, lunge:true,
    spawnCol:'#43362a', deathCol:'#5b4a3a',
    intro:['🐺 Werewolves', 'Big, tanky, and they lunge. Don’t get cornered.'] },
  alien:    { minNight:8, weight:2, hp0:44, hpN:11, spd0:40, spdN:3,   spdMax:82, dmg:16, xp:38, coin0:16, rise:0.5, riseSpd:1.8, fly:true, weave:true, blink:true, super:true,
    spawnCol:'#6fae5a', deathCol:'#9ff08a',
    intro:['👽 …Aliens?', 'They blink around and hit hard — but they’re worth a fortune.'] },
};
export const ENEMY_ORDER = ['zombie', 'ghost', 'vampire', 'werewolf', 'alien'];

// Character archetypes ("park tribes"). Chosen once at ARCHETYPE_LEVEL; grants
// passive perks (data-driven multipliers read live by the sim) + a visual
// makeover (palette + prop). Abilities come in a later phase.
export const ARCHETYPE_LEVEL = 3;

// Ranger rescues per run: die this many times and the run is over.
export const MAX_LIVES = 3;
export const ARCHETYPES = {
  volleyball: { id:'volleyball', name:'🏐 Volleyball Bro',
    flavor:'Bumps zombies like they’re serves — fast, physical, all knockback.',
    perkText:'+15% speed · +25% knockback · +10% melee damage',
    moveMult:1.15, knockMult:1.25, meleeMult:1.10,
    pal:{ skin:'#e8b58a', shirt:'#f2ead6', pants:'#2f3742', hair:'#4a3123' }, prop:'headband',
    ability1:{ name:'Spike Dash', icon:'»', level:6, cd:6, dashSpd:440, dashTime:0.2, dmg:26, range:24, knock:200 },
    ability2:{ name:'Ace', icon:'◎', level:10, cd:18, dmg:40, radius:90, knock:260, stun:1.2 } },
  tech: { id:'tech', name:'💻 Tech Bro',
    flavor:'Out-earns the apocalypse. More Bucks, cheaper gear.',
    perkText:'+50% Bucks · 15% off at the Ranger Cart',
    coinMult:1.5, priceMult:0.85,
    pal:{ skin:'#e8b58a', shirt:'#4c6b57', pants:'#8a8a8a', hair:'#2b2b2b' }, prop:'earbuds',
    ability1:{ name:'Overclock', icon:'⚡', level:6, cd:11, dur:5, speed:1.2, haste:1.6 },
    ability2:{ name:'Drone', icon:'✈', level:10, cd:24, dur:12, rate:0.35, dmg:10 } },
  hippie: { id:'hippie', name:'🌼 Hippie',
    flavor:'Peace, love, and regeneration. The supernatural doesn’t faze them.',
    perkText:'+1.5 HP/sec regen · −20% damage from ghosts, vampires & aliens',
    regen:1.5, superRes:0.2,
    pal:{ skin:'#d9a06f', shirt:'#8e6fb8', pants:'#4c6b57', hair:'#6b4a2e' }, prop:'shades',
    ability1:{ name:'Second Wind', icon:'✦', level:6, cd:11, healFrac:0.35, dur:4, resist:0.4 },
    ability2:{ name:'Smoke Cloud', icon:'☁', level:10, cd:20, dur:6, radius:64, slow:0.35 } },
};
export const ARCHETYPE_ORDER = ['volleyball', 'tech', 'hippie'];

// Discoverable landmarks. `r` = tile rect [x0,y0,x1,y1]; `grounds` = match by tile type.
// `m` = minimap marker tile coords.
export const ZONES = [
  { id:'pav',  m:[53,46], r:[45,39,60,53], t:'Cheesman Memorial Pavilion',
    p:'Built 1908–1910 of white Colorado Yule marble. The colonnade faces the Front Range — and makes decent cover. (+$25)' },
  { id:'pool', m:[33,46], r:[28,41,46,51], t:'Fountains & Reflecting Pool',
    p:'The fountain jets run all day. Zombies hate water. Probably. (+$25)' },
  { id:'loop', m:[34,8], r:null, grounds:[G.PATH, G.PAVE], t:'The Loops',
    p:'The gravel perimeter trail runs ~1.7 miles; the paved figure-8 around the two lawns — the old carriage drive — is Denver’s classic mile-ish run. (+$25)' },
  { id:'cem',  m:[22,32], r:[17,27,28,38], t:'Mount Prospect Cemetery · 1858–1893',
    p:'Denver’s first cemetery. The 1893 clearing left thousands of graves behind. At night, this lawn is the front line. (+$25)' },
  { id:'dbg',  m:[67,18], r:[58,3,72,34], t:'Denver Botanic Gardens',
    p:'The Boettcher Conservatory glows beyond the fence. The plants are safe. You are not. (+$25)' },
  { id:'play', m:[13,49], r:[10,46,17,53], t:'Playground',
    p:'Swings, slide, dome climber. Decent kiting terrain. (+$25)' },
  { id:'lawn', m:[26,64], r:[12,50,42,80], t:'The Great Lawn',
    p:'Eighty acres of open bluegrass. Nowhere to hide — for them or for you. (+$25)' },
  { id:'beds', m:[37,52], r:[26,39,45,53], t:'Formal Flower Beds',
    p:'Fresh annuals every summer. Try not to trample them mid-fight. (+$25)' },
];

// Waypoints evenly spaced around a lobe ellipse (for joggers)
export function ellipseWp(l, n, rev) {
  const wp = [];
  for (let i = 0; i < n; i++) {
    const a = (rev ? -1 : 1) * i / n * Math.PI * 2;
    wp.push([l.cx + Math.cos(a) * l.rx, l.cy + Math.sin(a) * l.ry]);
  }
  return wp;
}
