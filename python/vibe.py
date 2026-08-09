"""
Vibe Protocol — 16-dimensional room descriptors.
Python type stubs for grand-pattern-net Rust/Python interop.

A Vibe is how a room FEELS. 16 dimensions, 0.0 to 1.0 each.
Compatible with the TypeScript and Rust types in vibe-protocol.
"""

from __future__ import annotations

from dataclasses import dataclass, asdict, fields
from typing import Dict, List, Tuple, Optional, Iterable
import math
import json
import struct

# The 16 dimensions — must match TypeScript/Rust exactly
VIBE_DIMENSIONS = [
    "warmth", "tension", "mystery", "energy",
    "order", "openness", "intimacy", "novelty",
    "brightness", "density", "rhythm", "resonance",
    "gravity", "friction", "clarity", "depth",
]


@dataclass
class Vibe:
    """16-dimensional room descriptor. How a room feels."""

    warmth: float = 0.5       # how welcoming
    tension: float = 0.5      # how dangerous
    mystery: float = 0.5      # how much is unknown
    energy: float = 0.5       # how active
    order: float = 0.5        # how structured
    openness: float = 0.5     # how expansive
    intimacy: float = 0.5     # how personal
    novelty: float = 0.5      # how surprising
    brightness: float = 0.5   # sensory light
    density: float = 0.5      # how much is packed in
    rhythm: float = 0.5       # temporal regularity
    resonance: float = 0.5    # how much it echoes other rooms
    gravity: float = 0.5      # how much it draws you in
    friction: float = 0.5     # how much resistance
    clarity: float = 0.5      # how legible
    depth: float = 0.5        # how much beneath surface

    def to_vector(self) -> List[float]:
        """Convert to 16-element list for math operations."""
        return [getattr(self, dim) for dim in VIBE_DIMENSIONS]

    @classmethod
    def from_vector(cls, vec: List[float]) -> "Vibe":
        """Construct from a 16-element list."""
        kwargs = {dim: max(0.0, min(1.0, vec[i])) for i, dim in enumerate(VIBE_DIMENSIONS)}
        return cls(**kwargs)

    def to_dict(self) -> Dict[str, float]:
        return asdict(self)

    @classmethod
    def from_dict(cls, d: Dict[str, float]) -> "Vibe":
        return cls(**{dim: max(0.0, min(1.0, d.get(dim, 0.5))) for dim in VIBE_DIMENSIONS})

    def to_binary(self) -> bytes:
        """Serialize to 16 bytes (1 byte per dimension, 0-255)."""
        return bytes(min(255, max(0, round(getattr(self, dim) * 255))) for dim in VIBE_DIMENSIONS)

    @classmethod
    def from_binary(cls, data: bytes) -> "Vibe":
        """Deserialize from 16 bytes."""
        if len(data) < 16:
            raise ValueError(f"Vibe binary needs 16 bytes, got {len(data)}")
        return cls(**{dim: data[i] / 255.0 for i, dim in enumerate(VIBE_DIMENSIONS)})

    def to_json(self) -> str:
        return json.dumps(self.to_dict())

    @classmethod
    def from_json(cls, json_str: str) -> "Vibe":
        return cls.from_dict(json.loads(json_str))

    def clamp(self) -> "Vibe":
        """Return a copy with all dimensions clamped to 0-1."""
        return Vibe.from_vector(self.to_vector())


def neutral_vibe() -> Vibe:
    """All dimensions at 0.5 — perfectly neutral."""
    return Vibe()


def zero_vibe() -> Vibe:
    """All dimensions at 0."""
    return Vibe(**{dim: 0.0 for dim in VIBE_DIMENSIONS})


def create_vibe(**overrides: float) -> Vibe:
    """Create a vibe with optional dimension overrides."""
    base = Vibe(
        warmth=0.5, tension=0.3, mystery=0.4, energy=0.4,
        order=0.5, openness=0.5, intimacy=0.3, novelty=0.3,
        brightness=0.5, density=0.4, rhythm=0.3, resonance=0.3,
        gravity=0.4, friction=0.3, clarity=0.5, depth=0.3,
    )
    for k, v in overrides.items():
        if k in VIBE_DIMENSIONS:
            setattr(base, k, max(0.0, min(1.0, v)))
    return base
