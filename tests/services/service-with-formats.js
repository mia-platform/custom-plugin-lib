/*
 * Copyright 2021 Mia srl
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

const serviceOptions = {
  ajv: {
    plugins: {
      'ajv-formats': { formats: ['date-time'] },
    },
    vocabulary: ['name'],
  },
}

module.exports = customService(async function clientGroups(service) {
  function handler(request, reply) {
    reply.send({ message: `hello there, it is ${request.body.someDate}` })
  }

  service.addRawCustomPlugin('POST', '/hello', handler, {
    body: {
      type: 'object',
      properties: {
        someDate: {
          type: 'string',
          name: 'My custom name in schema',
          format: 'date-time',
          description: 'some date description',
        },
      },
    },
  })
}, serviceOptions)
