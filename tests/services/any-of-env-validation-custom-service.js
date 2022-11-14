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

const properties = {
  ANY_OF_REQUIRED_FIELD_1: { type: 'string' },
  ANY_OF_REQUIRED_FIELD_2: { type: 'string' },
}

const envJsonSchema = {
  type: 'object',
  properties,
  required: [],
  anyOf: [
    {
      required: [
        'ANY_OF_REQUIRED_FIELD_1',
      ],
    },
    {
      required: [
        'ANY_OF_REQUIRED_FIELD_2',
      ],
    },
  ],
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
