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

/* eslint id-length: 0 */
/* eslint require-await: 0 */
/* eslint no-shadow: 0 */
/* eslint no-magic-numbers: 0 */
/* eslint max-lines: 0 */
/* eslint max-statements: 0 */
'use strict'

const t = require('tap')
const fastifyBuilder = require('fastify')
const nock = require('nock')

const initCustomServiceEnvironment = require('../index')
const fs = require('fs')
const { promisify } = require('util')

const USERID_HEADER_KEY = 'userid-header-key'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'
const ADDITIONAL_HEADERS_TO_PROXY = 'additionalheader1,additionalheader2'
const baseEnv = {
  USERID_HEADER_KEY,
  GROUPS_HEADER_KEY,
  CLIENTTYPE_HEADER_KEY,
  BACKOFFICE_HEADER_KEY,
  MICROSERVICE_GATEWAY_SERVICE_NAME,
}

function setupFastify(t) {
  const fastify = fastifyBuilder({
    logger: { level: 'silent' },
  })
  t.tearDown(() => fastify.close())
  return fastify
}

nock.disableNetConnect()

t.test('customService', t => {
  t.test('', async t => {
    t.plan(1)
    const payload = 'Hello world'
    const customService = initCustomServiceEnvironment()
    process.env.TRUSTED_PROXIES = '127.0.0.1' // eslint-disable-line no-process-env
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler() {
        return payload
      }
      service.addRawCustomPlugin('GET', '/', handler)
    })

    t.strictSame(helloWorldPlugin.options, { trustProxy: '127.0.0.1' })
    delete process.env.TRUSTED_PROXIES  // eslint-disable-line no-process-env
  })

  t.test('hello world', async t => {
    t.plan(4)
    const payload = 'Hello world'
    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler() {
        return payload
      }
      service.addRawCustomPlugin('GET', '/', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/text\/plain/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, payload)
  })

  t.test('access client, groups, clientType, backoffice', async t => {
    const testConfigs = [
      {
        url: '/myuser',
        headers: {
          [USERID_HEADER_KEY]: 'Mark',
        },
        expectedPayload: 'Hi Mark!',
      },
      {
        url: '/mygroups',
        headers: {
          [GROUPS_HEADER_KEY]: 'group-name,group-to-greet',
        },
        expectedPayload: 'Hi, your groups are: group-name group-to-greet',
      },
      {
        url: '/myclienttype',
        headers: {
          [CLIENTTYPE_HEADER_KEY]: 'CMS',
        },
        expectedPayload: 'Hi, your client type is CMS',
      },
      {
        url: '/amibackoffice',
        headers: {},
        expectedPayload: 'false',
      },
    ]
    const customService = initCustomServiceEnvironment()
    const baseFunctionalitiesPlugin = customService(async function clientGroups(service) {
      async function handleUser(request) {
        return `Hi ${request.getUserId()}!`
      }
      async function handleGroups(request) {
        return `Hi, your groups are: ${request.getGroups().join(' ')}`
      }
      async function handleClient(request) {
        return `Hi, your client type is ${request.getClientType()}`
      }
      async function handleFromBackoffice(request) {
        return `${request.isFromBackOffice()}`
      }
      service
        .addRawCustomPlugin('GET', '/myuser', handleUser)
        .addRawCustomPlugin('GET', '/mygroups', handleGroups)
        .addRawCustomPlugin('GET', '/myclienttype', handleClient)
        .addRawCustomPlugin('GET', '/amibackoffice', handleFromBackoffice)
    })
    const fastify = setupFastify(t)
    fastify.register(baseFunctionalitiesPlugin, baseEnv)
    t.plan(testConfigs.length * 4)
    for (const { url, headers, expectedPayload } of testConfigs) {
      const response = await fastify.inject({
        method: 'GET',
        url,
        headers,
      })
      t.strictSame(response.statusCode, 200)
      t.ok(/text\/plain/.test(response.headers['content-type']))
      t.ok(/charset=utf-8/.test(response.headers['content-type']))
      t.strictSame(response.payload, expectedPayload)
    }
  })

  t.test('require some environment variables', async t => {
    t.plan(4)
    const MY_AWESOME_ENV = 'foobar'
    const envSchema = {
      type: 'object',
      required: ['MY_AWESOME_ENV'],
      properties: {
        MY_AWESOME_ENV: { type: 'string' },
      },
    }
    const customService = initCustomServiceEnvironment(envSchema)
    const myEnvService = customService(async function envService(service) {
      const configVariable = service.config['MY_AWESOME_ENV']
      async function handler() {
        return configVariable
      }
      service.addRawCustomPlugin('GET', '/', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(myEnvService, { ...baseEnv, MY_AWESOME_ENV })
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/text\/plain/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, MY_AWESOME_ENV)
  })

  t.test('decorate fastify with custom functionalities', async t => {
    t.plan(4)
    const payload = 'Hello world'
    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function custom(service) {
      const customFunctionality = () => payload
      service.decorate('customFunctionality', customFunctionality)
      async function handler() {
        return this.customFunctionality()
      }
      service.addRawCustomPlugin('GET', '/', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/text\/plain/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, payload)
  })

  t.test('send some json, with validation', async t => {
    t.plan(5)
    const payload = { some: 'stuff' }
    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function serviceWithValidation(service) {
      const schema = {
        body: {
          type: 'object',
          required: ['some'],
          properties: {
            some: { type: 'string' },
          },
          additionalProperties: false,
        },
      }
      async function handler(request) {
        return request.body
      }
      service.addRawCustomPlugin('POST', '/', handler, schema)
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), payload)
    const badResponse = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { ...payload, other: 'stuff' },
    })
    t.strictSame(badResponse.statusCode, 400)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
  })

  t.test('send form encoded data', async t => {
    t.plan(3)
    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function form(service) {
      async function handler(request) {
        return request.body
      }
      service.addRawCustomPlugin('POST', '/', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      payload: 'foo=foo&bar=bar',
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      foo: 'foo',
      bar: 'bar',
    })
  })

  t.test('can return a stream', async t => {
    t.plan(4)
    const filename = './tests/index.test.js'
    const readFile = promisify(fs.readFile)
    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function stream(service) {
      async function handler() {
        return fs.createReadStream(filename)
      }
      service.addRawCustomPlugin('GET', '/', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/octet-stream')
    t.strictSame(response.headers['transfer-encoding'], 'chunked')
    t.strictSame(response.payload, (await readFile(filename)).toString())
  })

  t.test('custom body parsing', async t => {
    t.plan(2)
    const customType = 'application/hakunamatata'
    const payload = 'hello world'
    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function customBodyParsing(service) {
      function customParser(req, done) {
        let data = ''
        req.on('data', chunk => {
          data += chunk
        })
        req.on('end', () => {
          done(null, data)
        })
      }
      service.addContentTypeParser(customType, customParser)
      async function handler(req) {
        return req.body
      }
      service.addRawCustomPlugin('POST', '/', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      headers: {
        'content-type': customType,
      },
      payload,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.payload, payload)
  })

  t.test('directly call a service from request instance', async t => {
    t.plan(3)
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
    }
    const scope = nock(`http://${otherServiceName}`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addRawCustomPlugin('POST', '/', async function handler(req) {
        const { some } = req.body
        const service = req.getDirectServiceProxy(otherServiceName)
        const res = await service.get('/res')
        const { id } = res.payload
        return { id, some }
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { some: 'stuff' },
      headers,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
  })

  t.test('directly call a service from service instance', async t => {
    t.plan(2)
    const otherServiceName = 'other-service'
    const scope = nock(`http://${otherServiceName}`)
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      const otherService = service.getDirectServiceProxy(otherServiceName)
      const res = await otherService.get('/res')
      t.strictSame(res.statusCode, 200)
      t.strictSame(res.payload, {
        id: 'a',
        b: 2,
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)

    await fastify.ready()
    scope.done()
  })

  t.test('directly call a service specifying port', async t => {
    t.plan(3)
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
    }
    const scope = nock(`http://${otherServiceName}:3000`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addRawCustomPlugin('POST', '/', async function handler(req) {
        const { some } = req.body
        const service = req.getDirectServiceProxy(otherServiceName, { port: 3000 })
        const res = await service.get('/res')
        const { id } = res.payload
        return { id, some }
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { some: 'stuff' },
      headers,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
  })

  t.test('directly call a service with custom header', async t => {
    t.plan(3)
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      additionalheader1: 'header1Value',
    }
    const scope = nock(`http://${otherServiceName}:3000`, {
      reqheaders: headers,
      badheaders: ['additionalheader2'],
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addRawCustomPlugin('POST', '/', async function handler(req) {
        const { some } = req.body
        const service = req.getDirectServiceProxy(otherServiceName, { port: 3000 })
        const res = await service.get('/res')
        const { id } = res.payload
        return { id, some }
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, { ...baseEnv, ADDITIONAL_HEADERS_TO_PROXY })
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { some: 'stuff' },
      headers,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
  })

  t.test('directly call a service with custom header into a pre decorator', async t => {
    t.plan(3)
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      additionalheader1: 'header1Value',
    }
    const scope = nock(`http://${otherServiceName}:3000`, {
      reqheaders: headers,
      badheaders: ['additionalheader2'],
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addPreDecorator('/', async function handler(req) {
        const { some } = req.getOriginalRequestBody()
        const service = req.getDirectServiceProxy(otherServiceName, { port: 3000 })
        const res = await service.get('/res')
        const { id } = res.payload
        return req.changeOriginalRequest().setBody({ id, some })
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, { ...baseEnv, ADDITIONAL_HEADERS_TO_PROXY })
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        method: 'POST',
        path: '/',
        headers,
        query: {},
        body: {
          some: 'stuff',
        },
      },
      headers: {},
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      body: {
        id: 'a',
        some: 'stuff',
      },
    })
    scope.done()
  })

  t.test('directly call a service with custom header into a post decorator', async t => {
    t.plan(3)
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      additionalheader1: 'header1Value',
    }
    const scope = nock(`http://${otherServiceName}:3000`, {
      reqheaders: headers,
      badheaders: ['additionalheader2'],
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addPostDecorator('/', async function handler(req) {
        const { some } = req.getOriginalResponseBody()
        const service = req.getDirectServiceProxy(otherServiceName, { port: 3000 })
        const res = await service.get('/res')
        const { id } = res.payload
        return req.changeOriginalResponse().setBody({ id, some })
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, { ...baseEnv, ADDITIONAL_HEADERS_TO_PROXY })
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        request: {
          method: 'POST',
          path: '/',
          headers,
          query: {},
          body: {},
        },
        response: {
          statusCode: 200,
          headers: {},
          body: {
            some: 'stuff',
          },
        },
      },
      headers: {},
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      body: {
        id: 'a',
        some: 'stuff',
      },
    })
    scope.done()
  })

  t.test('call a service (through the microservice_gateway) from request instance', async t => {
    t.plan(3)
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
    }
    const scope = nock(`http://${MICROSERVICE_GATEWAY_SERVICE_NAME}`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addRawCustomPlugin('POST', '/', async function handler(req) {
        const { some } = req.body
        const service = req.getServiceProxy()
        const res = await service.get('/res')
        const { id } = res.payload
        return { id, some }
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { some: 'stuff' },
      headers,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
  })

  t.test('call a service (through the microservice_gateway) from service instance', async t => {
    t.plan(2)
    const otherServiceName = 'other-service'
    const scope = nock(`http://${MICROSERVICE_GATEWAY_SERVICE_NAME}`)
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      const otherService = service.getServiceProxy(otherServiceName)
      const res = await otherService.get('/res')
      t.strictSame(res.statusCode, 200)
      t.strictSame(res.payload, {
        id: 'a',
        b: 2,
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)

    await fastify.ready()
    scope.done()
  })

  t.test('call a service (through the microservice_gateway) custom options', async t => {
    t.plan(3)
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
    }
    const scope = nock(`https://${MICROSERVICE_GATEWAY_SERVICE_NAME}:3000`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addRawCustomPlugin('POST', '/', async function handler(req) {
        const { some } = req.body
        const service = req.getServiceProxy({ port: 3000, protocol: 'https' })
        const res = await service.get('/res')
        const { id } = res.payload
        return { id, some }
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { some: 'stuff' },
      headers,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
  })

  t.test('call a service (through the microservice_gateway) with custom header', async t => {
    t.plan(3)
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      additionalheader1: 'header1value',
      additionalheader2: 'header2value',
    }
    const scope = nock(`https://${MICROSERVICE_GATEWAY_SERVICE_NAME}:3000`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addRawCustomPlugin('POST', '/', async function handler(req) {
        const { some } = req.body
        const service = req.getServiceProxy({ port: 3000, protocol: 'https' })
        const res = await service.get('/res')
        const { id } = res.payload
        return { id, some }
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, { ...baseEnv, ADDITIONAL_HEADERS_TO_PROXY })
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: { some: 'stuff' },
      headers,
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
  })

  t.test('call a service (through the microservice_gateway) with custom header into a pre decorator', async t => {
    t.plan(3)
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      additionalheader1: 'header1value',
      additionalheader2: 'header2value',
    }
    const scope = nock(`https://${MICROSERVICE_GATEWAY_SERVICE_NAME}:3000`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addPreDecorator('/', async function handler(req) {
        const { some } = req.getOriginalRequestBody()
        const service = req.getServiceProxy({ port: 3000, protocol: 'https' })
        const res = await service.get('/res')
        const { id } = res.payload
        return req.changeOriginalRequest().setBody({ id, some })
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, { ...baseEnv, ADDITIONAL_HEADERS_TO_PROXY })
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        method: 'POST',
        path: '/',
        headers,
        query: {},
        body: {
          some: 'stuff',
        },
      },
      headers: {},
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      body: {
        id: 'a',
        some: 'stuff',
      },
    })
    scope.done()
  })

  t.test('call a service (through the microservice_gateway) with custom header into a post decorator', async t => {
    t.plan(3)
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      additionalheader1: 'header1value',
      additionalheader2: 'header2value',
    }
    const scope = nock(`https://${MICROSERVICE_GATEWAY_SERVICE_NAME}:3000`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', b: 2 })

    const customService = initCustomServiceEnvironment()
    const myCustomService = customService(async function index(service) {
      service.addPostDecorator('/', async function handler(req) {
        const { some } = req.getOriginalResponseBody()
        const service = req.getServiceProxy({ port: 3000, protocol: 'https' })
        const res = await service.get('/res')
        const { id } = res.payload
        return req.changeOriginalResponse().setBody({ id, some })
      })
    })
    const fastify = setupFastify(t)
    fastify.register(myCustomService, { ...baseEnv, ADDITIONAL_HEADERS_TO_PROXY })
    const response = await fastify.inject({
      method: 'POST',
      url: '/',
      payload: {
        request: {
          method: 'POST',
          path: '/',
          headers,
          query: {},
          body: {},
        },
        response: {
          statusCode: 200,
          body: {
            some: 'stuff',
          },
          headers: {},
        },
      },
      headers: {},
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    t.strictSame(JSON.parse(response.payload), {
      body: {
        id: 'a',
        some: 'stuff',
      },
    })
    scope.done()
  })

  t.test('access userId is null if falsy', async t => {
    t.plan(2)
    const customService = initCustomServiceEnvironment()
    const baseFunctionalitiesPlugin = customService(async function clientGroups(service) {
      async function handler(request) {
        return {
          userId: request.getUserId(),
          clientType: request.getClientType(),
        }
      }
      service
        .addRawCustomPlugin('GET', '/', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(baseFunctionalitiesPlugin, baseEnv)
    const response = await fastify.inject({
      method: 'GET',
      url: '/',
      headers: { },
    })
    t.strictSame(response.statusCode, 200)
    t.strictSame(response.payload, JSON.stringify({ userId: null, clientType: null }))
  })

  t.end()
})
