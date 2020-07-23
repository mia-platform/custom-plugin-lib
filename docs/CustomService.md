# Custom Service
A Custom Microservice is a service that receives HTTP requests, whose cycle of use and deploy is managed by the platform. A Custom Microservice  encapsulates ad-hoc business logics that can be developed by any user of the platform. To know how manage your services in the DevOps Console see the [documentation](https://docs.mia-platform.eu/development_suite/api-console/api-design/services/)

The library exports a function which creates the infrastructure ready to accept the definition of routes and decorators.  
The function optionally can take a schema of the required environment variables (you can find the reference [fastify-env](https://github.com/fastify/fastify-env).

## Example

```js
const customService = require('@mia-platform/custom-plugin-lib')({
  type: 'object',
  required: ['ENV_VAR'],
  properties: {
    ENV_VAR: { type: 'string' },
  },
})
```

> **_More examples?_** Go [here](../examples/advanced/index.js#L46) to see another use cases.



You can configure the environment variables from DevOps console, in your service configuration. To further detail see [Mia-Platform documentation](https://docs.mia-platform.eu/development_suite/api-console/api-design/services/#environment-variable-configuration).  

The function expects an async function to initialize and configure the `service`, a [Fastify instance](https://www.fastify.io/docs/latest/Server/).   
You can get the environment variables from `service.config`:
```js
module.exports = customService(async function handler(service) {
  const { ENV_VAR } = service.config
  ...
})
```
Upon `service`, you can you can add [routes](Routes.md) and [decorators](Decorators.md). 


