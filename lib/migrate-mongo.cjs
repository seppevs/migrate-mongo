// CommonJS wrapper for backward compatibility
const esmModule = import('./migrate-mongo.js');

module.exports = esmModule.then(m => m.default || m);

// Also support direct property access for CommonJS users
const handler = {
  get(target, prop) {
    return esmModule.then(m => m[prop] || m.default[prop]);
  }
};

module.exports = new Proxy({}, handler);
