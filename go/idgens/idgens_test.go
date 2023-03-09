package idgens

import (
	"testing"
)

func TestBase62(t *testing.T) {
	var buf [16]byte
	if actual := Base62(buf[:]); actual != "0" {
		t.Fatalf("Base62([16]byte{}[:]) != 0: %q", actual)
	}
}
