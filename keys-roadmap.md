# Seed Roulette — engine roadmap

How to make the spinner fast, and what "fast" is actually worth.

## Where it stands

The page spins in the browser on the main thread and checks every seed against a
live API. One spin ≈ 15ms of derivation (3 address types) plus a ~350ms debounced
network round trip, self-throttled to roughly one seed every 2 seconds. That is
fine for the toy and hopeless for a search.

- `lib/seed.ts` — BIP39 ↔ addresses, the pin/roll solver, search-space math
- `lib/balance.ts` — bulk balance lookups (blockchain.info, mempool.space fallback)
- 6 addresses checked per seed: BIP44/49/84 × receive/change, index 0

## The constraint

A browser page cannot spawn a process. Something has to be listening, so there
are only three shapes this can take.

### A. Browser worker pool

`navigator.hardwareConcurrency` Web Workers derive in parallel; hits are tested
against a Bloom filter of funded addresses cached in OPFS. No server, no
dev-mode dependency, works on the deployed Pages site.

### B. Vite plugin → Node child process

~40 lines in `vite.config.ts`:

```js
configureServer(server) {
  server.middlewares.use('/api/engine', (req, res) => {
    // POST → fork('scripts/spin.mjs'), GET → SSE stream of rate/hits
  })
}
```

Dev-only by construction — the middleware doesn't exist in the built bundle, so
the deployed page falls back to browser mode on its own. Survives a closed tab,
can hold the full address set in memory, logs hits to a file.

### C. Standalone daemon on a port

Rejected. A deployed `https://` page cannot reach `http://localhost:8787` —
Chrome and Firefox both block it as mixed content, localhost included. It only
works when you're already on `localhost:5173`, and at that point B is strictly
simpler.

## The speedup is not Node

Worth being precise, because it changes which option matters: the ~10,000×
does **not** come from leaving the browser. It comes from two things a Web
Worker has equal access to.

1. **Killing the per-check network round trip.** 2 seconds → nanoseconds. This
   is essentially the entire speedup.
2. **Using every core.** `@noble` is pure JS, so a browser core derives at
   roughly the speed of a Node core.

Node vs. browser is maybe 2×. The network call was the whole story.

Measured, single core: **~68 seeds/sec** deriving all three address types
(~14.6ms each), **~110 seeds/sec** deriving only native segwit. PBKDF2's 2048
SHA-512 rounds dominate — the secp256k1 work is the smaller half. So budget
**500–900 seeds/sec on 8 cores**, and note that restricting to `bc1` nearly
doubles throughput if you're rolling at random rather than recovering.

## Filter sizing

Bloom filter at a 1-in-a-million false positive rate costs ~28.8 bits per
entry, or **~3.6MB per million addresses**. Verify the rare positive against a
real API.

| set | addresses | filter |
|---|---|---|
| every nonzero balance | ~50M | ~180MB |
| ≥ 0.1 BTC | ~4M | ~15MB |
| ≥ 1 BTC | ~1M | ~4MB |

A 15MB fetch cached in OPFS is nothing. The full 50M set is where B earns its
keep — and building any of these needs the raw daily dump (~1.5GB, Blockchair
or the Loyce.club lists) chewed through locally anyway.

**So the architecture that falls out of this: Node builds the filter offline,
the browser runs the engine.** One `npm run spin:filter` a month, and a worker
pool that works on localhost *and* on the deployed site.

## What partial recovery actually costs

Random 24-word spinning is decoration. The only version of this that ever pays
out is somebody holding most of a phrase.

**Use the checksum as a filter and it's a free 256×.** Of the 2048^k
combinations over k unknown word slots, only 1-in-256 has a valid checksum
(1-in-16 for a 12-word phrase). Testing the checksum is ~1µs; deriving a seed
is ~15ms. Never derive a phrase that fails it — enumerate the combinations,
checksum them, derive only the survivors.

At 500 derivations/sec:

| unknown words | combinations | checksum-valid | time |
|---|---|---|---|
| 2 | 4.2×10⁶ | 16k | **33 seconds** |
| 3 | 8.6×10⁹ | 3.4×10⁷ | **19 hours** |
| 4 | 1.8×10¹³ | 6.9×10¹⁰ | 4.4 years |
| 5 | 3.6×10¹⁶ | 1.4×10¹⁴ | 8,900 years |
| 6 | 7.4×10¹⁹ | 2.9×10¹⁷ | 18 million years |
| 12 | 5.4×10³⁹ | 2.1×10³⁷ | 1.3×10²⁷ years |

Three unknown words is an overnight job. Four is a research project. Five is
never. That cliff is the whole design brief: **the grid should make it easy to
pin everything you know**, because each pin is the only lever with real teeth.

(If the unknown slot is the *last* word it barely counts — it carries just 3
entropy bits, so there are only 8 candidates. `solveLastWord` already does this.)

For a full random roll there is no 256× to collect: every 256-bit entropy has
exactly one valid checksum, so the space of valid phrases is 2²⁵⁶ on the nose.
At 10⁹/sec — a warehouse of GPUs — that's 3.7×10⁶⁰ years, about 2.7×10⁵⁰ times
the age of the universe. Six orders of magnitude of engineering buys nothing,
because you are fighting an exponent with a coefficient.

## Recommendation

Build **A** first. It gets the real speedup (no network, all cores), it works on
the deployed site, and it doesn't couple the feature to the dev server. **B**
becomes a thin add-on later for overnight runs against the full 50M filter, with
an engine dropdown that auto-detects whether the local one is reachable.

## Smaller gaps in the page today

- **Auto-spin can roll past a live wallet.** It only checks index 0 of the six
  standard spots; funds at receive index 4 are invisible to it. Escalate to the
  60-address deep scan whenever any address shows `tx_count > 0` — history at
  index 0 is the tell that a seed was ever used.
- Auto stops on `balance > 0` and on chain-lookup errors, but not on a swept
  wallet (history, zero balance). Probably correct, worth a toggle.
- Passphrase (BIP39 "25th word") is unsupported. Real recoveries hit this.
- No BIP32 account scanning past `account 0`.
- The wall keeps only the most recent 300 rows and lives in memory only, so a
  long run loses its history on reload. The running tally is uncapped.
