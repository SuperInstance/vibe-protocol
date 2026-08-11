"""
Vibe Protocol — operations on vibes.
Python implementation matching the TypeScript protocol.

Includes: compute, compare, distance, text rendering, merge, propagate, CRDT merge.
"""

from __future__ import annotations

try:
    from .vibe import (
        Vibe, VIBE_DIMENSIONS, create_vibe, neutral_vibe, zero_vibe,
    )
except ImportError:
    from vibe import (
        Vibe, VIBE_DIMENSIONS, create_vibe, neutral_vibe, zero_vibe,
    )
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
import math
import re

# ─── Room and WorldState types ───────────────────────────────────────────────

@dataclass
class RoomObject:
    name: str
    type: Optional[str] = None
    properties: Optional[dict] = None

@dataclass
class Room:
    id: str
    name: str
    description: Optional[str] = None
    exits: Optional[List[str]] = None
    objects: Optional[List[RoomObject]] = None
    npcs: Optional[List[str]] = None
    players: Optional[List[str]] = None
    lighting: float = 0.5
    temperature: float = 0.5
    size: float = 0.5
    tags: Optional[List[str]] = None

@dataclass
class WorldState:
    time: Optional[float] = None
    weather: Optional[str] = None
    ambient_energy: float = 0.3
    recent_events: Optional[List[str]] = None
    player_count: int = 0


# ─── compute_vibe ────────────────────────────────────────────────────────────

def compute_vibe(room: Room, state: WorldState = None) -> Vibe:
    """Derive a vibe from room properties and world state."""
    if state is None:
        state = WorldState()

    objects = room.objects or []
    player_count = len(room.players) if room.players else state.player_count
    tags = room.tags or []
    lighting = room.lighting
    temperature = room.temperature
    size = room.size

    def count_matching(pattern: str) -> int:
        return sum(1 for o in objects if re.search(pattern, o.name, re.IGNORECASE))

    # Warmth
    warmth = 0.3 + temperature * 0.4
    warmth += count_matching(r"fire|hearth|candle|lamp|bed|carpet|curtain") * 0.05
    if "home" in tags or "cozy" in tags: warmth += 0.15
    if "cold" in tags or "sterile" in tags: warmth -= 0.15

    # Tension
    tension = 0.2
    tension += count_matching(r"weapon|sword|gun|trap|danger|blood|bone") * 0.08
    if "dangerous" in tags or "combat" in tags: tension += 0.2
    if "safe" in tags or "haven" in tags: tension -= 0.15
    tension += (1 - lighting) * 0.1

    # Mystery
    mystery = 0.3
    mystery += count_matching(r"secret|hidden|ancient|artifact|rune|glyph|portal|mirror") * 0.07
    if "mysterious" in tags or "unknown" in tags: mystery += 0.15
    if "familiar" in tags or "known" in tags: mystery -= 0.1

    # Energy
    energy = 0.2
    energy += min(player_count * 0.1, 0.4)
    energy += state.ambient_energy * 0.3
    energy += min(len(state.recent_events or []) * 0.05, 0.2)
    energy += count_matching(r"engine|machine|pump|bell|alarm|screen") * 0.04

    # Order
    order = 0.5
    if any(t in tags for t in ("organized", "clean", "formal")): order += 0.2
    if any(t in tags for t in ("chaotic", "messy", "ruined")): order -= 0.2
    order += 0.05 if (room.exits and len(room.exits) <= 2) else -0.05

    # Openness
    openness = size * 0.5 + min(len(room.exits or []) * 0.1, 0.3)
    if any(t in tags for t in ("outdoor", "open", "vast")): openness += 0.2
    if any(t in tags for t in ("cramped", "cave", "closet")): openness -= 0.2

    # Intimacy
    intimacy = (1 - size) * 0.3 + min(0.3, 0.4 - player_count * 0.05)
    if lighting < 0.4: intimacy += 0.1
    intimacy += count_matching(r"bed|photo|letter|diary|keepsake") * 0.06

    # Novelty
    novelty = 0.2
    novelty += min(count_matching(r"strange|unusual|alien|crystal|glow") * 0.08, 0.3)
    if any(t in tags for t in ("novel", "strange", "alien")): novelty += 0.15
    novelty += min(len(state.recent_events or []) * 0.03, 0.15)

    # Brightness
    brightness = lighting * 0.6
    brightness += count_matching(r"lamp|light|torch|candle|fire|glow|crystal") * 0.05
    if state.time is not None:
        day_factor = math.sin(state.time * math.pi * 2 - math.pi / 2) * 0.5 + 0.5
        brightness += day_factor * 0.15

    # Density
    density = min(len(objects) * 0.05, 0.3)
    density += min(len(room.npcs or []) * 0.05, 0.2)
    density += min(len(room.exits or []) * 0.04, 0.2)
    density += 0.15 if size < 0.3 else 0

    # Rhythm
    rhythm = 0.3
    rhythm += count_matching(r"clock|pendulum|engine|pump|drum|bell") * 0.06
    if "rhythmic" in tags or "mechanical" in tags: rhythm += 0.15
    if "chaotic" in tags or "random" in tags: rhythm -= 0.1

    # Resonance
    resonance = 0.2
    resonance += min(len(room.exits or []) * 0.06, 0.3)
    if "hub" in tags or "crossroads" in tags: resonance += 0.15
    if "isolated" in tags or "dead-end" in tags: resonance -= 0.1

    # Gravity
    gravity = 0.3
    gravity += count_matching(r"throne|altar|fountain|statue|tree|tower|stage") * 0.08
    if any(t in tags for t in ("destination", "landmark", "important")): gravity += 0.2
    if "passage" in tags or "corridor" in tags: gravity -= 0.1

    # Friction
    friction = 0.2
    friction += count_matching(r"lock|door|gate|wall|fence|trap|rubble") * 0.05
    if any(t in tags for t in ("difficult", "blocked", "hazard")): friction += 0.15
    if "easy" in tags or "open" in tags: friction -= 0.1

    # Clarity
    clarity = lighting * 0.3 + 0.3
    if any(t in tags for t in ("clear", "simple", "clean")): clarity += 0.15
    if any(t in tags for t in ("confusing", "maze", "dark")): clarity -= 0.15
    clarity += order * 0.15

    # Depth
    depth = 0.2
    depth += count_matching(r"book|scroll|paint|carv|history|ancient|rune") * 0.05
    if any(t in tags for t in ("ancient", "deep", "layered")): depth += 0.15
    depth += mystery * 0.2

    return Vibe(
        warmth=warmth, tension=tension, mystery=mystery, energy=energy,
        order=order, openness=openness, intimacy=intimacy, novelty=novelty,
        brightness=brightness, density=density, rhythm=rhythm, resonance=resonance,
        gravity=gravity, friction=friction, clarity=clarity, depth=depth,
    ).clamp()


