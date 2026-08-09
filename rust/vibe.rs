// Vibe Protocol — 16-dimensional room descriptors
// Rust type for grand-pattern-net interop.
//
// A Vibe is how a room FEELS. 16 dimensions, 0.0 to 1.0 each.
// Compatible with the TypeScript and Python types in vibe-protocol.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// The 16 dimensions of a room's vibe.
/// Each is 0.0 to 1.0 — how a room feels.
///
/// Like MIDI dynamics: the same composition played through different instruments.
/// This struct is the shared type that flows through Rust, TypeScript, and Python.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Vibe {
    /// How welcoming (0=cold, 1=inviting)
    pub warmth: f64,
    /// How dangerous (0=safe, 1=hostile)
    pub tension: f64,
    /// How much is unknown (0=plain, 1=enigmatic)
    pub mystery: f64,
    /// How active (0=still, 1=vibrant)
    pub energy: f64,
    /// How structured (0=chaotic, 1=ordered)
    pub order: f64,
    /// How expansive (0=cramped, 1=vast)
    pub openness: f64,
    /// How personal (0=public, 1=intimate)
    pub intimacy: f64,
    /// How surprising (0=familiar, 1=strange)
    pub novelty: f64,
    /// Sensory light (0=dark, 1=radiant)
    pub brightness: f64,
    /// How much is packed in (0=sparse, 1=dense)
    pub density: f64,
    /// Temporal regularity (0=erratic, 1=rhythmic)
    pub rhythm: f64,
    /// How much it echoes other rooms (0=isolated, 1=resonant)
    pub resonance: f64,
    /// How much it draws you in (0=forgettable, 1=compelling)
    pub gravity: f64,
    /// How much resistance (0=smooth, 1=hazardous)
    pub friction: f64,
    /// How legible (0=murky, 1=sharp)
    pub clarity: f64,
    /// How much beneath surface (0=shallow, 1=profound)
    pub depth: f64,
}

/// The dimension names in canonical order.
pub const VIBE_DIMENSIONS: [&str; 16] = [
    "warmth", "tension", "mystery", "energy",
    "order", "openness", "intimacy", "novelty",
    "brightness", "density", "rhythm", "resonance",
    "gravity", "friction", "clarity", "depth",
];

impl Vibe {
    /// Create a neutral vibe (all 0.5).
    pub fn neutral() -> Self {
        Vibe {
            warmth: 0.5, tension: 0.5, mystery: 0.5, energy: 0.5,
            order: 0.5, openness: 0.5, intimacy: 0.5, novelty: 0.5,
            brightness: 0.5, density: 0.5, rhythm: 0.5, resonance: 0.5,
            gravity: 0.5, friction: 0.5, clarity: 0.5, depth: 0.5,
        }
    }

    /// Create a vibe with all zeros.
    pub fn zero() -> Self {
        Vibe {
            warmth: 0.0, tension: 0.0, mystery: 0.0, energy: 0.0,
            order: 0.0, openness: 0.0, intimacy: 0.0, novelty: 0.0,
            brightness: 0.0, density: 0.0, rhythm: 0.0, resonance: 0.0,
            gravity: 0.0, friction: 0.0, clarity: 0.0, depth: 0.0,
        }
    }

    /// Create a default vibe with pleasant baseline values.
    pub fn new() -> Self {
        Vibe {
            warmth: 0.5, tension: 0.3, mystery: 0.4, energy: 0.4,
            order: 0.5, openness: 0.5, intimacy: 0.3, novelty: 0.3,
            brightness: 0.5, density: 0.4, rhythm: 0.3, resonance: 0.3,
            gravity: 0.4, friction: 0.3, clarity: 0.5, depth: 0.3,
        }
    }

    /// Convert to a 16-element vector.
    pub fn to_vec(&self) -> [f64; 16] {
        [
            self.warmth, self.tension, self.mystery, self.energy,
            self.order, self.openness, self.intimacy, self.novelty,
            self.brightness, self.density, self.rhythm, self.resonance,
            self.gravity, self.friction, self.clarity, self.depth,
        ]
    }

