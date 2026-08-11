"""
Tests for vibe_protocol.py — compute, compare, merge, propagate, CRDT.
"""
import pytest
import math
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", "python"))

from vibe import Vibe, VIBE_DIMENSIONS, neutral_vibe, zero_vibe, create_vibe
from vibe_protocol import (
    Room, RoomObject, WorldState,
    compute_vibe, compare_vibes, vibe_distance,
    vibe_to_text, text_to_vibe,
    merge_vibes, propagate_vibes,
    VibeEntry, merge_vibe_maps,
)


# ─── compute_vibe ─────────────────────────────────────────────────────────────

class TestComputeVibe:
    def test_empty_room(self):
        room = Room(id="r1", name="Empty Room")
        v = compute_vibe(room)
        for dim in VIBE_DIMENSIONS:
            assert 0.0 <= getattr(v, dim) <= 1.0

    def test_warmth_from_temperature(self):
        hot_room = Room(id="r1", name="Sauna", temperature=1.0)
        cold_room = Room(id="r2", name="Freezer", temperature=0.0)
        v_hot = compute_vibe(hot_room)
        v_cold = compute_vibe(cold_room)
        assert v_hot.warmth > v_cold.warmth

    def test_tension_from_dangerous_objects(self):
        dangerous = Room(
            id="r1", name="Armory",
            objects=[RoomObject("Blood Sword"), RoomObject("Trap Door")]
        )
        safe = Room(id="r2", name="Garden", objects=[RoomObject("Flower")])
        v_danger = compute_vibe(dangerous)
        v_safe = compute_vibe(safe)
        assert v_danger.tension > v_safe.tension

    def test_tension_from_tags(self):
        dangerous = Room(id="r1", name="Arena", tags=["dangerous", "combat"])
        safe = Room(id="r2", name="Home", tags=["safe", "haven"])
        v_d = compute_vibe(dangerous)
        v_s = compute_vibe(safe)
        assert v_d.tension > v_s.tension

    def test_brightness_from_lighting(self):
        bright = Room(id="r1", name="Sunlit", lighting=1.0)
        dark = Room(id="r2", name="Cave", lighting=0.0)
        v_bright = compute_vibe(bright)
        v_dark = compute_vibe(dark)
        assert v_bright.brightness > v_dark.brightness

    def test_mystery_from_objects(self):
        mysterious = Room(
            id="r1", name="Vault",
            objects=[RoomObject("Ancient Rune"), RoomObject("Hidden Portal")]
        )
        plain = Room(id="r2", name="Hallway", objects=[RoomObject("Chair")])
        v_myst = compute_vibe(mysterious)
        v_plain = compute_vibe(plain)
        assert v_myst.mystery > v_plain.mystery

    def test_openness_from_size_and_exits(self):
        large = Room(id="r1", name="Plaza", size=1.0, exits=["n", "s", "e", "w"])
        small = Room(id="r2", name="Closet", size=0.1, exits=["n"])
        v_large = compute_vibe(large)
        v_small = compute_vibe(small)
        assert v_large.openness > v_small.openness

    def test_energy_from_players(self):
        busy = Room(id="r1", name="Market", players=["a", "b", "c", "d"])
        quiet = Room(id="r2", name="Attic", players=[])
        v_busy = compute_vibe(busy)
        v_quiet = compute_vibe(quiet)
        assert v_busy.energy > v_quiet.energy

    def test_energy_from_world_state(self):
        room = Room(id="r1", name="Room")
        active_state = WorldState(ambient_energy=1.0, recent_events=["explosion", "bell"])
        idle_state = WorldState(ambient_energy=0.0)
        v_active = compute_vibe(room, active_state)
        v_idle = compute_vibe(room, idle_state)
        assert v_active.energy > v_idle.energy

    def test_all_values_clamped(self):
        room = Room(
            id="r1", name="Extreme",
            temperature=1.0, lighting=1.0, size=1.0,
            objects=[RoomObject(f"Item{i}") for i in range(50)],
            tags=["dangerous", "mysterious", "chaotic"]
        )
        v = compute_vibe(room)
        for dim in VIBE_DIMENSIONS:
            assert 0.0 <= getattr(v, dim) <= 1.0

    def test_with_default_world_state(self):
        room = Room(id="r1", name="Test")
        v = compute_vibe(room)  # state=None should use default
        assert v is not None


# ─── Comparison ───────────────────────────────────────────────────────────────

