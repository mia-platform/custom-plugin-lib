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

/* eslint no-extra-parens: 0 */
/* eslint no-magic-numbers: 0 */
'use strict'

const url = require('url')
const { promisify } = require('util')

const sget = require('simple-get')
const sgetPromisified = promisify(sget)

function convertBody(body) {
  if (body === undefined) {
    return body
  }
  if (body === null) {
    return 'null'
  }
  if (typeof body === 'string') {
    return body
  }
  if (Buffer.isBuffer(body)) {
    return body
  }
  // is a stream
  if (typeof body.pipe === 'function') {
    return body
  }
  return JSON.stringify(body)
}

function makeCallAsStream(endUrl, method, body, options) {
  return sgetPromisified({
    url: endUrl,
    method,
    body,
    headers: options.headers,
  })
}

function makeCallAsBuffer(endUrl, method, body, options) {
  return new Promise(function promiseFunction(resolve, reject) {
    sget.concat({
      url: endUrl,
      method,
      body,
      headers: options.headers,
    }, function onResult(error, res, data) {
      if (error) {
        return reject(error)
      }
      // ugly
      if (options.allowedStatusCodes && !options.allowedStatusCodes.includes(res.statusCode)) {
        return reject(new Error('Status code of the response is not included in the allowed status codes.'))
      }
      res.payload = data
      resolve(res)
    })
  })
}

function makeCallAsJSON(endUrl, method, body, options) {
  return new Promise(function promiseFunction(resolve, reject) {
    sget.concat({
      url: endUrl,
      method,
      body,
      headers: options.headers,
    }, function onResult(error, res, data) {
      if (error) {
        return reject(error)
      }
      // ugly
      let payload
      try {
        payload = JSON.parse(data)
      } catch (parseError) {
        parseError.res = res
        parseError.payload = data
        return reject(parseError)
      }
      if (options.allowedStatusCodes && !options.allowedStatusCodes.includes(res.statusCode)) {
        return reject(new Error('Status code of the response is not included in the allowed status codes.'))
      }
      res.payload = payload
      resolve(res)
    })
  })
}

function makeCall(hostname, path, method, querystring, body, options = {}) {
  const protocol = (options && options.protocol) ? options.protocol : 'http'
  const port = (options && options.port) ? options.port : undefined
  const pathWithPrefix = ((options && options.prefix) ? options.prefix : '') + path
  const endUrl = url.format({
    protocol,
    hostname,
    port,
    pathname: pathWithPrefix,
    query: querystring,
  })
  const asJSON = !options || !options.returnAs || options.returnAs === 'JSON'
  const asStream = options && options.returnAs === 'STREAM'
  const asBuffer = options && options.returnAs === 'BUFFER'

  const isJSON = !Buffer.isBuffer(body) && typeof body !== 'string' && !(body && typeof body.pipe === 'function')
  if (isJSON) {
    options.headers = options.headers || {}
    options.headers['content-type'] = 'application/json;charset=utf8'
  }

  if (!body) {
    options.headers = options.headers || {}
    options.headers['content-length'] = '0'
  }

  if (asStream) {
    return makeCallAsStream(endUrl, method, convertBody(body), options)
  } else if (asJSON) {
    return makeCallAsJSON(endUrl, method, convertBody(body), options)
  } else if (asBuffer) {
    return makeCallAsBuffer(endUrl, method, convertBody(body), options)
  } else {
    return Promise.reject(new Error(`Unknwon returnAs: ${options.returnAs}`))
  }
}

function getHeader(options, miaHeaders, baseOptions) {
  return Object.assign({}, miaHeaders || {}, baseOptions.headers || {}, options.headers || {})
}

function Service(serviceName, requestMiaHeaders, baseOptions = {}) {
  this.serviceName = serviceName
  this.requestMiaHeaders = requestMiaHeaders
  this.baseOptions = baseOptions
}

Service.prototype = {
  get(path, querystring, options = {}) {
    options.headers = getHeader(options, this.requestMiaHeaders, this.baseOptions)
    return makeCall(this.serviceName, path, 'GET', querystring, undefined, { ...this.baseOptions, ...options })
  },
  post(path, body, querystring, options = {}) {
    options.headers = getHeader(options, this.requestMiaHeaders, this.baseOptions)
    return makeCall(this.serviceName, path, 'POST', querystring, body, { ...this.baseOptions, ...options })
  },
  put(path, body, querystring, options = {}) {
    options.headers = getHeader(options, this.requestMiaHeaders, this.baseOptions)
    return makeCall(this.serviceName, path, 'PUT', querystring, body, { ...this.baseOptions, ...options })
  },
  patch(path, body, querystring, options = {}) {
    options.headers = getHeader(options, this.requestMiaHeaders, this.baseOptions)
    return makeCall(this.serviceName, path, 'PATCH', querystring, body, { ...this.baseOptions, ...options })
  },
  delete(path, body, querystring, options = {}) {
    options.headers = getHeader(options, this.requestMiaHeaders, this.baseOptions)
    return makeCall(this.serviceName, path, 'DELETE', querystring, body, { ...this.baseOptions, ...options })
  },
}

function serviceBuilder(serviceName, requestMiaHeaders, baseOptions) {
  return new Service(serviceName, requestMiaHeaders, baseOptions)
}

module.exports = serviceBuilder
