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
'use strict'

const t = require('tap')
const fastifyBuilder = require('fastify')
const nock = require('nock')

const initCustomServiceEnvironment = require('../index')

const USERID_HEADER_KEY = 'userid-header-key'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'
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

t.test('preDecorator', t => {
  t.test('leaveOriginalRequestUnmodified', async t => {
    t.plan(1)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.leaveOriginalRequestUnmodified()
      }
      service.addPreDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    t.strictSame(response.statusCode, 204)
  })

  t.test('changeOriginalRequest', async t => {
    t.plan(4)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.changeOriginalRequest()
          .setBody({ the: 'new-body' })
          .setQuery({ new: 'querystring' })
      }
      service.addPreDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, JSON.stringify({
      body: { the: 'new-body' },
      query: { new: 'querystring' },
    }))
  })

  t.test('changeOriginalRequest with headers', async t => {
    t.plan(4)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.changeOriginalRequest()
          .setBody({ the: 'new-body' })
          .setHeaders({ new: 'headers' })
      }
      service.addPreDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, JSON.stringify({
      body: { the: 'new-body' },
      headers: { new: 'headers' },
    }))
  })

  t.test('test bad handler that doesn\'t return the right type', async t => {
    t.plan(3)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler() {
        return {
          not: 'using the decorated functions',
        }
      }
      service.addPreDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    t.strictSame(response.statusCode, 500)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.strictSame(JSON.parse(response.payload), {
      error: 'Internal Server Error',
      message: 'Unknown return type',
      statusCode: 500,
    })
  })

  t.test('abortChain', async t => {
    t.plan(4)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.abortChain(406, { the: 'body' }, {})
      }
      service.addPreDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    t.strictSame(response.statusCode, 418)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, JSON.stringify({
      statusCode: 406,
      body: { the: 'body' },
      headers: {},
    }))
  })

  t.test('is able to access to the mia headers correctly', async t => {
    t.plan(12)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        t.strictSame(request.getUserId(), 'fjdsaklfaksldkksjkfllsdhjk')
        t.strictSame(request.getGroups(), ['group-to-greet', 'group'])
        t.strictSame(request.getClientType(), 'CMS')
        t.strictSame(request.isFromBackOffice(), true)

        t.strictSame(request.getOriginalRequest(), {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: {
            [CLIENTTYPE_HEADER_KEY]: 'CMS',
            [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
            [GROUPS_HEADER_KEY]: 'group-to-greet,group',
            [BACKOFFICE_HEADER_KEY]: '1',
            my: 'headers',
          },
        })
        t.strictSame(request.getOriginalRequestBody(), { the: 'body' })
        t.strictSame(request.getOriginalRequestHeaders(), {
          [CLIENTTYPE_HEADER_KEY]: 'CMS',
          [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
          [GROUPS_HEADER_KEY]: 'group-to-greet,group',
          [BACKOFFICE_HEADER_KEY]: '1',
          my: 'headers',
        })
        t.strictSame(request.getOriginalRequestQuery(), { my: 'query' })
        t.strictSame(request.getOriginalRequestMethod(), 'GET')
        t.strictSame(request.getOriginalRequestPath(), '/the-original-request-path')

        t.ok(this.config)

        return request.leaveOriginalRequestUnmodified()
      }
      service.addPreDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: {
          [CLIENTTYPE_HEADER_KEY]: 'CMS',
          [USERID_HEADER_KEY]: 'fjdsaklfaksldkksjkfllsdhjk',
          [GROUPS_HEADER_KEY]: 'group-to-greet,group',
          [BACKOFFICE_HEADER_KEY]: '1',
          my: 'headers',
        },
      },
    })
    t.strictSame(response.statusCode, 204)
  })

  t.test('addPreDecorator is Chainable', async t => {
    t.plan(2)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.leaveOriginalRequestUnmodified()
      }
      service
        .addPreDecorator('/my-hook', handler)
        .addPreDecorator('/my-hook1', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    t.strictSame(response.statusCode, 204)

    const response1 = await fastify.inject({
      method: 'POST',
      url: '/my-hook1',
      payload: {
        method: 'GET',
        path: '/the-original-request-path',
        query: { my: 'query' },
        body: { the: 'body' },
        headers: { my: 'headers' },
      },
    })
    t.strictSame(response1.statusCode, 204)
  })

  t.end()
})
