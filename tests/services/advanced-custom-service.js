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
const envSchema = {
  type: 'object',
  required: ['MY_AWESOME_ENV', 'MY_REQUIRED_ENV_VAR'],
  properties: {
    MY_AWESOME_ENV: { type: 'string', default: 'the default value' },
    MY_REQUIRED_ENV_VAR: { type: 'string' },
  },
}

const customService = require('../../index')(envSchema)

module.exports = customService(async function clientGroups(service) {
  const customFunctionality = request => request.body
  service.decorate('customFunctionality', customFunctionality)
  async function handlerCustom(request, reply) {
    reply.send(this.customFunctionality(request))
  }

  function handlerEnv(request, reply) {
    reply.send(this.config.MY_AWESOME_ENV)
  }

  service.addRawCustomPlugin('GET', '/env', handlerEnv)
  service.addRawCustomPlugin('POST', '/custom', handlerCustom)
})
