'use strict'

const tap = require('tap')
const nock = require('nock')

const MY_AWESOME_SERVICE_PROXY_URL = 'my-awesome-service'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'
const MY_AWESOME_SERVICE_PROXY_HTTP_URL = 'http://my-awesome-service'
const MY_AWESOME_SERVICE_PROXY_HTTPS_URL = 'https://my-awesome-service'
const MY_AWESOME_SERVICE_PROXY_HTTP_URL_CUSTOM_PORT = 'http://my-awesome-service:3000'
const MY_AWESOME_SERVICE_PROXY_HTTPS_URL_CUSTOM_PORT = 'https://my-awesome-service:3001'

const {
  getDirectServiceProxy,
  getServiceProxy,
} = require('../index')

tap.test('getDirectServiceProxy available for testing', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getDirectServiceProxy(MY_AWESOME_SERVICE_PROXY_URL)
  const awesomeServiceScope = nock(`http://${MY_AWESOME_SERVICE_PROXY_URL}:80`)
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })

  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  awesomeServiceScope.done()
})

tap.test('getDirectServiceProxy accept all options', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getDirectServiceProxy(MY_AWESOME_SERVICE_PROXY_URL, {
    port: 3000,
  })

  const awesomeServiceScope = nock(`http://${MY_AWESOME_SERVICE_PROXY_URL}:3000`)
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })

  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  awesomeServiceScope.done()
})

tap.test('getServiceProxy available for testing', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getServiceProxy(MICROSERVICE_GATEWAY_SERVICE_NAME, { port: 3000 })
  const microserviceScope = nock(`http://${MICROSERVICE_GATEWAY_SERVICE_NAME}:3000`)
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })


  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  microserviceScope.done()
})

tap.test('getDirectServiceProxy available for testing - complete url passed', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getDirectServiceProxy(MY_AWESOME_SERVICE_PROXY_HTTP_URL)
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

tap.test('getDirectServiceProxy available for testing - https url', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getDirectServiceProxy(MY_AWESOME_SERVICE_PROXY_HTTPS_URL)
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

tap.test('getDirectServiceProxy available for testing - custom port 3000 - custom headers', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getDirectServiceProxy(MY_AWESOME_SERVICE_PROXY_HTTP_URL_CUSTOM_PORT,
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

tap.test('getDirectServiceProxy available for testing - https url - custom port 3001', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getDirectServiceProxy(MY_AWESOME_SERVICE_PROXY_HTTPS_URL_CUSTOM_PORT)
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

tap.test('getDirectServiceProxy throws on invalid url', async t => {
  const invalidUrl = 'httpnot-a-complete-url'
  try {
    getDirectServiceProxy(invalidUrl)
  } catch (error) {
    t.notOk(true, 'The function should not throw anymore if the url is not a valid one, bet return the standard proxy')
  }
})
