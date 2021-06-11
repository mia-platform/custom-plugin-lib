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

const tap = require('tap')
const lc39 = require('@mia-platform/lc39')

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

async function setupFastify(filePath, envVariables) {
  const fastify = await lc39(filePath, {
    logLevel: 'silent',
    envVariables,
  })

  return fastify
}

function testEnvVariableIsNotEmptyString(test, envVariableName) {
  test.test(`Should fail on empty ${envVariableName}`, async assert => {
    try {
      await setupFastify('./tests/services/plain-custom-service.js', { ...baseEnv, [envVariableName]: '' })
      assert.fail()
    } catch (error) {
      assert.ok(error)
    }

    assert.end()
  })
}

tap.test('Test Environment variables', test => {
  const headersToTest = ['USERID_HEADER_KEY', 'GROUPS_HEADER_KEY', 'CLIENTTYPE_HEADER_KEY', 'BACKOFFICE_HEADER_KEY', 'MICROSERVICE_GATEWAY_SERVICE_NAME']
  headersToTest.forEach(header => testEnvVariableIsNotEmptyString(test, header))

  test.test('Should fail if required properties are missing', async assert => {
    const { ...badEnv } = baseEnv
    delete badEnv.USERID_HEADER_KEY

    try {
      await setupFastify('./tests/services/plain-custom-service.js', badEnv)
      assert.fail()
    } catch (error) {
      assert.ok(error)
    }

    assert.end()
  })

  test.test('Should fail on invalid microservice gateway name (special characters)', async assert => {
    try {
      await setupFastify('./tests/services/plain-custom-service.js', {
        ...baseEnv,
        MICROSERVICE_GATEWAY_SERVICE_NAME: '%$£!"',
      })
      assert.fail()
    } catch (error) {
      assert.strictSame(error.message, 'should match pattern "^(?=.{1,253}.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*.?$"')
    }

    assert.end()
  })

  test.test('Should not fail when microservice gateway name is a valid IP', async assert => {
    const options = {
      ...baseEnv,
      MICROSERVICE_GATEWAY_SERVICE_NAME: '172.16.0.0',
    }

    const fastify = await setupFastify('./tests/services/plain-custom-service.js', options)
    assert.ok(fastify)
    assert.end()
  })

  test.end()
})
