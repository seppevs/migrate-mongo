const { format } = require("date-fns");

const now = (dateString = Date.now()) => {
  const date = new Date(dateString);
  return new Date(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
};

const nowAsString = () => format(now(), "yyyyMMddHHmmss");

module.exports = {
  now,
  nowAsString
};
