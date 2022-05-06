/*
 * Copyright 2022 Mia srl
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

const axios = require('axios')
const nodeUrl = require('url')
const httpsClient = require('https')

class HttpClient {
  constructor(baseUrl, requestMiaHeaders, baseOptions = {}) {
    this.baseUrl = baseUrl
    this.requestMiaHeaders = requestMiaHeaders
    this.baseOptions = baseOptions

    const httpsAgent = getHttpsAgent(baseOptions)
    this.axios = axios.create({
      ...httpsAgent ? { httpsAgent } : {},
      timeout: baseOptions.timeout,
    })
  }

  async get(path, options = {}) {
    return this.makeCall(path, undefined, {
      ...options,
      method: 'GET',
    })
  }

  async post(path, payload, options = {}) {
    return this.makeCall(path, payload, {
      ...options,
      method: 'POST',
    })
  }

  async put(path, payload, options = {}) {
    return this.makeCall(path, payload, {
      ...options,
      method: 'PUT',
    })
  }

  async patch(path, payload, options = {}) {
    return this.makeCall(path, payload, {
      ...options,
      method: 'PATCH',
    })
  }

  async delete(path, payload, options = {}) {
    return this.makeCall(path, payload, {
      ...options,
      method: 'DELETE',
    })
  }

  async makeCall(path, payload, options) {
    let headers = getHeaders(options, this.requestMiaHeaders, this.baseOptions)
    if (typeof payload === 'object') {
      headers = {
        'content-type': 'application/json;charset=utf-8',
        ...headers,
      }
    }
    if (payload === undefined) {
      headers = {
        'content-length': '0',
        'content-type': 'text/html',
        ...headers,
      }
    }
    const url = getUrl(this.baseUrl, path, this.baseOptions)
    const httpsAgent = getHttpsAgent(options)
    const errorMessageKey = getErrorMessageKey(this.baseOptions, options)
    try {
      const validateStatus = getValidateStatus(options)
      const response = await this.axios({
        url,
        method: options.method,
        headers,
        data: getData(payload),
        responseType: getResponseType(options),
        params: options.query,
        ...validateStatus ? { validateStatus } : {},
        timeout: options.timeout,
        proxy: options.proxy,
        ...httpsAgent ? { httpsAgent } : {},
      })
      return {
        statusCode: response.status,
        headers: response.headers,
        payload: response.data,
      }
    } catch (error) {
      if (error.response) {
        const errorMessage = getErrorMessage(error.response, options.returnAs, errorMessageKey)
        const responseError = new Error(errorMessage)
        responseError.headers = error.response.headers
        responseError.statusCode = error.response.status
        responseError.payload = error.response.data
        throw responseError
      }
      const errToReturn = new Error(error.message)
      errToReturn.code = error.code
      throw errToReturn
    }
  }
}

function getErrorMessageKey(baseOptions, options) {
  return options.errorMessageKey || baseOptions.errorMessageKey || 'message'
}

function getHttpsAgent({ cert, ca, key }) {
  if (cert || ca || key) {
    return new httpsClient.Agent({ cert, key, ca })
  }
}

function getValidateStatus({ validateStatus }) {
  if (validateStatus && typeof validateStatus !== 'function') {
    throw new Error('validateStatus must be a function')
  }
  return validateStatus
}

function getData(payload) {
  if (payload === null) {
    return 'null'
  }
  if (payload === undefined) {
    return ''
  }
  return payload
}

const DEFAULT_ERROR_MESSAGE = 'Something went wrong'
function getErrorMessage(response, returnAs, errorMessageKey) {
  const { headers, data } = response
  const contentType = headers['content-type']
  if (!contentType || !contentType.includes('application/json')) {
    return DEFAULT_ERROR_MESSAGE
  }

  switch (returnAs) {
  case 'BUFFER':
    try {
      return JSON.parse(data)[errorMessageKey]
    } catch (error) {
      return DEFAULT_ERROR_MESSAGE
    }
  case 'JSON':
  default:
    return data[errorMessageKey] || DEFAULT_ERROR_MESSAGE
  }
}

function getResponseType({ returnAs = 'JSON' }) {
  switch (returnAs) {
  case 'JSON':
    return 'json'
  case 'BUFFER':
    return 'arraybuffer'
  case 'STREAM':
    return 'stream'
  default:
    throw new Error(`Unknown returnAs: ${returnAs}`)
  }
}

function getUrl(baseUrl, path) {
  const urlObj = new nodeUrl.URL(path, baseUrl)
  return urlObj.toString()
}

function getHeaders(options, miaHeaders, baseOptions) {
  const isMiaHeaderInjected = options.isMiaHeaderInjected === undefined || options.isMiaHeaderInjected
  return {
    ...isMiaHeaderInjected ? miaHeaders : {},
    ...baseOptions.headers || {},
    ...options.headers || {},
  }
}

module.exports = HttpClient

