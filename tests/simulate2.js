/**
 * Shard 2 of 4 of tests/simulate.js (the suite runs the four in parallel).
 *
 *   node tests/simulate2.js
 */
await import('./simulate.js?shard=1/4');
