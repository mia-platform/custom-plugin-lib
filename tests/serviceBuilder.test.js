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

/* eslint id-length: 0 */
/* eslint require-await: 0 */
/* eslint no-shadow: 0 */
/* eslint no-magic-numbers: 0 */
/* eslint no-use-before-define: 0 */
/* eslint max-nested-callbacks: 0 */
/* eslint max-statements-per-line: 0 */
/* eslint max-lines: 0 */
'use strict'

const t = require('tap')
const nock = require('nock')

const serviceBuilder = require('../lib/serviceBuilder')

const reqheaders = { 'content-type': 'application/json;charset=utf8' }

const { Readable } = require('stream')

nock.disableNetConnect()

t.test('serviceBuilder', t => {
  t.test('get', async t => {
    t.test('returnAs: JSON', async t => {
      t.plan(4)
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('returnAs: JSON default', async t => {
      t.plan(4)
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo')

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('returnAs: BUFFER', async t => {
      t.plan(4)
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { returnAs: 'BUFFER' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('returnAs: STREAM', async t => {
      t.plan(4)
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', {}, { returnAs: 'STREAM' })
      t.equal(response.statusCode, 200)
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => { acc += data.toString() })
        response.on('end', () => resolve(acc))
      })
      t.strictSame(body, JSON.stringify({ the: 'response' }))
    })

    t.test('with queryparameter', async t => {
      t.plan(4)
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo?aa=bar')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo', { aa: 'bar' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('returnAs: JSON but xml is returned', async t => {
      t.plan(2)
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(500, '<some><xml /></some>')

      const service = serviceBuilder('my-service-name')

      try {
        await service.get('/foo')
      } catch (error) {
        t.strictSame(error.res.statusCode, 500)
        t.strictSame(error.payload, Buffer.from('<some><xml /></some>'))
      }

      myServiceNameScope.done()
    })

    t.test('on 500 doesn\'t reject the promise', async t => {
      t.plan(4)
      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .get('/foo')
        .reply(500, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.get('/foo')

      t.equal(response.statusCode, 500)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('on TCP error rejects the promise', async t => {
      t.plan(1)

      nock.enableNetConnect('unresolved-hostname-i-hope-so')

      const service = serviceBuilder('unresolved-hostname-i-hope-so')

      try {
        await service.get('/foo')
      } catch (error) {
        t.equal(error.code, 'ENOTFOUND')
      }
    })

    t.end()
  })

  t.test('post', t => {
    t.test('send Object - returnAs: JSON', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('send String - returnAs: JSON', async t => {
      t.plan(4)

      const THE_SENT_BODY = 'this is my custom body'

      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('send Buffer - returnAs: JSON', async t => {
      t.plan(4)

      const THE_SENT_BODY = new Buffer('my buffer')

      const myServiceNameScope = nock('http://my-service-name')
        .replyContentLength()
        .post('/foo', THE_SENT_BODY.toString('utf8'))
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('send Stream - returnAs: JSON', async t => {
      t.plan(4)

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

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('send nothing - returnAs: JSON', async t => {
      t.plan(4)

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

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('with querystring - returnAs: JSON', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo?qq=foobar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, { qq: 'foobar' }, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('send Object - returnAs: BUFFER', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'BUFFER' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, Buffer.from(JSON.stringify({ the: 'response' })))
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('send Object - returnAs: STREAM', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY, {}, { returnAs: 'STREAM' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])
      myServiceNameScope.done()

      await wait(200)

      const body = await new Promise(resolve => {
        let acc = ''
        response.on('data', data => { acc += data.toString() })
        response.on('end', () => resolve(acc))
      })
      t.strictSame(body, JSON.stringify({ the: 'response' }))
    })

    t.test('on 500 doesn\'t reject the promise', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }
      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', THE_SENT_BODY)
        .reply(500, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY)

      t.equal(response.statusCode, 500)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.test('on TCP error rejects the promise', async t => {
      t.plan(1)

      nock.enableNetConnect('unresolved-hostname-i-hope-so')

      const service = serviceBuilder('unresolved-hostname-i-hope-so')

      try {
        await service.post('/foo', { the: 'sent body' }, {}, { returnAs: 'BUFFER' })
      } catch (error) {
        t.equal(error.code, 'ENOTFOUND')
      }
    })

    t.test('send null', async t => {
      t.plan(4)

      const THE_SENT_BODY = null
      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .post('/foo', 'null')
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.post('/foo', THE_SENT_BODY)

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.end()
  })

  t.test('put', t => {
    t.test('send Object - returnAs: JSON', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .put('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.put('/foo', THE_SENT_BODY, { aa: 'bar' }, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.end()
  })

  t.test('patch', t => {
    t.test('send Object - returnAs: JSON', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .patch('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.patch('/foo', THE_SENT_BODY, { aa: 'bar' }, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.end()
  })

  t.test('delete', t => {
    t.test('send Object - returnAs: JSON', async t => {
      t.plan(4)

      const THE_SENT_BODY = { the: 'sent body' }

      const myServiceNameScope = nock('http://my-service-name', { reqheaders })
        .replyContentLength()
        .delete('/foo?aa=bar', THE_SENT_BODY)
        .reply(200, { the: 'response' }, {
          some: 'response-header',
        })

      const service = serviceBuilder('my-service-name')

      const response = await service.delete('/foo', THE_SENT_BODY, { aa: 'bar' }, { returnAs: 'JSON' })

      t.equal(response.statusCode, 200)
      t.strictSame(response.payload, { the: 'response' })
      t.strictSame(response.headers.some, 'response-header')
      t.ok(response.headers['content-length'])

      myServiceNameScope.done()
    })

    t.end()
  })

  t.test('returnAs: unknwon', async t => {
    t.plan(1)

    const service = serviceBuilder('my-service-name')
    try {
      await service.get('/foo', {}, { returnAs: 'UNKNWON TYPE' })
    } catch (error) {
      t.equal(error.message, 'Unknwon returnAs: UNKNWON TYPE')
    }
  })

  t.test('https', async t => {
    t.plan(3)

    const myServiceNameScope = nock('https://my-service-name:443')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name')

    const response = await service.get('/foo', {}, { protocol: 'https' })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
  })

  t.test('https in service build', async t => {
    t.plan(3)

    const myServiceNameScope = nock('https://my-service-name:443')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', {}, { protocol: 'https' })

    const response = await service.get('/foo', {})

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
  })

  t.test('change port', async t => {
    t.plan(3)

    const myServiceNameScope = nock('http://my-service-name:3000')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name')

    const response = await service.get('/foo', {}, { port: 3000 })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
  })

  t.test('base options change port', async t => {
    t.plan(3)

    const myServiceNameScope = nock('http://my-service-name:3000')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', {}, { port: 3000 })

    const response = await service.get('/foo', {})

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
  })

  t.test('base options change port, override during call', async t => {
    t.plan(3)

    const myServiceNameScope = nock('http://my-service-name:5000')
      .get('/foo')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', {}, { port: 3000 })

    const response = await service.get('/foo', {}, { port: 5000 })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')

    myServiceNameScope.done()
  })

  t.test('request headers can be overwritten', async t => {
    t.plan(4)

    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'header value chosen by the developer' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { foo: 'header value chosen by platform' })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON', headers: { foo: 'header value chosen by the developer' } })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')
    t.ok(response.headers['content-length'])

    myServiceNameScope.done()
  })

  t.test('developer can specify a global header', async t => {
    t.plan(4)

    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'global user header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON' })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')
    t.ok(response.headers['content-length'])

    myServiceNameScope.done()
  })

  t.test('global header can be overwritten by a request header', async t => {
    t.plan(4)

    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'request header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON', headers: { foo: 'request header' } })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')
    t.ok(response.headers['content-length'])

    myServiceNameScope.done()
  })

  t.test('request header overwrite global and mia headers', async t => {
    t.plan(4)

    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'request header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { foo: 'mia header' }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON', headers: { foo: 'request header' } })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')
    t.ok(response.headers['content-length'])

    myServiceNameScope.done()
  })

  t.test('mia header overwrite global header', async t => {
    t.plan(4)

    const myServiceNameScope = nock('http://my-service-name', { reqheaders: { foo: 'mia header' } })
      .replyContentLength()
      .get('/foo?aa=bar')
      .reply(200, { the: 'response' }, {
        some: 'response-header',
      })

    const service = serviceBuilder('my-service-name', { foo: 'mia header' }, { headers: { foo: 'global user header' } })

    const response = await service.get('/foo', { aa: 'bar' }, { returnAs: 'JSON' })

    t.equal(response.statusCode, 200)
    t.strictSame(response.payload, { the: 'response' })
    t.strictSame(response.headers.some, 'response-header')
    t.ok(response.headers['content-length'])

    myServiceNameScope.done()
  })

  t.end()
})

function wait(n) {
  return new Promise(resolve => setTimeout(resolve, n))
}
