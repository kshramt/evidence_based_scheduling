package idgens

import (
	"crypto/rand"
	"encoding/binary"
	"io"
	"math/big"
	"sync"
	"time"
)

type Id128 [16]byte

var (
	rander = rand.Reader
)

const mask = 0b0111111111111111

type SortableIdGenerator struct {
	seq             uint16
	shard           uint16
	time            uint64
	rand            uint64
	created_at_msec int64
	created_at      time.Time
	mutex           sync.Mutex
}

func NewSortableIdGenerator(shard uint16) *SortableIdGenerator {
	return &SortableIdGenerator{
		seq:   0,
		shard: shard,
		time:  0,
		rand:  0,
		mutex: sync.Mutex{},
	}
}

func (g *SortableIdGenerator) Next() (Id128, error) {
	var res Id128
	var buf [8]byte
	if _, err := io.ReadFull(rander, buf[:]); err != nil {
		return res, err
	}
	rand64 := binary.BigEndian.Uint64(buf[:])
	t := uint64(time.Now().UnixMilli())
	var seq uint16
	{
		g.mutex.Lock()
		defer g.mutex.Unlock()
		if t < g.time {
			t = g.time
		}
		if t == g.time {
			seq = g.seq + 1
			if seq == 0 {
				t = g.time + 1
			}
		} else {
			seq = uint16(rand64) & mask
		}
		g.time = t
		g.seq = seq

	}
	binary.BigEndian.PutUint64(res[0:], t<<16|uint64(seq))
	binary.BigEndian.PutUint64(res[8:], rand64)
	binary.BigEndian.PutUint16(res[14:], g.shard)
	return res, nil
}

func Base62(buf []byte) string {
	var i big.Int
	i.SetBytes(buf[:])
	return i.Text(62)
}
