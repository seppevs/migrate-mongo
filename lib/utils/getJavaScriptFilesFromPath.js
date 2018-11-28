const path = require("path");
const fs = require("fs");

const getJavaScriptFilesFromPath = async filepath => {
  const files = await fs.readdirSync(filepath);
  return files.filter(file => path.extname(file) === ".js");
};

module.exports = getJavaScriptFilesFromPath;
