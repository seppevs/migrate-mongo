const fnArgs = require('fn-args');

module.exports = (func) => {

  const argNames = fnArgs(func);
  const lastArgName = argNames[argNames.length - 1];

  return [
    'callback',
    'callback_',
    'cb',
    'cb_',
    'next',
    'next_',
    'done',
    'done_'
  ].includes(lastArgName);

};
