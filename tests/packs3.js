/**
 * Shard 3 of 4 of tests/packs.js (the suite runs the four in parallel).
 *
 *   node tests/packs3.js
 */
await import('./packs.js?shard=2/4');
