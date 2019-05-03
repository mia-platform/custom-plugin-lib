<div align="center">

# Custom Plugin Node Library

[![Build Status][travis-svg]][travis-org]
[![javascript style guide][standard-mia-svg]][standard-mia]
[![Coverage Status][coverall-svg]][coverall-io]  
[![NPM version][npmjs-svg]][npmjs-com]
[![Greenkeeper badge][greenkeeper-svg]][greenkeeper-io]

</div>

**The Mia-Platform Plugin Node Library**

This library is intented to ease the creation of new services to deploy
on [Mia-Platform][mia-platform].  
Is highly copled with [`lc39`][lc39] and on [Fastify][fastify].

## Getting Started

### Install

To install the package you can run:

```sh
npm install @mia-platform/custom-plugin-lib --save
```

### Examples

Defining a new service that integrate with the platform is as simple as in this
[example](examples/basic/index.js).  
Please see also a more [advanced example](examples/advanced/index.js) to see how to require
more environment variables, and to specify schema definitions for validation and swagger documentation.

For using one of the two example provided you can move to one of the two directories and run:

```sh
npm run start:local
```

This command will launch the service on `localhost:3000` with the environment variables defined
in this [file](examples/default.env).
Now you can consult the swagger documentation of the service at
[this](http://localhost:3000/documentation/) address.

### Local Development

To develop the service locally you need:
- Node 8+

To setup node, please if possible try to use [nvm][nvm], so you can manage multiple versions easily.
Once you have installed nvm, you can go inside the directory of the project and simply run
`nvm install`, the `.nvmrc` file will install and select the correct version
if you don’t already have it.

Once you have all the dependency in place, you can launch:
```shell
npm i
npm run coverage
```

This two commands, will install the dependencies and run the tests with the coverage report that you can view as an HTML
page in `coverage/lcov-report/index.html`.

## `rawCustomPlugin`
Defining a custom plugin that uses the platform’s services is as simple as
in this [helloWorld](examples/basic/helloWorld.js) example.
This library exports a function that optionally takes a schema of the required environment variables
(you can find the reference [here][fastify-env]).
This function returns a `customService` function, that expects an async function to initialize and configure
the service (provided as the only argument). This service is a [fastify][fastify] instance,
that also contains the method `addRawCustomPlugin`, that allows you to add a route.
Multiple routes can be added in this way.  
For each route you have to specify an async handler. You should always return something (strings, objects, streams),
unless you set the response status code to 204. Please read [here][fastify-async] for further information
about async handlers.  
You must also specify the http method, and the path of the hander. Optionally you can indicate the JSONSchemas
to validate the querystring, the parameters, the payload, the response.  
In addition to validation, you will also have a swagger documentation available at the `/documentation/` path.

Thanks to TypeScript's type definitions, editors can actually provide autocompletion for the additional methods
of the request object such as `getUserId` or `getGroups`.

In the async initialization function you can also access the `fastify` instance, so you can register any plugin,
see [here][fastify-ecosystem] for a list of currently available plugins.  
In addition, you can register additional [`content-type` parsers][fastify-parsers].

## Configuration
To use the library, you should specify the environment variables listed [here](index.js#L22),
other variables can be specified by setting your envSchema when calling the plugin.

[travis-svg]: https://travis-ci.org/mia-platform/custom-plugin-lib.svg?branch=master
[travis-org]: https://travis-ci.org/mia-platform/custom-plugin-lib
[standard-mia-svg]: https://img.shields.io/badge/code_style-standard--mia-orange.svg
[standard-mia]: https://github.com/mia-platform/eslint-config-mia
[coverall-svg]: https://coveralls.io/repos/github/mia-platform/custom-plugin-lib/badge.svg
[coverall-io]: https://coveralls.io/github/mia-platform/custom-plugin-lib
[npmjs-svg]: https://img.shields.io/npm/v/@mia-platform/custom-plugin-lib.svg?logo=npm
[npmjs-com]: https://www.npmjs.com/package/@mia-platform/custom-plugin-lib
[greenkeeper-svg]: https://badges.greenkeeper.io/mia-platform/custom-plugin-lib.svg
[greenkeeper-io]: https://greenkeeper.io/

[mia-platform]: https://www.mia-platform.eu/
[lc39]: https://github.com/mia-platform/lc39
[nvm]: https://github.com/creationix/nvm

[fastify]: https://www.fastify.io/
[fastify-env]: https://github.com/fastify/fastify-env
[fastify-async]: https://www.fastify.io/docs/latest/Routes/#async-await
[fastify-ecosystem]: https://www.fastify.io/ecosystem/
[fastify-parsers]: https://www.fastify.io/docs/latest/ContentTypeParser/
