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
'use strict'

const t = require('tap')
const fastifyBuilder = require('fastify')
const greetByGroupService = require('../greetByGroup')

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

function setupFastify(t) {
  const fastify = fastifyBuilder({
    logger: { level: 'silent' },
  })
  t.tearDown(() => fastify.close())
  return fastify
}

t.test('greetByGroup', t => {
  t.test('greets the special group', async t => {
    const fastify = setupFastify(t)
    fastify.register(greetByGroupService, env)
    const user = 'Mark'

    const response = await fastify.inject({
      method: 'GET',
      url: '/greetbygroup',
      headers: {
        [USERID_HEADER_KEY]: user,
        [GROUPS_HEADER_KEY]: 'group-to-greet',
      },
    })
    t.strictSame(response.statusCode, 200)
    t.ok(/application\/json/.test(response.headers['content-type']))
    t.ok(/charset=utf-8/.test(response.headers['content-type']))
    t.strictSame(JSON.parse(response.payload), {
      message: `Hello ${user} of group: group-to-greet!\n`,
      user,
      groups: ['group-to-greet'],
    })
  })
  t.end()
})
