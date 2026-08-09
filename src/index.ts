/**
 * Vibe Protocol — 16-dimensional room descriptors
 *
 * A Vibe is how a room FEELS. Any agent can perceive it, any language can represent it.
 * Like MIDI dynamics: the same composition played through different instruments.
 */

// ─── The 16 Dimensions ───────────────────────────────────────────────────────

export const VIBE_DIMENSIONS = [
  'warmth', 'tension', 'mystery', 'energy',
  'order', 'openness', 'intimacy', 'novelty',
  'brightness', 'density', 'rhythm', 'resonance',
  'gravity', 'friction', 'clarity', 'depth',
] as const;

export type VibeDimension = typeof VIBE_DIMENSIONS[number];

/**
 * A Vibe is how a room FEELS — 16 dimensions that any agent can perceive.
 * Each dimension is 0-1.
 *
 * The same descriptor flows through TypeScript, Python, and Rust.
 * Like MIDI velocity, pitch, and expression — the dynamics of a room.
 */
export interface Vibe {
  warmth: number;       // how welcoming
  tension: number;      // how dangerous
  mystery: number;      // how much is unknown
  energy: number;       // how active
  order: number;        // how structured
  openness: number;     // how expansive
  intimacy: number;     // how personal
  novelty: number;      // how surprising
  brightness: number;   // sensory light
  density: number;      // how much is packed in
  rhythm: number;       // temporal regularity
  resonance: number;    // how much it echoes other rooms
  gravity: number;      // how much it draws you in
  friction: number;     // how much resistance
  clarity: number;      // how legible
  depth: number;        // how much beneath surface
}

// ─── Room and WorldState for computeVibe ─────────────────────────────────────

export interface Room {
  id: string;
  name: string;
  description?: string;
  exits?: string[];
  objects?: RoomObject[];
  npcs?: string[];
  players?: string[];
  lighting?: number;       // 0-1
  temperature?: number;    // 0-1 (0=cold, 1=hot)
  size?: number;           // 0-1 (0=tiny, 1=vast)
  tags?: string[];
}

export interface RoomObject {
  name: string;
  type?: string;
  properties?: Record<string, unknown>;
}

export interface WorldState {
  time?: number;           // 0-1 (0=midnight, 1=midnight again)
  weather?: string;
  ambientEnergy?: number;  // 0-1
  recentEvents?: string[];
  playerCount?: number;
}

// ─── Vibe Map and CRDT types ─────────────────────────────────────────────────

export interface VibeEntry {
  vibe: Vibe;
  timestamp: number;      // logical clock for LWW
  source: string;         // node/agent id that last wrote
}

export type VibeMap = Map<string, VibeEntry>;

// ─── Constructors ────────────────────────────────────────────────────────────

export function createVibe(overrides: Partial<Vibe> = {}): Vibe {
  const base: Vibe = {
    warmth: 0.5, tension: 0.3, mystery: 0.4, energy: 0.4,
    order: 0.5, openness: 0.5, intimacy: 0.3, novelty: 0.3,
    brightness: 0.5, density: 0.4, rhythm: 0.3, resonance: 0.3,
    gravity: 0.4, friction: 0.3, clarity: 0.5, depth: 0.3,
  };
  return { ...base, ...overrides };
}

export function neutralVibe(): Vibe {
  return {
    warmth: 0.5, tension: 0.5, mystery: 0.5, energy: 0.5,
    order: 0.5, openness: 0.5, intimacy: 0.5, novelty: 0.5,
    brightness: 0.5, density: 0.5, rhythm: 0.5, resonance: 0.5,
    gravity: 0.5, friction: 0.5, clarity: 0.5, depth: 0.5,
  };
}

export function zeroVibe(): Vibe {
  return {
    warmth: 0, tension: 0, mystery: 0, energy: 0,
    order: 0, openness: 0, intimacy: 0, novelty: 0,
    brightness: 0, density: 0, rhythm: 0, resonance: 0,
    gravity: 0, friction: 0, clarity: 0, depth: 0,
  };
}

