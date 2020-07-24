<div align="center">

# Mia service Node.js Library

[![Build Status][travis-svg]][travis-org]
[![javascript style guide][standard-mia-svg]][standard-mia]
[![Coverage Status][coverall-svg]][coverall-io]  
[![NPM version][npmjs-svg]][npmjs-com]
[![Greenkeeper badge][greenkeeper-svg]][greenkeeper-io]

</div>

This library is intended to ease the [creation of new services](https://docs.mia-platform.eu/development_suite/api-console/api-design/services/) to deploy
on [Mia-Platform][mia-platform].  
Built on [`Fastify`][fastify], it takes advantage of Mia-Platform Node.js service launcher [`lc39`][lc39].

# Getting Started
You can use this module in your projects or, from the [DevOps Console](https://docs.mia-platform.eu/development_suite/overview-dev-suite/), get started quickly and easily with a [ready-to-use microservice template](https://docs.mia-platform.eu/development_suite/api-console/api-design/custom_microservice_get_started/). Even in  the [Mia-Platform Marketplace](https://github.com/mia-platform-marketplace) repository, you can find some examples and boilerplates that using this library.

## Setup the local development environment

To develop the service locally you need:
- Node.js v12 LTS or later.

To setup node.js, we suggest to use [nvm][nvm], so you can manage multiple versions easily.
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

## Install module

To install the package with npm:

```sh
npm i @mia-platform/custom-plugin-lib --save
```
To install with Yarn:

```sh
yarn add @mia-platform/custom-plugin-lib
```
## Define a Custom Service

You can define a new Custom Service that integrates with the platform simply writing this:
```js
const customService = require('@mia-platform/custom-plugin-lib')()

module.exports = customService(async function helloWorldService(service) {
  service.addRawCustomPlugin('GET', '/hello', function handler(request, reply) {
    request.log.trace('requested myuser')
    // if the user is not logged, this method returns a falsy value
    const user = request.getUserId() || 'World'
    reply.send({
      hello: `${user}!`,
    })
  })
}) 
```
- The library exports a function, `customService`, that expects an async function to initialize and configure the `service`. Optionally can take a schema of the required environment variables (you can find the reference [here][fastify-env]).
- `service` is a [Fastify instance](https://www.fastify.io/docs/latest/Server/), upon which, you can call `addRawCustomPlugin` method that allows you to add your route. You can use  *service* to register any Fastify plugin, see [here][fastify-ecosystem] for a list of currently available plugins.

- `addRawCustomPlugin` is a function that requires the HTTP method, the path of the route and a handler. The handler can also be an [async function](https://www.fastify.io/docs/latest/Routes/#async-await).  
Optionally you can indicate the JSONSchemas to validate the querystring, the parameters, the payload and the response.  

To get more info about Custom Services can you look at the [related section](./docs/CustomService.md).

## Environment Variables configuration
To works correctly, this library needs some specific environment variables:

* `USERID_HEADER_KEY`
* `USER_PROPERTIES_HEADER_KEY`
* `GROUPS_HEADER_KEY`
* `CLIENTTYPE_HEADER_KEY`
* `BACKOFFICE_HEADER_KEY`
* `MICROSERVICE_GATEWAY_SERVICE_NAME`

If you create the service from the Platform, they are already defined. To change them you have to [do from DevOps console](https://docs.mia-platform.eu/development_suite/api-console/api-design/services#environment-variable-configuration).  
In local, the environment variables are defined
in this [file](examples/default.env).

Other variables can be specified by setting your envSchema when calling the plugin.

## Examples
You can see an [advanced example](examples/advanced/  ) to see different use cases of the library.

To see other examples of library use you can visit [some repository](https://github.com/mia-platform/custom-plugin-lib/network/dependents?package_id=UGFja2FnZS00NTc2OTY4OTE%3D) that depends on it.

To run the [examples](examples) directly you can move to specific example folder and run:

```sh
npm run start:local
```

This command will launch the service on `localhost:3000` with the environment variables defined
in this [file](examples/default.env).
Now you can consult the swagger documentation of the service at
[http://localhost:3000/documentation/](http://localhost:3000/documentation/).

For other examples of library use, you can see [some repositories](https://github.com/mia-platform/custom-plugin-lib/network/dependents?package_id=UGFja2FnZS00NTc2OTY4OTE%3D) that depend on it.

# How to

* <a href="./docs/CustomService.md"><b>Create a Custom Service</b></a>
* <a href="./docs/Routes.md#declare-routes"><b>Declare routes</b></a>
* <a href="./docs/Decorators.md"><b>Declare decorators</b></a>
* <a href="./docs/HTTPClient.md"><b>Call the other services on the Platform project</b></a>
* <a href="./docs/ApiDoc.md"><b>API documentation</b></a>
* <a href="./docs/Testing.md"><b>Testing</b></a>
* <a href="./docs/Logging.md#logging"><b>Logging</b></a>

[17]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Array

[18]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String

[19]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Object

[20]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Boolean

[21]: https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise

[22]: https://developer.mozilla.org/docs/Web/API/Comment/Comment

[23]: https://daringfireball.net/projects/markdown/

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
