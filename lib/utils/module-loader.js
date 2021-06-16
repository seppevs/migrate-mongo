module.exports = {
  require(requirePath) {
    return require(requirePath); // eslint-disable-line
  },

  /* istanbul ignore next */
  import(importPath) {
    return import(importPath); // eslint-disable-line
  },
};
