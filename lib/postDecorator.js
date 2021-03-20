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

const LEAVE_UNCHANGED_RESPONSE_STATUS_CODE = 204

const {
  ABORT_CHAIN_STATUS_CODE,
  getUserIdFromBody,
  getUserPropertiesFromBody,
  getGroupsFromBody,
  getClientTypeFromBody,
  isFromBackOfficeFromBody,
} = require('./decoratorsCommonFunctions')

const POST_DECORATOR_SCHEMA = {
  body: {
    type: 'object',
    required: ['request', 'response'],
    properties: {
      request: {
        type: 'object',
        required: ['method', 'path', 'headers', 'query'],
        properties: {
          method: { type: 'string' },
          path: { type: 'string' },
          headers: { type: 'object' },
          query: { type: 'object' },
          body: { },
        },
      },
      response: {
        type: 'object',
        required: ['headers', 'statusCode'],
        properties: {
          headers: { type: 'object' },
          statusCode: { type: 'number' },
          body: { },
        },
      },
    },
  },
}
function getRequest() {
  return this.body.request
}
function getMethod() {
  return this.body.request.method
}
function getPath() {
  return this.body.request.path
}
function getHeaders() {
  return this.body.request.headers
}
function getQuery() {
  return this.body.request.query
}
function getBody() {
  return this.body.request.body
}
function getResponse() {
  return this.body.response
}
function getResponseBody() {
  return this.body.response.body
}
function getResponseHeaders() {
  return this.body.response.headers
}
function getResponseStatusCode() {
  return this.body.response.statusCode
}

async function postDecoratorHandler(request, reply) {
  const ret = await reply.context.config.handler(request, reply)
  if (ret === undefined) {
    reply.code(LEAVE_UNCHANGED_RESPONSE_STATUS_CODE).send()
    return
  }
  if (ret.type === 'CHANGE_RESPONSE') {
    return ret.getResponseBody()
  }
  if (ret.type === 'ABORT_CHAIN') {
    reply.code(ABORT_CHAIN_STATUS_CODE)
    return ret.getResponseBody()
  }
  reply.internalServerError('Unknown return type')
}

function change() {
  const data = {
    body: undefined,
    statusCode: undefined,
    headers: undefined,
    setBody(body) {
      data.body = body
      return data
    },
    setStatusCode(statusCode) {
      data.statusCode = statusCode
      return data
    },
    setHeaders(headers) {
      data.headers = headers
      return data
    },
    type: 'CHANGE_RESPONSE',
    getResponseBody() {
      const ret = {}
      if (this.body) {
        ret.body = this.body
      }
      if (this.statusCode) {
        ret.statusCode = this.statusCode
      }
      if (this.headers) {
        ret.headers = this.headers
      }
      return ret
    },
  }
  return data
}

function leaveOriginalRequestUnmodified() {
  return undefined
}

function abortChain(statusCode, body, headers = {}) {
  return {
    type: 'ABORT_CHAIN',
    getResponseBody() {
      return {
        statusCode,
        body,
        headers,
      }
    },
  }
}

function addPostDecorator(path, handler) {
  this.register(function postDecoratorPlugin(fastify, opts, next) {
    fastify.decorateRequest('getOriginalRequest', getRequest)
    fastify.decorateRequest('getOriginalRequestMethod', getMethod)
    fastify.decorateRequest('getOriginalRequestPath', getPath)
    fastify.decorateRequest('getOriginalRequestHeaders', getHeaders)
    fastify.decorateRequest('getOriginalRequestQuery', getQuery)
    fastify.decorateRequest('getOriginalRequestBody', getBody)

    fastify.decorateRequest('getOriginalResponse', getResponse)
    fastify.decorateRequest('getOriginalResponseBody', getResponseBody)
    fastify.decorateRequest('getOriginalResponseHeaders', getResponseHeaders)
    fastify.decorateRequest('getOriginalResponseStatusCode', getResponseStatusCode)

    fastify.decorateRequest('getUserId', getUserIdFromBody)
    fastify.decorateRequest('getUserProperties', getUserPropertiesFromBody)
    fastify.decorateRequest('getGroups', getGroupsFromBody)
    fastify.decorateRequest('getClientType', getClientTypeFromBody)
    fastify.decorateRequest('isFromBackOffice', isFromBackOfficeFromBody)

    fastify.decorateRequest('changeOriginalResponse', change)
    fastify.decorateRequest('leaveOriginalResponseUnmodified', leaveOriginalRequestUnmodified)
    fastify.decorateRequest('abortChain', abortChain)

    fastify.post(path, {
      schema: POST_DECORATOR_SCHEMA,
      config: { handler: handler.bind(fastify) },
    }, postDecoratorHandler)

    next()
  })
  // chainable
  return this
}

addPostDecorator[Symbol.for('plugin-meta')] = {
  decorators: {
    request: ['USERID_HEADER_KEY', 'USER_PROPERTIES_HEADER_KEY', 'GROUPS_HEADER_KEY', 'CLIENTTYPE_HEADER_KEY', 'BACKOFFICE_HEADER_KEY'],
  },
}

module.exports = addPostDecorator
