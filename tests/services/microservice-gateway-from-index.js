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
  const proxy = service.getServiceProxy({ port: 3000, protocol: 'https' })
  const res = await proxy.get('/res')
  service.assert.strictEqual(res.statusCode, 200, 400, 'status code not equals')
  service.assert.deepEqual(res.payload, {
    id: 'a',
    key: 2,
  }, 400, 'payload not equals')
})
