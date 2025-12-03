import { createRequire } from 'module';
import { pathToFileURL } from 'url';
import path from 'path';

export default {
  require(requirePath) {
    // Create require from the user's working directory context, not migrate-mongo's
    const requireFunc = createRequire(pathToFileURL(path.join(process.cwd(), 'package.json')));
    return requireFunc(requirePath);
  },

  import(importPath) {
    return import(importPath);
  },
};
