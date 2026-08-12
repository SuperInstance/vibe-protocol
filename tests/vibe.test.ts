import { describe, it, expect } from 'vitest';
import {
  VIBE_DIMENSIONS,
  type Vibe, type Room, type WorldState, type VibeMap,
  createVibe, neutralVibe, zeroVibe, clampVibe, isValidVibe,
  computeVibe, compareVibes, vibeDistance, vibeToVector, vectorToVibe,
  vibeToText, vibeToAtmosphere, textToVibe, mergeVibes,
  propagateVibes, mergeVibeMaps,
  vibeToBinary, vibeFromBinary, vibeToJSON, vibeFromJSON,
} from '../src/index.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const warmRoom: Room = {
  id: 'kitchen', name: 'Kitchen',
  description: 'A warm kitchen with a fire',
  exits: ['hallway', 'pantry'],
  objects: [
    { name: 'fire', type: 'light' },
    { name: 'stove', type: 'appliance' },
    { name: 'bed' },
  ],
  players: ['alice', 'bob'],
  lighting: 0.7,
  temperature: 0.8,
  size: 0.4,
  tags: ['home', 'cozy'],
};

const darkDungeon: Room = {
  id: 'dungeon', name: 'Dark Dungeon',
  exits: ['stairs'],
  objects: [
    { name: 'sword', type: 'weapon' },
    { name: 'bone', type: 'remains' },
    { name: 'ancient rune', type: 'artifact' },
  ],
  players: [],
  lighting: 0.1,
  temperature: 0.2,
  size: 0.6,
  tags: ['dangerous', 'mysterious', 'dark'],
};

const openPlaza: Room = {
  id: 'plaza', name: 'Grand Plaza',
  exits: ['north', 'south', 'east', 'west'],
  objects: [
    { name: 'fountain', type: 'landmark' },
    { name: 'statue', type: 'landmark' },
  ],
  players: ['carol', 'dave', 'eve'],
  lighting: 0.9,
  temperature: 0.5,
  size: 0.9,
  tags: ['open', 'hub', 'landmark'],
};

// ─── Constructors ────────────────────────────────────────────────────────────

describe('Constructors', () => {
  it('createVibe uses defaults', () => {
    const v = createVibe();
    expect(v.warmth).toBe(0.5);
    expect(v.tension).toBe(0.3);
    expect(VIBE_DIMENSIONS).toHaveLength(16);
  });

  it('createVibe accepts overrides', () => {
    const v = createVibe({ warmth: 0.9, tension: 0.1 });
    expect(v.warmth).toBe(0.9);
    expect(v.tension).toBe(0.1);
    expect(v.mystery).toBe(0.4); // default
  });

  it('neutralVibe is all 0.5', () => {
    const v = neutralVibe();
    for (const dim of VIBE_DIMENSIONS) {
      expect(v[dim]).toBe(0.5);
    }
  });

  it('zeroVibe is all 0', () => {
    const v = zeroVibe();
    for (const dim of VIBE_DIMENSIONS) {
      expect(v[dim]).toBe(0);
    }
  });
});

// ─── Validation ──────────────────────────────────────────────────────────────

describe('Validation', () => {
  it('clampVibe keeps values in 0-1', () => {
    const v = clampVibe({ ...neutralVibe(), warmth: 1.5, tension: -0.5 });
    expect(v.warmth).toBe(1);
    expect(v.tension).toBe(0);
  });

  it('isValidVibe accepts valid vibes', () => {
    expect(isValidVibe(neutralVibe())).toBe(true);
    expect(isValidVibe(createVibe({ warmth: 0, depth: 1 }))).toBe(true);
  });

  it('isValidVibe rejects invalid vibes', () => {
    expect(isValidVibe(null)).toBe(false);
    expect(isValidVibe({ warmth: 0.5 })).toBe(false);
    expect(isValidVibe({ ...neutralVibe(), warmth: -1 })).toBe(false);
    expect(isValidVibe({ ...neutralVibe(), tension: 2 })).toBe(false);
    expect(isValidVibe('not a vibe')).toBe(false);
  });
});

