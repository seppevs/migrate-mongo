# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [12.1.2] - 2025-01-29
- Update ESM config with soft lock settings

## [12.1.1] - 2025-01-29
- Fix issue when no soft lock is defined in config file

## [12.1.0] - 2025-01-29
- Add soft lock feature (https://github.com/seppevs/migrate-mongo/pull/262)

## [12.0.1] - 2025-01-29
- Fix "No url defined in config file" when using ESM (https://github.com/seppevs/migrate-mongo/issues/458)

## [12.0.0] - 2025-01-29
- Fix "No url defined in config file" when using ESM ([`f086575`](https://github.com/seppevs/migrate-mongo/commit/f086575f6ec55411dca4f2cf9d24a19cb7c41696))
- fix: Bump deprecated eslint from 7.31.0 to 9.15.0 ([`63c37fa`](https://github.com/seppevs/migrate-mongo/commit/63c37fa0231ffbc192477d1449fcad7b478b5f42))
- Replace Lodash with Smaller Modular Packages ([`b08b924`](https://github.com/seppevs/migrate-mongo/commit/b08b924c35aea0ab5a1d0266703017f12a383344))
- add type annotations in sample migrations ([`55f8c0b`](https://github.com/seppevs/migrate-mongo/commit/55f8c0badeedde1ae533cb77a912c623606c8d45))
- Update package.json to support Mongo 7 ([`f33228f`](https://github.com/seppevs/migrate-mongo/commit/f33228f58d5c02402b355cbbbf0579051691f05b))
- feat: remove date-fns dep (https://github.com/seppevs/migrate-mongo/pull/436/)
- Update README.md site with dependencies seems to be down (https://github.com/seppevs/migrate-mongo/pull/444)
- Fix up/down command console output when logger replaces it (https://github.com/seppevs/migrate-mongo/pull/365)
- typo: mistake with async function signature in README.md (https://github.com/seppevs/migrate-mongo/pull/333)
- Enable rollback of all scripts from same migration ([`f67f6d4`](https://github.com/seppevs/migrate-mongo/commit/f67f6d43540773161ba913dd09c14ebf44e61594))

## [11.0.0] - 2023-09-25
- Upgrade mongodb to version 6 ([`1f020ab`](https://github.com/seppevs/migrate-mongo/commit/1f020ab8a3fafef826eb8c68e844ed94f3d9666e))
- docs: CHANGELOG ([`47740cb`](https://github.com/seppevs/migrate-mongo/commit/47740cb81bd8108631eaf2fe6b3fd4b4ba2aec92))
- docs: No autolink ([`f2c13c5`](https://github.com/seppevs/migrate-mongo/commit/f2c13c508cf60cdc790a1552fc24784e79c4ead9))
- typo: function async > async function ([`282cd6e`](https://github.com/seppevs/migrate-mongo/commit/282cd6e1527f02a282bbadc29ee61aa0c67bc0b4))
- fix: exit from process after create command is done ([`addeabf`](https://github.com/seppevs/migrate-mongo/commit/addeabf1c781752771f923370d83f5edfc1a335f))
- docs: added '{session}' options to Transactions API samples ([`47fa544`](https://github.com/seppevs/migrate-mongo/commit/47fa544a1c249e473135df06f6befa1b6a3caaaf))

## [10.0.0] - 2023-04-11

- Change dependencies of `mongodb@^4.4.1` to peerDependencies of `mongodb@^4.4.1||^5.0.0` ([`e4d9446`](https://github.com/seppevs/migrate-mongo/commit/e4d944680db7222482ce55340eaddf15c02c234d))

## [9.0.0] - 2022-03-31

- Add ESM support ([`633235e`](https://github.com/seppevs/migrate-mongo/commit/633235eecad3aa852d75809d5a150ddfb9a3a3b9), [`4b9a955`](https://github.com/seppevs/migrate-mongo/commit/4b9a955b291734c3f8971327423343d4d90311d1))
- Upgrade dependencies from `mongodb@^4.0.1` to `mongodb@^4.4.1` ([`b5d4dc5`](https://github.com/seppevs/migrate-mongo/commit/b5d4dc514062ef15525806bb58d5ff16ffac5173))

## [8.2.3] - 2021-07-28

- Upgrade dependencies from `mongodb@^3.6.4` to `mongodb@^4.0.1` ([`499fc8d`](https://github.com/seppevs/migrate-mongo/commit/499fc8dc823f0d8e794e2edb15767832144ef7f2))

## [8.2.2] - 2021-03-05

- Upgrade dependencies ([`4876e5b`](https://github.com/seppevs/migrate-mongo/commit/4876e5b5530f10055f2cd05da796fce78b3cc289))

## [8.2.1] - 2021-03-05

- Add custom file extension to sample file ([`3b79e11`](https://github.com/seppevs/migrate-mongo/commit/3b79e11b5ebf89123267601f2711e6f29ebe93de))

## [8.1.5] - 2021-03-05

- Add support for file hash tracking ([`20a8884`](https://github.com/seppevs/migrate-mongo/commit/20a8884e60ad09968093b7d0b09e22689d01ef2f))

## [8.1.4] - 2020-10-19

- Fix `mocha` issue ([`eeea64a`](https://github.com/seppevs/migrate-mongo/commit/eeea64a4ca98aa86d4b90b0a8e79ce54ab9f8719))

## [8.1.3] - 2020-10-19

- Upgrade dependencies ([`4385b78`](https://github.com/seppevs/migrate-mongo/commit/4385b78e4a536084ca9ef4b5b20b2aae02051f13))

## [8.1.2] - 2020-09-21

- Upgrade dependencies from `mongodb@3.5.9` to `mongodb@^3.6.2` ([`862fde0`](https://github.com/seppevs/migrate-mongo/commit/862fde035e4ecc3353f8d7e0f6aeafcef9ef01b1))

## [8.1.0] - 2020-07-21

- Add API to set config ([`f842ba1`](https://github.com/seppevs/migrate-mongo/commit/f842ba1c0db15e34860d115c0d945bffb0659b35))
- Change `databaseName` on connection URI to be optional ([`84494dd`](https://github.com/seppevs/migrate-mongo/commit/84494dd483f39bdcfe0d1377ed9348c751ec65a3))

## [8.0.0] - 2020-07-20

- Deprecate node v8 ([`af0eaf2`](https://github.com/seppevs/migrate-mongo/commit/af0eaf2d4c2d29b8a2bf7ce250c0d48d6d70307e))

## [7.2.2] - 2020-07-20

- Upgrade dependencies from `mongodb@3.5.6` to `mongodb@3.5.9` ([`53e7e63`](https://github.com/seppevs/migrate-mongo/commit/53e7e630dc6fc817b9fe45b85b5d4dff060aaaf4))

## [7.2.1] - 2020-04-28

- Downgrade dependencies from `fs-extra@9.0.0` to `fs-extra@8.1.0` to support node v8 ([`e066ef0`](https://github.com/seppevs/migrate-mongo/commit/e066ef0b25e133d438aa902d75922c618279f655))

## [7.2.0] - 2020-04-24

- Add configurable migration file extension ([`ecc48fb`](https://github.com/seppevs/migrate-mongo/commit/ecc48fbb29ff3cf76aaaa23c8973ec1eae8b83f9))
- Upgrade dependencies from `mongodb@3.5.3` to `mongodb@3.5.6` ([`eab9104`](https://github.com/seppevs/migrate-mongo/commit/eab910496b30241ad0348ccbef4225cb4492380b))

## [7.1.0] - 2020-02-23

- Upgrade dependencies from `mongodb@3.3.3` to `mongodb@3.5.3` ([`85d29be`](https://github.com/seppevs/migrate-mongo/commit/85d29be1026cdb9e6ec226b99da2947a1aa5c147))

## [7.0.0] - 2019-11-03

- Add `client` argument to access MongoDB transaction API ([`d52c418`](https://github.com/seppevs/migrate-mongo/commit/d52c4180b9b5532185daea21ca9f5759a41e8974))
