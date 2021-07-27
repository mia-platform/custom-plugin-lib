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
const fs = require('fs')
const fastifyRoutes = require('fastify-routes')

const schema = {
  body: {
    type: 'object',
    required: ['some'],
    properties: {
      some: { type: 'string' },
      foobar: {
        type: 'string',
        enum: ['foo1', 'bar2', 'taz3'],
      },
      nested: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
          },
        },
        additionalProperties: false,
        required: ['field'],
      },
    },
    additionalProperties: false,
  },
  querystring: {
    type: 'object',
    properties: {
      some: { type: 'number' },
    },
  },
}

function customParser(req, payload, done) {
  let data = ''
  payload.on('data', chunk => {
    data += chunk
  })

  payload.on('end', () => {
    done(null, data)
  })
}

module.exports = customService(async function clientGroups(service) {
  service.register(fastifyRoutes)
  function handler(request, reply) {
    reply.send('Hello world!')
  }

  function handlePlatformValues(request, reply) {
    reply.send({
      userId: request.getUserId(),
      userGroups: request.getGroups(),
      userProperties: request.getUserProperties(),
      clientType: request.getClientType(),
      backoffice: request.isFromBackOffice(),
    })
  }

  function handlerRespondWithBody(request, reply) {
    reply.send(request.body)
  }

  function handlerStream(request, reply) {
    reply.send(fs.createReadStream('./tests/services/plain-custom-service.js'))
  }

  service.addRawCustomPlugin('GET', '/', handler)
  service.addRawCustomPlugin('GET', '/platform-values', handlePlatformValues)
  service.addRawCustomPlugin('POST', '/', handlerRespondWithBody)
  service.addRawCustomPlugin('GET', '/stream', handlerStream)
  service.addRawCustomPlugin('POST', '/validation', handlerRespondWithBody, schema)
  service.addContentTypeParser('application/custom-type', customParser)
  service.addRawCustomPlugin('POST', '/customValidation', handlerRespondWithBody)
})

module.exports.healthinessHandler = async function healthinessHandler(fastify) {
  fastify.assert.ok(fastify.getServiceProxy)
  fastify.assert.ok(fastify.routes)
  return {
    statusOk: true,
  }
}
