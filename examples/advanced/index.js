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

const { readFileSync } = require('fs')
const { join } = require('path')
const customService = require('@mia-platform/custom-plugin-lib')({
  type: 'object',
  required: ['GROUP_TO_GREET'],
  properties: {
    GROUP_TO_GREET: { type: 'string' },
  },
})

const BusinessLogic = require('./greetBusinessLogic')

const greetByGroupSchema = {
  description: readFileSync(join(__dirname, 'greetByGroup.md'), { encoding: 'utf-8' }),
  tags: ['Greet by Group'],
  response: {
    200: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'the greeting message' },
        user: { type: 'string', description: 'the user' },
        groups: { type: 'array', items: { type: 'string' } },
      },
    },
  },
}

const sumSchema = {
  description: 'Sum an array of numbers',
  tags: ['Sum'],
  body: {
    type: 'array',
    items: { type: 'number' },
  },
  response: {
    200: { type: 'number' },
  },
}

function greetByGroupHandler(request, reply) {
  request.log.trace('requested myuser')
  const user = request.getUserId()
  const groups = request.getGroups()
  // call the decorated fastify instance
  reply.send(this.myBusinessLogic.greet(user, groups))
}

function handleSum(request, reply) {
  const args = request.body
  request.log.trace({ args }, 'requested sum')
  let acc = 0
  for (let idx = 0; idx < args.length; idx++) {
    acc += args[idx]
  }
  reply.send({ acc })
}

// eslint-disable-next-line require-await
module.exports = customService(async function exampleService(service) {
  // retrieve environment variables from config
  const { GROUP_TO_GREET } = service.config
  // instantiate your business logic
  const myBusinessLogic = new BusinessLogic(GROUP_TO_GREET)
  // instantiate your business logic and decorate the fastify instance
  // to call it with this.myBusinessLogic in the handler
  service.decorate('myBusinessLogic', myBusinessLogic)

  service
    .addRawCustomPlugin('GET', '/greetbygroup', greetByGroupHandler, greetByGroupSchema)
    .addRawCustomPlugin('POST', '/sum', handleSum, sumSchema)
})
