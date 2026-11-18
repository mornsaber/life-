/**
 * Shard 4 of 4 of tests/simulate.js (the suite runs the four in parallel).
 *
 *   node tests/simulate4.js
 */
await import('./simulate.js?shard=3/4');
