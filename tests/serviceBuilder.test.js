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
const nock = require('nock')
const serviceBuilder = require('../lib/serviceBuilder')
const reqheaders = { 'content-type': 'application/json;charset=utf-8' }
const { Readable } = require('stream')
const http = require('http')
const proxy = require('proxy')
const { HttpProxyAgent } = require('hpagent')

function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

tap.test('serviceBuilder', test => {
  nock.disableNetConnect()
  test.tearDown(() => {
    nock.enableNetConnect()
  })

  test.test('forwarding of mia headers', innerTest => {
    const HEADER_MIA_KEY = 'miaheader'
    const HEADER_MIA = { [HEADER_MIA_KEY]: 'foo' }

    innerTest.test('injects Mia Header if isMiaHeaderInjected option is missing', async assert => {
      const myServiceNameScope = nock('http://my-service-name', {
        reqheaders: {
          [HEADER_MIA_KEY]: HEADER_MIA[HEADER_MIA_KEY],
        },
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = serviceBuilder('my-service-name', HEADER_MIA)
      const response = await service.get('/foo', {}, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('injects Mia Header if isMiaHeaderInjected option is true', async assert => {
      const myServiceNameScope = nock('http://my-service-name', {
        reqheaders: {
          [HEADER_MIA_KEY]: HEADER_MIA[HEADER_MIA_KEY],
        },
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = serviceBuilder('my-service-name', HEADER_MIA)
      const response = await service.get('/foo', {}, { returnAs: 'JSON', isMiaHeaderInjected: true })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('does not inject Mia header if isMiaHeaderInjected option is false', async assert => {
      const myServiceNameScope = nock('http://my-service-name', {
        badheaders: [HEADER_MIA_KEY],
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = serviceBuilder('my-service-name', { [HEADER_MIA_KEY]: 'foo' })
      const response = await service.get('/foo', {}, { returnAs: 'JSON', isMiaHeaderInjected: false })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('get', innerTest => {
    innerTest.test('returnAs: JSON', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: JSON default', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo')

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: BUFFER', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: STREAM', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { returnAs: 'STREAM' })
      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => {
          acc += data.toString()
        })
        response.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('with query parameter', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo?aa=bar')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', { aa: 'bar' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: JSON but xml is returned', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(500, '<some><xml /></some>')

      const service = serviceBuilder('my-service-name')

      try {
        await service.get('/foo')
      } catch (error) {
        assert.strictSame(error.res.statusCode, 500)
        assert.strictSame(error.payload, Buffer.from('<some><xml /></some>'))
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('on 500 doesn\'t reject the promise', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(500, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo')

      assert.equal(response.statusCode, 500)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('on TCP error rejects the promise', async assert => {
      const myServiceNameScope = nock('http://unresolved-hostname')
        .get('/foo')
        .replyWithError({
          code: 'ENOTFOUND',
        })
      const service = serviceBuilder('unresolved-hostname')

      try {
        await service.get('/foo')
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.equal(error.code, 'ENOTFOUND')
      }
      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - returnAs: JSON', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(201, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { allowedStatusCodes: [200, 201, 202] })

      assert.equal(response.statusCode, 201)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed: returnAs: JSON', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')
      try {
        await service.get('/foo', {}, { allowedStatusCodes: [200, 201, 202] })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - returnAs: BUFFER', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(201, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 201)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: BUFFER', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')
      try {
        await service.get('/foo', {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'BUFFER' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - returnAs: STREAM', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'STREAM' })
      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => {
          acc += data.toString()
        })
        response.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: STREAM', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      try {
        await service.get('/foo', {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'STREAM' })
      } catch (error) {
        assert.strictSame(error.message, 'Invalid status code: 404. Allowed: 200,201,202.')
        assert.strictSame(error.statusCode, 404)
        myServiceNameScope.done()
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('post', innerTest => {
    innerTest.test('send Object - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send String - returnAs: JSON', async assert => {
      const THE_SENT_BODY = 'this is my custom body'

      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Buffer - returnAs: JSON', async assert => {
      const THE_SENT_BODY = Buffer.from('my buffer')

      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .post('/foo', THE_SENT_BODY.toString('utf-8'))
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Stream - returnAs: JSON', async assert => {
      const CHUNK1 = 'my-streamed-data\n'
      const CHUNK2 = 'my-streamed-data2'
      const myStream = new Readable({
        read() {
          this.push(CHUNK1)
          this.push(CHUNK2)
          this.push(null)
        },
      })

      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .post('/foo', CHUNK1 + CHUNK2)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', myStream, {}, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send nothing - returnAs: JSON', async assert => {
      const myServiceNameScope = nock('http://my-service-name', {
        reqheaders: { 'content-length': '0' },
      })
        .replyContentLength()
        .post('/foo', '')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', undefined, {}, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('with querystring - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo?qq=foobar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, { qq: 'foobar' }, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Object - returnAs: BUFFER', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Object - returnAs: STREAM', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'STREAM' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => {
          acc += data.toString()
        })
        response.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('on 500 doesn\'t reject the promise', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }
      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(500, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY)

      assert.equal(response.statusCode, 500)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('on TCP error rejects the promise', async assert => {
      const myServiceNameScope = nock('http://unresolved-hostname')
        .post('/foo')
        .replyWithError({
          code: 'ENOTFOUND',
        })
      const service = serviceBuilder('unresolved-hostname')

      try {
        await service.post('/foo', { the: 'sent body' }, {}, { returnAs: 'BUFFER' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.equal(error.code, 'ENOTFOUND')
      }
      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send null', async assert => {
      const THE_SENT_BODY = null
      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', 'null')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY)

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { allowedStatusCodes: [200, 201, 202] })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      try {
        await service.post('/foo', THE_SENT_BODY, {}, { allowedStatusCodes: [200, 201, 202] })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.equal(error.statusCode, 404)
        myServiceNameScope.done()
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - returnAs: BUFFER', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: BUFFER', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      try {
        await service.post('/foo', THE_SENT_BODY, {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'BUFFER' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.equal(error.statusCode, 404)

        myServiceNameScope.done()
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - returnAs: STREAM', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'STREAM' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => {
          acc += data.toString()
        })
        response.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: STREAM', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      try {
        await service.post('/foo', THE_SENT_BODY, {}, { allowedStatusCodes: [200, 201, 202], returnAs: 'STREAM' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Invalid status code: 404. Allowed: 200,201,202.')
        assert.equal(error.statusCode, 404)
        myServiceNameScope.done()
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('put', innerTest => {
    innerTest.test('send Object - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .put('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.put('/foo', THE_SENT_BODY, { aa: 'bar' }, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('patch', innerTest => {
    innerTest.test('send Object - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .patch('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.patch('/foo', THE_SENT_BODY, { aa: 'bar' }, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('delete', innerTest => {
    innerTest.test('send Object - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .delete('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.delete('/foo', THE_SENT_BODY, { aa: 'bar' }, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('returnAs: unknwon', async assert => {
    const service = serviceBuilder('my-service-name')
    try {
      await service.get('/foo', {}, { returnAs: 'UNKNWON TYPE' })
      assert.fail('We can\'t reach this!')
    } catch (error) {
      assert.equal(error.message, 'Unknwon returnAs: UNKNWON TYPE')
    }
    assert.end()
  })

  test.test('allowedStatusCodes is not array', async assert => {
    const service = serviceBuilder('my-service-name')
    try {
      await service.get('/foo', {}, { allowedStatusCodes: 200 })
      assert.fail('We can\'t reach this!')
    } catch (error) {
      assert.equal(error.message, 'allowedStatusCodes should be array. Found: number.')
    }
    assert.end()
  })

  test.test('https', async assert => {
    const myServiceNameScope = nock('https://my-service-name:443')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name')

    const response = await service.get('/foo', {}, { protocol: 'https' })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
    assert.end()
  })

  test.test('https in service build', async assert => {
    const myServiceNameScope = nock('https://my-service-name:443')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', {}, { protocol: 'https' })

    const response = await service.get('/foo', {})

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
    assert.end()
  })

  test.test('change port', async assert => {
    const myServiceNameScope = nock('http://my-service-name:3000')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name')

    const response = await service.get('/foo', {}, { port: 3000 })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
    assert.end()
  })

  test.test('base options change port', async assert => {
    const myServiceNameScope = nock('http://my-service-name:3000')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', {}, { port: 3000 })

    const response = await service.get('/foo', {})

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
    assert.end()
  })

  test.test('base options change port, override during call', async assert => {
    const myServiceNameScope = nock('http://my-service-name:5000')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', {}, { port: 3000 })

    const response = await service.get('/foo', {}, { port: 5000 })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
    assert.end()
  })

  test.test('request headers can be overwritten', async assert => {
    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'header value chosen by the developer' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { foo: 'header value chosen by platform' })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON', headers: { foo: 'header value chosen by the developer' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('developer can specify a global header', async assert => {
    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'global user header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON' })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('global header can be overwritten by a request header', async assert => {
    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'request header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON', headers: { foo: 'request header' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('request header overwrites global and mia headers', async assert => {
    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'request header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { foo: 'mia header' }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON', headers: { foo: 'request header' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('global user header overwrites mia header', async assert => {
    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'global user header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { foo: 'mia header' }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON' })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('with prefix', async assert => {
    const myServiceNameScope = nock('http://my-service-name')
      .replyContentLength()
      .get('/my-prefix/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { }, { prefix: '/my-prefix' })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON' })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('timeout', async assert => {
    assert.test('returnAs: JSON', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .delay(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      await assert.rejects(async() => {
        await service.get('/foo', {}, {
          returnAs: 'JSON',
          timeout: 100,
        })
      }, new Error('Request timed out'))

      myServiceNameScope.done()
      assert.end()
    })

    assert.test('returnAs: BUFFER', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .delay(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      await assert.rejects(async() => {
        await service.get('/foo', {}, {
          returnAs: 'BUFFER',
          timeout: 100,
        })
      }, new Error('Request timed out'))

      myServiceNameScope.done()
      assert.end()
    })

    assert.test('returnAs: STREAM with delay body', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .delayBody(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { returnAs: 'STREAM', timeout: 100 })
      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => {
          acc += data.toString()
        })
        response.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    assert.test('returnAs: STREAM', async assert => {
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .delay(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      await assert.rejects(async() => {
        await service.get('/foo', {}, {
          returnAs: 'STREAM',
          timeout: 100,
        })
      }, new Error('Request timed out'))


      myServiceNameScope.done()
      assert.end()
    })

    assert.end()
  })

  test.test('agent', async assert => {
    nock.enableNetConnect('127.0.0.1')
    assert.tearDown(() => {
      nock.disableNetConnect()
    })

    async function createProxy() {
      return new Promise((resolve) => {
        const server = proxy(http.createServer())
        server.listen(0, '127.0.0.1', () => {
          resolve(server)
        })
      })
    }

    async function createServer() {
      return new Promise((resolve) => {
        const server = http.createServer()
        server.listen(0, '127.0.0.1', () => {
          resolve(server)
        })
      })
    }

    assert.test('returnAs: JSON', async assert => {
      const server = await createServer()
      server.on('request', (req, res) => {
        res.end('{"status": "ok"}')
      })
      const serverProxy = await createProxy()
      let proxyCalled = false
      serverProxy.authenticate = (req, fn) => {
        proxyCalled = true
        fn(null, req.headers['proxy-authorization'] === `Basic ${Buffer.from('hello:world').toString('base64')}`)
      }

      const service = serviceBuilder(server.address().address)

      const response = await service.get('/foo', {}, {
        returnAs: 'JSON',
        port: `${server.address().port}`,
        agent: new HttpProxyAgent({
          proxy: `http://hello:world@${serverProxy.address().address}:${serverProxy.address().port}/`,
        }),
      })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { status: 'ok' })
      assert.ok(proxyCalled)

      server.close()
      serverProxy.close()

      assert.end()
    })

    assert.test('returnAs: BUFFER', async assert => {
      const server = await createServer()
      server.on('request', (req, res) => {
        res.end('OK')
      })
      const serverProxy = await createProxy()
      let proxyCalled = false
      serverProxy.authenticate = (req, fn) => {
        proxyCalled = true
        fn(null, req.headers['proxy-authorization'] === `Basic ${Buffer.from('hello:world').toString('base64')}`)
      }

      const service = serviceBuilder(server.address().address)

      const response = await service.get('/foo', {}, {
        returnAs: 'BUFFER',
        port: `${server.address().port}`,
        agent: new HttpProxyAgent({
          proxy: `http://hello:world@${serverProxy.address().address}:${serverProxy.address().port}/`,
        }),
      })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload.toString('utf-8'), 'OK')
      assert.ok(proxyCalled)

      server.close()
      serverProxy.close()

      assert.end()
    })

    assert.test('returnAs: STREAM', async assert => {
      const server = await createServer()
      server.on('request', (req, res) => {
        res.end(JSON.stringify({ the: 'response' }))
      })
      const serverProxy = await createProxy()
      let proxyCalled = false
      serverProxy.authenticate = (req, fn) => {
        proxyCalled = true
        fn(null, req.headers['proxy-authorization'] === `Basic ${Buffer.from('hello:world').toString('base64')}`)
      }

      const service = serviceBuilder(server.address().address)

      const response = await service.get('/foo', {}, {
        returnAs: 'STREAM',
        port: `${server.address().port}`,
        agent: new HttpProxyAgent({
          proxy: `http://hello:world@${serverProxy.address().address}:${serverProxy.address().port}/`,
        }),
      })

      assert.equal(response.statusCode, 200)
      assert.ok(response.headers['content-length'])
      assert.ok(proxyCalled)

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => {
          acc += data.toString()
        })
        response.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))

      server.close()
      serverProxy.close()

      assert.end()
    })

    assert.end()
  })

  test.end()
})
