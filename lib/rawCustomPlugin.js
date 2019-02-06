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

const { getUserId, getGroups, getClientType, isFromBackOffice } = require('./util')

function getUserIdFromHeader() {
  return getUserId(this.headers[this.USERID_HEADER_KEY])
}

function getGroupsFromHeaders() {
  return getGroups(this.headers[this.GROUPS_HEADER_KEY] || '')
}

function getClientTypeFromHeaders() {
  return getClientType(this.headers[this.CLIENTTYPE_HEADER_KEY])
}

function isFromBackOfficeFromHeaders() {
  return isFromBackOffice(this.headers[this.BACKOFFICE_HEADER_KEY])
}

function addRawCustomPlugin(method, path, handler, schema) {
  this.register(function rawCustomPlugin(fastify, options, next) {
    fastify.decorateRequest('getUserId', getUserIdFromHeader)
    fastify.decorateRequest('getGroups', getGroupsFromHeaders)
    fastify.decorateRequest('getClientType', getClientTypeFromHeaders)
    fastify.decorateRequest('isFromBackOffice', isFromBackOfficeFromHeaders)

    fastify.route({ method, path, handler, schema })
    next()
  })
  return this
}

addRawCustomPlugin[Symbol.for('plugin-meta')] = {
  decorators: {
    request: ['USERID_HEADER_KEY', 'GROUPS_HEADER_KEY', 'CLIENTTYPE_HEADER_KEY', 'BACKOFFICE_HEADER_KEY', 'ADDITIONAL_HEADERS_TO_PROXY'],
  },
}

module.exports = addRawCustomPlugin
