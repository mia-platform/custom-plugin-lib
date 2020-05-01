'use strict'

const tap = require('tap')
const nock = require('nock')

const MY_AWESOME_SERVICE_PROXY_URL = 'my-awesome-service'
const MICROSERVICE_GATEWAY_SERVICE_NAME = 'microservice-gateway'
const { getDirectServiceProxy, getServiceProxy } = require('../index')

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


tap.test('getServiceProxy available for testing', async t => {
  nock.disableNetConnect()
  t.tearDown(() => {
    nock.enableNetConnect()
  })

  const RETURN_MESSAGE = 'OK'
  const customProxy = getServiceProxy(MICROSERVICE_GATEWAY_SERVICE_NAME)(MY_AWESOME_SERVICE_PROXY_URL)

  const microserviceScope = nock(`http://${MICROSERVICE_GATEWAY_SERVICE_NAME}`)
    .get('/test-endpoint')
    .reply(200, {
      message: RETURN_MESSAGE,
    })


  const result = await customProxy.get('/test-endpoint')

  t.strictSame(result.statusCode, 200)
  t.strictSame(result.payload.message, RETURN_MESSAGE)
  microserviceScope.done()
})