# ─── Comparison ──────────────────────────────────────────────────────────────

def compare_vibes(a: Vibe, b: Vibe) -> float:
    """Cosine similarity between two vibes. Returns -1 to 1."""
    va, vb = a.to_vector(), b.to_vector()
    dot = sum(x * y for x, y in zip(va, vb))
    mag_a = math.sqrt(sum(x * x for x in va))
    mag_b = math.sqrt(sum(x * x for x in vb))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def vibe_distance(a: Vibe, b: Vibe) -> float:
    """Euclidean distance between two vibes."""
    va, vb = a.to_vector(), b.to_vector()
    return math.sqrt(sum((x - y) ** 2 for x, y in zip(va, vb)))


# ─── Text Rendering ──────────────────────────────────────────────────────────

_DIM_DESC = {
    "warmth":    ("warm", "cold"),
    "tension":   ("tense", "calm"),
    "mystery":   ("mysterious", "plain"),
    "energy":    ("energetic", "still"),
    "order":     ("ordered", "chaotic"),
    "openness":  ("open", "cramped"),
    "intimacy":  ("intimate", "public"),
    "novelty":   ("strange", "familiar"),
    "brightness":("bright", "dark"),
    "density":   ("dense", "sparse"),
    "rhythm":    ("rhythmic", "arrhythmic"),
    "resonance": ("echoing", "isolated"),
    "gravity":   ("compelling", "forgettable"),
    "friction":  ("difficult", "easy"),
    "clarity":   ("clear", "murky"),
    "depth":     ("deep", "shallow"),
}

