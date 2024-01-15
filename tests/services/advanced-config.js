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

const customService = require('../../index')()

module.exports = customService(async function clientGroups(service) {
  function handlerAdvancedConfig(request, reply) {
    reply.send({
      error: request.validationError.message,
      config: request.routeOptions.config,
    })
  }

  const advancedConfig = {
    attachValidation: true,
    config: { myConfig: [1, 2, 3, 4] },
    method: 'overwritten property',
    path: 'overwritten property',
    handler: 'overwritten property',
    schema: 'overwritten property',
  }

  const schema = {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['foo'],
      properties: {
        foo: { type: 'number' },
      },
    },
  }
  service.addRawCustomPlugin('POST', '/advanced-config', handlerAdvancedConfig, schema, advancedConfig)
})
