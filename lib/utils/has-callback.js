const fnArgs = require('fn-args');
const { last } = require('lodash');

module.exports = (func) => {

  const argNames = fnArgs(func);
  const lastArgName = last(argNames);

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