def vibe_to_text(vibe: Vibe) -> str:
    """Render vibe as evocative natural language."""
    traits = []
    for dim in VIBE_DIMENSIONS:
        val = getattr(vibe, dim)
        dist = abs(val - 0.5)
        if dist > 0.12:
            traits.append((dim, dist, val >= 0.5))

    traits.sort(key=lambda t: -t[1])

    if not traits:
        return "balanced and unremarkable"

    words = []
    for dim, _, is_high in traits[:5]:
        high, low = _DIM_DESC[dim]
        words.append(high if is_high else low)

    if len(words) == 1:
        return words[0]
    if len(words) == 2:
        return f"{words[0]} and {words[1]}"

    last = words.pop()
    return ", ".join(words) + f", and {last}"


# ─── Text to Vibe ────────────────────────────────────────────────────────────

_WORD_TO_DIM = {}
for _dim, (_high, _low) in _DIM_DESC.items():
    _WORD_TO_DIM[_high] = (_dim, 0.85)
    _WORD_TO_DIM[_low] = (_dim, 0.15)
# Extra words
_WORD_TO_DIM.update({
    "cozy": ("warmth", 0.85), "hot": ("warmth", 0.95), "inviting": ("warmth", 0.8),
    "frigid": ("warmth", 0.05), "icy": ("warmth", 0.1), "sterile": ("warmth", 0.2),
    "dangerous": ("tension", 0.9), "hostile": ("tension", 0.95), "peaceful": ("tension", 0.1),
    "serene": ("tension", 0.05), "safe": ("tension", 0.1),
    "enigmatic": ("mystery", 0.9), "hidden": ("mystery", 0.8), "secret": ("mystery", 0.85),
    "obvious": ("mystery", 0.1), "transparent": ("mystery", 0.15),
    "lively": ("energy", 0.85), "vibrant": ("energy", 0.9), "bustling": ("energy", 0.85),
    "dormant": ("energy", 0.1), "dead": ("energy", 0.05),
    "neat": ("order", 0.85), "organized": ("order", 0.85), "structured": ("order", 0.8),
    "messy": ("order", 0.2), "ruined": ("order", 0.1),
    "vast": ("openness", 0.95), "spacious": ("openness", 0.85), "expansive": ("openness", 0.9),
    "narrow": ("openness", 0.2), "confined": ("openness", 0.1),
    "personal": ("intimacy", 0.8), "private": ("intimacy", 0.85), "exposed": ("intimacy", 0.1),
    "unusual": ("novelty", 0.8), "alien": ("novelty", 0.95), "bizarre": ("novelty", 0.9),
    "ordinary": ("novelty", 0.1), "mundane": ("novelty", 0.05),
    "luminous": ("brightness", 0.9), "gleaming": ("brightness", 0.85), "radiant": ("brightness", 0.95),
    "dim": ("brightness", 0.25), "gloomy": ("brightness", 0.2), "shadowy": ("brightness", 0.15),
    "packed": ("density", 0.9), "cluttered": ("density", 0.8), "crowded": ("density", 0.85),
    "empty": ("density", 0.05), "bare": ("density", 0.1), "minimal": ("density", 0.15),
    "pulsing": ("rhythm", 0.85), "mechanical": ("rhythm", 0.8), "steady": ("rhythm", 0.8),
    "irregular": ("rhythm", 0.2), "erratic": ("rhythm", 0.1),
    "connected": ("resonance", 0.8), "resonant": ("resonance", 0.85),
    "remote": ("resonance", 0.1),
    "magnetic": ("gravity", 0.9), "captivating": ("gravity", 0.9),
    "dull": ("gravity", 0.2), "bland": ("gravity", 0.15),
    "rough": ("friction", 0.8), "hazardous": ("friction", 0.9),
    "smooth": ("friction", 0.2), "effortless": ("friction", 0.1),
    "legible": ("clarity", 0.85), "sharp": ("clarity", 0.85),
    "confusing": ("clarity", 0.2), "obscure": ("clarity", 0.15),
    "layered": ("depth", 0.85), "profound": ("depth", 0.9),
    "shallow": ("depth", 0.15), "superficial": ("depth", 0.1),
})


