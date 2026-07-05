// ============================================================================
// state.js — the game world as plain, serializable data.
//
// Co-op design note: State contains NO canvas, DOM, or function references.
// The ground/solid grids are derived from `worldSeed` (so a joining client can
// regenerate them rather than receive them), and every random outcome flows
// through `simSeed`. That means the whole dynamic world can be snapshotted and
// sent to a peer — the foundation for host-authoritative multiplayer.
// ============================================================================
import { T, MW, MH, G, MAX_LIVES, NLOBE, SLOBE, ellipseWp } from './constants.js';
import { makeRng } from './rng.js';
import { buildMap } from './map.js';

export const DEFAULT_SEED = 20260701;

export function createState(seed = DEFAULT_SEED) {
  const state = {
    worldSeed: seed >>> 0,
    simSeed: (seed ^ 0x9e3779b9) >>> 0,  // independent stream for gameplay RNG
    time: 0,                              // accumulated sim seconds (deterministic clock)

    // terrain (derived from worldSeed)
    ground: new Uint8Array(MW * MH).fill(G.GRASS),
    solid: new Uint8Array(MW * MH),
    objects: [],
    cars: [],

    // inhabitants
    npcs: [],
    ambients: [],
    enemies: [], projectiles: [], pickups: [], particles: [], floats: [], swings: [],
    acorns: [], squirrels: [],             // daytime critters
    parkScore: 0, bestScore: 0, crittersActive: false, acornT: 0, sproutMet: false,
    drone: null, clouds: [], shocks: [],   // ultimate-ability entities
    zenT: 0,                               // yogi ultimate: global slow-motion

    player: {
      x: 6 * T + 8, y: 45.5 * T, dir: 'right', fx: 1, fy: 0, phase: 0, moving: false, speed: 76,
      hp: 100, maxHp: 100, coins: 0, xp: 0, level: 1, dmgMult: 1,
      weapon: 'frisbee', owned: new Set(['frisbee']), atkCd: 0, hurtCd: 0, flashT: 0, kills: 0,
      archetype: null, style: 'm',           // cosmetic look: 'm' | 'f'
      // abilities + transient buffs
      ab1Cd: 0, ab1Held: false, ab2Cd: 0, ab2Held: false,
      dashT: 0, dashVX: 0, dashVY: 0, dashDmg: 0, dashRange: 0, dashKnock: 0,
      hasteT: 0, hasteMoveMult: 1, hasteRateMult: 1,
      shieldT: 0, shieldAmt: 0,
      ghostT: 0,                            // jogger sprint: phase through enemies
      boulderT: 0, ramDmg: 0, ramKnock: 0,  // jogger ultimate: ramming

      acorns: 0,                            // acorns currently carried (for feeding squirrels)
    },

    found: new Set(),

    // day/night + session
    phase: 'day', phaseT: 40, night: 0, spawnLeft: 0, spawnTimer: 0,
    paused: false, started: false, shopOpen: false, dead: false, choosing: false,
    lives: MAX_LIVES, gameOver: false,
    lastZoneT: -99,
    bestNight: 0,

    // sim -> UI message queue (toasts, death, future: sounds). Drained each frame.
    events: [],

    // replay bookkeeping: completed step count + player actions (shop buys,
    // tribe picks, respawns) stamped with the frame they happened at. Together
    // with the recorded input stream this makes a run fully reproducible.
    frame: 0, actionLog: [],
  };

  const wr = makeRng(state.worldSeed);
  buildMap(state, wr);
  initEntities(state, wr);
  return state;
}

