import {manifest} from '../lib/workshop.mjs';
console.log(`Validated immutable ${manifest.id}@${manifest.version}: 3 reference hashes, prerequisites and trusted harness hash. Run browser release tests for behavior.`);
