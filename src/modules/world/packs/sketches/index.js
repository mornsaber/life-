/** Countries built with sketch() (see ../Sketch.js), by region. */
import * as Europe from './Europe.js';
import * as Eurasia from './Eurasia.js';
import * as Africa from './Africa.js';
import * as Americas from './Americas.js';
import * as Pacific from './Pacific.js';

export const SKETCHES = [Europe, Eurasia, Africa, Americas, Pacific].flatMap((m) => Object.values(m));
