/*
 * Copyright 2019 Mia srl
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
const nock = require('nock')
const lc39 = require('@mia-platform/lc39')

const USERID_HEADER_KEY = 'userid-header-key'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'
const ADDITIONAL_HEADERS_TO_PROXY = 'additionalheader1,additionalheader2'

const X_REQUEST_ID_HEADER_KEY = 'x-request-id'
const X_FORWARDED_FOR_HEADER_KEY = 'x-forwarded-for'
const X_FORWARDED_PROTO_HEADER_KEY = 'x-forwarded-proto'
const X_FORWARDED_HOST_HEADER_KEY = 'x-forwarded-host'

const baseEnv = {
  USERID_HEADER_KEY,
  GROUPS_HEADER_KEY,
  CLIENTTYPE_HEADER_KEY,
  BACKOFFICE_HEADER_KEY,
  MICROSERVICE_GATEWAY_SERVICE_NAME,
}

async function setupFastify(filePath, envVariables) {
  const fastify = await lc39(filePath, {
    logLevel: 'silent',
    envVariables,
  })

  return fastify
}

tap.test('', test => {
  nock.disableNetConnect()
  test.tearDown(() => {
    nock.enableNetConnect()
  })

  test.test('directly call a service from request instance', async assert => {
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'userid',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      [X_REQUEST_ID_HEADER_KEY]: 'request-id',
      [X_FORWARDED_FOR_HEADER_KEY]: '8.8.8.8, 10.0.0.1, 172.16.0.1, 192.168.0.1',
      [X_FORWARDED_PROTO_HEADER_KEY]: 'https',
      [X_FORWARDED_HOST_HEADER_KEY]: 'www.hostname.tld',
    }
    const scope = nock(`http://${otherServiceName}`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', key: 2 })

    const fastify = await setupFastify('./tests/services/service-proxy.js', baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/default',
      payload: { some: 'stuff' },
      headers,
    })
    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
    assert.end()
  })

  test.test('directly call a service from service instance', async assert => {
    const otherServiceName = 'other-service'
    const scope = nock(`https://${otherServiceName}:3000`)
      .get('/res')
      .reply(200, { id: 'a', key: 2 })

    const fastify = await setupFastify('./tests/services/service-proxy-from-index.js', baseEnv)
    await fastify.ready()
    scope.done()
    assert.end()
  })

  test.test('directly call a service from request instance specifying port', async assert => {
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'userid',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
    }
    const scope = nock(`http://${otherServiceName}:3000`, {
      reqheaders: headers,
    })
      .get('/res')
      .reply(200, { id: 'a', key: 2 })

    const fastify = await setupFastify('./tests/services/service-proxy.js', baseEnv)
    const response = await fastify.inject({
      method: 'POST',
      url: '/custom',
      payload: { some: 'stuff' },
      headers,
    })
    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
    assert.end()
  })

  test.test('directly call a service with custom header', async assert => {
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'userid',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      [X_REQUEST_ID_HEADER_KEY]: 'request-id',
      [X_FORWARDED_FOR_HEADER_KEY]: '8.8.8.8, 10.0.0.1, 172.16.0.1, 192.168.0.1',
      [X_FORWARDED_PROTO_HEADER_KEY]: 'https',
      [X_FORWARDED_HOST_HEADER_KEY]: 'www.hostname.tld',
      additionalheader1: 'header1Value',
    }
    const scope = nock(`http://${otherServiceName}:3000`, {
      reqheaders: headers,
      badheaders: ['additionalheader2'],
    })
      .get('/res')
      .reply(200, { id: 'a', key: 2 })

    const fastify = await setupFastify('./tests/services/service-proxy.js', {
      ...baseEnv,
      ADDITIONAL_HEADERS_TO_PROXY,
    })
    const response = await fastify.inject({
      method: 'POST',
      url: '/custom',
      payload: { some: 'stuff' },
      headers,
    })
    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(response.payload), {
      id: 'a',
      some: 'stuff',
    })
    scope.done()
    assert.end()
  })

  test.test('directly call a service with custom header into a pre decorator', async assert => {
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'userid',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      [X_REQUEST_ID_HEADER_KEY]: 'request-id',
      [X_FORWARDED_FOR_HEADER_KEY]: '8.8.8.8, 10.0.0.1, 172.16.0.1, 192.168.0.1',
      [X_FORWARDED_PROTO_HEADER_KEY]: 'https',
      [X_FORWARDED_HOST_HEADER_KEY]: 'www.hostname.tld',
      additionalheader1: 'header1Value',
    }
    const scope = nock(`https://${otherServiceName}:3000`, {
      reqheaders: headers,
      badheaders: ['additionalheader2'],
    })
      .get('/res')
      .reply(200, { id: 'a', key: 2 })

    const fastify = await setupFastify('./tests/services/service-proxy.js', {
      ...baseEnv,
      ADDITIONAL_HEADERS_TO_PROXY,
    })
    const response = await fastify.inject({
      method: 'POST',
      url: '/pre',
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
    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(response.payload), {
      body: {
        id: 'a',
        some: 'stuff',
      },
    })
    scope.done()
    assert.end()
  })

  test.test('directly call a service with custom header into a post decorator', async assert => {
    const otherServiceName = 'other-service'
    const headers = {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'userid',
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '',
      [X_REQUEST_ID_HEADER_KEY]: 'request-id',
      [X_FORWARDED_FOR_HEADER_KEY]: '8.8.8.8, 10.0.0.1, 172.16.0.1, 192.168.0.1',
      [X_FORWARDED_PROTO_HEADER_KEY]: 'https',
      [X_FORWARDED_HOST_HEADER_KEY]: 'www.hostname.tld',
      additionalheader1: 'header1Value',
    }
    const scope = nock(`https://${otherServiceName}:3000`, {
      reqheaders: headers,
      badheaders: ['additionalheader2'],
    })
      .get('/res')
      .reply(200, { id: 'a', key: 2 })

    const fastify = await setupFastify('./tests/services/service-proxy.js', {
      ...baseEnv,
      ADDITIONAL_HEADERS_TO_PROXY,
    })
    const response = await fastify.inject({
      method: 'POST',
      url: '/post',
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
    assert.strictSame(response.statusCode, 200)
    assert.strictSame(response.headers['content-type'], 'application/json; charset=utf-8')
    assert.strictSame(JSON.parse(response.payload), {
      body: {
        id: 'a',
        some: 'stuff',
      },
    })
    scope.done()
    assert.end()
  })

  test.end()
})
