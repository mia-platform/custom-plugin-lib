/*
 * Copyright 2018 Mia srl
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

'use strict'

const tap = require('tap')
const lc39 = require('@mia-platform/lc39')

const fs = require('fs')
const { promisify } = require('util')

const USER_PROPERTIES_HEADER_KEY = 'miauserproperties'
const USERID_HEADER_KEY = 'userid-header-key'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'

const baseEnv = {
  USERID_HEADER_KEY,
  USER_PROPERTIES_HEADER_KEY,
  GROUPS_HEADER_KEY,
  CLIENTTYPE_HEADER_KEY,
  BACKOFFICE_HEADER_KEY,
  MICROSERVICE_GATEWAY_SERVICE_NAME,
}

tap.test('Plain Custom Service', test => {
  async function setupFastify(envVariables) {
    const fastify = await lc39('./tests/services/plain-custom-service.js', {
      logLevel: 'silent',
      envVariables,
    })
    return fastify
  }

  test.test('Hello World', async assert => {
    const fastify = await setupFastify(baseEnv)

    const response = await fastify.inject({
      method: 'GET',
      url: '/',
    })
    assert.strictSame(response.statusCode, 200)
    assert.ok(/text\/plain/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(response.payload, 'Hello world!')
    assert.end()
  })

  test.test('Access platform values', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/platform-values',
      headers: {
        [CLIENTTYPE_HEADER_KEY]: 'CMS',
        [GROUPS_HEADER_KEY]: 'group-name,group-to-greet',
        [USERID_HEADER_KEY]: 'Mark',
        [USER_PROPERTIES_HEADER_KEY]: JSON.stringify({ prop1: 'value1', prop2: 'value2' }),
      },
    })

    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(JSON.parse(response.payload), {
      userId: 'Mark',
      userGroups: ['group-name', 'group-to-greet'],
      userProperties: { prop1: 'value1', prop2: 'value2' },
      clientType: 'CMS',
      backoffice: false,
    })
    assert.end()
  })

  test.test('Access platform "miauserproperties" - when USER_PROPERTIES_HEADER_KEY NOT defined - uses default header key', async assert => {
    const envarWithoutUserProperties = {
      ...baseEnv,
    }
    delete envarWithoutUserProperties.USER_PROPERTIES_HEADER_KEY

    const fastify = await setupFastify(envarWithoutUserProperties)

    const response = await fastify.inject({
      method: 'GET',
      url: '/platform-values',
      headers: {
        'miauserproperties': JSON.stringify({ prop1: 'value1', prop2: 'value2' }),
      },
    })

    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(JSON.parse(response.payload), {
      userId: null,
      userGroups: [],
      userProperties: { prop1: 'value1', prop2: 'value2' },
      clientType: null,
      backoffice: false,
    })
    assert.end()
  })

  test.test('Access platform values when not declared', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/platform-values',
      headers: {},
    })

    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(JSON.parse(response.payload), {
      userId: null,
      userProperties: null,
      userGroups: [],
      clientType: null,
      backoffice: false,
    })
    assert.end()
  })

  test.test('Send form encoded data', async assert => {
    const fastify = await setupFastify(baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'foo=foo&bar=bar',
    })

    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(response.payload), {
      foo: 'foo',
      bar: 'bar',
    })

    assert.end()
  })

  test.test('Can return a stream', async assert => {
    const filename = './tests/services/plain-custom-service.js'
    const readFile = promisify(fs.readFile)
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/stream',
    })

    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/octet-stream')
    assert.strictSame(response.headers['transfer-encoding'], 'chunked')
    assert.strictSame(response.payload, (await readFile(filename)).toString())
    assert.end()
  })

  test.test('Send some json, with validation', async assert => {
    const payload = { some: 'stuff' }
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/validation',
      payload,
    })

    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(response.payload), payload)

    const badResponse = await fastify.inject({
      method: 'POST',
      url: '/validation',
      payload: { ...payload, other: 'stuff' },
    })

    assert.strictSame(badResponse.statusCode, 400)
    assert.strictSame(badResponse.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(badResponse.payload), {
      statusCode: 400,
      message: 'body must NOT have additional properties',
      error: 'Bad Request',
    }, 'bad response')

    const badResponse1 = await fastify.inject({
      method: 'POST',
      url: '/validation',
      payload: { ...payload, foobar: 'not valid' },
    })

    assert.strictSame(badResponse1.statusCode, 400)
    assert.strictSame(badResponse1.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(badResponse1.payload), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'body.foobar must be equal to one of the allowed values',
    }, 'enum validation')

    const badResponse2 = await fastify.inject({
      method: 'POST',
      url: '/validation',
      payload: {
        ...payload,
        foobar: 'foo1',
        nested: { field: [1, 2, 3] },
      },
    })

    assert.strictSame(badResponse2.statusCode, 400)
    assert.strictSame(badResponse2.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(badResponse2.payload), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'body.nested.field must be string',
    }, 'nested fields validation')

    const badResponse3 = await fastify.inject({
      method: 'POST',
      url: '/validation?some=foo',
      payload,
    })

    assert.strictSame(badResponse3.statusCode, 400)
    assert.strictSame(badResponse3.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(badResponse3.payload), {
      statusCode: 400,
      error: 'Bad Request',
      message: 'querystring.some must be number',
    }, 'nested fields validation')

    assert.end()
  })

  test.test('custom body parsing', async assert => {
    const customType = 'application/custom-type'
    const payload = { hello: 'world' }
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: {
        'content-type': customType,
      },
      payload,
    })
    assert.strictSame(response.statusCode, 200)
    assert.strictSame(JSON.parse(response.payload), payload)
    assert.end()
  })

  test.test('Healtiness handler can see decoration', async assert => {
    const fastify = await setupFastify(baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/-/healthz',
    })
    assert.strictSame(response.statusCode, 200)
    assert.end()
  })

  test.end()
})

tap.test('Advanced Custom Service', test => {
  async function setupFastify(envVariables) {
    const fastify = await lc39('./tests/services/advanced-custom-service.js', {
      logLevel: 'silent',
      envVariables,
    })
    return fastify
  }

  test.test('Require some environment variables', async assert => {
    const MY_AWESOME_ENV = 'foobar'
    const fastify = await setupFastify({ ...baseEnv, MY_AWESOME_ENV })
    const response = await fastify.inject({
      method: 'GET',
      url: '/env',
    })
    assert.strictSame(response.statusCode, 200)
    assert.ok(/text\/plain/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(response.payload, MY_AWESOME_ENV)
    assert.end()
  })

  test.test('Decorate fastify with custom functionalities', async assert => {
    const MY_AWESOME_ENV = 'foobar'
    const payload = { hello: 'world' }
    const fastify = await setupFastify({ ...baseEnv, MY_AWESOME_ENV })
    const response = await fastify.inject({
      method: 'POST',
      url: '/custom',
      payload,
    })

    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(JSON.parse(response.payload), payload)
    assert.end()
  })


  test.end()
})

tap.test('Advanced config', test => {
  async function setupFastify(envVariables) {
    const fastify = await lc39('./tests/services/advanced-config.js', {
      logLevel: 'silent',
      envVariables,
    })
    return fastify
  }

  test.test('it accepts advacend config', async assert => {
    const fastify = await setupFastify(baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/advanced-config',
      body: {},
    })

    const parsedPayload = JSON.parse(response.payload)

    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))

    assert.match(parsedPayload.error, /foo/, 'route can access the validation error')
    assert.match(parsedPayload.config, { myConfig: [1, 2, 3, 4] }, 'route can access context')

    assert.test('part of advanced config is overwritten', (assert) => {
      const {
        method,
        path,
        handler,
        schema,
      } = parsedPayload.config

      assert.notEqual(method, 'overwritten property')
      assert.notEqual(path, 'overwritten property')
      assert.notEqual(handler, 'overwritten property')
      assert.notEqual(schema, 'overwritten property')

      assert.end()
    })
    assert.end()
  })

  test.end()
})
