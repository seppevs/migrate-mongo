module.exports = (config, fileName) => {
  let migrationName = fileName;
  if (config.namePrefix)
    migrationName = `${config.namePrefix}${migrationName}`;
  if (config.nameWithoutExtension)
    migrationName = migrationName.substring(0, migrationName.lastIndexOf('.')) || migrationName;

  return migrationName
}