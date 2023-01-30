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

const fastifyEnv = require('@fastify/env')
const fp = require('fastify-plugin')
const fastifyFormbody = require('@fastify/formbody')
const Ajv = require('ajv')
const path = require('path')
const { name, description, version } = require(path.join(process.cwd(), 'package.json'))

const serviceBuilder = require('./lib/serviceBuilder')
const addRawCustomPlugin = require('./lib/rawCustomPlugin')
const addPreDecorator = require('./lib/preDecorator')
const addPostDecorator = require('./lib/postDecorator')
const ajvSetup = require('./lib/ajvSetup')
const HttpClient = require('./lib/httpClient')
const { extraHeadersKeys } = require('./lib/util')

const USERID_HEADER_KEY = 'USERID_HEADER_KEY'
const USER_PROPERTIES_HEADER_KEY = 'USER_PROPERTIES_HEADER_KEY'
const GROUPS_HEADER_KEY = 'GROUPS_HEADER_KEY'
const CLIENTTYPE_HEADER_KEY = 'CLIENTTYPE_HEADER_KEY'
const BACKOFFICE_HEADER_KEY = 'BACKOFFICE_HEADER_KEY'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'MICROSERVICE_GATEWAY_SERVICE_NAME'
const ADDITIONAL_HEADERS_TO_PROXY = 'ADDITIONAL_HEADERS_TO_PROXY'
const ENABLE_HTTP_CLIENT_METRICS = 'ENABLE_HTTP_CLIENT_METRICS'

const baseSchema = {
  type: 'object',
  required: [
    USERID_HEADER_KEY,
    GROUPS_HEADER_KEY,
    CLIENTTYPE_HEADER_KEY,
    BACKOFFICE_HEADER_KEY,
    MICROSERVICE_GATEWAY_SERVICE_NAME,
  ],
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
    [ENABLE_HTTP_CLIENT_METRICS]: {
      type: 'boolean',
      default: false,
      description: 'flag to enable the httpClient metrics',
    },
  },
}

function mergeObjectOrArrayProperty(toBeMergedValues, alreadyMergedValues, isArray) {
  return isArray ? [
    ...toBeMergedValues ?? [],
    ...alreadyMergedValues,
  ] : {
    ...toBeMergedValues ?? {},
    ...alreadyMergedValues,
  }
}

// WARNING: including any first level properties other than the ones already declared
// may have undesired effects on the result of the merge
function mergeWithDefaultJsonSchema(schema) {
  const defaultSchema = {
    ...baseSchema,
  }

  Object.keys(schema).forEach(key => {
    defaultSchema[key] = typeof schema[key] === 'object'
      ? mergeObjectOrArrayProperty(defaultSchema[key], schema[key], Array.isArray(schema[key]))
      : schema[key]
  })

  return defaultSchema
}

