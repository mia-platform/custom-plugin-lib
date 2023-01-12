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

const fastifyRoutes = require('@fastify/routes')

const baseProperties = {
  BASE_REQUIRED_FIELD: { type: 'string' },
  CONDITION_FIELD: { type: 'boolean' },
}

const thenProperties = {
  CONDITION_TRUE_REQUIRED_FIELD: { type: 'string' },
}

const elseProperties = {
  CONDITION_FALSE_REQUIRED_FIELD: { type: 'string' },
}

const thenRequired = [
  'CONDITION_TRUE_REQUIRED_FIELD',
]

const baseRequired = [
  'BASE_REQUIRED_FIELD',
]

const elseRequired = [
  'CONDITION_FALSE_REQUIRED_FIELD',
]

const envJsonSchema = {
  type: 'object',
  properties: baseProperties,
  required: baseRequired,
  if: {
    properties: {
      CONDITION_FIELD: { const: true },
    },
  },
  then: {
    properties: thenProperties,
    required: thenRequired,
  },
  else: {
    properties: elseProperties,
    required: elseRequired,
  },
}

const customService = require('../../index')(envJsonSchema)

module.exports = customService(async function clientGroups(service) {
  service.register(fastifyRoutes)
  service.addRawCustomPlugin('GET', '/', (request, reply) => {
    reply.send('Hello world!')
  })
})

module.exports.healthinessHandler = async function healthinessHandler(fastify) {
  fastify.assert.ok(fastify.getServiceProxy)
  fastify.assert.ok(fastify.getHttpClient)
  fastify.assert.ok(fastify.routes)
  return {
    statusOk: true,
  }
}