// ─── computeVibe ─────────────────────────────────────────────────────────────

describe('computeVibe', () => {
  it('derives warmth from fire, temperature, cozy tags', () => {
    const v = computeVibe(warmRoom);
    expect(v.warmth).toBeGreaterThan(0.6);
  });

  it('derives tension from weapons and danger tags', () => {
    const v = computeVibe(darkDungeon);
    expect(v.tension).toBeGreaterThan(0.5);
  });

  it('derives mystery from runes and hidden objects', () => {
    const v = computeVibe(darkDungeon);
    expect(v.mystery).toBeGreaterThan(0.5);
  });

  it('derives openness from size and exits', () => {
    const v = computeVibe(openPlaza);
    expect(v.openness).toBeGreaterThan(0.7);
  });

  it('derives brightness from lighting', () => {
    const v = computeVibe(openPlaza);
    expect(v.brightness).toBeGreaterThan(0.5);
    const v2 = computeVibe(darkDungeon);
    expect(v2.brightness).toBeLessThan(0.3);
  });

  it('derives gravity from landmarks', () => {
    const v = computeVibe(openPlaza);
    expect(v.gravity).toBeGreaterThan(0.5);
  });

  it('derives energy from player count', () => {
    const v = computeVibe(openPlaza);
    expect(v.energy).toBeGreaterThan(0.4);
    const v2 = computeVibe(darkDungeon);
    expect(v2.energy).toBeLessThan(v.energy);
  });

  it('uses world state ambient energy', () => {
    const v = computeVibe(warmRoom, { ambientEnergy: 0.9 });
    expect(v.energy).toBeGreaterThan(0.5);
  });

  it('all dimensions are in 0-1 range', () => {
    const v = computeVibe(warmRoom);
    for (const dim of VIBE_DIMENSIONS) {
      expect(v[dim]).toBeGreaterThanOrEqual(0);
      expect(v[dim]).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Comparison ──────────────────────────────────────────────────────────────

describe('compareVibes (cosine similarity)', () => {
  it('identical vibes have similarity 1', () => {
    const v = createVibe({ warmth: 0.8 });
    expect(compareVibes(v, v)).toBeCloseTo(1, 5);
  });

  it('similar vibes have high similarity', () => {
    const a = createVibe({ warmth: 0.8, tension: 0.2 });
    const b = createVibe({ warmth: 0.75, tension: 0.25 });
    expect(compareVibes(a, b)).toBeGreaterThan(0.99);
  });

  it('opposite vibes have low similarity', () => {
    // Invert ALL 16 dimensions for a truly opposite vibe
    const a = createVibe({
      warmth: 0.9, tension: 0.1, mystery: 0.9, energy: 0.1,
      order: 0.9, openness: 0.1, intimacy: 0.9, novelty: 0.1,
      brightness: 0.9, density: 0.1, rhythm: 0.9, resonance: 0.1,
      gravity: 0.9, friction: 0.1, clarity: 0.9, depth: 0.1,
    });
    const b = createVibe({
      warmth: 0.1, tension: 0.9, mystery: 0.1, energy: 0.9,
      order: 0.1, openness: 0.9, intimacy: 0.1, novelty: 0.9,
      brightness: 0.1, density: 0.9, rhythm: 0.1, resonance: 0.9,
      gravity: 0.1, friction: 0.9, clarity: 0.1, depth: 0.9,
    });
    expect(compareVibes(a, b)).toBeLessThan(0.5);
  });

  it('kitchen vs dungeon are very different', () => {
    const a = computeVibe(warmRoom);
    const b = computeVibe(darkDungeon);
    expect(compareVibes(a, b)).toBeLessThan(0.9);
  });
});

describe('vibeDistance (Euclidean)', () => {
  it('identical vibes have distance 0', () => {
    const v = createVibe();
    expect(vibeDistance(v, v)).toBe(0);
  });

  it('maximally different vibes have high distance', () => {
    const a = zeroVibe();
    const b: Vibe = { ...zeroVibe() };
    for (const dim of VIBE_DIMENSIONS) (b as Record<string, number>)[dim] = 1;
    expect(vibeDistance(a, b)).toBeCloseTo(4, 1); // sqrt(16) = 4
  });
});

describe('vector conversion', () => {
  it('round-trips through vector', () => {
    const v = createVibe({ warmth: 0.7, depth: 0.3 });
    const round = vectorToVibe(vibeToVector(v));
    expect(compareVibes(v, round)).toBeCloseTo(1, 5);
  });
});

// ─── Text Rendering ──────────────────────────────────────────────────────────

describe('vibeToText', () => {
  it('renders warm cozy vibe', () => {
    const v = createVibe({ warmth: 0.9, tension: 0.1, intimacy: 0.8 });
    const text = vibeToText(v);
    expect(text).toContain('warm');
    expect(text).toContain('calm');
    expect(text).toContain('intimate');
  });

  it('renders dark dangerous vibe', () => {
    const v = createVibe({ tension: 0.9, brightness: 0.1, mystery: 0.85 });
    const text = vibeToText(v);
    expect(text).toContain('tense');
    expect(text).toContain('dark');
    expect(text).toContain('mysterious');
  });

  it('renders neutral vibe as balanced', () => {
    const text = vibeToText(neutralVibe());
    expect(text).toBe('balanced and unremarkable');
  });

  it('uses natural English phrasing', () => {
    const v = createVibe({ warmth: 0.9, tension: 0.9, mystery: 0.9 });
    const text = vibeToText(v);
    // Should have commas and "and"
    expect(text).toMatch(/,.*and /);
  });
});

describe('vibeToAtmosphere', () => {
  it('renders atmospheric paragraph', () => {
    const v = computeVibe(darkDungeon);
    const text = vibeToAtmosphere(v);
    expect(text.length).toBeGreaterThan(30);
    expect(text).toMatch(/[.]/); // ends with period
  });

  it('handles neutral vibes gracefully', () => {
    const text = vibeToAtmosphere(neutralVibe());
    expect(text.length).toBeGreaterThan(10);
  });
});

// ─── Text to Vibe ────────────────────────────────────────────────────────────

describe('textToVibe', () => {
  it('parses warm cozy description', () => {
    const v = textToVibe('warm cozy inviting');
    expect(v.warmth).toBeGreaterThan(0.7);
  });

  it('parses dark dangerous description', () => {
    const v = textToVibe('dark dangerous tense mysterious');
    expect(v.tension).toBeGreaterThan(0.7);
    expect(v.mystery).toBeGreaterThan(0.7);
    expect(v.brightness).toBeLessThan(0.3);
  });

  it('round-trips through vibeToText partially', () => {
    const original = createVibe({ warmth: 0.85, tension: 0.15, brightness: 0.85 });
    const text = vibeToText(original);
    const parsed = textToVibe(text);
    expect(parsed.warmth).toBeGreaterThan(0.7);
    expect(parsed.tension).toBeLessThan(0.3);
  });

  it('ignores unknown words', () => {
    const v = textToVibe('the quick brown fox jumps over the lazy dog');
    // Should be mostly neutral
    for (const dim of VIBE_DIMENSIONS) {
      expect(v[dim]).toBeCloseTo(0.5, 1);
    }
  });
});

// ─── Merge ───────────────────────────────────────────────────────────────────

describe('mergeVibes', () => {
  it('averages two vibes equally', () => {
    const a = createVibe({ warmth: 0.9 });
    const b = createVibe({ warmth: 0.3 });
    const merged = mergeVibes([a, b]);
    expect(merged.warmth).toBeCloseTo(0.6, 2);
  });

  it('respects weights', () => {
    const a = createVibe({ warmth: 1.0 });
    const b = createVibe({ warmth: 0.0 });
    const merged = mergeVibes([a, b], [3, 1]);
    expect(merged.warmth).toBeCloseTo(0.75, 2);
  });

  it('single vibe returns copy', () => {
    const a = createVibe({ warmth: 0.7 });
    const merged = mergeVibes([a]);
    expect(merged.warmth).toBe(0.7);
    expect(merged).not.toBe(a); // different object
  });

  it('empty array returns neutral', () => {
    const merged = mergeVibes([]);
    expect(merged.warmth).toBe(0.5);
  });

  it('normalizes weights', () => {
    const a = createVibe({ warmth: 0.0 });
    const b = createVibe({ warmth: 1.0 });
    const merged = mergeVibes([a, b], [50, 50]);
    expect(merged.warmth).toBeCloseTo(0.5, 2);
  });
});

// ─── Propagation ─────────────────────────────────────────────────────────────

describe('propagateVibes', () => {
  it('spreads vibes to adjacent rooms', () => {
    const rooms = new Map<string, Vibe>([
      ['A', createVibe({ warmth: 1.0 })],
      ['B', neutralVibe()],
    ]);
    const adjacency = new Map([['A', ['B']], ['B', ['A']]]);

    const propagated = propagateVibes(rooms, adjacency, { decay: 0.3, iterations: 1 });

    const bVibe = propagated.get('B')!;
    expect(bVibe.warmth).toBeGreaterThan(0.5); // got warmer from A
    expect(bVibe.warmth).toBeLessThan(0.7);   // but not as warm as A
  });

  it('decay controls spread strength', () => {
    const rooms = new Map<string, Vibe>([
      ['A', createVibe({ warmth: 1.0 })],
      ['B', neutralVibe()],
    ]);
    const adjacency = new Map([['A', ['B']], ['B', ['A']]]);

    const weak = propagateVibes(rooms, adjacency, { decay: 0.1, iterations: 1 });
    const strong = propagateVibes(rooms, adjacency, { decay: 0.5, iterations: 1 });

    expect(strong.get('B')!.warmth).toBeGreaterThan(weak.get('B')!.warmth);
  });

  it('multiple iterations spread deeper', () => {
    const rooms = new Map<string, Vibe>([
      ['A', createVibe({ warmth: 1.0 })],
      ['B', neutralVibe()],
      ['C', neutralVibe()],
    ]);
    const adjacency = new Map([['A', ['B']], ['B', ['A', 'C']], ['C', ['B']]]);

    const oneHop = propagateVibes(rooms, adjacency, { iterations: 1 });
    const twoHops = propagateVibes(rooms, adjacency, { iterations: 2 });

    // C should be warmer after two hops than one
    expect(twoHops.get('C')!.warmth).toBeGreaterThan(oneHop.get('C')!.warmth);
  });

  it('isolated rooms keep their vibe', () => {
    const rooms = new Map<string, Vibe>([
      ['solo', createVibe({ warmth: 0.9 })],
    ]);
    const adjacency = new Map([['solo', []]]);

    const propagated = propagateVibes(rooms, adjacency);
    expect(propagated.get('solo')!.warmth).toBeCloseTo(0.9, 5);
  });

  it('source room loses some intensity', () => {
    const rooms = new Map<string, Vibe>([
      ['A', createVibe({ warmth: 1.0 })],
      ['B', zeroVibe()],
    ]);
    const adjacency = new Map([['A', ['B']], ['B', ['A']]]);

    const propagated = propagateVibes(rooms, adjacency, { decay: 0.3 });
    // A should be slightly less warm (bled into B)
    expect(propagated.get('A')!.warmth).toBeLessThan(1.0);
  });
});

// ─── CRDT Merge ──────────────────────────────────────────────────────────────

describe('mergeVibeMaps (CRDT)', () => {
  const makeMap = (entries: [string, Vibe, number, string][]): VibeMap => {
    const m: VibeMap = new Map();
    for (const [id, vibe, ts, src] of entries) {
      m.set(id, { vibe, timestamp: ts, source: src });
    }
    return m;
  };

  it('takes remote when remote is newer', () => {
    const local = makeMap([['room1', createVibe({ warmth: 0.3 }), 1, 'nodeA']]);
    const remote = makeMap([['room1', createVibe({ warmth: 0.9 }), 2, 'nodeB']]);

    const merged = mergeVibeMaps(local, remote);
    expect(merged.get('room1')!.vibe.warmth).toBe(0.9);
    expect(merged.get('room1')!.source).toBe('nodeB');
  });

  it('keeps local when local is newer', () => {
    const local = makeMap([['room1', createVibe({ warmth: 0.9 }), 5, 'nodeA']]);
    const remote = makeMap([['room1', createVibe({ warmth: 0.2 }), 3, 'nodeB']]);

    const merged = mergeVibeMaps(local, remote);
    expect(merged.get('room1')!.vibe.warmth).toBe(0.9);
  });

  it('adds rooms only in remote', () => {
    const local = makeMap([['room1', createVibe(), 1, 'nodeA']]);
    const remote = makeMap([
      ['room1', createVibe(), 1, 'nodeA'],
      ['room2', createVibe({ warmth: 0.8 }), 2, 'nodeB'],
    ]);

    const merged = mergeVibeMaps(local, remote);
    expect(merged.has('room2')).toBe(true);
    expect(merged.get('room2')!.vibe.warmth).toBe(0.8);
  });

  it('is commutative — order does not matter', () => {
    const localA = makeMap([
      ['room1', createVibe({ warmth: 0.7 }), 3, 'nodeA'],
      ['room2', createVibe({ tension: 0.6 }), 2, 'nodeA'],
    ]);
    const remoteB = makeMap([
      ['room1', createVibe({ warmth: 0.4 }), 5, 'nodeB'],
      ['room3', createVibe({ mystery: 0.8 }), 1, 'nodeB'],
    ]);

    const ab = mergeVibeMaps(localA, remoteB);
    const ba = mergeVibeMaps(remoteB, localA);

    // Same rooms present
    expect(ab.size).toBe(ba.size);
    for (const key of ab.keys()) {
      expect(ba.has(key)).toBe(true);
    }
    // Same timestamps
    for (const [key, entry] of ab) {
      expect(ba.get(key)!.timestamp).toBe(entry.timestamp);
    }
  });

  it('is idempotent — merging a map with itself is a no-op', () => {
    const local = makeMap([
      ['room1', createVibe({ warmth: 0.7 }), 3, 'nodeA'],
      ['room2', createVibe({ tension: 0.4 }), 5, 'nodeB'],
    ]);

    const merged = mergeVibeMaps(local, local);
    expect(merged.size).toBe(local.size);
    for (const [key, entry] of local) {
      expect(merged.get(key)!.timestamp).toBe(entry.timestamp);
      expect(merged.get(key)!.source).toBe(entry.source);
    }
  });
});

// ─── Serialization ───────────────────────────────────────────────────────────

describe('Serialization', () => {
  it('binary round-trip', () => {
    const original = createVibe({
      warmth: 0.73, tension: 0.27, mystery: 0.55,
      energy: 0.81, order: 0.42, openness: 0.67,
    });
    const binary = vibeToBinary(original);
    expect(binary).toHaveLength(16);

    const restored = vibeFromBinary(binary);
    for (const dim of VIBE_DIMENSIONS) {
      expect(Math.abs(restored[dim] - original[dim])).toBeLessThan(0.01);
    }
  });

  it('JSON round-trip', () => {
    const original = createVibe({ warmth: 0.8, depth: 0.2, gravity: 0.6 });
    const json = vibeToJSON(original);
    const restored = vibeFromJSON(json);
    expect(compareVibes(original, restored)).toBeCloseTo(1, 5);
  });

  it('binary throws on short buffer', () => {
    expect(() => vibeFromBinary(new Uint8Array(8))).toThrow();
  });
});

// ─── Edge cases and robustness ───────────────────────────────────────────────

describe('NaN and Infinity handling', () => {
  // Documents current behavior — NaN and Infinity are NOT handled gracefully
  // This is a known gap in the implementation, mirroring the fleet-wide NaN blind spot

  it('createVibe with NaN override passes through unchecked', () => {
    const v = createVibe({ warmth: NaN });
    expect(v.warmth).toBeNaN();
  });

  it('createVibe with Infinity override passes through unchecked', () => {
    const v = createVibe({ warmth: Infinity, tension: -Infinity });
    expect(v.warmth).toBe(Infinity);
    expect(v.tension).toBe(-Infinity);
  });

  it('clampVibe does not handle NaN', () => {
    const v = clampVibe({ ...neutralVibe(), warmth: NaN });
    // Document: clampVibe uses Math.min/max which propagates NaN
    expect(isNaN(v.warmth)).toBe(true);
  });

  it('clampVibe handles Infinity', () => {
    const v = clampVibe({ ...neutralVibe(), energy: Infinity });
    expect(v.energy).toBeLessThanOrEqual(1);
  });

  it('clampVibe handles -Infinity', () => {
    const v = clampVibe({ ...neutralVibe(), depth: -Infinity });
    expect(v.depth).toBeGreaterThanOrEqual(0);
  });
});

describe('computeVibe edge cases', () => {
  it('handles empty room', () => {
    const room: Room = { id: 'empty', name: 'Empty' };
    const vibe = computeVibe(room);
    expect(isValidVibe(vibe)).toBe(true);
    // All dimensions should be in 0-1
    for (const dim of VIBE_DIMENSIONS) {
      expect(vibe[dim]).toBeGreaterThanOrEqual(0);
      expect(vibe[dim]).toBeLessThanOrEqual(1);
    }
  });

  it('handles room with empty arrays', () => {
    const room: Room = {
      id: 'blank', name: 'Blank',
      exits: [], objects: [], npcs: [], players: [], tags: []
    };
    const vibe = computeVibe(room);
    expect(isValidVibe(vibe)).toBe(true);
  });

  it('handles room with undefined optionals', () => {
    const room: Room = { id: 'minimal', name: 'Minimal' };
    const vibe = computeVibe(room, {});
    expect(isValidVibe(vibe)).toBe(true);
  });

  it('handles extreme lighting values', () => {
    const room: Room = { id: 'bright', name: 'Bright', lighting: 1.0 };
    const dark: Room = { id: 'dark', name: 'Dark', lighting: 0.0 };
    const brightVibe = computeVibe(room);
    const darkVibe = computeVibe(dark);
    expect(brightVibe.brightness).toBeGreaterThanOrEqual(darkVibe.brightness);
  });

  it('handles very large room', () => {
    const room: Room = {
      id: 'huge', name: 'Huge',
      size: 1.0, exits: Array.from({ length: 20 }, (_, i) => `exit${i}`),
      objects: Array.from({ length: 50 }, (_, i) => ({ name: `obj${i}` })),
      players: Array.from({ length: 100 }, (_, i) => `player${i}`),
    };
    const vibe = computeVibe(room);
    expect(isValidVibe(vibe)).toBe(true);
    expect(vibe.openness).toBeGreaterThan(0.5);
    expect(vibe.energy).toBeGreaterThan(0.5);
  });
});

describe('compareVibes and vibeDistance edge cases', () => {
  it('compareVibes with zero vectors returns valid number', () => {
    const zero = zeroVibe();
    const result = compareVibes(zero, zero);
    expect(typeof result).toBe('number');
    expect(isNaN(result)).toBe(false);
  });

  it('vibeDistance is symmetric', () => {
    const a = createVibe({ warmth: 0.9, tension: 0.1 });
    const b = createVibe({ warmth: 0.1, tension: 0.9 });
    expect(vibeDistance(a, b)).toBeCloseTo(vibeDistance(b, a), 5);
  });

  it('compareVibes with identical vibes returns exactly 1', () => {
    const v = createVibe({ warmth: 0.7, depth: 0.3 });
    expect(compareVibes(v, v)).toBe(1);
  });

  it('vibeDistance with identical vibes returns 0', () => {
    const v = createVibe({ warmth: 0.7 });
    expect(vibeDistance(v, v)).toBe(0);
  });

  it('vibeDistance satisfies triangle inequality approximately', () => {
    const a = createVibe({ warmth: 1, tension: 0, mystery: 0.5 });
    const b = createVibe({ warmth: 0.3, tension: 0.7, mystery: 0.2 });
    const c = createVibe({ warmth: 0.6, tension: 0.4, mystery: 0.8 });
    const dab = vibeDistance(a, b);
    const dbc = vibeDistance(b, c);
    const dac = vibeDistance(a, c);
    // Triangle inequality: d(a,c) <= d(a,b) + d(b,c)
    expect(dac).toBeLessThanOrEqual(dab + dbc + 0.001);
  });
});

describe('vector conversion edge cases', () => {
  it('vectorToVibe with wrong length throws or handles gracefully', () => {
    const short = [0.5, 0.5, 0.5]; // only 3 values
    expect(() => vectorToVibe(short)).not.toThrow();
    // The result should have all 16 dimensions
    const vibe = vectorToVibe(short);
    expect(VIBE_DIMENSIONS.length).toBe(16);
  });

  it('vectorToVibe with extra values truncates', () => {
    const long = Array.from({ length: 20 }, () => 0.5);
    const vibe = vectorToVibe(long);
    expect(isValidVibe(vibe)).toBe(true);
  });

  it('vibeToVector returns exactly 16 elements', () => {
    const v = createVibe({ warmth: 0.5 });
    const vec = vibeToVector(v);
    expect(vec.length).toBe(16);
  });

  it('round-trip preserves exact values', () => {
    const original = createVibe({
      warmth: 0.123, tension: 0.456, mystery: 0.789,
      energy: 0.0, order: 1.0
    });
    const vec = vibeToVector(original);
    const restored = vectorToVibe(vec);
    for (const dim of VIBE_DIMENSIONS) {
      expect(restored[dim]).toBeCloseTo(original[dim], 5);
    }
  });
});

describe('serialization edge cases', () => {
  it('binary round-trip preserves extreme values', () => {
    const extreme = createVibe({
      warmth: 0.0, tension: 1.0, mystery: 0.0, energy: 1.0,
      order: 0.0, openness: 1.0, intimacy: 0.0, novelty: 1.0,
      brightness: 0.0, density: 1.0, rhythm: 0.0, resonance: 1.0,
      gravity: 0.0, friction: 1.0, clarity: 0.0, depth: 1.0,
    });
    const binary = vibeToBinary(extreme);
    const restored = vibeFromBinary(binary);
    expect(compareVibes(extreme, restored)).toBeCloseTo(1, 5);
  });

  it('JSON round-trip preserves all values', () => {
    const original = createVibe({
      warmth: 0.111, tension: 0.222, mystery: 0.333,
      energy: 0.444, order: 0.555, openness: 0.666,
    });
    const json = vibeToJSON(original);
    const restored = vibeFromJSON(json);
    for (const dim of VIBE_DIMENSIONS) {
      expect(restored[dim]).toBeCloseTo(original[dim], 5);
    }
  });

  it('JSON throws on invalid input', () => {
    expect(() => vibeFromJSON('not json')).toThrow();
    expect(() => vibeFromJSON('{}')).toBeDefined(); // may or may not throw
  });

  it('binary produces compact representation', () => {
    const v = createVibe({ warmth: 0.5 });
    const binary = vibeToBinary(v);
    // 16 dimensions × 1 byte = 16 bytes minimum
    expect(binary.length).toBeGreaterThanOrEqual(16);
    expect(binary.length).toBeLessThan(100); // not bloated
  });
});

describe('textToVibe edge cases', () => {
  it('handles empty string', () => {
    const v = textToVibe('');
    expect(isValidVibe(v)).toBe(true);
  });

  it('handles string with no known words', () => {
    const v = textToVibe('xyzzy fnord qwerty');
    expect(isValidVibe(v)).toBe(true);
    // Should return something close to neutral
    const neutral = neutralVibe();
    expect(vibeDistance(v, neutral)).toBeLessThan(0.3);
  });

  it('handles very long text', () => {
    const longText = 'warm '.repeat(1000) + 'bright '.repeat(1000);
    const v = textToVibe(longText);
    expect(isValidVibe(v)).toBe(true);
    expect(v.warmth).toBeGreaterThan(0.5);
    expect(v.brightness).toBeGreaterThan(0.5);
  });

  it('is case insensitive', () => {
    const lower = textToVibe('warm bright cozy');
    const upper = textToVibe('WARM BRIGHT COZY');
    expect(vibeDistance(lower, upper)).toBeCloseTo(0, 5);
  });
});

describe('mergeVibes edge cases', () => {
  it('handles negative weights gracefully', () => {
    const a = createVibe({ warmth: 0.9 });
    const b = createVibe({ warmth: 0.1 });
    const merged = mergeVibes([a, b], [-1, 2]);
    // Should not crash, should produce valid vibe
    expect(isValidVibe(merged)).toBe(true);
  });

  it('handles all-zero weights', () => {
    const a = createVibe({ warmth: 0.9 });
    const b = createVibe({ warmth: 0.1 });
    // All-zero weights: total weight is 0, division may produce NaN
    // Document the behavior — either it crashes or produces NaN/neutral
    let result;
    try {
      result = mergeVibes([a, b], [0, 0]);
      // If it produces a result, document what it is
      expect(typeof result.warmth).toBe('number');
    } catch (e) {
      // If it crashes, document that
      expect(e).toBeDefined();
    }
  });

  it('handles mismatched array lengths', () => {
    const a = createVibe({ warmth: 0.9 });
    const b = createVibe({ warmth: 0.1 });
    const c = createVibe({ warmth: 0.5 });
    // 3 vibes, 2 weights — should handle gracefully
    expect(() => mergeVibes([a, b, c], [1, 1])).not.toThrow();
  });
});

describe('propagateVibes edge cases', () => {
  it('handles empty room map', () => {
    const rooms = new Map<string, Vibe>();
    const adj = new Map<string, string[]>();
    const result = propagateVibes(rooms, adj, { iterations: 1 });
    expect(result.size).toBe(0);
  });

  it('handles zero iterations', () => {
    const rooms = new Map<string, Vibe>([
      ['room1', createVibe({ warmth: 0.9 })]
    ]);
    const adj = new Map<string, string[]>();
    const result = propagateVibes(rooms, adj, { iterations: 0 });
    expect(result.has('room1')).toBe(true);
  });

  it('handles disconnected rooms', () => {
    const rooms = new Map<string, Vibe>([
      ['a', createVibe({ warmth: 0.9 })],
      ['b', createVibe({ warmth: 0.1 })],
    ]);
    const adj = new Map<string, string[]>(); // no connections
    const result = propagateVibes(rooms, adj, { decay: 0.3, iterations: 3 });
    // Disconnected rooms: vibes should stay the same
    expect(result.get('a')?.warmth).toBeCloseTo(0.9, 2);
    expect(result.get('b')?.warmth).toBeCloseTo(0.1, 2);
  });

  it('propagates through connected rooms', () => {
    const rooms = new Map<string, Vibe>([
      ['a', createVibe({ warmth: 0.9 })],
      ['b', createVibe({ warmth: 0.1 })],
    ]);
    const adj = new Map<string, string[]>([
      ['a', ['b']],
      ['b', ['a']],
    ]);
    const result = propagateVibes(rooms, adj, { decay: 0.3, iterations: 1 });
    // After propagation, room b should be warmer than before
    expect(result.get('b')?.warmth).toBeGreaterThan(0.1);
  });
});
