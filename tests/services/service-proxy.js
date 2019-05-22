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

const otherServiceName = 'other-service'

module.exports = customService(async function clientGroups(service) {
  service.addRawCustomPlugin('POST', '/default', async function handler(req) {
    const { some } = req.body
    const proxy = req.getDirectServiceProxy(otherServiceName)
    const res = await proxy.get('/res')
    const { id } = res.payload
    return { id, some }
  })

  service.addRawCustomPlugin('POST', '/custom', async function handler(req) {
    const { some } = req.body
    const proxy = req.getDirectServiceProxy(otherServiceName, { port: 3000 })
    const res = await proxy.get('/res')
    const { id } = res.payload
    return { id, some }
  })

  service.addPreDecorator('/pre', async function handler(req) {
    const { some } = req.getOriginalRequestBody()
    const proxy = req.getDirectServiceProxy(otherServiceName, { port: 3000, protocol: 'https' })
    const res = await proxy.get('/res')
    const { id } = res.payload
    return req.changeOriginalRequest().setBody({ id, some })
  })

  service.addPostDecorator('/post', async function handler(req) {
    const { some } = req.getOriginalResponseBody()
    const proxy = req.getDirectServiceProxy(otherServiceName, { port: 3000, protocol: 'https' })
    const res = await proxy.get('/res')
    const { id } = res.payload
    return req.changeOriginalResponse().setBody({ id, some })
  })
})
