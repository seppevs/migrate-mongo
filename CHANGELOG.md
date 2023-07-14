# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)

## [10.0.0] - 2023-04-11

* Change dependencies of `mongodb@^4.4.1` to peerDependencies of `mongodb@^4.4.1||^5.0.0` (e4d9446)

## [9.0.0] - 2022-03-31

* Add ESM support (633235e, 4b9a955)
* Upgrade dependencies from `mongodb@^4.0.1` to `mongodb@^4.4.1` (b5d4dc5)

## [8.2.3] - 2021-07-28

* Upgrade dependencies from `mongodb@^3.6.4` to `mongodb@^4.0.1` (499fc8d)

## [8.2.2] - 2021-03-05

* Upgrade dependencies (4876e5b)

## [8.2.1] - 2021-03-05

* Add custom file extension to sample file (3b79e11)

## [8.1.5] - 2021-03-05

* Add support for file hash tracking (20a8884)

## [8.1.4] - 2020-10-19

* Fix `mocha` issue (eeea64a)

## [8.1.3] - 2020-10-19

* Upgrade dependencies (4385b78)

## [8.1.2] - 2020-09-21

* Upgrade dependencies from `mongodb@3.5.9` to `mongodb@^3.6.2` (862fde0)

## [8.1.0] - 2020-07-21

* Add API to set config (f842ba1)
* Change `databaseName` on connection URI to be optional (84494dd)

## [8.0.0] - 2020-07-20

* Deprecate node v8 (af0eaf2)

## [7.2.2] - 2020-07-20

* Upgrade dependencies from `mongodb@3.5.6` to `mongodb@3.5.9` (53e7e63)

## [7.2.1] - 2020-04-28

* Downgrade dependencies from `fs-extra@9.0.0` to `fs-extra@8.1.0` to support node v8 (e066ef0)

## [7.2.0] - 2020-04-24

* Add configurable migration file extension (ecc48fb)
* Upgrade dependencies from `mongodb@3.5.3` to `mongodb@3.5.6` (eab9104)

## [7.1.0] - 2020-02-23

* Upgrade dependencies from `mongodb@3.3.3` to `mongodb@3.5.3` (85d29be)

## [7.0.0] - 2019-11-03

* Add `client` argument to access MongoDB transaction API (d52c418)