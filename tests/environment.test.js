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

let fastify
async function setupFastify(filePath, envVariables) {
  fastify = await lc39(filePath, {
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

  tap.afterEach(async() => {
    if (fastify) { fastify.close() }
  })

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
      assert.strictSame(error.message, 'env/MICROSERVICE_GATEWAY_SERVICE_NAME must match pattern "^(?=.{1,253}.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*.?$"')
    }

    assert.end()
  })

  test.test('Should not fail when microservice gateway name is a valid IP', async assert => {
    const options = {
      ...baseEnv,
      MICROSERVICE_GATEWAY_SERVICE_NAME: '172.16.0.0',
    }

    await assert.resolves(async() => {
      await setupFastify('./tests/services/plain-custom-service.js', options)
    })

    assert.end()
  })

  test.test('Should fail since BASE_REQUIRED_FIELD is not present and CONDITION_FIELD is true and CONDITION_TRUE_REQUIRED_FIELD is not present', async assert => {
    const env = {
      ...baseEnv,
      CONDITION_FIELD: true,
    }

    // NOTE: use try catch instead of assert.reject to customize error message assertion
    assert.plan(1)
    try {
      await setupFastify('./tests/services/if-then-else-env-validation-custom-service.js', env)
    } catch (error) {
      const errorMessage = 'env must have required property \'CONDITION_TRUE_REQUIRED_FIELD\', env must match "then" schema, env must have required property \'BASE_REQUIRED_FIELD\''
      assert.strictSame(error.message, errorMessage)
    }

    assert.end()
  })

  test.test('Should fail since CONDITION_FIELD is false and CONDITION_FALSE_REQUIRED_FIELD is not present', async assert => {
    const env = {
      ...baseEnv,
      CONDITION_FIELD: false,
    }

    // NOTE: use try catch instead of assert.reject to customize error message assertion
    assert.plan(1)
    try {
      await setupFastify('./tests/services/if-then-else-env-validation-custom-service.js', env)
    } catch (error) {
      const errorMessage = 'env must have required property \'CONDITION_FALSE_REQUIRED_FIELD\', env must match "else" schema, env must have required property \'BASE_REQUIRED_FIELD\''
      assert.strictSame(error.message, errorMessage)
    }

    assert.end()
  })

  test.test('Should pass since CONDITION_FIELD is true and CONDITION_TRUE_REQUIRED_FIELD is present', async assert => {
    const env = {
      ...baseEnv,
      BASE_REQUIRED_FIELD: 'some-value',
      CONDITION_FIELD: true,
      CONDITION_TRUE_REQUIRED_FIELD: 'some-value',
    }

    await assert.resolves(async() => {
      await setupFastify('./tests/services/if-then-else-env-validation-custom-service.js', env)
    })

    assert.end()
  })

  test.test('Should fail since none of the anyOf required fields are present', async assert => {
    // NOTE: use try catch instead of assert.reject to customize error message assertion
    assert.plan(1)
    try {
      await setupFastify('./tests/services/any-of-env-validation-custom-service.js', baseEnv)
    } catch (error) {
      const errorMessage = 'env must have required property \'ANY_OF_REQUIRED_FIELD_1\', env must have required property \'ANY_OF_REQUIRED_FIELD_2\', env must match a schema in anyOf'
      assert.strictSame(error.message, errorMessage)
    }

    assert.end()
  })

  test.test('Should pass since one of the anyOf required fields is present', async assert => {
    const env = {
      ...baseEnv,
      ANY_OF_REQUIRED_FIELD_1: 'some-value',
    }

    await assert.resolves(async() => {
      await setupFastify('./tests/services/any-of-env-validation-custom-service.js', env)
    })

    assert.end()
  })

  test.test('Should fail since not all of the allOf required fields are present', async assert => {
    const env = {
      ...baseEnv,
      ALL_OF_REQUIRED_FIELD_1: 'some-value',
    }

    // NOTE: use try catch instead of assert.reject to customize error message assertion
    assert.plan(1)
    try {
      await setupFastify('./tests/services/all-of-env-validation-custom-service.js', env)
    } catch (error) {
      const errorMessage = 'env must have required property \'ALL_OF_REQUIRED_FIELD_2\''
      assert.strictSame(error.message, errorMessage)
    }

    assert.end()
  })

  test.test('Should pass since all of the allOf required fields are present', async assert => {
    const env = {
      ...baseEnv,
      ALL_OF_REQUIRED_FIELD_1: 'some-value',
      ALL_OF_REQUIRED_FIELD_2: 'some-value',
    }

    await assert.resolves(async() => {
      await setupFastify('./tests/services/all-of-env-validation-custom-service.js', env)
    })

    assert.end()
  })

  test.test('Should fail since all of the oneOf required fields are present', async assert => {
    const env = {
      ...baseEnv,
      ONE_OF_REQUIRED_FIELD_1: 'some-value',
      ONE_OF_REQUIRED_FIELD_2: 'some-value',
    }

    // NOTE: use try catch instead of assert.reject to customize error message assertion
    assert.plan(1)
    try {
      await setupFastify('./tests/services/one-of-env-validation-custom-service.js', env)
    } catch (error) {
      const errorMessage = 'env must match exactly one schema in oneOf'
      assert.strictSame(error.message, errorMessage)
    }

    assert.end()
  })

  test.test('Should pass since only one of the oneOf required fields is present', async assert => {
    const env = {
      ...baseEnv,
      ONE_OF_REQUIRED_FIELD_1: 'some-value',
    }

    await assert.resolves(async() => {
      await setupFastify('./tests/services/one-of-env-validation-custom-service.js', env)
    })

    assert.end()
  })

  test.test('Should fail since the env has properties already present in the baseEnv of the lib', async assert => {
    // NOTE: use try catch instead of assert.reject to customize error message assertion
    assert.plan(1)
    try {
      await setupFastify('./tests/services/overlapping-env-validation-custom-service.js', baseEnv)
    } catch (error) {
      const errorMessage = 'The provided Environment JSON Schema includes properties declared in the Base JSON Schema of the custom-plugin-lib, please remove them from your schema. The properties to remove are: USERID_HEADER_KEY, USER_PROPERTIES_HEADER_KEY, GROUPS_HEADER_KEY, CLIENTTYPE_HEADER_KEY'
      assert.strictSame(error.message, errorMessage)
    }

    assert.end()
  })

  test.end()
})