function getOverlappingKeys(properties, otherProperties) {
  if (!otherProperties) {
    return []
  }
  const propertiesNames = Object.keys(properties)
  const otherPropertiesNames = Object.keys(otherProperties)
  const overlappingProperties = propertiesNames.filter(propertyName =>
    otherPropertiesNames.includes(propertyName)
  )
  return overlappingProperties
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

function getMiaHeaders() {
  const userId = this.getUserId()
  const userProperties = this.getUserProperties()
  const groups = this.getGroups().join(',')
  const clientType = this.getClientType()
  const fromBackoffice = this.isFromBackOffice() ? '1' : ''
  return {
    ...userId !== null ? { [this.USERID_HEADER_KEY]: userId } : {},
    ...userProperties !== null ? { [this.USER_PROPERTIES_HEADER_KEY]: JSON.stringify(userProperties) } : {},
    ...groups ? { [this.GROUPS_HEADER_KEY]: groups } : {},
    ...clientType !== null ? { [this.CLIENTTYPE_HEADER_KEY]: clientType } : {},
    ...fromBackoffice ? { [this.BACKOFFICE_HEADER_KEY]: fromBackoffice } : {},
  }
}

function getOriginalRequestHeaders() {
  return this.headers
}

function getHttpClientFromRequest(url, baseOptions = {}) {
  const requestHeaders = this.getOriginalRequestHeaders()
  const extraHeaders = getCustomHeaders(extraHeadersKeys, requestHeaders)
  const options = getBaseOptionsDecorated(this[ADDITIONAL_HEADERS_TO_PROXY], baseOptions, requestHeaders)
  const serviceHeaders = { ...this.getMiaHeaders(), ...extraHeaders }
  return new HttpClient(url, serviceHeaders, options, this.httpClientMetrics)
}

function getHttpClient(url, baseOptions = {}) {
  return new HttpClient(url, {}, baseOptions, this.httpClientMetrics)
}

function getHeadersToProxy({ isMiaHeaderInjected = true } = {}) {
  const requestHeaders = this.getOriginalRequestHeaders()

  const miaHeaders = this.getMiaHeaders()
  const extraMiaHeaders = getCustomHeaders(extraHeadersKeys, requestHeaders)
  const customHeaders = getCustomHeaders(this[ADDITIONAL_HEADERS_TO_PROXY], requestHeaders)
  return {
    ...isMiaHeaderInjected ? miaHeaders : {},
    ...isMiaHeaderInjected ? extraMiaHeaders : {},
    ...customHeaders,
  }
}

function decorateFastify(fastify) {
  const { config } = fastify
  const httpClientMetrics = config[ENABLE_HTTP_CLIENT_METRICS] ? getHttpClientMetrics(fastify) : {}

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
  fastify.decorateRequest('getHeadersToProxy', getHeadersToProxy)

  fastify.decorateRequest('getDirectServiceProxy', getDirectlyServiceBuilderFromRequest)
  fastify.decorateRequest('getServiceProxy', getServiceBuilderFromRequest)
  fastify.decorateRequest('getHttpClient', getHttpClientFromRequest)
  fastify.decorateRequest('httpClientMetrics', httpClientMetrics)

  fastify.decorate(MICROSERVICE_GATEWAY_SERVICE_NAME, config[MICROSERVICE_GATEWAY_SERVICE_NAME])
  fastify.decorate('addRawCustomPlugin', addRawCustomPlugin)
  fastify.decorate('addPreDecorator', addPreDecorator)
  fastify.decorate('addPostDecorator', addPostDecorator)

  fastify.decorate('getDirectServiceProxy', getDirectlyServiceBuilderFromService)
  fastify.decorate('getServiceProxy', getServiceBuilderFromService)
  fastify.decorate('getHttpClient', getHttpClient)
  fastify.decorate('httpClientMetrics', httpClientMetrics)
}

async function decorateRequestAndFastifyInstance(fastify, { asyncInitFunction, serviceOptions = {} }) {
  const { ajv: ajvServiceOptions } = serviceOptions

  const ajv = new Ajv({ coerceTypes: true, useDefaults: true })
  ajvSetup(ajv, ajvServiceOptions)

  fastify.setValidatorCompiler(({ schema }) => ajv.compile(schema))

  fastify.decorate('addValidatorSchema', (schema) => {
    ajv.addSchema(schema)
    fastify.addSchema(schema)
  })
  fastify.decorate('getValidatorSchema', ajv.getSchema.bind(ajv))

  decorateFastify(fastify)

  fastify.register(fp(asyncInitFunction))
  fastify.setErrorHandler(function errorHandler(error, request, reply) {
    if (reply.raw.statusCode === 500 && !error.statusCode) {
      request.log.error(error)
      reply.send(new Error('Something went wrong'))
      return
    }
    reply.send(error)
  })
  fastify.setSchemaErrorFormatter((errors, dataVar) => {
    const [{ instancePath, message }] = errors
    const objectPath = `${dataVar}${instancePath.replace(/\//g, '.')}`
    const customErr = new Error(`${objectPath} ${message}`)
    customErr.statusCode = 400
    return customErr
  })
}


function initCustomServiceEnvironment(envSchema) {
  return function customService(asyncInitFunction, serviceOptions) {
    async function index(fastify, opts) {
      const overlappingPropertiesNames = getOverlappingKeys(baseSchema.properties, envSchema?.properties)
      if (overlappingPropertiesNames.length > 0) {
        throw new Error(`The provided Environment JSON Schema includes properties declared in the Base JSON Schema of the custom-plugin-lib, please remove them from your schema. The properties to remove are: ${overlappingPropertiesNames.join(', ')}`)
      }

      const schema = envSchema ? mergeWithDefaultJsonSchema(envSchema) : baseSchema
      fastify.register(fastifyEnv, { schema, data: opts })
      fastify.register(fastifyFormbody)
      fastify.register(fp(decorateRequestAndFastifyInstance), { asyncInitFunction, serviceOptions })
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

function getHttpClientMetrics(fastify) {
  if (fastify.metrics?.client) {
    const requestDuration = new fastify.metrics.client.Histogram({
      name: 'http_request_duration_milliseconds',
      help: 'request duration histogram',
      labelNames: ['baseUrl', 'url', 'method', 'statusCode'],
      buckets: [5, 10, 50, 100, 500, 1000, 5000, 10000],
    })
    return { requestDuration }
  }
}

module.exports = initCustomServiceEnvironment
module.exports.getDirectServiceProxy = getDirectlyServiceBuilderFromService
module.exports.getServiceProxy = (microserviceGatewayServiceName, baseOptions = {}) => {
  return serviceBuilder(microserviceGatewayServiceName, {}, baseOptions)
}
module.exports.getHttpClient = getHttpClient
