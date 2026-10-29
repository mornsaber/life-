/** Countries built with nation() (see ../Nation.js), by region. */
import * as Europe from './Europe.js';
import * as MiddleEast from './MiddleEast.js';
import * as Africa from './Africa.js';
import * as Asia from './Asia.js';
import * as Americas from './Americas.js';
import * as More from './More.js';

export const NATIONS = [Europe, MiddleEast, Africa, Asia, Americas, More].flatMap((m) => Object.values(m));
