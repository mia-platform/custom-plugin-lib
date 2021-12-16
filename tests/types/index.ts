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

import * as stream from 'stream'

import * as cpl from '../../index'

cpl({
  type: 'object',
  required: [ 'foo'],
  properties: {
    foo: { type: 'string' }
  }
})
cpl()

const a = cpl()
const { getDirectServiceProxy, getServiceProxy } = cpl

async function invokeSomeApis(service: cpl.Service) {
  service.get('/path')
  service.get('/path', { query: 'params' })
  service.get('/path', { query: 'params' }, { returnAs: 'JSON' })
  service.get('/path', { query: 'params' }, { returnAs: 'BUFFER' })
  service.get('/path', { query: 'params' }, { returnAs: 'STREAM' })

  service.post('/path', {my: 'body'})
  service.post('/path', 'My body as string')
  service.post('/path', Buffer.from('My body as buffer'))
  service.post('/path', new stream.Readable())
  service.post('/path', {my: 'body'}, { query: 'params' })
  service.post('/path', {my: 'body'}, { query: 'params' }, { returnAs: 'STREAM' })

  service.put('/path', {my: 'body'})
  service.put('/path', 'My body as string')
  service.put('/path', Buffer.from('My body as buffer'))
  service.put('/path', new stream.Readable())
  service.put('/path', {my: 'body'}, { query: 'params' })
  service.put('/path', {my: 'body'}, { query: 'params' }, { returnAs: 'STREAM' })

  service.patch('/path', {my: 'body'})
  service.patch('/path', 'My body as string')
  service.patch('/path', Buffer.from('My body as buffer'))
  service.patch('/path', new stream.Readable())
  service.patch('/path', {my: 'body'}, { query: 'params' })
  service.patch('/path', {my: 'body'}, { query: 'params' }, { returnAs: 'STREAM' })

  service.delete('/path', {my: 'body'})
  service.delete('/path', 'My body as string')
  service.delete('/path', Buffer.from('My body as buffer'))
  service.delete('/path', new stream.Readable())
  service.delete('/path', {my: 'body'}, { query: 'params' })
  service.delete('/path', {my: 'body'}, { query: 'params' }, { returnAs: 'STREAM' })

  const response = await service.get('/path') as cpl.JSONServiceResponse
  console.log(response.statusCode)
  console.log(response.headers)
  console.log(response.payload)

  const responseAsBuffer = await service.get('/path') as cpl.BufferServiceResponse
  console.log(responseAsBuffer.statusCode)
  console.log(responseAsBuffer.headers)
  console.log(responseAsBuffer.payload)

  const responseAsStream = await service.get('/path', {}, { returnAs: 'STREAM' })  as cpl.StreamedServiceResponse
  let d: string = ''
  responseAsStream.on('data', data => { d += data.toString() })
  responseAsStream.on('end', () => console.log(d))

}

