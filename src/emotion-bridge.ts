/**
 * Vibe-Emotion Bridge
 * 
 * Connects vibe-protocol (16-dimensional room feel) with the-listeners-ear (emotional memory).
 * 
 * The bridge translates emotional memories into vibe vectors, allowing the Ear's memories
 * to be compared spatially using vibe-protocol's cosine similarity and distance functions.
 * 
 * This is the first hallway between two rooms that have never been connected.
 */

// Emotion-to-Vibe dimension mapping
// Each emotion maps to shifts in the 16 vibe dimensions
const EMOTION_TO_VIBE = {
  fear:         { warmth: -0.3, tension: +0.4, mystery: +0.1, energy: +0.2, openness: -0.2, intimacy: -0.1, brightness: -0.3, clarity: -0.2, gravity: +0.3, friction: +0.3, depth: +0.1 },
  joy:          { warmth: +0.4, tension: -0.2, energy: +0.3, openness: +0.2, intimacy: +0.2, brightness: +0.3, clarity: +0.1, resonance: +0.2, gravity: +0.1 },
  anger:        { warmth: -0.2, tension: +0.5, energy: +0.4, friction: +0.4, density: +0.2, rhythm: -0.2, clarity: -0.1, resonance: -0.1 },
  loneliness:   { warmth: -0.3, energy: -0.2, openness: +0.1, intimacy: -0.3, density: -0.2, depth: +0.2, gravity: -0.2 },
  wonder:       { mystery: +0.3, novelty: +0.3, openness: +0.3, brightness: +0.2, depth: +0.2, clarity: -0.1, resonance: +0.2 },
  curiosity:    { mystery: +0.2, novelty: +0.2, energy: +0.1, openness: +0.2, rhythm: +0.1, depth: +0.1 },
  frustration:  { tension: +0.3, friction: +0.3, energy: +0.1, clarity: -0.3, rhythm: -0.2, density: +0.1 },
  sadness:      { warmth: -0.2, energy: -0.3, tension: -0.1, brightness: -0.2, gravity: +0.2, depth: +0.3, rhythm: -0.1, resonance: +0.1 },
};

/**
 * Convert an emotional memory from the-listeners-ear into a partial vibe vector.
 * The intensity of the emotion scales the dimension shifts.
 * 
 * @param {string} emotion - One of: fear, joy, anger, loneliness, wonder, curiosity, frustration, sadness
 * @param {number} intensity - 0.0 to 1.0
 * @returns {Object} Partial vibe (only the dimensions that shift, centered at 0.5)
 */
export function emotionToVibe(emotion, intensity) {
  const mapping = EMOTION_TO_VIBE[emotion];
  if (!mapping) return null;
  
  const clampedIntensity = Math.max(0, Math.min(1, intensity || 0));
  const vibe = {};
  
  for (const [dim, shift] of Object.entries(mapping)) {
    // Center at 0.5, apply shift scaled by intensity
    vibe[dim] = Math.max(0, Math.min(1, 0.5 + shift * clampedIntensity));
  }
  
  return vibe;
}

/**
 * Convert a full vibe vector back to the closest emotion label.
 * Finds the emotion whose mapping best matches the vibe's dimension profile.
 * 
 * @param {Object} vibe - A full 16-dimensional vibe object
 * @returns {{emotion: string, confidence: number} | null}
 */
export function vibeToEmotion(vibe) {
  if (!vibe) return null;
  
  let bestMatch = null;
  let bestScore = -Infinity;
  
  for (const [emotion, mapping] of Object.entries(EMOTION_TO_VIBE)) {
    let score = 0;
    let count = 0;
    for (const [dim, expectedShift] of Object.entries(mapping)) {
      if (dim in vibe) {
        // How far is this dimension from neutral (0.5) in the expected direction?
        const actualShift = vibe[dim] - 0.5;
        // Dot product: positive when actual shift matches expected direction
        score += actualShift * expectedShift;
        count++;
      }
    }
    // Normalize by number of dimensions checked
    if (count > 0) {
      score /= count;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = emotion;
    }
  }
  
  return {
    emotion: bestMatch,
    confidence: Math.max(0, Math.min(1, bestScore * 2)), // Scale to 0-1
  };
}

/**
 * Create a complete vibe from an emotional memory, filling unspecified dimensions
 * with neutral values (0.5).
 * 
 * @param {string} emotion - Emotion label
 * @param {number} intensity - 0.0 to 1.0
 * @param {Object} roomVibe - Optional existing room vibe to blend with
 * @returns {Object} Full 16-dimensional vibe
 */
export function emotionToFullVibe(emotion, intensity, roomVibe = null) {
  const partial = emotionToVibe(emotion, intensity);
  if (!partial) return null;
  
  const VIBE_DIMENSIONS = [
    'warmth', 'tension', 'mystery', 'energy',
    'order', 'openness', 'intimacy', 'novelty',
    'brightness', 'density', 'rhythm', 'resonance',
    'gravity', 'friction', 'clarity', 'depth',
  ];
  
  const full = {};
  for (const dim of VIBE_DIMENSIONS) {
    if (partial[dim] !== undefined) {
      full[dim] = partial[dim];
    } else if (roomVibe && roomVibe[dim] !== undefined) {
      full[dim] = roomVibe[dim]; // Keep existing room vibe
    } else {
      full[dim] = 0.5; // Neutral
    }
  }
  
  return full;
}

export { EMOTION_TO_VIBE };