    /// Construct from a 16-element array.
    pub fn from_vec(v: [f64; 16]) -> Self {
        Vibe {
            warmth: v[0], tension: v[1], mystery: v[2], energy: v[3],
            order: v[4], openness: v[5], intimacy: v[6], novelty: v[7],
            brightness: v[8], density: v[9], rhythm: v[10], resonance: v[11],
            gravity: v[12], friction: v[13], clarity: v[14], depth: v[15],
        }
    }

    /// Clamp all dimensions to 0.0-1.0.
    pub fn clamped(&self) -> Self {
        let clamp = |v: f64| v.clamp(0.0, 1.0);
        Vibe {
            warmth: clamp(self.warmth),
            tension: clamp(self.tension),
            mystery: clamp(self.mystery),
            energy: clamp(self.energy),
            order: clamp(self.order),
            openness: clamp(self.openness),
            intimacy: clamp(self.intimacy),
            novelty: clamp(self.novelty),
            brightness: clamp(self.brightness),
            density: clamp(self.density),
            rhythm: clamp(self.rhythm),
            resonance: clamp(self.resonance),
            gravity: clamp(self.gravity),
            friction: clamp(self.friction),
            clarity: clamp(self.clarity),
            depth: clamp(self.depth),
        }
    }

    /// Serialize to 16 bytes (1 byte per dimension).
    pub fn to_binary(&self) -> [u8; 16] {
        let mut buf = [0u8; 16];
        let vec = self.to_vec();
        for i in 0..16 {
            buf[i] = (vec[i].clamp(0.0, 1.0) * 255.0).round() as u8;
        }
        buf
    }

    /// Deserialize from 16 bytes.
    pub fn from_binary(buf: &[u8]) -> Result<Self, &'static str> {
        if buf.len() < 16 {
            return Err("Vibe binary needs 16 bytes");
        }
        let vec: [f64; 16] = std::array::from_fn(|i| buf[i] as f64 / 255.0);
        Ok(Vibe::from_vec(vec))
    }

    /// Cosine similarity to another vibe (-1.0 to 1.0).
    pub fn cosine_similarity(&self, other: &Vibe) -> f64 {
        let a = self.to_vec();
        let b = other.to_vec();
        let dot: f64 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
        let mag_a: f64 = a.iter().map(|x| x * x).sum::<f64>().sqrt();
        let mag_b: f64 = b.iter().map(|x| x * x).sum::<f64>().sqrt();
        if mag_a == 0.0 || mag_b == 0.0 {
            return 0.0;
        }
        dot / (mag_a * mag_b)
    }

    /// Euclidean distance to another vibe.
    pub fn distance(&self, other: &Vibe) -> f64 {
        let a = self.to_vec();
        let b = other.to_vec();
        a.iter()
            .zip(b.iter())
            .map(|(x, y)| (x - y).powi(2))
            .sum::<f64>()
            .sqrt()
    }

    /// Weighted average merge of multiple vibes.
    pub fn merge(vibes: &[&Vibe], weights: Option<&[f64]>) -> Vibe {
        if vibes.is_empty() {
            return Vibe::neutral();
        }
        if vibes.len() == 1 {
            return vibes[0].clone();
        }

        let n = vibes.len();
        let w: Vec<f64> = match weights {
            Some(w) if w.len() == n => {
                let total: f64 = w.iter().sum();
                w.iter().map(|wi| wi / total).collect()
            }
            _ => vec![1.0 / n as f64; n],
        };

        let mut result = Vibe::zero();
        let dims = vibes[0].to_vec();
        for (i, _val) in dims.iter().enumerate() {
            let dim_name = VIBE_DIMENSIONS[i];
            let merged: f64 = vibes
                .iter()
                .zip(w.iter())
                .map(|(v, weight)| v.to_vec()[i] * weight)
                .sum();
            match dim_name {
                "warmth" => result.warmth = merged,
                "tension" => result.tension = merged,
                "mystery" => result.mystery = merged,
                "energy" => result.energy = merged,
                "order" => result.order = merged,
                "openness" => result.openness = merged,
                "intimacy" => result.intimacy = merged,
                "novelty" => result.novelty = merged,
                "brightness" => result.brightness = merged,
                "density" => result.density = merged,
                "rhythm" => result.rhythm = merged,
                "resonance" => result.resonance = merged,
                "gravity" => result.gravity = merged,
                "friction" => result.friction = merged,
                "clarity" => result.clarity = merged,
                "depth" => result.depth = merged,
                _ => {}
            }
        }
        result.clamped()
    }
}

