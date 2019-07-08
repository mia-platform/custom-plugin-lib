# Changelog

All notable changes to this project will be documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

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
