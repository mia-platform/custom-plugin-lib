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

const fastifyEnv = require('fastify-env')
const fp = require('fastify-plugin')
const fastifyFormbody = require('fastify-formbody')
const Ajv = require('ajv')
const path = require('path')
const { name, description, version } = require(path.join(process.cwd(), 'package.json'))

const serviceBuilder = require('./lib/serviceBuilder')
const addRawCustomPlugin = require('./lib/rawCustomPlugin')
const addPreDecorator = require('./lib/preDecorator')
const addPostDecorator = require('./lib/postDecorator')

const USERID_HEADER_KEY = 'USERID_HEADER_KEY'
const USER_PROPERTIES_HEADER_KEY = 'USER_PROPERTIES_HEADER_KEY'
const GROUPS_HEADER_KEY = 'GROUPS_HEADER_KEY'
const CLIENTTYPE_HEADER_KEY = 'CLIENTTYPE_HEADER_KEY'
const BACKOFFICE_HEADER_KEY = 'BACKOFFICE_HEADER_KEY'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'MICROSERVICE_GATEWAY_SERVICE_NAME'
const ADDITIONAL_HEADERS_TO_PROXY = 'ADDITIONAL_HEADERS_TO_PROXY'

const extraHeadersKeys = [
  'x-request-id',
  'x-forwarded-for',
  'x-forwarded-proto',
  'x-forwarded-host',
]

