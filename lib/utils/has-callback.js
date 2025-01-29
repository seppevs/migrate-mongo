const fnArgs = require('fn-args');
const _last = require('lodash.last');

module.exports = (func) => {

  const argNames = fnArgs(func);
  const lastArgName = _last(argNames);

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