impl Default for Vibe {
    fn default() -> Self {
        Self::new()
    }
}

// ─── Vibe Entry for CRDT ─────────────────────────────────────────────────────

/// A vibe with metadata for CRDT merge.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VibeEntry {
    pub vibe: Vibe,
    pub timestamp: u64,
    pub source: String,
}

/// Merge two vibe maps using last-write-wins.
/// CRDT merge — converges regardless of order.
pub fn merge_vibe_maps(
    local: &HashMap<String, VibeEntry>,
    remote: &HashMap<String, VibeEntry>,
) -> HashMap<String, VibeEntry> {
    let mut merged = local.clone();

    for (room_id, remote_entry) in remote {
        match merged.get(room_id) {
            None => {
                merged.insert(room_id.clone(), remote_entry.clone());
            }
            Some(local_entry) => {
                if remote_entry.timestamp > local_entry.timestamp {
                    merged.insert(room_id.clone(), remote_entry.clone());
                } else if remote_entry.timestamp == local_entry.timestamp {
                    // Blend — average dimensions
                    let a = local_entry.vibe.to_vec();
                    let b = remote_entry.vibe.to_vec();
                    let blended: [f64; 16] = std::array::from_fn(|i| (a[i] + b[i]) / 2.0);
                    merged.insert(
                        room_id.clone(),
                        VibeEntry {
                            vibe: Vibe::from_vec(blended).clamped(),
                            timestamp: local_entry.timestamp.max(remote_entry.timestamp),
                            source: local_entry.source.clone().max(remote_entry.source.clone()),
                        },
                    );
                }
            }
        }
    }

    merged
}

// ─── Propagation ─────────────────────────────────────────────────────────────