// ─── Validation ──────────────────────────────────────────────────────────────

export function clampVibe(vibe: Vibe): Vibe {
  const clamped: Vibe = { ...vibe };
  for (const dim of VIBE_DIMENSIONS) {
    clamped[dim] = Math.max(0, Math.min(1, vibe[dim]));
  }
  return clamped;
}

export function isValidVibe(vibe: unknown): vibe is Vibe {
  if (typeof vibe !== 'object' || vibe === null) return false;
  const v = vibe as Record<string, unknown>;
  return VIBE_DIMENSIONS.every(dim =>
    typeof v[dim] === 'number' && v[dim] >= 0 && v[dim] <= 1
  );
}

// ─── computeVibe — derive vibe from room properties ──────────────────────────

export function computeVibe(room: Room, state: WorldState = {}): Vibe {
  const objects = room.objects ?? [];
  const playerCount = room.players?.length ?? state.playerCount ?? 0;
  const tags = room.tags ?? [];
  const lighting = room.lighting ?? 0.5;
  const temperature = room.temperature ?? 0.5;
  const size = room.size ?? 0.5;

  // Warmth: temperature, soft objects, fire/living tags, time of day
  let warmth = 0.3 + temperature * 0.4;
  warmth += objects.filter(o => /fire|hearth|candle|lamp|bed|carpet|curtain/i.test(o.name)).length * 0.05;
  if (tags.includes('home') || tags.includes('cozy')) warmth += 0.15;
  if (tags.includes('cold') || tags.includes('sterile')) warmth -= 0.15;

  // Tension: weapons, danger tags, darkness, low player count
  let tension = 0.2;
  tension += objects.filter(o => /weapon|sword|gun|trap|danger|blood|bone/i.test(o.name)).length * 0.08;
  if (tags.includes('dangerous') || tags.includes('combat')) tension += 0.2;
  if (tags.includes('safe') || tags.includes('haven')) tension -= 0.15;
  tension += (1 - lighting) * 0.1; // darker = more tense

  // Mystery: hidden/concealed objects, unknown tags, fog, artifacts
  let mystery = 0.3;
  mystery += objects.filter(o => /secret|hidden|ancient|artifact|rune|glyph|portal|mirror/i.test(o.name)).length * 0.07;
  if (tags.includes('mysterious') || tags.includes('unknown')) mystery += 0.15;
  if (tags.includes('familiar') || tags.includes('known')) mystery -= 0.1;

  // Energy: player count, recent events, ambient energy, active objects
  let energy = 0.2;
  energy += Math.min(playerCount * 0.1, 0.4);
  energy += (state.ambientEnergy ?? 0.3) * 0.3;
  energy += Math.min((state.recentEvents?.length ?? 0) * 0.05, 0.2);
  energy += objects.filter(o => /engine|machine|pump|bell|alarm|screen/i.test(o.name)).length * 0.04;

  // Order: structured tags, symmetrical objects, clean
  let order = 0.5;
  if (tags.includes('organized') || tags.includes('clean') || tags.includes('formal')) order += 0.2;
  if (tags.includes('chaotic') || tags.includes('messy') || tags.includes('ruined')) order -= 0.2;
  order += room.exits && room.exits.length <= 2 ? 0.05 : -0.05;

  // Openness: size, exits, high ceilings (outdoor tags)
  let openness = size * 0.5 + Math.min((room.exits?.length ?? 1) * 0.1, 0.3);
  if (tags.includes('outdoor') || tags.includes('open') || tags.includes('vast')) openness += 0.2;
  if (tags.includes('cramped') || tags.includes('cave') || tags.includes('closet')) openness -= 0.2;

  // Intimacy: small size, few people, soft lighting, personal objects
  let intimacy = (1 - size) * 0.3 + Math.min(0.3, 0.4 - playerCount * 0.05);
  if (lighting < 0.4) intimacy += 0.1;
  intimacy += objects.filter(o => /bed|photo|letter|diary|keepsake/i.test(o.name)).length * 0.06;

  // Novelty: unusual tags, rare objects, recent changes
  let novelty = 0.2;
  novelty += Math.min(objects.filter(o => /strange|unusual|alien|crystal|glow/i.test(o.name)).length * 0.08, 0.3);
  if (tags.includes('novel') || tags.includes('strange') || tags.includes('alien')) novelty += 0.15;
  novelty += Math.min((state.recentEvents?.length ?? 0) * 0.03, 0.15);

  // Brightness: lighting, light sources, time of day
  let brightness = lighting * 0.6;
  brightness += objects.filter(o => /lamp|light|torch|candle|fire|glow|crystal/i.test(o.name)).length * 0.05;
  if (state.time !== undefined) {
    // midday = bright, midnight = dark
    const dayFactor = Math.sin(state.time * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5;
    brightness += dayFactor * 0.15;
  }

  // Density: object count, npc count, exit count
  let density = Math.min(objects.length * 0.05, 0.3);
  density += Math.min((room.npcs?.length ?? 0) * 0.05, 0.2);
  density += Math.min((room.exits?.length ?? 0) * 0.04, 0.2);
  density += size < 0.3 ? 0.15 : 0;

  // Rhythm: regularity of objects, music/machine tags
  let rhythm = 0.3;
  rhythm += objects.filter(o => /clock|pendulum|engine|pump|drum|bell/i.test(o.name)).length * 0.06;
  if (tags.includes('rhythmic') || tags.includes('mechanical')) rhythm += 0.15;
  if (tags.includes('chaotic') || tags.includes('random')) rhythm -= 0.1;

  // Resonance: how much it echoes other rooms — connections, shared tags
  let resonance = 0.2;
  resonance += Math.min((room.exits?.length ?? 0) * 0.06, 0.3);
  if (tags.includes('hub') || tags.includes('crossroads')) resonance += 0.15;
  if (tags.includes('isolated') || tags.includes('dead-end')) resonance -= 0.1;

  // Gravity: landmarks, central objects, draws
  let gravity = 0.3;
  gravity += objects.filter(o => /throne|altar|fountain|statue|tree|tower|stage/i.test(o.name)).length * 0.08;
  if (tags.includes('destination') || tags.includes('landmark') || tags.includes('important')) gravity += 0.2;
  if (tags.includes('passage') || tags.includes('corridor')) gravity -= 0.1;

  // Friction: difficult terrain, locked doors, hazards
  let friction = 0.2;
  friction += objects.filter(o => /lock|door|gate|wall|fence|trap|rubble/i.test(o.name)).length * 0.05;
  if (tags.includes('difficult') || tags.includes('blocked') || tags.includes('hazard')) friction += 0.15;
  if (tags.includes('easy') || tags.includes('open')) friction -= 0.1;

  // Clarity: lighting, simplicity, legibility
  let clarity = lighting * 0.3 + 0.3;
  if (tags.includes('clear') || tags.includes('simple') || tags.includes('clean')) clarity += 0.15;
  if (tags.includes('confusing') || tags.includes('maze') || tags.includes('dark')) clarity -= 0.15;
  clarity += order * 0.15;

  // Depth: layered descriptions, history, hidden things
  let depth = 0.2;
  depth += objects.filter(o => /book|scroll|paint|carv|history|ancient|rune/i.test(o.name)).length * 0.05;
  if (tags.includes('ancient') || tags.includes('deep') || tags.includes('layered')) depth += 0.15;
  depth += mystery * 0.2;

  return clampVibe({
    warmth, tension, mystery, energy, order, openness, intimacy, novelty,
    brightness, density, rhythm, resonance, gravity, friction, clarity, depth,
  });
}

// ─── Comparison ──────────────────────────────────────────────────────────────

export function vibeToVector(vibe: Vibe): number[] {
  return VIBE_DIMENSIONS.map(d => vibe[d]);
}

export function vectorToVibe(vec: number[]): Vibe {
  const vibe: Record<string, number> = {};
  VIBE_DIMENSIONS.forEach((d, i) => { vibe[d] = vec[i] ?? 0; });
  return clampVibe(vibe as Vibe);
}

/**
 * Cosine similarity between two vibes.
 * Returns -1 to 1 (1 = identical feel, 0 = unrelated, -1 = opposite).
 */
export function compareVibes(a: Vibe, b: Vibe): number {
  const va = vibeToVector(a);
  const vb = vibeToVector(b);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < va.length; i++) {
    dot += va[i] * vb[i];
    magA += va[i] * va[i];
    magB += vb[i] * vb[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  if (denom === 0) return 0;
  return dot / denom;
}

/**
 * Euclidean distance between two vibes.
 * Returns 0 (identical) to ~4 (maximally different).
 */
export function vibeDistance(a: Vibe, b: Vibe): number {
  const va = vibeToVector(a);
  const vb = vibeToVector(b);
  let sum = 0;
  for (let i = 0; i < va.length; i++) {
    const diff = va[i] - vb[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

// ─── Text Rendering ──────────────────────────────────────────────────────────

const DIMENSION_DESCRIPTOR: Record<VibeDimension, { high: string; low: string; threshold: number }> = {
  warmth:    { high: 'warm',          low: 'cold',          threshold: 0.65 },
  tension:   { high: 'tense',         low: 'calm',          threshold: 0.65 },
  mystery:   { high: 'mysterious',    low: 'plain',         threshold: 0.65 },
  energy:    { high: 'energetic',     low: 'still',         threshold: 0.65 },
  order:     { high: 'ordered',       low: 'chaotic',       threshold: 0.65 },
  openness:  { high: 'open',          low: 'cramped',       threshold: 0.65 },
  intimacy:  { high: 'intimate',      low: 'public',        threshold: 0.65 },
  novelty:   { high: 'strange',       low: 'familiar',      threshold: 0.65 },
  brightness:{ high: 'bright',        low: 'dark',          threshold: 0.65 },
  density:   { high: 'dense',         low: 'sparse',        threshold: 0.65 },
  rhythm:    { high: 'rhythmic',      low: 'arrhythmic',    threshold: 0.65 },
  resonance: { high: 'echoing',       low: 'isolated',      threshold: 0.65 },
  gravity:   { high: 'compelling',    low: 'forgettable',   threshold: 0.65 },
  friction:  { high: 'difficult',     low: 'easy',          threshold: 0.65 },
  clarity:   { high: 'clear',         low: 'murky',         threshold: 0.65 },
  depth:     { high: 'deep',          low: 'shallow',       threshold: 0.65 },
};

/**
 * Render a vibe as evocative natural language.
 * Not a mechanical list — it reads like a mood.
 */
export function vibeToText(vibe: Vibe): string {
  // Find dominant traits (furthest from neutral 0.5)
  const traits: { dim: VibeDimension; strength: number; isHigh: boolean }[] = [];
  for (const dim of VIBE_DIMENSIONS) {
    const val = vibe[dim];
    const dist = Math.abs(val - 0.5);
    if (dist > 0.12) {
      traits.push({ dim, strength: dist, isHigh: val >= 0.5 });
    }
  }
  traits.sort((a, b) => b.strength - a.strength);

  if (traits.length === 0) {
    return 'balanced and unremarkable';
  }

  // Top 3-5 traits as adjectives
  const top = traits.slice(0, 5);
  const words = top.map(t => {
    const desc = DIMENSION_DESCRIPTOR[t.dim];
    return t.isHigh ? desc.high : desc.low;
  });

  if (words.length === 1) return words[0];
  if (words.length === 2) return `${words[0]} and ${words[1]}`;

  const last = words.pop();
  return `${words.join(', ')}, and ${last}`;
}

/**
 * Render a vibe as a rich, atmospheric paragraph.
 * For room descriptions, agent perceptions.
 */
export function vibeToAtmosphere(vibe: Vibe): string {
  const traits: { dim: VibeDimension; val: number }[] = VIBE_DIMENSIONS.map(dim => ({ dim, val: vibe[dim] }));
  const high = traits.filter(t => t.val >= 0.7).sort((a, b) => b.val - a.val);
  const low = traits.filter(t => t.val <= 0.3).sort((a, b) => a.val - b.val);

  const parts: string[] = [];

  // Atmospheric rendering based on dominant dimensions
  if (vibe.brightness >= 0.7) parts.push('Light floods the space');
  else if (vibe.brightness <= 0.3) parts.push('Shadows pool in every corner');

  if (vibe.warmth >= 0.7) parts.push('a warmth that settles into your bones');
  else if (vibe.warmth <= 0.3) parts.push('a chill that prickles the skin');

  if (vibe.tension >= 0.7) parts.push('something coiled tight beneath the surface');
  else if (vibe.tension <= 0.3) parts.push('a deep, settled calm');

  if (vibe.mystery >= 0.7) parts.push('more here than meets the eye');
  else if (vibe.mystery <= 0.3) parts.push('exactly what it appears to be');

  if (vibe.energy >= 0.7) parts.push('the air itself seems to hum');
  else if (vibe.energy <= 0.3) parts.push('the kind of quiet you can feel');

  if (vibe.gravity >= 0.7) parts.push('drawing you deeper');
  else if (vibe.gravity <= 0.3) parts.push('easy to pass through without a second thought');

  if (vibe.depth >= 0.7) parts.push('layers upon layers waiting to be unraveled');

  if (parts.length === 0) {
    return 'A space that holds no strong impression — pleasant, functional, forgettable.';
  }

  const last = parts.pop();
  if (parts.length === 0) return last + '.';
  return `${parts.join('; ')}. And ${last}.`;
}

// ─── Text to Vibe ────────────────────────────────────────────────────────────

const WORD_TO_DIMENSION: Record<string, { dim: VibeDimension; val: number }> = {
  // Warmth
  warm: { dim: 'warmth', val: 0.85 }, cozy: { dim: 'warmth', val: 0.85 },
  hot: { dim: 'warmth', val: 0.95 }, inviting: { dim: 'warmth', val: 0.8 },
  cold: { dim: 'warmth', val: 0.15 }, frigid: { dim: 'warmth', val: 0.05 },
  icy: { dim: 'warmth', val: 0.1 }, sterile: { dim: 'warmth', val: 0.2 },
  // Tension
  tense: { dim: 'tension', val: 0.85 }, dangerous: { dim: 'tension', val: 0.9 },
  threatening: { dim: 'tension', val: 0.9 }, hostile: { dim: 'tension', val: 0.95 },
  calm: { dim: 'tension', val: 0.15 }, safe: { dim: 'tension', val: 0.1 },
  peaceful: { dim: 'tension', val: 0.1 }, serene: { dim: 'tension', val: 0.05 },
  // Mystery
  mysterious: { dim: 'mystery', val: 0.85 }, enigmatic: { dim: 'mystery', val: 0.9 },
  hidden: { dim: 'mystery', val: 0.8 }, secret: { dim: 'mystery', val: 0.85 },
  plain: { dim: 'mystery', val: 0.15 }, obvious: { dim: 'mystery', val: 0.1 },
  transparent: { dim: 'mystery', val: 0.15 },
  // Energy
  energetic: { dim: 'energy', val: 0.85 }, lively: { dim: 'energy', val: 0.85 },
  vibrant: { dim: 'energy', val: 0.9 }, bustling: { dim: 'energy', val: 0.85 },
  still: { dim: 'energy', val: 0.15 }, quiet: { dim: 'energy', val: 0.2 },
  dormant: { dim: 'energy', val: 0.1 }, dead: { dim: 'energy', val: 0.05 },
  // Order
  ordered: { dim: 'order', val: 0.85 }, neat: { dim: 'order', val: 0.85 },
  organized: { dim: 'order', val: 0.85 }, structured: { dim: 'order', val: 0.8 },
  chaotic: { dim: 'order', val: 0.15 }, messy: { dim: 'order', val: 0.2 },
  ruined: { dim: 'order', val: 0.1 }, disordered: { dim: 'order', val: 0.15 },
  // Openness
  open: { dim: 'openness', val: 0.85 }, vast: { dim: 'openness', val: 0.95 },
  spacious: { dim: 'openness', val: 0.85 }, expansive: { dim: 'openness', val: 0.9 },
  cramped: { dim: 'openness', val: 0.15 }, narrow: { dim: 'openness', val: 0.2 },
  confined: { dim: 'openness', val: 0.1 }, tight: { dim: 'openness', val: 0.15 },
  // Intimacy
  intimate: { dim: 'intimacy', val: 0.85 }, personal: { dim: 'intimacy', val: 0.8 },
  private: { dim: 'intimacy', val: 0.85 },
  public: { dim: 'intimacy', val: 0.15 }, exposed: { dim: 'intimacy', val: 0.1 },
  // Novelty
  strange: { dim: 'novelty', val: 0.85 }, unusual: { dim: 'novelty', val: 0.8 },
  alien: { dim: 'novelty', val: 0.95 }, bizarre: { dim: 'novelty', val: 0.9 },
  familiar: { dim: 'novelty', val: 0.15 }, ordinary: { dim: 'novelty', val: 0.1 },
  mundane: { dim: 'novelty', val: 0.05 }, routine: { dim: 'novelty', val: 0.1 },
  // Brightness
  bright: { dim: 'brightness', val: 0.85 }, luminous: { dim: 'brightness', val: 0.9 },
  gleaming: { dim: 'brightness', val: 0.85 }, radiant: { dim: 'brightness', val: 0.95 },
  dark: { dim: 'brightness', val: 0.15 }, dim: { dim: 'brightness', val: 0.25 },
  gloomy: { dim: 'brightness', val: 0.2 }, shadowy: { dim: 'brightness', val: 0.15 },
  // Density
  dense: { dim: 'density', val: 0.85 }, packed: { dim: 'density', val: 0.9 },
  cluttered: { dim: 'density', val: 0.8 }, crowded: { dim: 'density', val: 0.85 },
  sparse: { dim: 'density', val: 0.15 }, empty: { dim: 'density', val: 0.05 },
  bare: { dim: 'density', val: 0.1 }, minimal: { dim: 'density', val: 0.15 },
  // Rhythm
  rhythmic: { dim: 'rhythm', val: 0.85 }, pulsing: { dim: 'rhythm', val: 0.85 },
  mechanical: { dim: 'rhythm', val: 0.8 }, steady: { dim: 'rhythm', val: 0.8 },
  arrhythmic: { dim: 'rhythm', val: 0.15 }, irregular: { dim: 'rhythm', val: 0.2 },
  erratic: { dim: 'rhythm', val: 0.1 },
  // Resonance
  echoing: { dim: 'resonance', val: 0.85 }, connected: { dim: 'resonance', val: 0.8 },
  resonant: { dim: 'resonance', val: 0.85 },
  isolated: { dim: 'resonance', val: 0.15 }, remote: { dim: 'resonance', val: 0.1 },
  cut: { dim: 'resonance', val: 0.15 },
  // Gravity
  compelling: { dim: 'gravity', val: 0.85 }, magnetic: { dim: 'gravity', val: 0.9 },
  captivating: { dim: 'gravity', val: 0.9 },
  forgettable: { dim: 'gravity', val: 0.15 }, dull: { dim: 'gravity', val: 0.2 },
  bland: { dim: 'gravity', val: 0.15 },
  // Friction
  difficult: { dim: 'friction', val: 0.85 }, rough: { dim: 'friction', val: 0.8 },
  hazardous: { dim: 'friction', val: 0.9 },
  easy: { dim: 'friction', val: 0.15 }, smooth: { dim: 'friction', val: 0.2 },
  effortless: { dim: 'friction', val: 0.1 },
  // Clarity
  clear: { dim: 'clarity', val: 0.85 }, legible: { dim: 'clarity', val: 0.85 },
  sharp: { dim: 'clarity', val: 0.85 },
  murky: { dim: 'clarity', val: 0.15 }, confusing: { dim: 'clarity', val: 0.2 },
  obscure: { dim: 'clarity', val: 0.15 },
  // Depth
  deep: { dim: 'depth', val: 0.85 }, layered: { dim: 'depth', val: 0.85 },
  profound: { dim: 'depth', val: 0.9 },
  shallow: { dim: 'depth', val: 0.15 }, surface: { dim: 'depth', val: 0.2 },
  superficial: { dim: 'depth', val: 0.1 },
};

/**
 * Parse a text description into a vibe.
 * Words adjust dimensions from neutral 0.5 baseline.
 */
export function textToVibe(text: string): Vibe {
  const words = text.toLowerCase().split(/[^a-z]+/).filter(w => w.length > 1);
  const adjustments: Partial<Record<VibeDimension, number[]>> = {};

  for (const word of words) {
    const mapping = WORD_TO_DIMENSION[word];
    if (mapping) {
      if (!adjustments[mapping.dim]) adjustments[mapping.dim] = [];
      adjustments[mapping.dim]!.push(mapping.val);
    }
  }

  const vibe = neutralVibe();
  for (const dim of VIBE_DIMENSIONS) {
    const vals = adjustments[dim];
    if (vals && vals.length > 0) {
      // Average the adjustments for this dimension
      vibe[dim] = vals.reduce((a, b) => a + b, 0) / vals.length;
    }
  }

  return clampVibe(vibe);
}

// ─── Merge ───────────────────────────────────────────────────────────────────

/**
 * Weighted average merge of multiple vibes.
 * Used for room transitions, blending, temporal smoothing.
 */
export function mergeVibes(vibes: Vibe[], weights?: number[]): Vibe {
  if (vibes.length === 0) return neutralVibe();
  if (vibes.length === 1) return { ...vibes[0] };

  const w = weights ?? vibes.map(() => 1 / vibes.length);
  // Normalize weights
  const totalWeight = w.reduce((a, b) => a + b, 0);
  const normalized = w.map(wi => wi / totalWeight);

  const result = zeroVibe();
  for (let i = 0; i < vibes.length; i++) {
    const weight = normalized[i] ?? 0;
    for (const dim of VIBE_DIMENSIONS) {
      result[dim] += vibes[i][dim] * weight;
    }
  }

  return clampVibe(result);
}

// ─── Propagation ─────────────────────────────────────────────────────────────

/**
 * Propagate vibes through room adjacency with decay.
 * Like warmth from a fire reaching adjacent rooms but weaker.
 *
 * One pass = vibes flow one hop. Multiple passes for deeper spread.
 */
export function propagateVibes(
  rooms: Map<string, Vibe>,
  adjacency: Map<string, string[]>,
  options?: { decay?: number; iterations?: number }
): Map<string, Vibe> {
  const decay = options?.decay ?? 0.3;      // how much of the neighbor's vibe bleeds in
  const iterations = options?.iterations ?? 1;

  let current = new Map(rooms);

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Map<string, Vibe>();

    for (const [roomId, originalVibe] of current) {
      const neighbors = adjacency.get(roomId) ?? [];

      if (neighbors.length === 0) {
        next.set(roomId, { ...originalVibe });
        continue;
      }

      // Collect neighbor vibes
      const neighborVibes: Vibe[] = [];
      const weights: number[] = [];

      for (const neighborId of neighbors) {
        const neighborVibe = current.get(neighborId);
        if (neighborVibe) {
          neighborVibes.push(neighborVibe);
          weights.push(decay);
        }
      }

      // Blend: keep (1 - decay) of original, distribute decay among neighbors
      const allVibes = [originalVibe, ...neighborVibes];
      const perNeighbor = decay / neighborVibes.length;
      const finalWeights = [1 - decay, ...neighborVibes.map(() => perNeighbor)];

      const merged = mergeVibes(allVibes, finalWeights);
      next.set(roomId, merged);
    }

    current = next;
  }

  return current;
}

// ─── CRDT Merge ──────────────────────────────────────────────────────────────

/**
 * Merge two vibe maps using last-write-wins per dimension.
 * This is the CRDT merge — when two agents have different vibe maps,
 * they converge by taking the latest write for each room.
 */
export function mergeVibeMaps(local: VibeMap, remote: VibeMap): VibeMap {
  const merged: VibeMap = new Map(local);

  for (const [roomId, remoteEntry] of remote) {
    const localEntry = merged.get(roomId);

    if (!localEntry) {
      // Remote has a room we don't — take it
      merged.set(roomId, { ...remoteEntry });
    } else if (remoteEntry.timestamp > localEntry.timestamp) {
      // Remote is newer — take it
      merged.set(roomId, { ...remoteEntry });
    } else if (remoteEntry.timestamp === localEntry.timestamp) {
      // Same timestamp — merge vibes dimension-by-dimension, per-dimension LWW
      // Use source string comparison as tiebreaker
      const mergedVibe = mergeVibesDimByDim(localEntry.vibe, remoteEntry.vibe, localEntry.source, remoteEntry.source);
      merged.set(roomId, {
        vibe: mergedVibe,
        timestamp: Math.max(localEntry.timestamp, remoteEntry.timestamp),
        source: localEntry.source >= remoteEntry.source ? localEntry.source : remoteEntry.source,
      });
    }
    // else local is newer — keep local
  }

  return merged;
}

/**
 * Per-dimension last-write-wins merge.
 * When timestamps are equal, use source id as deterministic tiebreaker.
 */
function mergeVibesDimByDim(a: Vibe, b: Vibe, sourceA: string, sourceB: string): Vibe {
  // Without per-dimension timestamps, we do a simple blend
  // In a full CRDT each dimension would have its own vector clock entry
  // For now: deterministic blend — average them, which converges
  const result = zeroVibe();
  for (const dim of VIBE_DIMENSIONS) {
    // Average — both writes are "equal" weight
    result[dim] = (a[dim] + b[dim]) / 2;
  }
  return clampVibe(result);
}

// ─── Serialization ───────────────────────────────────────────────────────────

export function vibeToBinary(vibe: Vibe): Uint8Array {
  // 16 dimensions × 1 byte each = 16 bytes
  const buf = new Uint8Array(16);
  VIBE_DIMENSIONS.forEach((dim, i) => {
    buf[i] = Math.round(vibe[dim] * 255);
  });
  return buf;
}

export function vibeFromBinary(buf: Uint8Array): Vibe {
  if (buf.length < 16) throw new Error(`Vibe binary needs 16 bytes, got ${buf.length}`);
  const vibe: Record<string, number> = {};
  VIBE_DIMENSIONS.forEach((dim, i) => {
    vibe[dim] = buf[i] / 255;
  });
  return vibe as Vibe;
}

export function vibeToJSON(vibe: Vibe): string {
  return JSON.stringify(vibe);
}

export function vibeFromJSON(json: string): Vibe {
  const parsed = JSON.parse(json);
  if (!isValidVibe(parsed)) throw new Error('Invalid vibe JSON');
  return parsed;
}