a(async function (service) {

  console.log(service.config)

  service.addRawCustomPlugin('POST', '/path-attach-validation', function handlerPath1(request, reply) {
    reply.send({ hi: 'hi' })
  }, {
    body: {
      type: 'object',
      additionalProperties: false,
      required: ['foo'],
      properties: {
        foo: { type: 'number' },
      },
    }
  }, { attachValidation: true })

  type RequestGeneric = {
    Body: {body: string}
    Querystring: {querystring: string}
    Params: {params: string}
    Headers: {headers: string}
  }

  service
    .addRawCustomPlugin('GET', '/path1', function handlerPath1(request, reply) {
    console.log(this.config)
    if (request.getUserId() === null) {
      reply.send({})
      return
    }
    reply.send({ hi: request.getUserId() })
  })
    .addRawCustomPlugin('GET', '/', async function handler(request, reply) {
    console.log(this.config)

    const userId: string | null = request.getUserId()
    const groups: string[] = request.getGroups()
    const clientType: string | null = request.getClientType()
    const isFromBackOffice: boolean = request.isFromBackOffice()

    const directService: cpl.Service = request.getDirectServiceProxy('my-service')
    await invokeSomeApis(directService)

    const directServiceWithOptions: cpl.Service = request.getDirectServiceProxy('my-service', {port: 3000, protocol: 'http'})
    await invokeSomeApis(directServiceWithOptions)

    const directServiceWithOptionsAndHeaders: cpl.Service = request.getDirectServiceProxy('my-service', {port: 3000, protocol: 'http', headers: { key: 'value1' }})
    await invokeSomeApis(directServiceWithOptionsAndHeaders)

    const proxiedService: cpl.Service = request.getServiceProxy()
    await invokeSomeApis(proxiedService)

    const proxiedServiceWithOptions: cpl.Service = request.getServiceProxy({port: 3000, protocol: 'http'})
    await invokeSomeApis(proxiedServiceWithOptions)

    const proxiedServiceWithOptionsAndHeaders: cpl.Service = request.getServiceProxy({port: 3000, protocol: 'http', headers: { key: 'value1' }})
    await invokeSomeApis(proxiedServiceWithOptionsAndHeaders)

    const proxiedServiceWithPrefix: cpl.Service = request.getServiceProxy({port: 3000, protocol: 'http', prefix: '/my-prefix'})
    await invokeSomeApis(proxiedServiceWithPrefix)

    await invokeProxies()

    return { 'aa': 'boo' }
  }, {
    headers: {
      type:'object'
    }
  })
    .addRawCustomPlugin<RequestGeneric>('GET', '/ts', async function handler(request, reply) {
      console.log(request.body.body)
      console.log(request.query.querystring)
      console.log(request.params.params)
      console.log(request.headers.headers)

      return { 'aa': 'boo' }
  })

  service
    .addPreDecorator('/decorators/my-pre1', async function myHandlerPreDecorator(request, reply) {
    const originalRequest : cpl.OriginalRequest = request.getOriginalRequest()
    console.log(originalRequest)
    console.log(originalRequest.body)
    console.log(originalRequest.headers)
    console.log(originalRequest.method)
    console.log(originalRequest.path)
    console.log(originalRequest.query)
    console.log(request.getOriginalRequestBody())
    console.log(request.getOriginalRequestHeaders())
    console.log(request.getOriginalRequestQuery())
    console.log(request.getOriginalRequestPath())
    console.log(request.getOriginalRequestMethod())

    console.log(request.getUserId())
    console.log(request.getGroups())
    console.log(request.getClientType())
    console.log(request.isFromBackOffice())
    console.log(request.getMiaHeaders())

    return request.leaveOriginalRequestUnmodified()
  })
    .addPreDecorator('/decorators/my-pre2', async function myHandlerPreDecorator(request, reply) {
    return request.changeOriginalRequest()
      .setBody({ new: 'body' })
      .setQuery({ rewrite: 'the querystring completely' })
      .setHeaders({ rewrite: 'the headers completely' })
  })
  service.addPreDecorator('/decorators/my-pre3', async function myHandlerPreDecorator(request, reply) {
    return request.abortChain(200, { final: 'body' })
  })
  service.addPreDecorator('/decorators/my-pre4', async function myHandlerPreDecorator(request, reply) {
    return request.abortChain(200, { final: 'body' }, { some: 'other headers' })
  })
  service.addPreDecorator<RequestGeneric>('/decorators/my-pre5', async function myHandlerPreDecorator(request, response) {
    console.log(request.body.body)
    console.log(request.query.querystring)
    console.log(request.params.params)
    console.log(request.headers.headers)

    return { 'aa': 'boo' }
  })

  service
    .addPostDecorator('/decorators/my-post1', async function myHandlerPostDecorator(request, reply) {
    const originalRequest : cpl.OriginalRequest = request.getOriginalRequest()
    console.log(originalRequest)
    console.log(originalRequest.body)
    console.log(originalRequest.headers)
    console.log(originalRequest.method)
    console.log(originalRequest.path)
    console.log(originalRequest.query)
    console.log(request.getOriginalRequestBody())
    console.log(request.getOriginalRequestHeaders())
    console.log(request.getOriginalRequestQuery())
    console.log(request.getOriginalRequestPath())
    console.log(request.getOriginalRequestMethod())

    const originalResponse : cpl.OriginalResponse = request.getOriginalResponse()
    console.log(originalResponse)
    console.log(originalResponse.statusCode)
    console.log(originalResponse.headers)
    console.log(originalResponse.body)
    console.log(request.getOriginalResponseBody())
    console.log(request.getOriginalResponseHeaders())
    console.log(request.getOriginalResponseStatusCode())

    console.log(request.getUserId())
    console.log(request.getGroups())
    console.log(request.getClientType())
    console.log(request.isFromBackOffice())
    console.log(request.getMiaHeaders())

    return request.leaveOriginalResponseUnmodified()
  })
    .addPostDecorator('/decorators/my-post2', async function myHandlerPostDecorator(request, reply) {
    return request.changeOriginalResponse()
      .setBody({ new: 'body' })
      .setStatusCode(201)
      .setHeaders({ rewrite: 'the headers completely' })
  })
  service.addPostDecorator('/decorators/my-post3', async function myHandlerPostDecorator(request, reply) {
    return request.abortChain(200, { final: 'body' })
  })
  service.addPostDecorator('/decorators/my-post4', async function myHandlerPostDecorator(request, reply) {
    return request.abortChain(200, { final: 'body' }, { some: 'other headers' })
  })
  service.addPostDecorator<RequestGeneric>('/decorators/my-post5', async function myHandlerPostDecorator(request, response) {
    console.log(request.body.body)
    console.log(request.query.querystring)
    console.log(request.params.params)
    console.log(request.headers.headers)

    return { 'aa': 'boo' }
  })
})

const b = cpl()
b(async function (service) {}, {
  avj: {
    plugins: {'ajv-formats': {formats: ['date-time']}}
  },
  vocabulary: ['my-keyword']
})

async function invokeProxies() {
  const directServiceProxy = getDirectServiceProxy('service_name')
  const directServiceProxyWithOpetions = getDirectServiceProxy('service_name', { port: 3000 })

  await directServiceProxy.get('/path')
  await directServiceProxyWithOpetions.get('/path')

  const serviceProxy = getServiceProxy('microservice-gateway')
  const serviceProxyWithOptions = getServiceProxy('microservice-gateway', { port: 3000 })

  await serviceProxy.get('/path')
  await serviceProxyWithOptions.get('/path')
}
