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

/* eslint require-await: 0 */
/* eslint global-require: 0 */
'use strict'

const fastifyEnv = require('fastify-env')
const fastifySwagger = require('fastify-swagger')
const fastifyFormbody = require('fastify-formbody')
const Ajv = require('ajv')

const serviceBuilder = require('./lib/serviceBuilder')
const addRawCustomPlugin = require('./lib/rawCustomPlugin')
const addPreDecorator = require('./lib/preDecorator')
const addPostDecorator = require('./lib/postDecorator')

const USERID_HEADER_KEY = 'USERID_HEADER_KEY'
const GROUPS_HEADER_KEY = 'GROUPS_HEADER_KEY'
const CLIENTTYPE_HEADER_KEY = 'CLIENTTYPE_HEADER_KEY'
const BACKOFFICE_HEADER_KEY = 'BACKOFFICE_HEADER_KEY'

const MICROSERVICE_GATEWAY_SERVICE_NAME = 'MICROSERVICE_GATEWAY_SERVICE_NAME'

const baseSchema = {
  type: 'object',
  required: [USERID_HEADER_KEY, GROUPS_HEADER_KEY, CLIENTTYPE_HEADER_KEY,
    BACKOFFICE_HEADER_KEY, MICROSERVICE_GATEWAY_SERVICE_NAME],
  properties: {
    [USERID_HEADER_KEY]: { type: 'string', description: 'the header key to get the user id' },
    [GROUPS_HEADER_KEY]: { type: 'string', description: 'the header key to get the groups comma separated list' },
    [CLIENTTYPE_HEADER_KEY]: { type: 'string', description: 'the header key to get the client type' },
    [BACKOFFICE_HEADER_KEY]: {
      type: 'string',
      description: 'the header key to get if the request is from backoffice (any truly string is true!!!)',
    },
    [MICROSERVICE_GATEWAY_SERVICE_NAME]: {
      type: 'string',
      description: 'the service name of the microservice gateway',
    },
  },
}

function concatEnvSchemas(schema, otherSchema) {
  return {
    type: 'object',
    required: schema.required.concat(otherSchema.required),
    properties: {
      ...schema.properties,
      ...otherSchema.properties,
    },
    additionalProperties: false,
  }
}

function getDirectlyServiceBuilder(serviceName, baseOptions = {}) {
  return serviceBuilder(serviceName, this.getMiaHeaders(), baseOptions)
}

function getServiceBuilder(baseOptions = {}) {
  return serviceBuilder(this[MICROSERVICE_GATEWAY_SERVICE_NAME], this.getMiaHeaders(), baseOptions)
}

function getMiaHeaders() {
  return {
    [this.USERID_HEADER_KEY]: this.getUserId(),
    [this.GROUPS_HEADER_KEY]: this.getGroups().join(','),
    [this.CLIENTTYPE_HEADER_KEY]: this.getClientType(),
    [this.BACKOFFICE_HEADER_KEY]: this.isFromBackOffice() ? '1' : '',
  }
}

async function decorateRequestAndFastifyInstance(fastify, { asyncInitFunction }) {
  const { config } = fastify

  const ajv = new Ajv({ coerceTypes: true, useDefaults: true })
  fastify.setSchemaCompiler(schema => ajv.compile(schema))

  fastify.decorateRequest(USERID_HEADER_KEY, config[USERID_HEADER_KEY])
  fastify.decorateRequest(GROUPS_HEADER_KEY, config[GROUPS_HEADER_KEY])
  fastify.decorateRequest(CLIENTTYPE_HEADER_KEY, config[CLIENTTYPE_HEADER_KEY])
  fastify.decorateRequest(BACKOFFICE_HEADER_KEY, config[BACKOFFICE_HEADER_KEY])
  fastify.decorateRequest(MICROSERVICE_GATEWAY_SERVICE_NAME, config[MICROSERVICE_GATEWAY_SERVICE_NAME])

  fastify.decorateRequest('getMiaHeaders', getMiaHeaders)

  fastify.decorateRequest('getDirectServiceProxy', getDirectlyServiceBuilder)
  fastify.decorateRequest('getServiceProxy', getServiceBuilder)

  fastify.decorate('addRawCustomPlugin', addRawCustomPlugin)
  fastify.decorate('addPreDecorator', addPreDecorator)
  fastify.decorate('addPostDecorator', addPostDecorator)

  fastify.register(asyncInitFunction)
}

const defaultSchema = { type: 'object', required: [], properties: {} }

function initCustomServiceEnvironment(envSchema = defaultSchema) {
  return function customService(asyncInitFunction) {
    async function index(fastify, opts) {
      const { name, description, version } = require(`${process.cwd()}/package`)
      fastify
        .register(fastifyEnv, { schema: concatEnvSchemas(baseSchema, envSchema), data: opts })
        .register(fastifyFormbody)
        .register(fastifySwagger, {
          swagger: {
            info: {
              title: name,
              description,
              version,
            },
            consumes: ['application/json', 'application/x-www-form-urlencoded'],
            produces: ['application/json'],
          },
          exposeRoute: true,
        })

      fastify.register(decorateRequestAndFastifyInstance, { asyncInitFunction })
    }
    index.options = {
      trustProxy: process.env.TRUSTED_PROXIES, // eslint-disable-line no-process-env
    }
    return index
  }
}

module.exports = initCustomServiceEnvironment
