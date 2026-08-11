"""
Tests for vibe.py — 16-dimensional room descriptor data type.
"""
import pytest
import json
import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "python"))

from vibe import (
    Vibe, VIBE_DIMENSIONS, neutral_vibe, zero_vibe, create_vibe,
)


# ─── VIBE_DIMENSIONS ──────────────────────────────────────────────────────────

class TestVibeDimensions:
    def test_exactly_16_dimensions(self):
        assert len(VIBE_DIMENSIONS) == 16

    def test_all_names_lowercase(self):
        for dim in VIBE_DIMENSIONS:
            assert dim == dim.lower()

    def test_no_duplicates(self):
        assert len(VIBE_DIMENSIONS) == len(set(VIBE_DIMENSIONS))


# ─── Vibe defaults ─────────────────────────────────────────────────────────────

class TestVibeDefaults:
    def test_default_all_05(self):
        v = Vibe()
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == 0.5

    def test_to_vector_returns_16_floats(self):
        v = Vibe()
        vec = v.to_vector()
        assert len(vec) == 16
        for val in vec:
            assert isinstance(val, float)

    def test_to_dict_has_all_dimensions(self):
        v = Vibe()
        d = v.to_dict()
        for dim in VIBE_DIMENSIONS:
            assert dim in d
            assert d[dim] == 0.5


# ─── Serialization ─────────────────────────────────────────────────────────────

class TestSerialization:
    def test_to_vector_matches_dimensions(self):
        v = Vibe(warmth=0.9, tension=0.1)
        vec = v.to_vector()
        assert vec[0] == 0.9  # warmth is first
        assert vec[1] == 0.1  # tension is second

    def test_from_vector(self):
        vec = [i / 20.0 for i in range(16)]  # 0.0 to 0.75
        v = Vibe.from_vector(vec)
        for i, dim in enumerate(VIBE_DIMENSIONS):
            assert getattr(v, dim) == pytest.approx(i / 20.0)

    def test_from_vector_clamps_high(self):
        vec = [2.0] * 16
        v = Vibe.from_vector(vec)
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == 1.0

    def test_from_vector_clamps_low(self):
        vec = [-1.0] * 16
        v = Vibe.from_vector(vec)
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == 0.0

    def test_from_vector_too_short_raises(self):
        vec = [0.5] * 10  # only 10 elements
        with pytest.raises(IndexError):
            Vibe.from_vector(vec)

    def test_to_binary_is_16_bytes(self):
        v = Vibe()
        b = v.to_binary()
        assert len(b) == 16

    def test_binary_round_trip(self):
        v = Vibe(warmth=0.8, tension=0.2, mystery=0.6)
        b = v.to_binary()
        v2 = Vibe.from_binary(b)
        for dim in VIBE_DIMENSIONS:
            assert getattr(v2, dim) == pytest.approx(getattr(v, dim), abs=1/255)

    def test_binary_value_0_maps_to_0(self):
        v = Vibe(**{dim: 0.0 for dim in VIBE_DIMENSIONS})
        b = v.to_binary()
        assert all(x == 0 for x in b)

    def test_binary_value_1_maps_to_255(self):
        v = Vibe(**{dim: 1.0 for dim in VIBE_DIMENSIONS})
        b = v.to_binary()
        assert all(x == 255 for x in b)

    def test_from_binary_too_short_raises(self):
        with pytest.raises(ValueError, match="16 bytes"):
            Vibe.from_binary(b"\x00" * 10)

    def test_json_round_trip(self):
        v = Vibe(warmth=0.9, tension=0.1)
        j = v.to_json()
        v2 = Vibe.from_json(j)
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == pytest.approx(getattr(v2, dim))

    def test_to_json_is_valid_json(self):
        v = Vibe()
        j = v.to_json()
        d = json.loads(j)
        assert "warmth" in d

    def test_from_dict_with_missing_keys_uses_default(self):
        d = {"warmth": 0.9}
        v = Vibe.from_dict(d)
        assert v.warmth == 0.9
        assert v.tension == 0.5  # default

    def test_from_dict_clamps_values(self):
        d = {"warmth": 1.5, "tension": -0.5}
        v = Vibe.from_dict(d)
        assert v.warmth == 1.0
        assert v.tension == 0.0


# ─── Clamp ────────────────────────────────────────────────────────────────────

class TestClamp:
    def test_clamp_does_nothing_for_valid_values(self):
        v = Vibe(warmth=0.5)
        clamped = v.clamp()
        assert clamped.warmth == 0.5

    def test_clamp_via_from_vector(self):
        # Vibe dataclass allows setting any float, but clamp uses from_vector
        v = Vibe(warmth=1.5)
        clamped = v.clamp()
        assert clamped.warmth == 1.0


# ─── Factory functions ────────────────────────────────────────────────────────

class TestFactories:
    def test_neutral_vibe_all_05(self):
        v = neutral_vibe()
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == 0.5

    def test_zero_vibe_all_0(self):
        v = zero_vibe()
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == 0.0

    def test_create_vibe_with_overrides(self):
        v = create_vibe(warmth=0.9, mystery=0.8)
        assert v.warmth == 0.9
        assert v.mystery == 0.8

    def test_create_vibe_clamps_high(self):
        v = create_vibe(warmth=5.0)
        assert v.warmth == 1.0

    def test_create_vibe_clamps_low(self):
        v = create_vibe(warmth=-1.0)
        assert v.warmth == 0.0

    def test_create_vibe_ignores_unknown_keys(self):
        v = create_vibe(foo=0.9)
        assert not hasattr(v, "foo")

    def test_create_vibe_has_sensible_defaults(self):
        v = create_vibe()
        # Defaults are not all 0.5 — they have varied values
        assert v.warmth == 0.5
        assert v.tension == 0.3
        assert v.mystery == 0.4