class TestCompareVibes:
    def test_identical_vibes_have_similarity_1(self):
        v = Vibe(warmth=0.8, tension=0.3)
        assert compare_vibes(v, v) == pytest.approx(1.0)

    def test_neutral_vibes_have_similarity_1(self):
        v1 = neutral_vibe()
        v2 = neutral_vibe()
        assert compare_vibes(v1, v2) == pytest.approx(1.0)

    def test_zero_vibes_similarity_is_0(self):
        v1 = zero_vibe()
        v2 = zero_vibe()
        assert compare_vibes(v1, v2) == 0.0  # magnitude is 0

    def test_opposite_vibes_have_low_similarity(self):
        high = Vibe(**{dim: 1.0 for dim in VIBE_DIMENSIONS})
        # Can't make a true opposite with all 0s because zero magnitude → 0
        mid_low = Vibe(**{dim: 0.01 for dim in VIBE_DIMENSIONS})
        result = compare_vibes(high, mid_low)
        assert result == pytest.approx(1.0, abs=0.01)  # same direction

    def test_similar_vibes_have_high_similarity(self):
        v1 = Vibe(warmth=0.8, tension=0.3)
        v2 = Vibe(warmth=0.79, tension=0.31)
        assert compare_vibes(v1, v2) > 0.99


class TestVibeDistance:
    def test_identical_vibes_distance_0(self):
        v = Vibe(warmth=0.8)
        assert vibe_distance(v, v) == 0.0

    def test_neutral_distance_to_neutral(self):
        assert vibe_distance(neutral_vibe(), neutral_vibe()) == 0.0

    def test_distance_is_symmetric(self):
        v1 = Vibe(warmth=0.9, tension=0.1)
        v2 = Vibe(warmth=0.1, tension=0.9)
        assert vibe_distance(v1, v2) == pytest.approx(vibe_distance(v2, v1))

    def test_max_distance(self):
        v1 = Vibe(**{dim: 1.0 for dim in VIBE_DIMENSIONS})
        v2 = zero_vibe()
        # sqrt(16 * 1.0) = 4.0
        assert vibe_distance(v1, v2) == pytest.approx(4.0)


# ─── Text rendering ───────────────────────────────────────────────────────────

class TestVibeToText:
    def test_neutral_returns_balanced(self):
        text = vibe_to_text(neutral_vibe())
        assert "balanced" in text

    def test_high_warmth(self):
        v = Vibe(warmth=0.95)
        text = vibe_to_text(v)
        assert "warm" in text

    def test_low_warmth(self):
        v = Vibe(warmth=0.05)
        text = vibe_to_text(v)
        assert "cold" in text

    def test_extreme_vibe_has_multiple_traits(self):
        v = Vibe(warmth=0.99, tension=0.99, mystery=0.99, brightness=0.99, energy=0.99)
        text = vibe_to_text(v)
        # Should have multiple words
        assert len(text.split()) >= 3

    def test_returns_string(self):
        assert isinstance(vibe_to_text(Vibe()), str)

    def test_at_most_5_traits(self):
        v = Vibe(**{dim: 0.99 for dim in VIBE_DIMENSIONS})
        text = vibe_to_text(v)
        # Should be at most 5 traits joined by commas and "and"
        assert "and" in text


class TestTextToVibe:
    def test_warm_text_produces_warm_vibe(self):
        v = text_to_vibe("warm cozy inviting")
        assert v.warmth > 0.7

    def test_dangerous_text_produces_tense_vibe(self):
        v = text_to_vibe("dangerous hostile threatening")
        assert v.tension > 0.7

    def test_empty_string_returns_neutral(self):
        v = text_to_vibe("")
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == pytest.approx(0.5)

    def test_unknown_words_ignored(self):
        v = text_to_vibe("xyzzy fnordwidget")
        # No recognized words → stays neutral
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == pytest.approx(0.5)

    def test_round_trip(self):
        original = "warm and bright"
        v = text_to_vibe(original)
        text = vibe_to_text(v)
        # Should contain warmth or brightness related words
        assert any(w in text for w in ["warm", "bright", "luminous", "inviting"])


# ─── Merge ─────────────────────────────────────────────────────────────────────

class TestMergeVibes:
    def test_empty_list_returns_neutral(self):
        v = merge_vibes([])
        for dim in VIBE_DIMENSIONS:
            assert getattr(v, dim) == 0.5

    def test_single_vibe_returns_copy(self):
        v1 = Vibe(warmth=0.9)
        merged = merge_vibes([v1])
        assert merged.warmth == 0.9

    def test_two_vibes_equal_weights(self):
        v1 = Vibe(warmth=0.8)
        v2 = Vibe(warmth=0.4)
        merged = merge_vibes([v1, v2])
        assert merged.warmth == pytest.approx(0.6)

    def test_weighted_merge(self):
        v1 = Vibe(warmth=1.0)
        v2 = Vibe(warmth=0.0)
        merged = merge_vibes([v1, v2], weights=[0.9, 0.1])
        assert merged.warmth == pytest.approx(0.9)

    def test_weights_normalized(self):
        v1 = Vibe(warmth=1.0)
        v2 = Vibe(warmth=0.0)
        merged = merge_vibes([v1, v2], weights=[90, 10])
        assert merged.warmth == pytest.approx(0.9)

    def test_merged_values_clamped(self):
        v1 = Vibe(warmth=1.0)
        v2 = Vibe(warmth=1.0)
        merged = merge_vibes([v1, v2])
        assert merged.warmth == pytest.approx(1.0)


