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

const customService = require('../../index')()

const USERID_HEADER_KEY = 'userid-header-key'
const USER_PROPERTIES_HEADER_KEY = 'miauserproperties'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'

module.exports = customService(async function clientGroups(service) {
  function responseUnmodifiedHandler(request) {
    return request.leaveOriginalResponseUnmodified()
  }
  service.addPostDecorator('/response-unmodified', responseUnmodifiedHandler)

  function changeOriginalBodyResponseHandler(request) {
    return request.changeOriginalResponse()
      .setBody({ the: 'new-body' })
      .setStatusCode(201)
  }
  service.addPostDecorator('/change-original-body', changeOriginalBodyResponseHandler)

  function changeOriginalHeadersResponseHandler(request) {
    return request.changeOriginalResponse()
      .setHeaders({ the: 'new-header' })
  }
  service.addPostDecorator('/change-original-headers', changeOriginalHeadersResponseHandler)

  function badHookHandler() {
    return {
      not: 'using the decorated functions',
    }
  }
  service.addPostDecorator('/bad-hook', badHookHandler)

  function abortChainHandler(request) {
    return request.abortChain(406, { the: 'final body' })
  }
  service.addPostDecorator('/abort-chain', abortChainHandler)

  function accessDataHandler(request) {
    this.assert.equal(request.getUserId(), 'userid')
    this.assert.deepEqual(request.getUserProperties(), { prop1: 'value1' })
    this.assert.deepEqual(request.getGroups(), ['group-to-greet', 'group'])
    this.assert.equal(request.getClientType(), 'CMS')
    this.assert.equal(request.isFromBackOffice(), true)

    this.assert.deepEqual(request.getOriginalRequest(), {
      method: 'GET',
      path: '/the-original-request-path',
      query: { my: 'query' },
      body: { the: 'body' },
      headers: {
        [CLIENTTYPE_HEADER_KEY]: 'CMS',
        [USERID_HEADER_KEY]: 'userid',
        [USER_PROPERTIES_HEADER_KEY]: JSON.stringify({ prop1: 'value1' }),
        [GROUPS_HEADER_KEY]: 'group-to-greet,group',
        [BACKOFFICE_HEADER_KEY]: '1',
        my: 'headers',
      },
    })
    this.assert.deepEqual(request.getOriginalRequestBody(), { the: 'body' })
    this.assert.deepEqual(request.getOriginalRequestHeaders(), {
      [CLIENTTYPE_HEADER_KEY]: 'CMS',
      [USERID_HEADER_KEY]: 'userid',
      [USER_PROPERTIES_HEADER_KEY]: JSON.stringify({ prop1: 'value1' }),
      [GROUPS_HEADER_KEY]: 'group-to-greet,group',
      [BACKOFFICE_HEADER_KEY]: '1',
      my: 'headers',
    })
    this.assert.deepEqual(request.getOriginalRequestQuery(), { my: 'query' })
    this.assert.equal(request.getOriginalRequestMethod(), 'GET')
    this.assert.equal(request.getOriginalRequestPath(), '/the-original-request-path')

    this.assert.deepEqual(request.getOriginalResponse(), {
      body: { the: 'response body' },
      headers: { my: 'response headers' },
      statusCode: 200,
    })
    this.assert.deepEqual(request.getOriginalResponseBody(), { the: 'response body' })
    this.assert.deepEqual(request.getOriginalResponseHeaders(), { my: 'response headers' })
    this.assert.equal(request.getOriginalResponseStatusCode(), 200)

    this.assert.ok(this.config)

    return request.leaveOriginalResponseUnmodified()
  }
  service.addPostDecorator('/can-access-data', accessDataHandler)

  service
    .addPostDecorator('/chained1', responseUnmodifiedHandler)
    .addPostDecorator('/chained2', responseUnmodifiedHandler)
})
