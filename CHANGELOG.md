# Changelog

## 10.2.0

- For `migrationFileExtension` using a value of `.ts`, a typescript template file will be used that comes with proper types

## 10.1.0

- Add [soft locks PR](https://github.com/seppevs/migrate-mongo/pull/262) to prevent multiple migration execution by @daveboulard

## 10.0.1

Update readme, docs in the samples dir

## 10.0.0

**breaking change**: 

- The `callback` parameter is no longer supported and has been removed.
- The baseline `node` engine is `>=12` from `>=8`

**new**: 

- A `context` function can now be specified in the config that will pass context 
data to each migration execution as the third parameter. See readme for more details.

## 9.0.3

Update `package.json` repo url

## 9.0.2

Update the readme to include a URL to the mongo driver options

## 9.0.1

Update dependencies to latest versions where possible and address `npm audit` issues.

## 9.0.0

- Update `mongodb` to 4.3.0

Applied the following PRs from the `seppevs/migrate-mongo` project:

- @Maximusya [`docs: added '{session}' options to Transactions API samples #393`](https://github.com/seppevs/migrate-mongo/pull/393)
- @Kuzzy [`Extend config for tuning migrations DB records #394`](https://github.com/seppevs/migrate-mongo/pull/394)
- @kabalin [`Fix up/down command console output when logger replaces it.`](https://github.com/seppevs/migrate-mongo/pull/365)