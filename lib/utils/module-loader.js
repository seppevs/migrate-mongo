module.exports = {
  require(requirePath) {
    return require(requirePath);
  },

  /* istanbul ignore next */
  import(importPath) {
    return import(importPath);
  },
};