/// Propagate vibes through room adjacency with decay.
/// Like warmth from a fire reaching adjacent rooms but weaker.
pub fn propagate_vibes(
    rooms: &HashMap<String, Vibe>,
    adjacency: &HashMap<String, Vec<String>>,
    decay: f64,
    iterations: usize,
) -> HashMap<String, Vibe> {
    let mut current: HashMap<String, Vibe> = rooms.clone();

    for _ in 0..iterations {
        let mut next: HashMap<String, Vibe> = HashMap::new();

        for (room_id, original) in &current {
            let neighbors = adjacency.get(room_id).cloned().unwrap_or_default();

            if neighbors.is_empty() {
                next.insert(room_id.clone(), original.clone());
                continue;
            }

            let neighbor_vibes: Vec<&Vibe> = neighbors
                .iter()
                .filter_map(|nid| current.get(nid))
                .collect();

            if neighbor_vibes.is_empty() {
                next.insert(room_id.clone(), original.clone());
                continue;
            }

            let per_neighbor = decay / neighbor_vibes.len() as f64;
            let mut all_vibes: Vec<&Vibe> = vec![original];
            all_vibes.extend(neighbor_vibes.iter());
            let mut all_weights: Vec<f64> = vec![1.0 - decay];
            all_weights.extend(vec![per_neighbor; neighbor_vibes.len()]);

            let merged = Vibe::merge(&all_vibes, Some(&all_weights));
            next.insert(room_id.clone(), merged);
        }

        current = next;
    }

    current
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_neutral_vibe() {
        let v = Vibe::neutral();
        assert!((v.warmth - 0.5).abs() < 1e-10);
        assert!((v.depth - 0.5).abs() < 1e-10);
    }

    #[test]
    fn test_clamp() {
        let v = Vibe { warmth: 1.5, tension: -0.5, ..Vibe::neutral() };
        let c = v.clamped();
        assert_eq!(c.warmth, 1.0);
        assert_eq!(c.tension, 0.0);
    }

    #[test]
    fn test_cosine_similarity_identical() {
        let v = Vibe::new();
        let sim = v.cosine_similarity(&v);
        assert!((sim - 1.0).abs() < 1e-10);
    }

    #[test]
    fn test_binary_round_trip() {
        let v = Vibe {
            warmth: 0.73, tension: 0.27, mystery: 0.55,
            energy: 0.81, order: 0.42, openness: 0.67,
            intimacy: 0.5, novelty: 0.5, brightness: 0.5,
            density: 0.5, rhythm: 0.5, resonance: 0.5,
            gravity: 0.5, friction: 0.5, clarity: 0.5, depth: 0.5,
        };
        let buf = v.to_binary();
        assert_eq!(buf.len(), 16);
        let restored = Vibe::from_binary(&buf).unwrap();
        for i in 0..16 {
            assert!((v.to_vec()[i] - restored.to_vec()[i]).abs() < 0.01);
        }
    }

    #[test]
    fn test_merge_weighted() {
        let a = Vibe { warmth: 1.0, ..Vibe::zero() };
        let b = Vibe { warmth: 0.0, ..Vibe::zero() };
        let merged = Vibe::merge(&[&a, &b], Some(&[3.0, 1.0]));
        assert!((merged.warmth - 0.75).abs() < 0.01);
    }

    #[test]
    fn test_crdt_merge_newer_wins() {
        let mut local: HashMap<String, VibeEntry> = HashMap::new();
        local.insert("room1".into(), VibeEntry {
            vibe: Vibe { warmth: 0.3, ..Vibe::neutral() },
            timestamp: 1,
            source: "nodeA".into(),
        });

        let mut remote: HashMap<String, VibeEntry> = HashMap::new();
        remote.insert("room1".into(), VibeEntry {
            vibe: Vibe { warmth: 0.9, ..Vibe::neutral() },
            timestamp: 2,
            source: "nodeB".into(),
        });

        let merged = merge_vibe_maps(&local, &remote);
        assert!((merged.get("room1").unwrap().vibe.warmth - 0.9).abs() < 1e-10);
    }

    #[test]
    fn test_crdt_merge_is_commutative() {
        let mut local_a: HashMap<String, VibeEntry> = HashMap::new();
        local_a.insert("r1".into(), VibeEntry {
            vibe: Vibe::neutral(), timestamp: 3, source: "A".into()
        });
        local_a.insert("r2".into(), VibeEntry {
            vibe: Vibe::neutral(), timestamp: 2, source: "A".into()
        });

        let mut remote_b: HashMap<String, VibeEntry> = HashMap::new();
        remote_b.insert("r1".into(), VibeEntry {
            vibe: Vibe::neutral(), timestamp: 5, source: "B".into()
        });
        remote_b.insert("r3".into(), VibeEntry {
            vibe: Vibe::neutral(), timestamp: 1, source: "B".into()
        });

        let ab = merge_vibe_maps(&local_a, &remote_b);
        let ba = merge_vibe_maps(&remote_b, &local_a);

        assert_eq!(ab.len(), ba.len());
        for key in ab.keys() {
            assert!(ba.contains_key(key));
            assert_eq!(ab.get(key).unwrap().timestamp, ba.get(key).unwrap().timestamp);
        }
    }

    #[test]
    fn test_propagate_spreads() {
        let mut rooms: HashMap<String, Vibe> = HashMap::new();
        rooms.insert("A".into(), Vibe { warmth: 1.0, ..Vibe::neutral() });
        rooms.insert("B".into(), Vibe::neutral());

        let mut adj: HashMap<String, Vec<String>> = HashMap::new();
        adj.insert("A".into(), vec!["B".into()]);
        adj.insert("B".into(), vec!["A".into()]);

        let propagated = propagate_vibes(&rooms, &adj, 0.3, 1);
        let b_warmth = propagated.get("B").unwrap().warmth;
        assert!(b_warmth > 0.5, "B should be warmer: {}", b_warmth);
        assert!(b_warmth < 0.7, "B should not be as warm as A: {}", b_warmth);
    }
}
