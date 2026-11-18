/**
 * Shard 2 of 4 of tests/packs.js (the suite runs the four in parallel).
 *
 *   node tests/packs2.js
 */
await import('./packs.js?shard=1/4');
