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

/* eslint id-length: 0 */
/* eslint require-await: 0 */
/* eslint no-shadow: 0 */
/* eslint no-magic-numbers: 0 */
/* eslint max-lines: 0 */
/* eslint max-statements: 0 */
'use strict'

const t = require('tap')
const fastifyBuilder = require('fastify')
const nock = require('nock')

const initCustomServiceEnvironment = require('../index')

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

function setupFastify(t) {
  const fastify = fastifyBuilder({
    logger: { level: 'silent' },
  })
  t.tearDown(() => fastify.close())
  return fastify
}

nock.disableNetConnect()

function testEnvVariableIsNotEmptyString(t, envVariableName) {
  t.test(`should fail on empty ${envVariableName}`, async t => {
    t.plan(1)
    const customService = initCustomServiceEnvironment()
    const baseFunctionalitiesPlugin = customService(async function clientGroups() {
      t.fail()
    })
    const fastify = setupFastify(t)
    fastify.register(baseFunctionalitiesPlugin, { ...baseEnv, [envVariableName]: '' })

    t.rejects(fastify.ready())
  })
}

t.test('environment', async t => {
  const headersToTest = ['USERID_HEADER_KEY', 'GROUPS_HEADER_KEY', 'CLIENTTYPE_HEADER_KEY', 'BACKOFFICE_HEADER_KEY', 'MICROSERVICE_GATEWAY_SERVICE_NAME']
  headersToTest.forEach(h => testEnvVariableIsNotEmptyString(t, h))

  t.test('should fail if required properties are missing', async t => {
    t.plan(1)
    const customService = initCustomServiceEnvironment()
    const baseFunctionalitiesPlugin = customService(async function clientGroups() {
      t.fail()
    })
    const fastify = setupFastify(t)
    const { ...badEnv } = baseEnv
    delete badEnv.USERID_HEADER_KEY
    fastify.register(baseFunctionalitiesPlugin, badEnv)

    t.rejects(fastify.ready())
  })

  t.test('should fail on invalid microservice gateway name (special characters)', async t => {
    t.plan(1)
    const customService = initCustomServiceEnvironment()
    const baseFunctionalitiesPlugin = customService(async function clientGroups() {
      t.fail()
    })
    const fastify = setupFastify(t)
    fastify.register(baseFunctionalitiesPlugin, { ...baseEnv, MICROSERVICE_GATEWAY_SERVICE_NAME: '%$£!"' })

    t.rejects(fastify.ready())
  })

  t.test('should not fail when microservice gateway name is a valid IP', async t => {
    t.plan(1)
    const customService = initCustomServiceEnvironment()
    const baseFunctionalitiesPlugin = customService(async function clientGroups() {
      t.pass()
    })
    const fastify = setupFastify(t)
    fastify.register(baseFunctionalitiesPlugin, { ...baseEnv, MICROSERVICE_GATEWAY_SERVICE_NAME: '172.16.0.0' })

    await fastify.ready()
  })
})