// Daytime NPCs and ambient Denver characters. Built from the world rng so they
// are identical across clients.
function initEntities(state, rnd) {
  state.npcs = [
    { kind:'jogger', wp:ellipseWp(NLOBE,16,false), i:0, x:(NLOBE.cx+NLOBE.rx)*T, y:NLOBE.cy*T, sp:52,
      pal:{skin:'#e8b58a',shirt:'#4a90c2',pants:'#2f3742',hair:'#2b2b2b'}, phase:0, dir:'right',
      lines:['On your left!','Mile 4. Or 5. Whatever.','Altitude training, baby.'], cd:rnd()*6, b:null },
    { kind:'jogger', wp:ellipseWp(SLOBE,16,true), i:0, x:(SLOBE.cx+SLOBE.rx)*T, y:SLOBE.cy*T, sp:47,
      pal:{skin:'#c98e63',shirt:'#e5c04b',pants:'#3b4a6b',hair:'#1f1a14'}, phase:0, dir:'up',
      lines:['On your left!','Training for the Bolder Boulder.'], cd:rnd()*6, b:null },
    { kind:'walker', wp:[[7.7,8],[60.7,8],[60.7,84.7],[7.7,84.7]], i:2, x:60.7*T, y:30*T, sp:26,
      pal:{skin:'#f0c8a0',shirt:'#8e6fb8',pants:'#555',hair:'#7a5230'}, phase:0, dir:'down', dog:true,
      lines:['He’s friendly!','He’s a rescue.','Yes, he’s technically on a leash.'], cd:rnd()*6, b:null },
  ];

  const SLACK_AX = 11 * T;
  const mkStoner = (x, y) => ({
    kind:'stoner', x:x*T, y:y*T, cd:rnd()*5, b:null, puff:1+rnd()*3,
    pal:{skin:'#d9a06f',shirt:['#e07a3f','#8e6fb8','#4c6b57'][(rnd()*3)|0],pants:'#4c6b57',hair:'#6b4a2e'},
    lines:['Beautiful day, man.','The clouds are, like… doing stuff.','This park is on a cemetery. Wild, right?','You ever really look at grass?'],
    nightLines:['They’re chill if you’re chill.','The ghosts? Yeah, we’re cool.','You want the leash guy. I’m more of an idea guy.','Nah man, I’m good here.'],
  });

  state.ambients = [
    { kind:'slack', x:SLACK_AX+20, y:40.2*T, u:0.2, du:0.09, wob:0, fall:0, cd:rnd()*5, b:null,
      pal:{skin:'#d9a06f',shirt:'#4c6b57',pants:'#8a6d3b',hair:'#2b2b2b'},
      lines:['It’s all core, bro.','Almost sent the full line today.','You just have to trust the webbing.'],
      fallLines:['I meant to do that.','The grass broke my fall. Thanks, grass.'] },
    { kind:'spotter', x:SLACK_AX+3*T, y:40.2*T+14, cd:rnd()*5, b:null,
      pal:{skin:'#8a5a3a',shirt:'#c94f43',pants:'#2f3742',hair:'#1f1a14'},
      lines:['You got this!','Bend your knees, bro!','I’m spotting. This is spotting.'] },
    { kind:'vb', nx:34*T, ny:18*T, u:0, src:2, hitter:0, pause:0, rally:0, cd:rnd()*5, b:null,
      px:[32.6*T,35.4*T,32.8*T,35.6*T], py:[16.4*T,16.4*T,19.9*T,19.9*T],
      pals:[{skin:'#e8b58a',shirt:'#c94f43',pants:'#f5f2ea',hair:'#4a3123'},
            {skin:'#8a5a3a',shirt:'#4a90c2',pants:'#2f3742',hair:'#1f1a14'},
            {skin:'#f0c8a0',shirt:'#e5c04b',pants:'#3b4a6b',hair:'#7a5230'},
            {skin:'#d9a06f',shirt:'#4c6b57',pants:'#555',hair:'#2b2b2b'}],
      lines:['Side out!','Little help?!','We’re going to nationals. Rec league nationals.','2-1-2! Watch the line!'] },
    { kind:'yoga', x:17*T, y:68*T, cd:rnd()*5, b:null,
      yogis:[{x:16.5*T,y:66*T,off:0},{x:19*T,y:68*T,off:1},{x:16.5*T,y:70.5*T,off:2},{x:19.5*T,y:72.5*T,off:1.5}],
      pals:[{skin:'#e8b58a',shirt:'#8e6fb8',pants:'#2f3742',hair:'#4a3123'},
            {skin:'#c98e63',shirt:'#d98aa6',pants:'#3b4a6b',hair:'#1f1a14'},
            {skin:'#f0c8a0',shirt:'#7fb4b4',pants:'#555',hair:'#7a5230'},
            {skin:'#8a5a3a',shirt:'#e5c04b',pants:'#2f3742',hair:'#2b2b2b'}],
      mats:['#8e6fb8','#c94f43','#7fb4b4','#e5c04b'],
      lines:['Inhale… exhale…','Find your mountain pose. That one. Right there.','Set an intention. Or don’t. No pressure.'] },
    { kind:'ham', x:57*T, y:21.5*T, cd:rnd()*5, b:null, sway:rnd()*6,
      lines:['Five more minutes.','I live here now.','ENO life, my dude.'] },
    mkStoner(33, 71.3), mkStoner(38, 30), mkStoner(44.5, 70),
    { kind:'dance', x:53*T, y:45.5*T, cd:rnd()*4, b:null, beat:0,
      crew:[[50.2,43.6],[53,43.4],[55.8,43.6],[50.2,47.8],[53,48.1],[55.8,47.8],[51.5,45.7]],
      pals:[{skin:'#e8b58a',shirt:'#c94f43',pants:'#2f3742',hair:'#4a3123'},
            {skin:'#8a5a3a',shirt:'#e5c04b',pants:'#3b4a6b',hair:'#1f1a14'},
            {skin:'#f0c8a0',shirt:'#8e6fb8',pants:'#555',hair:'#7a5230'},
            {skin:'#d9a06f',shirt:'#4a90c2',pants:'#2f3742',hair:'#2b2b2b'},
            {skin:'#c98e63',shirt:'#4c6b57',pants:'#3b4a6b',hair:'#6b4a2e'},
            {skin:'#e8b58a',shirt:'#d98aa6',pants:'#2f3742',hair:'#2b2b2b'},
            {skin:'#f0c8a0',shirt:'#e07a3f',pants:'#463f38',hair:'#7a5230'}],
      lines:['Five, six, seven, EIGHT!','West Coast Swing. Every Tuesday. Rain or shine.',
        'This is a silent disco. You can’t hear it, but it slaps.',
        'Ecstatic dance! No talking! …Except this.',
        'The vampire meetup was yesterday. This is contact improv.'] },
    // impromptu dog park on the open north lawn — owners chatting, dogs romping
    { kind:'dogpark', x:29*T, y:26.5*T, r:5.2*T, cd:rnd()*5, b:null,
      owners:[
        {x:26*T,   y:24.5*T, dir:'right', pal:{skin:'#e8b58a',shirt:'#4a90c2',pants:'#2f3742',hair:'#2b2b2b'}},
        {x:31.5*T, y:24*T,   dir:'left',  pal:{skin:'#8a5a3a',shirt:'#c94f43',pants:'#3b4a6b',hair:'#1f1a14'}},
        {x:26.5*T, y:29*T,   dir:'right', pal:{skin:'#f0c8a0',shirt:'#4c6b57',pants:'#555',hair:'#7a5230'}},
        {x:32*T,   y:28.5*T, dir:'left',  pal:{skin:'#d9a06f',shirt:'#e5c04b',pants:'#2f3742',hair:'#6b4a2e'}},
      ],
      dogs:[
        {x:28*T,   y:25.5*T, col:'#b98d5e', dark:'#8a6540'},  // tan
        {x:31*T,   y:26*T,   col:'#3f3a36', dark:'#2a2622'},  // black lab
        {x:29*T,   y:28*T,   col:'#e0c078', dark:'#b8944a'},  // golden
        {x:27*T,   y:27*T,   col:'#9a968e', dark:'#6f6b63'},  // grey
        {x:32*T,   y:25.5*T, col:'#c8743f', dark:'#9a5227'},  // ginger
        {x:30*T,   y:26.5*T, col:'#f4efe2', dark:'#c8743f', sprout:true},  // SPROUT (corgi × cattle dog)
      ].map((d) => ({ ...d, tx:d.x, ty:d.y, sp:40 + rnd() * 22, phase:rnd() * 6, dir:'right', pause:rnd() * 0.6 })),
      lines:['Is he friendly?','They just LOVE each other.','Loki! Leave it!',
        'He’s usually better than this.','Off-leash hours. Technically.','Oh, they’re fine — they’re playing.',
        'Sprout! Leave the squirrels alone!','Sprout’s a corgi. Ish. The spots are a whole thing.',
        'Sprout herds the other dogs. Nobody asked her to.'] },
  ];
}

