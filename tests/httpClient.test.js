'use strict'

const tap = require('tap')
const nock = require('nock')
const { Readable } = require('stream')
const http = require('http')
const { createProxy: proxy } = require('proxy')
const fs = require('fs')
const https = require('https')
const split = require('split2')
const Pino = require('pino')
const lc39 = require('@mia-platform/lc39')
const httpsClient = require('https')

const HttpClient = require('../lib/httpClient')

const MY_AWESOME_SERVICE_PROXY_HTTP_URL = 'http://my-awesome-service'
const MY_AWESOME_SERVICE_PROXY_HTTPS_URL = 'https://my-awesome-service'
const reqheaders = { 'content-type': 'application/json;charset=utf-8' }
const DEFAULT_ERROR_MESSAGE = 'Something went wrong'

function wait(time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

tap.test('httpClient', test => {
  nock.disableNetConnect()
  test.teardown(() => {
    nock.enableNetConnect()
  })

  test.test('forwarding of mia headers', innerTest => {
    const HEADER_MIA_KEY = 'miaheader'
    const HEADER_MIA = { [HEADER_MIA_KEY]: 'foo' }

    innerTest.test('injects Mia Header if isMiaHeaderInjected option is missing', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
        reqheaders: {
          [HEADER_MIA_KEY]: HEADER_MIA[HEADER_MIA_KEY],
        },
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, HEADER_MIA)
      const response = await service.get('/foo', { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('injects Mia Header if isMiaHeaderInjected option is true', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
        reqheaders: {
          [HEADER_MIA_KEY]: HEADER_MIA[HEADER_MIA_KEY],
        },
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, HEADER_MIA)
      const response = await service.get('/foo', { returnAs: 'JSON', isMiaHeaderInjected: true })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('does not inject Mia header if isMiaHeaderInjected option is false', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
        badheaders: [HEADER_MIA_KEY],
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { [HEADER_MIA_KEY]: 'foo' })
      const response = await service.get('/foo', { returnAs: 'JSON', isMiaHeaderInjected: false })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('injects Mia Header if isMiaHeaderInjected base option is true', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
        reqheaders: {
          [HEADER_MIA_KEY]: HEADER_MIA[HEADER_MIA_KEY],
        },
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, HEADER_MIA, {}, { isMiaHeaderInjected: true })
      const response = await service.get('/foo')

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('does not inject Mia header if isMiaHeaderInjected option is false and base option is true', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
        badheaders: [HEADER_MIA_KEY],
      })
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { [HEADER_MIA_KEY]: 'foo' }, { isMiaHeaderInjected: true })
      const response = await service.get('/foo', { returnAs: 'JSON', isMiaHeaderInjected: false })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('get', innerTest => {
    innerTest.test('returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: JSON with prefix', async assert => {
      const basePrefix = '/prefix'
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get(`${basePrefix}/foo`)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(`${MY_AWESOME_SERVICE_PROXY_HTTP_URL}${basePrefix}`)

      const response = await service.get('/foo', { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: JSON default', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo')

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: BUFFER', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', { returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: STREAM', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', { returnAs: 'STREAM' })
      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('with query parameter', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo?aa=bar')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', {
        query: { aa: 'bar' },
      })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response includes duration property', async assert => {
      const responseDelay = 50
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .delay(responseDelay)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo')

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.duration > responseDelay)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('with query parameter in path', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo?aa=bar')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo?aa=bar')

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('returnAs: JSON but xml is returned', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(500, '<some><xml /></some>')

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      try {
        await service.get('/foo')
      } catch (error) {
        assert.strictSame(error.statusCode, 500)
        assert.strictSame(error.payload, '<some><xml /></some>')
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('on not allowed statusCode error includes duration property', async assert => {
      const responseDelay = 50
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .delay(responseDelay)
        .reply(500, { the: 'error' }, {
          some: 'error-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      try {
        await service.get('/foo')
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Something went wrong')
        assert.strictSame(error.statusCode, 500)
        assert.strictSame(error.payload, { the: 'error' })
        assert.strictSame(error.headers.some, 'error-header')
        assert.ok(error.duration > responseDelay)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('on 500 doesn\'t reject the promise', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(500, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', {
        validateStatus: status => {
          return status === 500
        },
      })

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
      const service = new HttpClient('http://unresolved-hostname')

      try {
        await service.get('/foo')
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.equal(error.code, 'ENOTFOUND')
      }
      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is 201 - default validateStatus - returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(201, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo')

      assert.equal(response.statusCode, 201)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response is empty - returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(200, '', {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo')

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, '')
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - default validateStatus - returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      try {
        await service.get('/foo')
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - response is empty - returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, '', {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      try {
        await service.get('/foo')
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Something went wrong')
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - custom errorMessageKey - returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, { custom: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      try {
        await service.get('/foo', {
          errorMessageKey: 'custom',
        })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - custom errorMessageKey in constructor - returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, { custom: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {
        errorMessageKey: 'custom',
      })
      try {
        await service.get('/foo')
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - default validateStatus - returnAs: BUFFER', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(201, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', { returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 201)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - default validateStatus - returnAs: BUFFER - error response in JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      try {
        await service.get('/foo', { returnAs: 'BUFFER' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, 'Resource Not Found')
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - default validateStatus - returnAs: BUFFER - error response in text', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, 'Some error', {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      try {
        await service.get('/foo', { returnAs: 'BUFFER' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, DEFAULT_ERROR_MESSAGE)
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - default validateStatus - returnAs: BUFFER - error response in text but content-type json', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, 'Some error', {
          some: 'response-header',
          'content-type': 'application/json;charset=utf-8',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      try {
        await service.get('/foo', { returnAs: 'BUFFER' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, DEFAULT_ERROR_MESSAGE)
        assert.strictSame(error.statusCode, 404)
      }

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is allowed - default validateStatus - returnAs: STREAM', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', { returnAs: 'STREAM' })
      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('response status code is not allowed - default validateStatus - returnAs: STREAM', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      try {
        await service.get('/foo', { returnAs: 'STREAM' })
      } catch (error) {
        assert.strictSame(error.message, DEFAULT_ERROR_MESSAGE)
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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send String - returnAs: JSON', async assert => {
      const THE_SENT_BODY = 'this is my custom body'

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Buffer - returnAs: JSON', async assert => {
      const THE_SENT_BODY = Buffer.from('my buffer')

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .post('/foo', THE_SENT_BODY.toString('utf-8'))
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'JSON' })

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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .post('/foo', CHUNK1 + CHUNK2)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', myStream, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send nothing - returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
        reqheaders: { 'content-length': '0' },
      })
        .replyContentLength()
        .post('/foo', (body) => {
          assert.strictSame(body, '')
          return true
        })
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', undefined, { returnAs: 'JSON' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('with querystring - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo?qq=foobar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'JSON', query: { qq: 'foobar' } })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Object - returnAs: BUFFER', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', (body) => {
          assert.strictSame(body, THE_SENT_BODY)
          return true
        })
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Object - returnAs: STREAM', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'STREAM' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('on 500 doesn\'t reject the promise', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(500, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, {
        validateStatus: status => status === 500,
      })

      assert.equal(response.statusCode, 500)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('on TCP error rejects the promise', async assert => {
      const myServiceNameScope = nock('http://unresolved-hostname')
        .post('/foo', { the: 'sent body' })
        .replyWithError({
          code: 'ENOTFOUND',
        })
      const service = new HttpClient('http://unresolved-hostname')

      try {
        await service.post('/foo', { the: 'sent body' }, { returnAs: 'BUFFER' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.equal(error.code, 'ENOTFOUND')
      }
      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send null', async assert => {
      const THE_SENT_BODY = null
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', body => {
          assert.strictSame(body, null)
          return true
        })
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY)

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: JSON', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      try {
        await service.post('/foo', THE_SENT_BODY)
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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: BUFFER', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      try {
        await service.post('/foo', THE_SENT_BODY, { returnAs: 'BUFFER' })
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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.post('/foo', THE_SENT_BODY, { returnAs: 'STREAM' })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    innerTest.test('response status code is not allowed - returnAs: STREAM', async assert => {
      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(404, { message: 'Resource Not Found' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      try {
        await service.post('/foo', THE_SENT_BODY, { returnAs: 'STREAM' })
        assert.fail('We can\'t reach this!')
      } catch (error) {
        assert.strictSame(error.message, DEFAULT_ERROR_MESSAGE)
        assert.strictSame(error.headers, {
          'some': 'response-header',
          'content-type': 'application/json',
          'content-length': '32',
        })
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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .put('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.put('/foo', THE_SENT_BODY, { returnAs: 'JSON', query: { aa: 'bar' } })

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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .patch('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.patch('/foo', THE_SENT_BODY, { returnAs: 'JSON', query: { aa: 'bar' } })

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

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders })
        .replyContentLength()
        .delete('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.delete('/foo', THE_SENT_BODY, { returnAs: 'JSON', query: { aa: 'bar' } })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { the: 'response' })
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('send Object - returnAs: BUFFER - error statusCode 502', async(assert) => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .delete('/foo')
        .reply(502)

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      try {
        await service.delete('/foo', undefined, {
          returnAs: 'BUFFER',
          validateStatus: status => status === 204,
        })
      } catch (error) {
        assert.equal(error.message, DEFAULT_ERROR_MESSAGE)
      }

      myServiceNameScope.done()
      assert.end()
    }
    )

    innerTest.test('send empty - returnAs: BUFFER - success statusCode 204', async(assert) => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .delete('/foo')
        .reply(204)

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.delete('/foo', undefined, { returnAs: 'BUFFER' })

      assert.equal(response.statusCode, 204)
      myServiceNameScope.done()

      assert.end()
    })

    innerTest.test('send empty - returnAs: STREAM - success statusCode 204', async(assert) => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .delete('/foo')
        .reply(204)

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.delete('/foo', undefined, { returnAs: 'STREAM' })

      assert.equal(response.statusCode, 204)
      myServiceNameScope.done()

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })
      assert.strictSame(body, '')

      assert.end()
    })


    innerTest.end()
  })

  test.test('httpClient metrics', innerTest => {
    const delay = 20
    let observedMetrics
    const metrics = {
      requestDuration: {
        observe: (labels, value) => {
          observedMetrics = {
            labels,
            value,
          }
        },
      },
    }

    innerTest.test('metrics are NOT collected if NOT enabled on proxy level - request ok', async assert => {
      observedMetrics = null
      const expectedObservedMetrics = null
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .get('/foo')
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      await service.get('/foo')

      assert.equal(observedMetrics, expectedObservedMetrics)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('metrics are collected if enabled - request ok', async assert => {
      observedMetrics = null
      const expectedObservedMetrics = {
        labels: {
          method: 'GET',
          url: '/foo',
          baseUrl: MY_AWESOME_SERVICE_PROXY_HTTP_URL,
          statusCode: 200,
        },
      }
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .get('/foo')
        .delay(delay)
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {}, metrics)
      await service.get('/foo')

      assert.strictSame(observedMetrics.labels, expectedObservedMetrics.labels)
      assert.ok(observedMetrics.value > delay)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('metrics are collected if enabled - request ko', async assert => {
      observedMetrics = null
      const expectedObservedMetrics = {
        labels: {
          method: 'GET',
          url: '/foo',
          baseUrl: MY_AWESOME_SERVICE_PROXY_HTTP_URL,
          statusCode: 500,
        },
      }
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .get('/foo')
        .delay(delay)
        .reply(500, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {}, metrics)

      try {
        await service.get('/foo')
        assert.fail()
      } catch (error) {
        assert.pass()
      }

      assert.strictSame(observedMetrics.labels, expectedObservedMetrics.labels)
      assert.ok(observedMetrics.value > delay)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('metrics are collected with option urlLabel', async assert => {
      observedMetrics = null
      const expectedObservedMetrics = {
        labels: {
          method: 'GET',
          url: '/foo/:user-parameter',
          baseUrl: MY_AWESOME_SERVICE_PROXY_HTTP_URL,
          statusCode: 200,
        },
      }
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .get('/foo/1234')
        .delay(delay)
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {}, metrics)
      await service.get('/foo/1234', { metrics: { urlLabel: '/foo/:user-parameter' } })

      assert.strictSame(observedMetrics.labels, expectedObservedMetrics.labels)
      assert.ok(observedMetrics.value > delay)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('metrics are NOT collected if disabled on proxy level', async assert => {
      observedMetrics = null
      const expectedObservedMetrics = null
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .get('/foo')
        .delay(delay)
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, { disableMetrics: true }, metrics)
      await service.get('/foo')

      assert.strictSame(observedMetrics, expectedObservedMetrics)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.test('metrics are NOT collected if disabled on request level', async assert => {
      observedMetrics = null
      const expectedObservedMetrics = null
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .get('/foo')
        .delay(delay)
        .reply(200, { the: 'response' })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {}, metrics)
      await service.get('/foo', { metrics: { disabled: true } })

      assert.strictSame(observedMetrics, expectedObservedMetrics)

      myServiceNameScope.done()
      assert.end()
    })

    innerTest.end()
  })

  test.test('returnAs: unknown', async assert => {
    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
    try {
      await service.get('/foo', { returnAs: 'UNKNOWN TYPE' })
      assert.fail('We can\'t reach this!')
    } catch (error) {
      assert.equal(error.message, 'Unknown returnAs: UNKNOWN TYPE')
    }
    assert.end()
  })

  test.test('allowedStatusCodes is not array', async assert => {
    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
    try {
      await service.get('/foo', { validateStatus: 200 })
      assert.fail('We can\'t reach this!')
    } catch (error) {
      assert.equal(error.message, 'validateStatus must be a function')
    }
    assert.end()
  })

  test.test('https', async assert => {
    const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTPS_URL)
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTPS_URL)

    const response = await service.get('/foo')

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
    assert.end()
  })

  test.test('change URL', async assert => {
    const myServiceNameScope = nock('http://my-service-name:3000')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

    const response = await service.get('http://my-service-name:3000/foo')

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
    assert.end()
  })

  test.test('request headers can be overwritten', async assert => {
    const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
      reqheaders: { foo: 'header value chosen by the developer' },
    })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { foo: 'header value chosen by platform' })

    const response = await service.get('/foo?aa=bar', { returnAs: 'JSON', headers: { foo: 'header value chosen by the developer' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('developer can specify a global header', async assert => {
    const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders: { foo: 'global user header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { query: { aa: 'bar' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('global header can be overwritten by a request header', async assert => {
    const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
      reqheaders: { foo: 'request header' },
    })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { headers: { foo: 'request header' }, query: { aa: 'bar' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('request header overwrites global and mia headers', async assert => {
    const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { reqheaders: { foo: 'request header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { foo: 'mia header' }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { query: { aa: 'bar' }, headers: { foo: 'request header' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('global user header overwrites mia header', async assert => {
    const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
      reqheaders: { foo: 'global user header' },
    })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, { foo: 'mia header' }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { query: { aa: 'bar' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('with prefix', async assert => {
    const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
      .replyContentLength()
      .get('/my-prefix/foo/bar?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = new HttpClient(`${MY_AWESOME_SERVICE_PROXY_HTTP_URL}/my-prefix/`)

    const response = await service.get('foo/bar', { query: { aa: 'bar' } })

    assert.equal(response.statusCode, 200)
    assert.strictSame(response.payload, { the: 'response' })
    assert.strictSame(response.headers.some, 'response-header')
    assert.ok(response.headers['content-length'])

    myServiceNameScope.done()
    assert.end()
  })

  test.test('timeout', async assert => {
    const expectedError = new Error('timeout of 100ms exceeded')
    expectedError.code = 'ECONNABORTED'

    assert.test('returnAs: JSON', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .delay(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      await assert.rejects(async() => {
        await service.get('/foo', {
          timeout: 100,
        })
      }, expectedError)

      myServiceNameScope.done()
      assert.end()
    })

    assert.test('returnAs: BUFFER', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .delay(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      await assert.rejects(async() => {
        await service.get('/foo', {
          returnAs: 'BUFFER',
          timeout: 100,
        })
      }, expectedError)

      myServiceNameScope.done()
      assert.end()
    })

    assert.test('returnAs: STREAM with delay body', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .delayBody(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      const response = await service.get('/foo', { returnAs: 'STREAM', timeout: 100 })
      assert.equal(response.statusCode, 200)
      assert.strictSame(response.headers.some, 'response-header')
      assert.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    assert.test('returnAs: STREAM', async assert => {
      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .get('/foo')
        .delay(101)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL)

      await assert.rejects(async() => {
        await service.get('/foo', {
          returnAs: 'STREAM',
          timeout: 100,
        })
      }, expectedError)


      myServiceNameScope.done()
      assert.end()
    })

    assert.end()
  })

  test.test('proxy', async assert => {
    nock.enableNetConnect('127.0.0.1')
    assert.teardown(() => {
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
      serverProxy.authenticate = (req) => {
        assert.strictSame(req.headers['proxy-authorization'], `Basic ${Buffer.from('hello:world').toString('base64')}`)
        return true
      }

      const service = new HttpClient(`http://${server.address().address}:${server.address().port}`)

      const response = await service.get('/foo', {
        proxy: {
          protocol: 'http',
          host: serverProxy.address().address,
          port: serverProxy.address().port,
          auth: {
            username: 'hello',
            password: 'world',
          },
        },
      })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { status: 'ok' })

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
      serverProxy.authenticate = (req) => {
        assert.strictSame(req.headers['proxy-authorization'], `Basic ${Buffer.from('hello:world').toString('base64')}`)
        return true
      }

      const service = new HttpClient(`http://${server.address().address}:${server.address().port}`)

      const response = await service.get('/foo', {
        returnAs: 'BUFFER',
        proxy: {
          protocol: 'http',
          host: serverProxy.address().address,
          port: serverProxy.address().port,
          auth: {
            username: 'hello',
            password: 'world',
          },
        },
      })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload.toString('utf-8'), 'OK')

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
      serverProxy.authenticate = (req) => {
        assert.strictSame(req.headers['proxy-authorization'], `Basic ${Buffer.from('hello:world').toString('base64')}`)
        return true
      }

      const service = new HttpClient(`http://${server.address().address}:${server.address().port}`)

      const response = await service.get('/foo', {
        returnAs: 'STREAM',
        proxy: {
          protocol: 'http',
          host: serverProxy.address().address,
          port: serverProxy.address().port,
          auth: {
            username: 'hello',
            password: 'world',
          },
        },
      })

      assert.equal(response.statusCode, 200)
      assert.ok(response.headers['content-length'])

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })
      assert.strictSame(body, JSON.stringify({ the: 'response' }))

      server.close()
      serverProxy.close()

      assert.end()
    })

    assert.end()
  })

  test.test('tls options', async assert => {
    nock.enableNetConnect('localhost:3200')
    assert.teardown(() => {
      nock.disableNetConnect()
    })

    // eslint-disable-next-line no-sync
    const serverCa = fs.readFileSync('tests/fixtures/keys/ca.crt')
    // eslint-disable-next-line no-sync
    const serverKey = fs.readFileSync('tests/fixtures/keys/server.key')
    // eslint-disable-next-line no-sync
    const serverCert = fs.readFileSync('tests/fixtures/keys/server.crt')

    // eslint-disable-next-line no-sync
    const clientKey = fs.readFileSync('tests/fixtures/keys/client.key')
    // eslint-disable-next-line no-sync
    const clientCert = fs.readFileSync('tests/fixtures/keys/client.crt')

    async function createServer() {
      return new Promise((resolve) => {
        const server = https.createServer({
          requestCert: true,
          rejectUnauthorized: false,
          ca: serverCa,
          key: serverKey,
          cert: serverCert,
        })
        server.listen(3200, 'localhost', () => {
          resolve(server)
        })
      })
    }

    assert.test('returnAs: JSON', async assert => {
      const server = await createServer()

      assert.teardown(() => {
        server.close()
      })

      server.on('request', (req, res) => {
        if (!req.client.authorized) {
          res.writeHead(401)
          return res.end('{"status": "nok"}')
        }

        res.end('{"status": "ok"}')
      })

      const service = new HttpClient('https://localhost:3200')

      const response = await service.get('/', {
        cert: clientCert,
        key: clientKey,
        ca: serverCa,
      })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { status: 'ok' })

      assert.end()
    })


    assert.test('returnAs: BUFFER', async assert => {
      const server = await createServer()

      assert.teardown(() => {
        server.close()
      })

      server.on('request', (req, res) => {
        if (!req.client.authorized) {
          res.writeHead(401)
          res.end('NOK')
        }

        res.end('OK')
      })

      const service = new HttpClient('https://localhost:3200')

      const response = await service.get('/', {
        returnAs: 'BUFFER',
        cert: clientCert,
        key: clientKey,
        ca: serverCa,
      })

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload.toString('utf-8'), 'OK')

      assert.end()
    })


    assert.test('returnAs: STREAM', async assert => {
      const server = await createServer()

      assert.teardown(() => {
        server.close()
      })

      server.on('request', (req, res) => {
        if (!req.client.authorized) {
          res.writeHead(401)
          res.end(JSON.stringify({ the: 'nok' }))
        }

        res.end(JSON.stringify({ the: 'response' }))
      })

      const service = new HttpClient('https://localhost:3200')

      const response = await service.get('/', {
        returnAs: 'STREAM',
        cert: clientCert,
        key: clientKey,
        ca: serverCa,
      })

      assert.equal(response.statusCode, 200)
      assert.ok(response.headers['content-length'])

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.payload.on('data', data => {
          acc += data.toString()
        })
        response.payload.on('end', () => resolve(acc))
      })

      assert.strictSame(body, JSON.stringify({ the: 'response' }))
      assert.end()
    })

    assert.test('returnAs: JSON - passing options to service initialization', async assert => {
      const server = await createServer()

      assert.teardown(() => {
        server.close()
      })

      server.on('request', (req, res) => {
        if (!req.client.authorized) {
          res.writeHead(401)
          return res.end('{"status": "nok"}')
        }

        res.end('{"status": "ok"}')
      })

      const service = new HttpClient('https://localhost:3200', {}, {
        ca: serverCa,
        cert: clientCert,
        key: clientKey,
      })

      const response = await service.get('/')

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { status: 'ok' })

      assert.end()
    })

    assert.test('returnAs: JSON - passing httpsAgent to service initialization', async assert => {
      const server = await createServer()

      assert.teardown(() => {
        server.close()
      })

      server.on('request', (req, res) => {
        if (!req.client.authorized) {
          res.writeHead(401)
          return res.end('{"status": "nok"}')
        }

        res.end('{"status": "ok"}')
      })

      const httpsAgent = new httpsClient.Agent({
        ca: serverCa,
        cert: clientCert,
        key: clientKey,
      })

      const service = new HttpClient('https://localhost:3200', {}, { httpsAgent })

      const response = await service.get('/')

      assert.equal(response.statusCode, 200)
      assert.strictSame(response.payload, { status: 'ok' })

      assert.end()
    })

    assert.end()
  })

  test.test('logger', async innerTest => {
    const USERID_HEADER_KEY = 'userid-header-key'
    const GROUPS_HEADER_KEY = 'groups-header-key'
    const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
    const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
    const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'

    const baseEnv = {
      USERID_HEADER_KEY,
      GROUPS_HEADER_KEY,
      CLIENTTYPE_HEADER_KEY,
      BACKOFFICE_HEADER_KEY,
      MICROSERVICE_GATEWAY_SERVICE_NAME,
    }
    const stream = split(JSON.parse)
    const fastify = await lc39('./tests/services/http-client.js', {
      logLevel: 'trace',
      stream,
      envVariables: baseEnv,
    })

    innerTest.test('log correctly - request ok', async assert => {
      const stream = split(JSON.parse)
      const pino = Pino({ level: 'trace' }, stream)

      stream.once('data', beforeRequest => {
        assert.match(beforeRequest, {
          baseURL: MY_AWESOME_SERVICE_PROXY_HTTP_URL,
          level: 10,
          msg: /^make call$/,
          url: '/foo',
          time: /[0-9]+/,
          headers: {
            some: 'value',
          },
          payload: {
            request: 'body',
          },
        })

        stream.once('data', afterRequest => {
          assert.match(afterRequest, {
            level: 10,
            msg: /^response info$/,
            statusCode: 200,
            headers: {
              some: 'response-header',
            },
            payload: { the: 'response' },
          })
        })
      })

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .post('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })
      const httpClient = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {
        logger: pino,
      })
      const response = await httpClient.post('/foo', {
        request: 'body',
      }, {
        headers: {
          some: 'value',
        },
      })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
    })

    innerTest.test('log correctly - options overwrite base options', async assert => {
      const stream = split(JSON.parse)
      const pino = Pino({ level: 'trace' }, stream)

      stream.once('data', beforeRequest => {
        assert.match(beforeRequest, {
          level: 10,
          baseURL: MY_AWESOME_SERVICE_PROXY_HTTP_URL,
          msg: /^make call$/,
          url: '/foo',
          time: /[0-9]+/,
          headers: {
            some: 'value',
          },
          payload: {
            request: 'body',
          },
        })

        stream.once('data', afterRequest => {
          assert.match(afterRequest, {
            level: 10,
            msg: /^response info$/,
            statusCode: 200,
            headers: {
              some: 'response-header',
            },
            payload: { the: 'response' },
          })
        })
      })

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .post('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })
      const httpClient = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {
        logger: Pino({ level: 'trace' }),
      })
      const response = await httpClient.post('/foo', {
        request: 'body',
      }, {
        headers: {
          some: 'value',
        },
        logger: pino,
      })

      assert.equal(response.statusCode, 200)

      myServiceNameScope.done()
    })

    innerTest.test('log correctly - response error', async assert => {
      const stream = split(JSON.parse)
      const pino = Pino({ level: 'trace' }, stream)

      stream.once('data', beforeRequest => {
        assert.match(beforeRequest, {
          level: 10,
          baseURL: MY_AWESOME_SERVICE_PROXY_HTTP_URL,
          msg: /^make call$/,
          url: '/foo',
          time: /[0-9]+/,
          headers: {
            some: 'value',
          },
          payload: {
            request: 'body',
          },
        })

        stream.once('data', afterRequest => {
          assert.match(afterRequest, {
            level: 50,
            msg: /^response error$/,
            statusCode: 500,
            message: 'error message',
          })
        })
      })

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .post('/foo')
        .reply(500, { message: 'error message' }, {
          some: 'response-header',
        })
      const httpClient = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {
        logger: pino,
      })
      try {
        await httpClient.post('/foo', {
          request: 'body',
        }, {
          headers: {
            some: 'value',
          },
        })
      } catch (error) {
        assert.equal(error.statusCode, 500)
      }


      myServiceNameScope.done()
    })

    innerTest.test('log correctly - generic error', async assert => {
      assert.plan(3)

      stream.once('data', beforeRequest => {
        assert.match(beforeRequest, {
          level: 10,
          baseURL: MY_AWESOME_SERVICE_PROXY_HTTP_URL,
          msg: /^make call$/,
          url: '/foo',
          time: /[0-9]+/,
          headers: {
            some: 'value',
          },
          payload: {
            request: 'body',
          },
        })

        stream.once('data', afterRequest => {
          assert.match(afterRequest, {
            level: 50,
            msg: /^generic request error$/,
            // eslint-disable-next-line id-blacklist
            err: {
              type: 'Error',
              message: 'timeout of 100ms exceeded',
              code: 'ECONNABORTED',
            },
          })
        })
      })

      const myServiceNameScope = nock(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
        .replyContentLength()
        .post('/foo')
        .delay(101)
        .reply(200, { the: 'response' })
      const httpClient = new HttpClient(MY_AWESOME_SERVICE_PROXY_HTTP_URL, {}, {
        logger: fastify.log,
        timeout: 100,
      })
      try {
        await httpClient.post('/foo', {
          request: 'body',
        }, {
          headers: {
            some: 'value',
          },
        })
      } catch (error) {
        assert.equal(error.message, 'timeout of 100ms exceeded')
      }

      myServiceNameScope.done()
    })
  })

  test.test('httpClientMetrics are registered if enabled', async innerTest => {
    const USERID_HEADER_KEY = 'userid-header-key'
    const GROUPS_HEADER_KEY = 'groups-header-key'
    const CLIENTTYPE_HEADER_KEY = 'clienttype-header-key'
    const BACKOFFICE_HEADER_KEY = 'backoffice-header-key'
    const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'

    const baseEnv = {
      USERID_HEADER_KEY,
      GROUPS_HEADER_KEY,
      CLIENTTYPE_HEADER_KEY,
      BACKOFFICE_HEADER_KEY,
      MICROSERVICE_GATEWAY_SERVICE_NAME,
      ENABLE_HTTP_CLIENT_METRICS: true,
    }
    const stream = split(JSON.parse)
    const fastify = await lc39('./tests/services/http-client.js', {
      logLevel: 'trace',
      stream,
      envVariables: baseEnv,
    })

    innerTest.equal(typeof fastify.httpClientMetrics?.requestDuration, 'object')
  })

  test.end()
})