const baseSchema = {
  type: 'object',
  required: [USERID_HEADER_KEY, GROUPS_HEADER_KEY, CLIENTTYPE_HEADER_KEY,
    BACKOFFICE_HEADER_KEY, MICROSERVICE_GATEWAY_SERVICE_NAME],
  properties: {
    [USERID_HEADER_KEY]: {
      type: 'string',
      description: 'the header key to get the user id',
      minLength: 1,
    },
    [USER_PROPERTIES_HEADER_KEY]: {
      type: 'string',
      description: 'the header key to get the user permissions',
      minLength: 1,
      default: 'miauserproperties',
    },
    [GROUPS_HEADER_KEY]: {
      type: 'string',
      description: 'the header key to get the groups comma separated list',
      minLength: 1,
    },
    [CLIENTTYPE_HEADER_KEY]: {
      type: 'string',
      description: 'the header key to get the client type',
      minLength: 1,
    },
    [BACKOFFICE_HEADER_KEY]: {
      type: 'string',
      description: 'the header key to get if the request is from backoffice (any truly string is true!!!)',
      minLength: 1,
    },
    [MICROSERVICE_GATEWAY_SERVICE_NAME]: {
      type: 'string',
      description: 'the service name of the microservice gateway',
      pattern: '^(?=.{1,253}.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*.?$',
    },
    [ADDITIONAL_HEADERS_TO_PROXY]: {
      type: 'string',
      default: '',
      description: 'comma separated list of additional headers to proxy',
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

function getCustomHeaders(headersKeyToProxy, headers) {
  return headersKeyToProxy.reduce((acc, headerKey) => {
    if (!{}.hasOwnProperty.call(headers, headerKey)) {
      return acc
    }
    const headerValue = headers[headerKey]
    return {
      ...acc,
      [headerKey]: headerValue,
    }
  }, {})
}

function getBaseOptionsDecorated(headersKeyToProxy, baseOptions, headers) {
  return {
    ...baseOptions,
    headers: {
      ...getCustomHeaders(headersKeyToProxy, headers),
      ...baseOptions.headers,
    },
  }
}

function getDirectlyServiceBuilderFromRequest(serviceNameOrURL, baseOptions = {}) {
  const requestHeaders = this.getOriginalRequestHeaders()
  const extraHeaders = getCustomHeaders(extraHeadersKeys, requestHeaders)
  const options = getBaseOptionsDecorated(this[ADDITIONAL_HEADERS_TO_PROXY], baseOptions, requestHeaders)
  const serviceHeaders = { ...this.getMiaHeaders(), ...extraHeaders }
  try {
    return getDirectServiceProxyFromUrlString(
      serviceNameOrURL,
      serviceHeaders,
      baseOptions
    )
  } catch (error) {
    return serviceBuilder(serviceNameOrURL, serviceHeaders, options)
  }
}

function getDirectlyServiceBuilderFromService(serviceNameOrURL, baseOptions = {}) {
  try {
    return getDirectServiceProxyFromUrlString(serviceNameOrURL, {}, baseOptions)
  } catch (error) {
    return serviceBuilder(serviceNameOrURL, {}, baseOptions)
  }
}

function getServiceBuilderFromRequest(baseOptions = {}) {
  const requestHeaders = this.getOriginalRequestHeaders()
  const extraHeaders = getCustomHeaders(extraHeadersKeys, requestHeaders)
  const options = getBaseOptionsDecorated(this[ADDITIONAL_HEADERS_TO_PROXY], baseOptions, requestHeaders)
  return serviceBuilder(this[MICROSERVICE_GATEWAY_SERVICE_NAME], { ...this.getMiaHeaders(), ...extraHeaders }, options)
}

function getServiceBuilderFromService(baseOptions = {}) {
  return serviceBuilder(this[MICROSERVICE_GATEWAY_SERVICE_NAME], {}, baseOptions)
}

function getDirectServiceProxyFromUrlString(serviceCompleteUrlString, requestMiaHeaders = {}, baseOptions = {}) {
  let completeUrl
  try {
    completeUrl = new URL(serviceCompleteUrlString)
  } catch (error) {
    throw new Error(`getDirectServiceProxy: invalid url ${serviceCompleteUrlString}`)
  }
  return serviceBuilder(
    completeUrl.hostname,
    requestMiaHeaders,
    {
      protocol: completeUrl.protocol,
      port: completeUrl.port,
      ...baseOptions,
    })
}

// TODO: test this
function getMiaHeaders() {
  return {
    [this.USERID_HEADER_KEY]: this.getUserId(),
    [this.USER_PROPERTIES_HEADER_KEY]: JSON.stringify(this.getUserProperties()),
    [this.GROUPS_HEADER_KEY]: this.getGroups().join(','),
    [this.CLIENTTYPE_HEADER_KEY]: this.getClientType(),
    [this.BACKOFFICE_HEADER_KEY]: this.isFromBackOffice() ? '1' : '',
  }
}

function getOriginalRequestHeaders() {
  return this.headers
}

async function decorateRequestAndFastifyInstance(fastify, { asyncInitFunction }) {
  const { config } = fastify

  const ajv = new Ajv({ coerceTypes: true, useDefaults: true })
  fastify.setValidatorCompiler(({ schema }) => ajv.compile(schema))

  fastify.decorateRequest(USERID_HEADER_KEY, config[USERID_HEADER_KEY])
  fastify.decorateRequest(USER_PROPERTIES_HEADER_KEY, config[USER_PROPERTIES_HEADER_KEY])
  fastify.decorateRequest(GROUPS_HEADER_KEY, config[GROUPS_HEADER_KEY])
  fastify.decorateRequest(CLIENTTYPE_HEADER_KEY, config[CLIENTTYPE_HEADER_KEY])
  fastify.decorateRequest(BACKOFFICE_HEADER_KEY, config[BACKOFFICE_HEADER_KEY])
  fastify.decorateRequest(MICROSERVICE_GATEWAY_SERVICE_NAME, config[MICROSERVICE_GATEWAY_SERVICE_NAME])
  fastify.decorateRequest(ADDITIONAL_HEADERS_TO_PROXY, {
    getter() {
      return config[ADDITIONAL_HEADERS_TO_PROXY].split(',').filter(header => header)
    },
  })

  fastify.decorateRequest('getMiaHeaders', getMiaHeaders)
  fastify.decorateRequest('getOriginalRequestHeaders', getOriginalRequestHeaders)

  fastify.decorateRequest('getDirectServiceProxy', getDirectlyServiceBuilderFromRequest)
  fastify.decorateRequest('getServiceProxy', getServiceBuilderFromRequest)

  fastify.decorate(MICROSERVICE_GATEWAY_SERVICE_NAME, config[MICROSERVICE_GATEWAY_SERVICE_NAME])
  fastify.decorate('addRawCustomPlugin', addRawCustomPlugin)
  fastify.decorate('addPreDecorator', addPreDecorator)
  fastify.decorate('addPostDecorator', addPostDecorator)

  fastify.decorate('getDirectServiceProxy', getDirectlyServiceBuilderFromService)
  fastify.decorate('getServiceProxy', getServiceBuilderFromService)

  fastify.register(fp(asyncInitFunction))
  fastify.setErrorHandler(function errorHandler(error, request, reply) {
    if (reply.raw.statusCode === 500 && !error.statusCode) {
      request.log.error(error)
      reply.send(new Error('Something went wrong'))
    } else {
      reply.send(error)
    }
  })
}

const defaultSchema = { type: 'object', required: [], properties: {} }

function initCustomServiceEnvironment(envSchema = defaultSchema) {
  return function customService(asyncInitFunction) {
    async function index(fastify, opts) {
      fastify.register(fastifyEnv, { schema: concatEnvSchemas(baseSchema, envSchema), data: opts })
      fastify.register(fastifyFormbody)
      fastify.register(fp(decorateRequestAndFastifyInstance), { asyncInitFunction })
    }
    index.options = {
      errorHandler: false,
      trustProxy: process.env.TRUSTED_PROXIES,
    }

    index.swaggerDefinition = {
      info: {
        title: name,
        description,
        version,
      },
      consumes: ['application/json', 'application/x-www-form-urlencoded'],
      produces: ['application/json'],
    }
    return index
  }
}

module.exports = initCustomServiceEnvironment
module.exports.getDirectServiceProxy = getDirectlyServiceBuilderFromService
module.exports.getServiceProxy = (microserviceGatewayServiceName, baseOptions = {}) => {
  return serviceBuilder(microserviceGatewayServiceName, {}, baseOptions)
}
