/**
 * Shard 3 of 4 of tests/simulate.js (the suite runs the four in parallel).
 *
 *   node tests/simulate3.js
 */
await import('./simulate.js?shard=2/4');
