let fnArgs;

async function loadFnArgs() {
  if (!fnArgs) {
    const module = await import('fn-args');
    fnArgs = module.default;
  }
  return fnArgs;
}

module.exports = async (func) => {
  const fnArgsFunc = await loadFnArgs();
  const argNames = fnArgsFunc(func);
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