def text_to_vibe(text: str) -> Vibe:
    """Parse a text description into a vibe."""
    words = re.split(r"[^a-z]+", text.lower())
    words = [w for w in words if len(w) > 1]

    adjustments: Dict[str, List[float]] = {dim: [] for dim in VIBE_DIMENSIONS}

    for word in words:
        if word in _WORD_TO_DIM:
            dim, val = _WORD_TO_DIM[word]
            adjustments[dim].append(val)

    vibe = neutral_vibe()
    for dim in VIBE_DIMENSIONS:
        vals = adjustments[dim]
        if vals:
            setattr(vibe, dim, sum(vals) / len(vals))

    return vibe.clamp()


# ─── Merge ───────────────────────────────────────────────────────────────────

def merge_vibes(vibes: List[Vibe], weights: Optional[List[float]] = None) -> Vibe:
    """Weighted average merge of multiple vibes."""
    if not vibes:
        return neutral_vibe()
    if len(vibes) == 1:
        return Vibe(**vibes[0].to_dict())

    if weights is None:
        weights = [1.0 / len(vibes)] * len(vibes)

    total = sum(weights)
    weights = [w / total for w in weights]

    result = zero_vibe()
    for vibe, weight in zip(vibes, weights):
        for dim in VIBE_DIMENSIONS:
            setattr(result, dim, getattr(result, dim) + getattr(vibe, dim) * weight)

    return result.clamp()


# ─── Propagation ─────────────────────────────────────────────────────────────

def propagate_vibes(
    rooms: Dict[str, Vibe],
    adjacency: Dict[str, List[str]],
    decay: float = 0.3,
    iterations: int = 1,
) -> Dict[str, Vibe]:
    """
    Propagate vibes through room adjacency with decay.
    Like warmth from a fire reaching adjacent rooms but weaker.
    """
    current = dict(rooms)

    for _ in range(iterations):
        next_map = {}
        for room_id, original in current.items():
            neighbors = adjacency.get(room_id, [])
            if not neighbors:
                next_map[room_id] = Vibe(**original.to_dict())
                continue

            neighbor_vibes = []
            for nid in neighbors:
                if nid in current:
                    neighbor_vibes.append(current[nid])

            if not neighbor_vibes:
                next_map[room_id] = Vibe(**original.to_dict())
                continue

            per_neighbor = decay / len(neighbor_vibes)
            all_vibes = [original] + neighbor_vibes
            all_weights = [1 - decay] + [per_neighbor] * len(neighbor_vibes)
            next_map[room_id] = merge_vibes(all_vibes, all_weights)

        current = next_map

    return current


# ─── CRDT Merge ──────────────────────────────────────────────────────────────

@dataclass
class VibeEntry:
    vibe: Vibe
    timestamp: int
    source: str


def merge_vibe_maps(
    local: Dict[str, VibeEntry],
    remote: Dict[str, VibeEntry],
) -> Dict[str, VibeEntry]:
    """
    Merge two vibe maps using last-write-wins.
    CRDT merge — converges regardless of order.
    """
    merged = dict(local)

    for room_id, remote_entry in remote.items():
        local_entry = merged.get(room_id)

        if local_entry is None:
            merged[room_id] = VibeEntry(
                vibe=Vibe(**remote_entry.vibe.to_dict()),
                timestamp=remote_entry.timestamp,
                source=remote_entry.source,
            )
        elif remote_entry.timestamp > local_entry.timestamp:
            merged[room_id] = VibeEntry(
                vibe=Vibe(**remote_entry.vibe.to_dict()),
                timestamp=remote_entry.timestamp,
                source=remote_entry.source,
            )
        elif remote_entry.timestamp == local_entry.timestamp:
            # Blend — deterministic convergence
            merged_vibe = Vibe.from_vector([
                (getattr(local_entry.vibe, dim) + getattr(remote_entry.vibe, dim)) / 2
                for dim in VIBE_DIMENSIONS
            ])
            merged[room_id] = VibeEntry(
                vibe=merged_vibe,
                timestamp=max(local_entry.timestamp, remote_entry.timestamp),
                source=max(local_entry.source, remote_entry.source),
            )

    return merged
