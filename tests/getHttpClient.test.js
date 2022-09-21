'use strict'

const tap = require('tap')
const nock = require('nock')

const { getHttpClient } = require('../index')

const MY_AWESOME_SERVICE_PROXY_HTTP_URL = 'http://my-awesome-service'
const MY_AWESOME_SERVICE_PROXY_HTTPS_URL = 'https://my-awesome-service'
const MY_AWESOME_SERVICE_PROXY_HTTP_URL_CUSTOM_PORT = 'http://my-awesome-service:3000'
const MY_AWESOME_SERVICE_PROXY_HTTPS_URL_CUSTOM_PORT = 'https://my-awesome-service:3001'

const fastifyMock = {
  httpClientMetrics: {
    requestDuration: {
      observe: () => { /* no-op*/ },
    },
  },
}

tap.test('getHttpClient available for testing - complete url passed', async t => {
  nock.disableNetConnect()
  t.teardown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getHttpClient.call(fastifyMock, MY_AWESOME_SERVICE_PROXY_HTTP_URL)
  const awesomeHttpServiceScope = nock(`${MY_AWESOME_SERVICE_PROXY_HTTP_URL}:80`)
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })

  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  awesomeHttpServiceScope.done()
})

tap.test('getHttpClient available for testing - timeout passed', async t => {
  nock.disableNetConnect()
  t.teardown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getHttpClient.call(fastifyMock, MY_AWESOME_SERVICE_PROXY_HTTP_URL, {
    timeout: 100,
  })
  const awesomeHttpServiceScope = nock(`${MY_AWESOME_SERVICE_PROXY_HTTP_URL}:80`)
    .get('/test-endpoint')
    .delay(101)
    .reply(200, {
      message: RETURN_MESSAGE,
    })

  try {
    await customProxy.get('/test-endpoint')
    t.fail('should not reach this point')
  } catch (error) {
    t.strictSame(error.message, 'timeout of 100ms exceeded')
  }

  awesomeHttpServiceScope.done()
})

tap.test('getHttpClient available for testing - https url', async t => {
  nock.disableNetConnect()
  t.teardown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getHttpClient.call(fastifyMock, MY_AWESOME_SERVICE_PROXY_HTTPS_URL)
  const awesomeHttpsServiceScope = nock(`${MY_AWESOME_SERVICE_PROXY_HTTPS_URL}:443`)
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })

  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  awesomeHttpsServiceScope.done()
})

tap.test('getHttpClient available for testing - custom port 3000 - custom headers', async t => {
  nock.disableNetConnect()
  t.teardown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getHttpClient.call(fastifyMock, MY_AWESOME_SERVICE_PROXY_HTTP_URL_CUSTOM_PORT,
    {
      headers: {
        'test-header': 'test header works',
      },
    })
  const awesomeHttpServiceScope = nock(`${MY_AWESOME_SERVICE_PROXY_HTTP_URL}:3000`)
    .matchHeader('test-header', 'test header works')
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })

  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  awesomeHttpServiceScope.done()
})

tap.test('getHttpClient available for testing - https url - custom port 3001', async t => {
  nock.disableNetConnect()
  t.teardown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getHttpClient.call(fastifyMock, MY_AWESOME_SERVICE_PROXY_HTTPS_URL_CUSTOM_PORT)
  const awesomeHttpsServiceScope = nock(`${MY_AWESOME_SERVICE_PROXY_HTTPS_URL}:3001`)
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })

  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  awesomeHttpsServiceScope.done()
})

tap.test('getHttpClient throws on invalid url', async t => {
  const invalidUrl = 'httpnot-a-complete-url'
  try {
    getHttpClient.call(fastifyMock, invalidUrl)
  } catch (error) {
    t.notOk(true, 'The function should not throw anymore if the url is not a valid one, bet return the standard proxy')
  }
})
