const fs = require("fs-extra");
const path = require("path");
const date = require("../utils/date");
const beforeDir = require("../env/beforeDir");

module.exports = async description => {
  if (!description) {
    throw new Error("Missing parameter: description");
  }
  await beforeDir.shouldExist();
  const source = path.join(__dirname, "../../samples/before-after.js");
  const filename = `${date.nowAsString()}-${description
    .split(" ")
    .join("_")}.js`;
  const destination = path.join(await beforeDir.resolve(), filename);
  await fs.copy(source, destination);
  return filename;
};
