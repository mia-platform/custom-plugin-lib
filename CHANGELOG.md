# Changelog

All notable changes to this project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## v2.0.2 - 2020-09-29

## [Unrealeased]

- [BMP-508](https://makeitapp.atlassian.net/browse/BMP-508): updated lc39 dependency to 3.1.3

### Added

  - [BMP-508](https://makeitapp.atlassian.net/browse/BMP-508): updated lc39 dependency to 3.1.2

## v2.0.1 - 2020-09-22

- [BMP-508](https://makeitapp.atlassian.net/browse/BMP-508): updated lc39 dependency to 3.1.1

## v2.0.0 - 2020-09-17

### BREAKING CHANGES

- Dropped support to Node 8
- Update @mia-platform/lc39 2.2.2 -> 3.1.0. 

    This update bring this breaking change:
    * Request and response logged information are now compliant with Mia-Platform logging guidelines. To see the guidelines, please check [Mia Platform Docs](https://docs.mia-platform.eu/docs/development_suite/monitoring-dashboard/dev_ops_guide/log). You can find the implementation details [here](https://github.com/mia-platform/lc39/blob/master/lib/custom-logger.js)

### Added

- Added `getUserProperties` to decorated `fastify.Request`, which returns the user properties

### Changed

- Update ajv 6.10.2 -> 6.12.0
- Update fastify-plugin 1.6.0 -> 1.6.1
- Update simple-get 3.0.3 -> 3.1.0

## v1.1.1 - 2019-12-09
## Add
- Add README

## v1.1.0 - 2019-12-09
## Add
- advanced config in route

## v1.0.5 - 2019-09-09

### Changed

- Update @types/node 12.7.1 -> 12.7.4
- Moved URL construction from deprecated url.format to the new WHATWG API

## v1.0.4 - 2019-08-08

### Changed

- Update @mia-platform/lc39 2.2.0 -> 2.2.2
- Update @types/node 12.6.0 ->  12.7.1
- Update ajv 6.10.1 -> 6.10.2

## v1.0.3 - 2019-07-08

### Changed

- Update @mia-platform/lc39 2.1.2 -> 2.2.0
- Update @types/node 12.0.2 -> 12.6.0
- Update ajv 6.10.0 -> 6.10.1
- Update http-errors 1.7.2 -> 1.7.3
- Update fastify-env 0.6.2 -> 1.0.1

## v1.0.1 - 2019-05-28

### Changed

- Improved condition for hinding error messages to users to avoid false positives

## v1.0.0 - 2019-05-23

### Added

- Add new flag for filtering mia header injection
- Add extra headers proxy during internal http calls

### Changed

- Update repository to use lc39 and fastify 2
- Modify error message on status code validation failure

## v1.0.0-rc.2 - 2019-05-08

### Changed

- Fix wrong dependencies in `package.json` file

## v1.0.0-rc.1 - 2019-05-08

### Changed

- Fix wrong encapsulation from fastify for custom functions

## v1.0.0-rc.0 - 2019-05-06

### Changed

- Update repository to use lc39 and fastify 2
- Modify error message on status code validation failure

## v0.7.0 - 2019-03-12

### Added

- Add checks for `env` variables
- Add response status code validation
- Add new way to create a service proxy

## v0.6.0 - 2019-02-13

### Added

- Add support for proxy custom headers to the services pipeline

## v0.5.2 - 2019-02-06

### Added

- Add support for proxy custom headers to other services

### Changed

- Update fastify-cli 0.22.0 -> 0.24.0

## v0.5.1 - 2018-10-19

### Added

- Add support for trusted proxies

### Changed

- Update fastify 1.9.0 -> 1.12.1
- Update fastify-cli 0.19.0 -> 0.22.0

## v0.5.0 - 2018-08-23

### Added

- Add more customization options for calling other services

## v0.4.0 - 2018-08-01

Initial public release
