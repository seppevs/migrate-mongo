const fs = require("fs-extra");
const path = require("path");
const date = require("../utils/date");
const alwaysBeforeDir = require("../env/alwaysBeforeDir");

module.exports = async description => {
  if (!description) {
    throw new Error("Missing parameter: description");
  }
  await alwaysBeforeDir.shouldExist();
  const source = path.join(__dirname, "../../samples/always.js");
  const filename = `${date.nowAsString()}-${description
    .split(" ")
    .join("_")}.js`;
  const destination = path.join(await alwaysBeforeDir.resolve(), filename);
  await fs.copy(source, destination);
  return filename;
};