# ─── Propagation ───────────────────────────────────────────────────────────────

class TestPropagateVibes:
    def test_no_neighbors_unchanged(self):
        rooms = {"r1": Vibe(warmth=0.9)}
        adjacency = {"r1": []}
        result = propagate_vibes(rooms, adjacency)
        assert result["r1"].warmth == pytest.approx(0.9)

    def test_propagation_blends_neighbors(self):
        rooms = {
            "r1": Vibe(warmth=1.0),
            "r2": Vibe(warmth=0.0),
        }
        adjacency = {"r1": ["r2"], "r2": ["r1"]}
        result = propagate_vibes(rooms, adjacency, decay=0.3, iterations=1)
        # r1 new warmth = 0.7 * 1.0 + 0.3 * 0.0 = 0.7
        assert result["r1"].warmth == pytest.approx(0.7)

    def test_multiple_iterations_converge(self):
        rooms = {"r1": Vibe(warmth=1.0), "r2": Vibe(warmth=0.0)}
        adjacency = {"r1": ["r2"], "r2": ["r1"]}
        result1 = propagate_vibes(rooms, adjacency, decay=0.3, iterations=1)
        result5 = propagate_vibes(rooms, adjacency, decay=0.3, iterations=5)
        # After more iterations, the values should be closer together
        diff1 = abs(result1["r1"].warmth - result1["r2"].warmth)
        diff5 = abs(result5["r1"].warmth - result5["r2"].warmth)
        assert diff5 < diff1

    def test_missing_neighbor_ignored(self):
        rooms = {"r1": Vibe(warmth=0.9)}
        adjacency = {"r1": ["r2"]}  # r2 doesn't exist
        result = propagate_vibes(rooms, adjacency)
        assert result["r1"].warmth == pytest.approx(0.9)


# ─── CRDT Merge ─────────────────────────────────────────────────────────────────

class TestCrdtMerge:
    def test_remote_only_added(self):
        local = {}
        remote = {"r1": VibeEntry(vibe=Vibe(warmth=0.8), timestamp=100, source="agent-A")}
        merged = merge_vibe_maps(local, remote)
        assert "r1" in merged
        assert merged["r1"].vibe.warmth == 0.8

    def test_local_only_preserved(self):
        local = {"r1": VibeEntry(vibe=Vibe(warmth=0.8), timestamp=100, source="A")}
        remote = {}
        merged = merge_vibe_maps(local, remote)
        assert "r1" in merged
        assert merged["r1"].vibe.warmth == 0.8

    def test_remote_newer_wins(self):
        local = {"r1": VibeEntry(vibe=Vibe(warmth=0.3), timestamp=100, source="A")}
        remote = {"r1": VibeEntry(vibe=Vibe(warmth=0.9), timestamp=200, source="B")}
        merged = merge_vibe_maps(local, remote)
        assert merged["r1"].vibe.warmth == 0.9
        assert merged["r1"].source == "B"

    def test_local_newer_wins(self):
        local = {"r1": VibeEntry(vibe=Vibe(warmth=0.9), timestamp=200, source="A")}
        remote = {"r1": VibeEntry(vibe=Vibe(warmth=0.3), timestamp=100, source="B")}
        merged = merge_vibe_maps(local, remote)
        assert merged["r1"].vibe.warmth == 0.9

    def test_equal_timestamps_blend(self):
        local = {"r1": VibeEntry(vibe=Vibe(warmth=0.2), timestamp=100, source="A")}
        remote = {"r1": VibeEntry(vibe=Vibe(warmth=0.8), timestamp=100, source="B")}
        merged = merge_vibe_maps(local, remote)
        assert merged["r1"].vibe.warmth == pytest.approx(0.5)

    def test_merge_is_commutative(self):
        local = {
            "r1": VibeEntry(vibe=Vibe(warmth=0.3), timestamp=100, source="A")
        }
        remote = {
            "r1": VibeEntry(vibe=Vibe(warmth=0.7), timestamp=200, source="B"),
            "r2": VibeEntry(vibe=Vibe(tension=0.9), timestamp=150, source="C")
        }
        merged_lr = merge_vibe_maps(local, remote)
        merged_rl = merge_vibe_maps(remote, local)
        assert set(merged_lr.keys()) == set(merged_rl.keys())
        for key in merged_lr:
            assert merged_lr[key].vibe.to_vector() == pytest.approx(
                merged_rl[key].vibe.to_vector(), abs=1e-6
            )

    def test_merge_preserves_local_entries_not_in_remote(self):
        local = {
            "r1": VibeEntry(vibe=Vibe(warmth=0.3), timestamp=100, source="A"),
            "r2": VibeEntry(vibe=Vibe(tension=0.9), timestamp=100, source="B"),
        }
        remote = {
            "r1": VibeEntry(vibe=Vibe(warmth=0.8), timestamp=200, source="C"),
        }
        merged = merge_vibe_maps(local, remote)
        assert "r2" in merged
        assert merged["r2"].vibe.tension == 0.9
