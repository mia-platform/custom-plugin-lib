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

t.test('postDecorator', t => {
  t.test('leaveOriginalResponseUnmodified', async t => {
    t.plan(1)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.leaveOriginalResponseUnmodified()
      }
      service.addPostDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: { my: 'headers' },
        },
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
      },
    })
    t.strictSame(response.statusCode, 204)
  })

  t.test('changeOriginalResponse', async t => {
    t.plan(4)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.changeOriginalResponse()
          .setBody({ the: 'new-body' })
          .setStatusCode(201)
      }
      service.addPostDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: { my: 'headers' },
        },
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
      },
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, JSON.stringify({
      body: { the: 'new-body' },
      statusCode: 201,
    }))
  })

  t.test('changeOriginalResponse with headers', async t => {
    t.plan(4)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.changeOriginalResponse()
          .setHeaders({ the: 'new-header' })
      }
      service.addPostDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: { my: 'headers' },
        },
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
      },
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(JSON.parse(response.payload), {
      headers: { the: 'new-header' },
    })
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
      service.addPostDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: { my: 'headers' },
        },
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
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
        return request.abortChain(406, { the: 'final body' })
      }
      service.addPostDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: { my: 'headers' },
        },
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
      },
    })
    t.strictSame(response.statusCode, 418)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(response.payload, JSON.stringify({
      statusCode: 406,
      body: { the: 'final body' },
      headers: {},
    }))
  })

  t.test('is able to access to the mia headers correctly', async t => {
    t.plan(16)

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

        t.strictSame(request.getOriginalResponse(), {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        })
        t.strictSame(request.getOriginalResponseBody(), { the: 'response body' })
        t.strictSame(request.getOriginalResponseHeaders(), { my: 'response headers' })
        t.strictSame(request.getOriginalResponseStatusCode(), 200)

        t.ok(this.config)

        return request.leaveOriginalResponseUnmodified()
      }
      service.addPostDecorator('/my-hook', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
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
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
      },
    })
    t.strictSame(response.statusCode, 204, response.payload)
  })

  t.test('addPostDecorator is chainable', async t => {
    t.plan(2)

    const customService = initCustomServiceEnvironment()
    const helloWorldPlugin = customService(async function hello(service) {
      async function handler(request) {
        return request.leaveOriginalResponseUnmodified()
      }
      service
        .addPostDecorator('/my-hook', handler)
        .addPostDecorator('/my-hook1', handler)
    })
    const fastify = setupFastify(t)
    fastify.register(helloWorldPlugin, baseEnv)

    const response = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: { my: 'headers' },
        },
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
      },
    })
    t.strictSame(response.statusCode, 204)

    const response1 = await fastify.inject({
      method: 'POST',
      url: '/my-hook',
      payload: {
        request: {
          method: 'GET',
          path: '/the-original-request-path',
          query: { my: 'query' },
          body: { the: 'body' },
          headers: { my: 'headers' },
        },
        response: {
          body: { the: 'response body' },
          headers: { my: 'response headers' },
          statusCode: 200,
        },
      },
    })
    t.strictSame(response1.statusCode, 204)
  })


  t.end()
})
