'use strict'

const tap = require('tap')
const lc39 = require('@mia-platform/lc39')
const Swagger = require('swagger-parser')

async function setupFastify(filePath, envVariables) {
  return lc39(filePath, {
    logLevel: 'silent',
    envVariables,
  })
}

const USERID_HEADER_KEY = 'userid-header-key'
const GROUPS_HEADER_KEY = 'groups-header-key'
const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'

const baseEnv = {
  USERID_HEADER_KEY,
  GROUPS_HEADER_KEY,
  CLIENTTYPE_HEADER_KEY,
  BACKOFFICE_HEADER_KEY,
  MICROSERVICE_GATEWAY_SERVICE_NAME,
}

tap.test('create a valid docs with the support of $ref schema', async t => {
  const fastify = await setupFastify('./tests/services/plain-custom-service.js', baseEnv)

  const res = await fastify.inject({
    method: 'GET',
    url: '/documentation/json',
  })

  await Swagger.validate(JSON.parse(res.payload))

  t.end()
})
