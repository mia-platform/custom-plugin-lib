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
const { getHttpClient } = cpl

async function invokeSomeApisServiceProxy(service: cpl.Service) {
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

async function invokeSomeApis(service: cpl.HttpClient) {
  service.get('/path')
  service.get('/path', { query: { query: 'params'} })
  service.get('/path', { returnAs: 'JSON', query: { query: 'params' } })
  service.get('/path', { returnAs: 'BUFFER', query: { query: 'params' } })
  service.get('/path', { returnAs: 'STREAM', query: { query: 'params' } })

  service.post('/path', {my: 'body'})
  service.post('/path', 'My body as string')
  service.post('/path', Buffer.from('My body as buffer'))
  service.post('/path', new stream.Readable())
  service.post('/path', {my: 'body'}, { query: { query: 'params'} })
  service.post('/path', {my: 'body'}, { returnAs: 'STREAM', query: { query: 'params'} })

  service.put('/path', {my: 'body'})
  service.put('/path', 'My body as string')
  service.put('/path', Buffer.from('My body as buffer'))
  service.put('/path', new stream.Readable())
  service.put('/path', {my: 'body'}, { query: { query: 'params'} })
  service.put('/path', {my: 'body'}, { returnAs: 'STREAM', query: { query: 'params'} })

  service.patch('/path', {my: 'body'})
  service.patch('/path', 'My body as string')
  service.patch('/path', Buffer.from('My body as buffer'))
  service.patch('/path', new stream.Readable())
  service.patch('/path', {my: 'body'}, {query: { query: 'params'}})
  service.patch('/path', {my: 'body'}, { returnAs: 'STREAM', query: { query: 'params'} })

  service.delete('/path', {my: 'body'})
  service.delete('/path', 'My body as string')
  service.delete('/path', Buffer.from('My body as buffer'))
  service.delete('/path', new stream.Readable())
  service.delete('/path', {my: 'body'}, { query: { query: 'params'} })
  service.delete('/path', {my: 'body'}, { returnAs: 'STREAM', query: { query: 'params'} })

  interface Res {
    foo: string
  }
  const response = await service.get<cpl.JSONResponse<Res>>('/path')
  console.log(response.statusCode)
  console.log(response.headers)
  console.log(response.payload.foo)

  const responseAsBuffer = await service.get<cpl.BufferResponse>('/path')
  console.log(responseAsBuffer.statusCode)
  console.log(responseAsBuffer.headers)
  console.log(responseAsBuffer.payload)

  const responseAsStream = await service.get<cpl.StreamResponse>('/path', { returnAs: 'STREAM' })
  let d: string = ''
  responseAsStream.headers
  responseAsStream.payload.on('data', data => { d += data.toString() })
  responseAsStream.payload.on('end', () => console.log(d))
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

  const httpClientFromService = service.getHttpClient('http://service-name')
  await invokeSomeApis(httpClientFromService)

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

    await invokeProxies()

    return { 'aa': 'boo' }
  }, {
    headers: {
      type:'object'
    }
  })
    .addRawCustomPlugin('POST', '/', async function handler(request, reply) {
    console.log(this.config)

    const userId: string | null = request.getUserId()
    const groups: string[] = request.getGroups()
    const clientType: string | null = request.getClientType()
    const isFromBackOffice: boolean = request.isFromBackOffice()

    const httpClient = request.getHttpClient('http://my-service')
    await invokeSomeApis(httpClient)

    const httpClientWithOptions = request.getHttpClient('http://my-service', {
      headers: {'accept': 'application/json'},
    })
    await invokeSomeApis(httpClientWithOptions)

    const httpClientFromService = service.getHttpClient('http://service-name')
    await invokeSomeApis(httpClientFromService)

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
  ajv: {
    plugins: {'ajv-formats': {formats: ['date-time']}}
  },
  vocabulary: ['my-keyword']
})

async function invokeProxies() {
  const httpClient = getHttpClient('http://service_name')
  const httpClientWithOptions = getHttpClient('http://service_name:3000', {
    timeout: 1000,
  })
  await httpClient.get('/path')
  await httpClientWithOptions.get('/path')
}
