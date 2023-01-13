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
const httpsClient = require('https')
const Pino = require('pino')

class HttpClient {
  constructor(baseUrl, requestHeadersToProxy, baseOptions = {}, metrics = {}) {
    this.baseURL = baseUrl
    this.requestHeadersToProxy = requestHeadersToProxy
    this.baseOptions = baseOptions
    this.metrics = baseOptions.disableMetrics ? {} : metrics

    const httpsAgent = getHttpsAgent(baseOptions)
    this.axios = axios.create({
      ...httpsAgent ? { httpsAgent } : {},
      baseURL: baseUrl,
      timeout: baseOptions.timeout,
    })
    decorateResponseWithDuration(this.axios)
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

  getLogger(options) {
    return options.logger || this.baseOptions.logger || Pino({ level: 'silent' })
  }

  getMaxValues(options) {
    return {
      maxContentLength: options.maxContentLength || this.baseOptions.maxContentLength,
      maxBodyLength: options.maxBodyLength || this.baseOptions.maxBodyLength,
      maxRedirects: options.maxRedirects || this.baseOptions.maxRedirects,
    }
  }

  // eslint-disable-next-line max-statements
  async makeCall(url, payload, options) {
    const logger = this.getLogger(options)
    const headers = getHeaders(options, this.requestHeadersToProxy, this.baseOptions, payload)
    const httpsAgent = getHttpsAgent(options)
    const errorMessageKey = getErrorMessageKey(options, this.baseOptions)
    const metricsOptions = getMetricsOptions(options.metrics, url, this.metrics)
    try {
      const validateStatus = getValidateStatus(options)
      logger.trace({ baseURL: this.baseURL, url, headers, payload }, 'make call')
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
        ...this.getMaxValues(options),
      })
      const responseBody = {
        statusCode: response.status,
        headers: response.headers,
        payload: response.data,
        duration: response.duration,
      }
      logger.trace({ url, ...responseBody }, 'response info')
      if (metricsOptions.enabled) {
        this.metrics.requestDuration.observe({
          method: options.method,
          url: metricsOptions.urlLabel,
          baseUrl: this.baseURL,
          statusCode: response.status,
        },
        response.duration,
        )
      }
      return responseBody
    } catch (error) {
      if (error.response) {
        const errorMessage = getErrorMessage(error.response, options.returnAs, errorMessageKey)
        const responseError = new Error(errorMessage)
        responseError.headers = error.response.headers
        responseError.statusCode = error.response.status
        responseError.payload = error.response.data
        responseError.duration = error.duration
        logger.error({ statusCode: error.response.status, message: errorMessage }, 'response error')
        if (metricsOptions.enabled) {
          this.metrics.requestDuration.observe({
            method: options.method,
            url: metricsOptions.urlLabel,
            baseUrl: this.baseURL,
            statusCode: error.response.status,
          },
          error.duration,
          )
        }
        throw responseError
      }
      const errToReturn = new Error(error.message)
      errToReturn.code = error.code
      // eslint-disable-next-line id-blacklist
      logger.error({ err: errToReturn }, 'generic request error')
      throw errToReturn
    }
  }
}

function getErrorMessageKey(options, baseOptions) {
  return options.errorMessageKey || baseOptions.errorMessageKey || 'message'
}

function getHttpsAgent({ cert, ca, key, httpsAgent }) {
  if (cert || ca || key) {
    return new httpsClient.Agent({ cert, key, ca })
  }
  if (httpsAgent) {
    return httpsAgent
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

function isMiaHeaderToInject(baseOptions, options) {
  if (options.isMiaHeaderInjected !== undefined) {
    return options.isMiaHeaderInjected
  }
  if (baseOptions.isMiaHeaderInjected === undefined && options.isMiaHeaderInjected === undefined) {
    return true
  }
  return baseOptions.isMiaHeaderInjected
}

function getHeaders(options, miaHeaders, baseOptions, payload) {
  const isMiaHeaderInjected = isMiaHeaderToInject(baseOptions, options)
  return {
    ...typeof payload === 'object' ? { 'content-type': 'application/json;charset=utf-8' } : {},
    ...payload === undefined ? { 'content-length': '0', 'content-type': 'text/html' } : {},
    ...isMiaHeaderInjected ? miaHeaders : {},
    ...baseOptions.headers || {},
    ...options.headers || {},
  }
}

function getMetricsOptions(metricsOptions = {}, url, metrics) {
  return {
    enabled: Boolean(metrics.requestDuration && metricsOptions.disabled !== true),
    urlLabel: metricsOptions.urlLabel ?? url,
  }
}

function decorateResponseWithDuration(axiosInstance) {
  axiosInstance.interceptors.response.use(
    (response) => {
      response.config.metadata.endTime = new Date()
      response.duration = response.config.metadata.endTime - response.config.metadata.startTime
      return response
    },
    (error) => {
      error.config.metadata.endTime = new Date()
      error.duration = error.config.metadata.endTime - error.config.metadata.startTime
      return Promise.reject(error)
    }
  )

  axiosInstance.interceptors.request.use(
    (config) => {
      config.metadata = { startTime: new Date() }
      return config
    }, (error) => {
      return Promise.reject(error)
    })
}

module.exports = HttpClient

