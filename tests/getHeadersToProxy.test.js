/*
 * Copyright 2022 Mia srl
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

const USERID_HEADER_KEY = 'userid-header-key'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
const USER_PROPERTIES_HEADER_KEY = 'userproperties-header-key'
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
  USER_PROPERTIES_HEADER_KEY,
  MICROSERVICE_GATEWAY_SERVICE_NAME,
}

async function setupFastify(filePath, envVariables) {
  const fastify = await lc39(filePath, {
    logLevel: 'silent',
    envVariables,
  })

  return fastify
}

const headers = {
  [CLIENTTYPE_HEADER_KEY]: 'CMS',
  [USERID_HEADER_KEY]: 'userid',
  [GROUPS_HEADER_KEY]: 'group-to-greet,group',
  [BACKOFFICE_HEADER_KEY]: '',
  [USER_PROPERTIES_HEADER_KEY]: '{"foo":"bar"}',
  [X_REQUEST_ID_HEADER_KEY]: 'request-id',
  [X_FORWARDED_FOR_HEADER_KEY]: '8.8.8.8, 10.0.0.1, 172.16.0.1, 192.168.0.1',
  [X_FORWARDED_PROTO_HEADER_KEY]: 'https',
  [X_FORWARDED_HOST_HEADER_KEY]: 'www.hostname.tld',
  donotproxy: 'foo',
  additionalheader1: 'bar',
}

tap.test('getHeadersToProxy basic', async assert => {
  const fastify = await setupFastify('./tests/services/get-headers-to-proxy.js', baseEnv)
  const response = await fastify.inject({
    method: 'POST',
    url: '/default',
    headers,
  })

  assert.equal(response.statusCode, 200)
  assert.strictSame(JSON.parse(response.payload), {
    [CLIENTTYPE_HEADER_KEY]: 'CMS',
    [USERID_HEADER_KEY]: 'userid',
    [GROUPS_HEADER_KEY]: 'group-to-greet,group',
    [USER_PROPERTIES_HEADER_KEY]: '{"foo":"bar"}',
    [X_REQUEST_ID_HEADER_KEY]: 'request-id',
    [X_FORWARDED_FOR_HEADER_KEY]: '8.8.8.8, 10.0.0.1, 172.16.0.1, 192.168.0.1',
    [X_FORWARDED_PROTO_HEADER_KEY]: 'https',
    [X_FORWARDED_HOST_HEADER_KEY]: 'www.hostname.tld',
  })
})

tap.test('getHeadersToProxy with isMiaHeaderInjected to false', async assert => {
  const fastify = await setupFastify('./tests/services/get-headers-to-proxy.js', baseEnv)
  const response = await fastify.inject({
    method: 'POST',
    payload: {
      options: {
        isMiaHeaderInjected: false,
      },
    },
    url: '/default',
    headers,
  })

  assert.equal(response.statusCode, 200)
  assert.strictSame(JSON.parse(response.payload), {})
})

tap.test('getHeadersToProxy - with isMiaHeaderInjected to false and additional headers to proxy', async assert => {
  const fastify = await setupFastify('./tests/services/get-headers-to-proxy.js', {
    ...baseEnv,
    ADDITIONAL_HEADERS_TO_PROXY,
  })
  const response = await fastify.inject({
    method: 'POST',
    payload: {
      options: {
        isMiaHeaderInjected: false,
      },
    },
    url: '/default',
    headers,
  })

  assert.equal(response.statusCode, 200)
  assert.strictSame(JSON.parse(response.payload), {
    additionalheader1: 'bar',
  })
})

tap.test('getHeadersToProxy - additional headers to proxy', async assert => {
  const fastify = await setupFastify('./tests/services/get-headers-to-proxy.js', {
    ...baseEnv,
    ADDITIONAL_HEADERS_TO_PROXY,
  })
  const response = await fastify.inject({
    method: 'POST',
    url: '/default',
    headers,
  })

  assert.equal(response.statusCode, 200)
  assert.strictSame(JSON.parse(response.payload), {
    [CLIENTTYPE_HEADER_KEY]: 'CMS',
    [USERID_HEADER_KEY]: 'userid',
    [GROUPS_HEADER_KEY]: 'group-to-greet,group',
    [USER_PROPERTIES_HEADER_KEY]: '{"foo":"bar"}',
    [X_REQUEST_ID_HEADER_KEY]: 'request-id',
    [X_FORWARDED_FOR_HEADER_KEY]: '8.8.8.8, 10.0.0.1, 172.16.0.1, 192.168.0.1',
    [X_FORWARDED_PROTO_HEADER_KEY]: 'https',
    [X_FORWARDED_HOST_HEADER_KEY]: 'www.hostname.tld',
    additionalheader1: 'bar',
  })
})

tap.test('getHeadersToProxy - no request headers', async assert => {
  const fastify = await setupFastify('./tests/services/get-headers-to-proxy.js', {
    ...baseEnv,
    ADDITIONAL_HEADERS_TO_PROXY,
  })
  const response = await fastify.inject({
    method: 'POST',
    url: '/default',
  })

  assert.equal(response.statusCode, 200)
  assert.strictSame(JSON.parse(response.payload), {})
})
