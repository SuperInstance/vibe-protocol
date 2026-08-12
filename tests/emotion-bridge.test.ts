/**
 * Tests for the emotion-vibe bridge.
 * 
 * This is the first hallway between two repos: vibe-protocol ↔ the-listeners-ear.
 */

import { describe, it, expect } from 'vitest';
import {
  emotionToVibe,
  vibeToEmotion,
  emotionToFullVibe,
  EMOTION_TO_VIBE,
} from '../src/emotion-bridge.js';

describe('emotionToVibe', () => {
  it('converts fear to a partial vibe', () => {
    const v = emotionToVibe('fear', 0.8);
    expect(v).not.toBeNull();
    expect(v.tension).toBeGreaterThan(0.5);
    expect(v.warmth).toBeLessThan(0.5);
    expect(v.brightness).toBeLessThan(0.5);
  });

  it('converts joy to a warm, bright vibe', () => {
    const v = emotionToVibe('joy', 0.9);
    expect(v.warmth).toBeGreaterThan(0.7);
    expect(v.brightness).toBeGreaterThan(0.7);
    expect(v.tension).toBeLessThan(0.5);
  });

  it('scales shifts by intensity', () => {
    const low = emotionToVibe('anger', 0.2);
    const high = emotionToVibe('anger', 1.0);
    expect(high.tension).toBeGreaterThan(low.tension);
  });

  it('returns null for unknown emotion', () => {
    expect(emotionToVibe('flarg', 0.5)).toBeNull();
  });

  it('returns null for undefined emotion', () => {
    expect(emotionToVibe(undefined, 0.5)).toBeNull();
  });

  it('clamps intensity above 1.0', () => {
    const v = emotionToVibe('joy', 5.0);
    expect(v.warmth).toBeLessThanOrEqual(1.0);
  });

  it('clamps intensity below 0', () => {
    const v = emotionToVibe('joy', -1.0);
    // All dimensions should be at neutral (0.5) since intensity is 0
    for (const val of Object.values(v)) {
      expect(val).toBeCloseTo(0.5, 1);
    }
  });

  it('handles zero intensity', () => {
    const v = emotionToVibe('wonder', 0);
    for (const val of Object.values(v)) {
      expect(val).toBeCloseTo(0.5, 1);
    }
  });

  it('all emotion mappings produce valid vibes', () => {
    for (const emotion of Object.keys(EMOTION_TO_VIBE)) {
      const v = emotionToVibe(emotion, 0.7);
      expect(v).not.toBeNull();
      for (const val of Object.values(v)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });

  it('all dimension values are clamped to 0-1', () => {
    for (const emotion of Object.keys(EMOTION_TO_VIBE)) {
      const v = emotionToVibe(emotion, 1.0);
      for (const [, val] of Object.entries(v)) {
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('vibeToEmotion', () => {
  it('identifies fear-like vibe', () => {
    const fearVibe = emotionToFullVibe('fear', 0.9);
    const result = vibeToEmotion(fearVibe);
    expect(result.emotion).toBe('fear');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('identifies joy-like vibe', () => {
    const joyVibe = emotionToFullVibe('joy', 0.9);
    const result = vibeToEmotion(joyVibe);
    expect(result.emotion).toBe('joy');
  });

  it('identifies anger-like vibe', () => {
    const angerVibe = emotionToFullVibe('anger', 1.0);
    const result = vibeToEmotion(angerVibe);
    expect(result.emotion).toBe('anger');
  });

  it('returns low confidence for neutral vibe', () => {
    const neutral = {};
    const VIBE_DIMENSIONS = [
      'warmth', 'tension', 'mystery', 'energy',
      'order', 'openness', 'intimacy', 'novelty',
      'brightness', 'density', 'rhythm', 'resonance',
      'gravity', 'friction', 'clarity', 'depth',
    ];
    for (const dim of VIBE_DIMENSIONS) neutral[dim] = 0.5;
    const result = vibeToEmotion(neutral);
    expect(result.confidence).toBeLessThan(0.2);
  });

  it('returns null for null input', () => {
    expect(vibeToEmotion(null)).toBeNull();
  });

  it('round-trips through emotionToFullVibe for distinct emotions', () => {
    // Fear, joy, anger, sadness are distinct enough to round-trip
    const distinctEmotions = ['fear', 'joy', 'anger', 'sadness', 'frustration', 'loneliness'];
    for (const emotion of distinctEmotions) {
      const vibe = emotionToFullVibe(emotion, 0.9);
      const result = vibeToEmotion(vibe);
      expect(result.emotion).toBe(emotion);
    }
  });

  it('wonder and curiosity may be confused (documented overlap)', () => {
    // Wonder and curiosity share several dimensions (novelty, openness, mystery)
    // The classifier may confuse them — this is a known semantic overlap
    const wonderVibe = emotionToFullVibe('wonder', 0.9);
    const result = vibeToEmotion(wonderVibe);
    expect(['wonder', 'curiosity']).toContain(result.emotion);

    const curiosityVibe = emotionToFullVibe('curiosity', 0.9);
    const result2 = vibeToEmotion(curiosityVibe);
    expect(['wonder', 'curiosity']).toContain(result2.emotion);
  });

  it('confidence is between 0 and 1', () => {
    for (const emotion of Object.keys(EMOTION_TO_VIBE)) {
      const vibe = emotionToFullVibe(emotion, 1.0);
      const result = vibeToEmotion(vibe);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe('emotionToFullVibe', () => {
  const VIBE_DIMENSIONS = [
    'warmth', 'tension', 'mystery', 'energy',
    'order', 'openness', 'intimacy', 'novelty',
    'brightness', 'density', 'rhythm', 'resonance',
    'gravity', 'friction', 'clarity', 'depth',
  ];

  it('returns all 16 dimensions', () => {
    const v = emotionToFullVibe('fear', 0.7);
    expect(Object.keys(v).length).toBe(16);
    for (const dim of VIBE_DIMENSIONS) {
      expect(v[dim]).toBeDefined();
    }
  });

  it('fills unspecified dimensions with 0.5', () => {
    const v = emotionToFullVibe('joy', 0.5);
    // 'order' is not in the joy mapping
    expect(v.order).toBeCloseTo(0.5, 1);
  });

  it('preserves room vibe dimensions not affected by emotion', () => {
    const roomVibe = { order: 0.9, rhythm: 0.3 };
    const v = emotionToFullVibe('fear', 0.5, roomVibe);
    expect(v.order).toBe(0.9); // From room, not affected by fear
  });

  it('returns null for unknown emotion', () => {
    expect(emotionToFullVibe('xyz', 0.5)).toBeNull();
  });

  it('all values are in 0-1 range', () => {
    for (const emotion of Object.keys(EMOTION_TO_VIBE)) {
      const v = emotionToFullVibe(emotion, 1.0);
      for (const dim of VIBE_DIMENSIONS) {
        expect(v[dim]).toBeGreaterThanOrEqual(0);
        expect(v[dim]).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe('EMOTION_TO_VIBE mapping structure', () => {
  it('all 8 emotions are mapped', () => {
    const emotions = Object.keys(EMOTION_TO_VIBE);
    expect(emotions).toContain('fear');
    expect(emotions).toContain('joy');
    expect(emotions).toContain('anger');
    expect(emotions).toContain('loneliness');
    expect(emotions).toContain('wonder');
    expect(emotions).toContain('curiosity');
    expect(emotions).toContain('frustration');
    expect(emotions).toContain('sadness');
    expect(emotions.length).toBe(8);
  });

  it('all dimension shifts are between -1 and 1', () => {
    for (const [, mapping] of Object.entries(EMOTION_TO_VIBE)) {
      for (const [, shift] of Object.entries(mapping)) {
        expect(shift).toBeGreaterThanOrEqual(-1);
        expect(shift).toBeLessThanOrEqual(1);
      }
    }
  });

  it('each emotion maps to at least 5 dimensions', () => {
    for (const [, mapping] of Object.entries(EMOTION_TO_VIBE)) {
      expect(Object.keys(mapping).length).toBeGreaterThanOrEqual(5);
    }
  });
});
