# Testing
`Mia service Node Library` is built on Fastify and therefore integrates with [testing tools](https://www.fastify.io/docs/latest/Testing/)
made available by the framework. A complete example of this type of test iis available [here](https://github.com/mia-platform/custom-plugin-lib/blob/master/examples/advanced/test/).

CustomPlugin directly expose `getDirectServiceProxy` and `getServiceProxy` for testing purpose.
Ypu can import the function in you test in ths way:
``` javascript
const { getDirectServiceProxy } = require('@mia-platform/custom-plugin-lib') 
const { getServiceProxy } = require('@mia-platform/custom-plugin-lib') 

const myServiceProxy = getDirectServiceProxy(serviceName,otions)
const myServiceProxy = getServiceProxy(options)

 ```
## Integration and Unit test

The testing of a ervice can be performed at multiple levels of abstraction. One of
Possibility is to use a technique called _fake http injection_ for which it is possible to simulate
receiving an HTTP request. In this way, all the service logic is exercised from the HTTP layer to the handlers and
this is an example of Integration Testing.

### Example Integration Test

In the example below the test framework [Mocha](https://mochajs.org/).

```js
'use strict'

const assert = require('assert')
const fastify = require('fastify')

const customPlugin = require('@mia-platform/custom-plugin-lib')()
const index = customPlugin(async service => {
  service.addRawCustomPlugin(
    'GET',
    '/status/alive',
    async (request, reply) => ({
      status: 'ok'
    })
  )
})

const createTestServer = () => {
  // Silent => trace for enabliing logs
  const createdServer = fastify({ logger: { level: 'silent' } })
  createdServer.register(index)
  
  return createdServer
}

describe('/status/alive', () => {
  it('should be available', async () => {
    const server = createTestServer()

    const response = await server.inject({
      url: '/status/alive',
    })

    assert.equal(response.statusCode, 200)
  })
})
```