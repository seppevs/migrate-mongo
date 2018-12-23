const fs = require("fs-extra");
const path = require("path");
const date = require("../utils/date");
const alwaysAfterDir = require("../env/alwaysAfterDir");

module.exports = async description => {
  if (!description) {
    throw new Error("Missing parameter: description");
  }
  await alwaysAfterDir.shouldExist();
  const source = path.join(__dirname, "../../samples/always.js");
  const filename = `${date.nowAsString()}-${description
    .split(" ")
    .join("_")}.js`;
  const destination = path.join(await alwaysAfterDir.resolve(), filename);
  await fs.copy(source, destination);
  return filename;
};
