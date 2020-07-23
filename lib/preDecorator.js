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

const LEAVE_UNCHANGED_REQUEST_STATUS_CODE = 204
const ABORT_CHAIN_STATUS_CODE = 418

const { getUserId, getGroups, getClientType, isFromBackOffice, getUserProperties } = require('./util')

function getUserIdFromBody() {
  return getUserId(this.getOriginalRequestHeaders()[this.USERID_HEADER_KEY])
}

function getUserPropertiesFromBody() {
  return getUserProperties(this.getOriginalRequestHeaders()[this.USER_PROPERTIES_HEADER_KEY])
}

function getGroupsFromBody() {
  return getGroups(this.getOriginalRequestHeaders()[this.GROUPS_HEADER_KEY] || '')
}

function getClientTypeFromBody() {
  return getClientType(this.getOriginalRequestHeaders()[this.CLIENTTYPE_HEADER_KEY])
}

function isFromBackOfficeFromBody() {
  return isFromBackOffice(this.getOriginalRequestHeaders()[this.BACKOFFICE_HEADER_KEY])
}

const PRE_DECORATOR_SCHEMA = {
  body: {
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
}
function getRequest() {
  return this.body
}
function getMethod() {
  return this.body.method
}
function getPath() {
  return this.body.path
}
function getHeaders() {
  return this.body.headers
}
function getQuery() {
  return this.body.query
}
function getBody() {
  return this.body.body
}

async function preDecoratorHandler(request, reply) {
  const ret = await reply.context.config.handler(request, reply)
  if (ret === undefined) {
    reply.code(LEAVE_UNCHANGED_REQUEST_STATUS_CODE).send()
    return
  }
  if (ret.type === 'CHANGE_REQUEST') {
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
    query: undefined,
    headers: undefined,
    setBody(body) {
      data.body = body
      return data
    },
    setQuery(query) {
      data.query = query
      return data
    },
    setHeaders(headers) {
      data.headers = headers
      return data
    },
    type: 'CHANGE_REQUEST',
    getResponseBody() {
      const ret = {}
      if (this.body) {
        ret.body = this.body
      }
      if (this.query) {
        ret.query = this.query
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

function addPreDecorator(path, handler) {
  this.register(function preDecoratorPlugin(fastify, opts, next) {
    fastify.decorateRequest('getOriginalRequest', getRequest)
    fastify.decorateRequest('getOriginalRequestMethod', getMethod)
    fastify.decorateRequest('getOriginalRequestPath', getPath)
    fastify.decorateRequest('getOriginalRequestHeaders', getHeaders)
    fastify.decorateRequest('getOriginalRequestQuery', getQuery)
    fastify.decorateRequest('getOriginalRequestBody', getBody)

    fastify.decorateRequest('getUserId', getUserIdFromBody)
    fastify.decorateRequest('getUserProperties', getUserPropertiesFromBody)
    fastify.decorateRequest('getGroups', getGroupsFromBody)
    fastify.decorateRequest('getClientType', getClientTypeFromBody)
    fastify.decorateRequest('isFromBackOffice', isFromBackOfficeFromBody)

    fastify.decorateRequest('changeOriginalRequest', change)
    fastify.decorateRequest('leaveOriginalRequestUnmodified', leaveOriginalRequestUnmodified)
    fastify.decorateRequest('abortChain', abortChain)

    fastify.post(path, {
      schema: PRE_DECORATOR_SCHEMA,
      config: { handler: handler.bind(fastify) },
    }, preDecoratorHandler)

    next()
  })
  // chainable
  return this
}

addPreDecorator[Symbol.for('plugin-meta')] = {
  decorators: {
    request: ['USERID_HEADER_KEY', 'USER_PROPERTIES_HEADER_KEY', 'GROUPS_HEADER_KEY', 'CLIENTTYPE_HEADER_KEY', 'BACKOFFICE_HEADER_KEY'],
  },
}

module.exports = addPreDecorator
