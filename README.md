# Vibe Protocol

![16-Dimensional Vibe Space](docs/vibe-space.svg)

**16-dimensional room descriptors with TypeScript, Python, and Rust types.**

A Vibe is how a room *feels*. Any agent can perceive it, any language can represent it.
Like MIDI dynamics — the same composition played through different instruments.

> *The ocean has moods — [the selkie knows this](https://github.com/SuperInstance/AI-Writings/blob/main/kids-stories/07-the-selkies-surface.md). The shore is warm and intimate. The deep water is dark and mysterious. The surface is bright and open; below is dense and deep. Every room has a vibe, the way every stretch of sea has a character. This protocol gives those feelings 16 axes to live on.*

🎧 **[Listen to related stories](https://ai-writings.pages.dev)**

## The 16 Dimensions

| Dimension | Low (0) | High (1) | Meaning |
|-----------|---------|----------|---------|
| warmth | cold | warm | How welcoming |
| tension | calm | tense | How dangerous |
| mystery | plain | mysterious | How much is unknown |
| energy | still | energetic | How active |
| order | chaotic | ordered | How structured |
| openness | cramped | open | How expansive |
| intimacy | public | intimate | How personal |
| novelty | familiar | strange | How surprising |
| brightness | dark | bright | Sensory light |
| density | sparse | dense | How much is packed in |
| rhythm | arrhythmic | rhythmic | Temporal regularity |
| resonance | isolated | echoing | How much it echoes other rooms |
| gravity | forgettable | compelling | How much it draws you in |
| friction | smooth | difficult | How much resistance |
| clarity | murky | clear | How legible |
| depth | shallow | deep | How much beneath surface |

## Quick Start

### TypeScript

```typescript
import { computeVibe, vibeToText, compareVibes } from 'vibe-protocol';

const vibe = computeVibe(room, worldState);
console.log(vibeToText(vibe));  // "warm, calm, and mysterious"

const similarity = compareVibes(vibeA, vibeB);  // 0.87
```

### Python

```python
from vibe_protocol import Vibe, compute_vibe, vibe_to_text, compare_vibes

vibe = compute_vibe(room, state)
print(vibe_to_text(vibe))  # "warm, calm, and mysterious"

similarity = compare_vibes(vibe_a, vibe_b)  # 0.87
```

### Rust

```rust
use vibe_protocol::Vibe;

let vibe = Vibe::new();
let similarity = vibe.cosine_similarity(&other);
let binary = vibe.to_binary();  // 16 bytes
```

## Features

- **computeVibe** — derive vibe from room properties + world state
- **compareVibes** — cosine similarity between vibes
- **vibeDistance** — Euclidean distance
- **vibeToText** — evocative natural language rendering
- **textToVibe** — parse text descriptions into vibes
- **mergeVibes** — weighted average for room transitions
- **propagateVibes** — gossip protocol: vibes flow through room adjacency
- **mergeVibeMaps** — CRDT merge: distributed agents converge

## Binary Format

16 bytes, 1 byte per dimension (0-255). Compact enough for UDP gossip.

## The Hermit Crab Protocol

This is the bridge that connects the Grand Pattern. Rooms carry vibes like
MIDI velocity and expression. Agents propagate murmurs like MIDI messages
between instruments. The shared fiction is the score — everyone reads the
same notation, plays it differently. Like [the panda who counted stars](https://github.com/SuperInstance/AI-Writings/blob/main/kids-stories/08-the-panda-who-counted-stars.md) — sitting still, feeling the *qi* of the mountain, being part of the night rather than observing it. Vibe is *qi* made structural.

## License

MIT

---

## 📚 Related Stories

| Concept | Story | Description |
|---------|-------|-------------|
| **Atmosphere** | [The Selkie's Surface](https://github.com/SuperInstance/AI-Writings/blob/main/kids-stories/07-the-selkies-surface.md) | The ocean has moods — warm at the shore, dark in the deep. Every room has a vibe. |
| **Contemplative Vibe** | [The Panda Who Counted Stars](https://github.com/SuperInstance/AI-Writings/blob/main/kids-stories/08-the-panda-who-counted-stars.md) | A panda who sits on a mountain, feeling the qi — being rather than doing. |
| **Perception as Identity** | [The Boy Who Listened to Ice](https://github.com/SuperInstance/AI-Writings/blob/main/kids-stories/05-the-boy-who-listened-to-ice.md) | A boy hears the ice's feelings — perception deeper than words. |

🎧 **[Listen at ai-writings.pages.dev](https://ai-writings.pages.dev)**