// --- serialization ---------------------------------------------------------
// Progress worth persisting across sessions / sending to a co-op host.
// (Full deterministic world snapshots for netcode build on the same idea:
// ship worldSeed + simSeed + dynamic lists, regenerate terrain on the client.)
export function toSaveData(state) {
  const p = state.player;
  return {
    coins: p.coins, xp: p.xp, level: p.level, maxHp: p.maxHp, dmgMult: p.dmgMult,
    weapon: p.weapon, owned: [...p.owned], kills: p.kills, archetype: p.archetype, style: p.style,
    found: [...state.found], night: state.night, bestNight: state.bestNight,
    parkScore: state.parkScore, bestScore: state.bestScore,
  };
}

export function applySaveData(state, d) {
  if (!d) return;
  const p = state.player;
  p.coins = d.coins ?? p.coins;
  p.xp = d.xp ?? p.xp;
  p.level = d.level ?? p.level;
  p.maxHp = d.maxHp ?? p.maxHp;
  p.dmgMult = d.dmgMult ?? p.dmgMult;
  p.weapon = d.weapon ?? p.weapon;
  if (Array.isArray(d.owned)) p.owned = new Set(d.owned);
  p.kills = d.kills ?? p.kills;
  p.archetype = d.archetype ?? p.archetype;
  p.style = d.style ?? p.style;
  if (Array.isArray(d.found)) state.found = new Set(d.found);
  state.night = d.night ?? state.night;
  state.bestNight = d.bestNight ?? state.bestNight;
  state.parkScore = d.parkScore ?? state.parkScore;
  state.bestScore = d.bestScore ?? state.bestScore;
  p.hp = p.maxHp; // restore at full health, never a partial bar
}
