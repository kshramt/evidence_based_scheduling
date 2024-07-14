use core::fmt;
use rand::{Rng, RngCore};

#[derive(Debug)]
pub struct SortableIdGenerator {
    seq: u16,
    shard: u16,
    time: u64,
}

/// A 128-bit sortable ID, designed to ensure both uniqueness and a degree of ordering.
/// The ID is composed of four parts:
/// 1. `time`: 48 bits - represents a time component in milliseconds, aiding in chronological sorting.
/// 2. `seq`: 16 bits - a sequence number that increments to avoid ID collision at the same millisecond.
/// 3. `rand`: 48 bits - a random component to ensure global uniqueness across different instances or threads.
/// 4. `shard`: 16 bits - an identifier for the shard or instance, useful in distributed systems.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct Id128([u8; 16]);

impl SortableIdGenerator {
    pub fn new(shard: u16) -> Self {
        SortableIdGenerator {
            seq: 0,
            shard,
            time: 0,
        }
    }

    pub fn gen(&mut self) -> Id128 {
        // Create [u8; 16] without initialization
        let mut buf = [0u8; 16];
        let mut rng = rand::thread_rng();
        rng.fill_bytes(&mut buf[8..14]);
        let mut t = chrono::Utc::now().timestamp_millis() as u64;
        let seq;
        if t < self.time {
            t = self.time;
        }
        if t == self.time {
            seq = self.seq + 1;
            if seq == 0 {
                t = self.time + 1;
            }
        } else {
            seq = rng.gen::<u16>() & 0b0111111111111111;
        }
        self.time = t;
        self.seq = seq;
        buf[0..8].copy_from_slice(&((t << 16) | (seq as u64)).to_be_bytes());
        buf[14..16].copy_from_slice(&self.shard.to_be_bytes());
        Id128::new(buf)
    }
}

const BASE62_CHARS: &[u8] = b"0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

impl Id128 {
    pub fn new(buf: [u8; 16]) -> Self {
        Id128(buf)
    }

    pub fn to_base62(&self) -> String {
        let mut encoded = [0u8; 22];
        let mut n = u128::from_be_bytes(self.0);

        for i in 0..22 {
            let rem = (n % 62) as usize;
            encoded[21 - i] = BASE62_CHARS[rem];
            n /= 62;
        }

        String::from_utf8(encoded.to_vec()).unwrap()
    }
}

impl fmt::Display for Id128 {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            f,
            "Id128([{}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}, {}])",
            self.0[0],
            self.0[1],
            self.0[2],
            self.0[3],
            self.0[4],
            self.0[5],
            self.0[6],
            self.0[7],
            self.0[8],
            self.0[9],
            self.0[10],
            self.0[11],
            self.0[12],
            self.0[13],
            self.0[14],
            self.0[15],
        )
    }
}

// Tests for SortableIdGenerator
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_monotonicity() {
        for shard in 0..10 {
            let mut gen = SortableIdGenerator::new(shard);
            let mut prev = gen.gen();
            for _ in 0..10_000 {
                let id = gen.gen();
                assert!(prev < id);
                prev = id;
            }
        }
    }

    #[test]
    fn test_to_base62() {
        assert_eq!(Id128::new([0u8; 16]).to_base62(), "0000000000000000000000");
        assert_eq!(
            Id128::new([
                0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 1u8
            ])
            .to_base62(),
            "0000000000000000000001"
        );
        assert_eq!(
            Id128::new([
                0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 61u8
            ])
            .to_base62(),
            "000000000000000000000z"
        );
        assert_eq!(
            Id128::new([
                0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 0u8, 62u8
            ])
            .to_base62(),
            "0000000000000000000010"
        );
    }
}
