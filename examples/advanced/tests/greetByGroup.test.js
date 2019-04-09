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
const GROUP_TO_GREET = 'group-to-greet'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'
const env = {
  USERID_HEADER_KEY,
  GROUPS_HEADER_KEY,
  CLIENTTYPE_HEADER_KEY,
  BACKOFFICE_HEADER_KEY,
  GROUP_TO_GREET,
  MICROSERVICE_GATEWAY_SERVICE_NAME,
}

async function setupFastify(envVariables) {
  const fastify = await lc39('./index.js', {
    logLevel: 'silent',
    envVariables,
  })
  return fastify
}

tap.test('greetByGroup', test => {
  test.test('greets the special group', async assert => {
    const fastify = await setupFastify(env)
    const user = 'Mark'

    const response = await fastify.inject({
      method: 'GET',
      url: '/greetbygroup',
      headers: {
        [USERID_HEADER_KEY]: user,
        [GROUPS_HEADER_KEY]: 'group-to-greet',
      },
    })

    assert.strictSame(response.statusCode, 200)
    assert.ok(/application\/json/.test(response.headers['content-type']))
    assert.ok(/charset=utf-8/.test(response.headers['content-type']))
    assert.strictSame(JSON.parse(response.payload), {
      message: `Hello ${user} of group: group-to-greet!\n`,
      user,
      groups: ['group-to-greet'],
    })
    assert.end()
  })

  test.end()
})
