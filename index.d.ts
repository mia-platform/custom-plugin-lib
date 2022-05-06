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

import * as fastify from 'fastify'
import * as http from 'http'

import {FormatName} from 'ajv-formats'

export = customPlugin

declare function customPlugin<Config extends customPlugin.ServiceConfig = customPlugin.ServiceConfig>(envSchema?: customPlugin.environmentSchema): customPlugin.CustomService<Config>

declare namespace customPlugin {
  type ServiceConfig<T = NodeJS.Dict<string | number>> = T

  type CustomService<Config extends ServiceConfig = ServiceConfig> = (asyncInitFunction: AsyncInitFunction<Config>, serviceOptions?: CustomServiceOptions) => any

  /**
   * @deprecated Do not use this method, use `getHttpClient` instead
   */
  function getDirectServiceProxy(serviceNameOrURL: string, options?: InitServiceOptions): Service
  /**
   * @deprecated Do not use this method, use `getHttpClient` instead
   */
  function getServiceProxy(microserviceGatewayServiceName: string, options?: InitServiceOptions): Service
  function getHttpClient(url: string, options?: HttpClientBaseOptions): HttpClient
  interface environmentSchema {
    type: 'object',
    required?: readonly string[],
    properties: object
  }

  type AsyncInitFunction<Config extends ServiceConfig = ServiceConfig> = (service: DecoratedFastify<Config>) => Promise<void>

  interface CustomServiceOptions {
    ajv?: {
      plugins?: {
        'ajv-formats'?: {formats: FormatName[]}
      }
    }
    vocabulary?: string[]
  }

  type RawCustomPluginAdvancedConfig = Pick<fastify.RouteShorthandOptions,
    'schema' |
    'attachValidation' |
    'validatorCompiler' |
    'bodyLimit' |
    'logLevel' |
    'config' |
    'prefixTrailingSlash'
  >

  type RawCustomPluginMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD'

  type RequestGeneric<T = fastify.RequestGenericInterface> = T

  interface DecoratedFastify<Config extends ServiceConfig = ServiceConfig> extends fastify.FastifyInstance {
    config: Config,
    addRawCustomPlugin<Request extends RequestGeneric = RequestGeneric>(method: RawCustomPluginMethod, path: string, handler: AsyncHandler<Config, Request> | Handler<Config, Request>, schema?: InputOutputSchemas, advancedConfigs?: RawCustomPluginAdvancedConfig): DecoratedFastify,
    addPreDecorator<Request extends RequestGeneric = RequestGeneric>(path: string, handler: preDecoratorHandler<Config, Request>): DecoratedFastify<Config>
    addPostDecorator<Request extends RequestGeneric = RequestGeneric>(path: string, handler: postDecoratorHandler<Config, Request>): DecoratedFastify<Config>
    /**
     * @deprecated Do not use this method, use `getHttpClient` instead
     */
    getDirectServiceProxy: (serviceNameOrURL: string, options?: InitServiceOptions) => Service,
    /**
     * @deprecated Do not use this method, use `getHttpClient` instead
     */
    getServiceProxy: (options?: InitServiceOptions) => Service,
    getHttpClient(url: string, options?: HttpClientBaseOptions): HttpClient,
    addValidatorSchema(schema: object): void,
    getValidatorSchema(schemaId: string): undefined | ((data: any) => boolean | Promise<any>),
  }

  interface DecoratedRequest<Request extends RequestGeneric = RequestGeneric> extends fastify.FastifyRequest<Request> {
    getUserId: () => string | null,
    getUserProperties: () => object | null,
    getGroups: () => string[],
    getClientType: () => string | null,
    isFromBackOffice: () => boolean,
    /**
     * @deprecated Do not use this method, use `getHttpClient` instead
     */
    getDirectServiceProxy: (serviceNameOrURL: string, options?: InitServiceOptions) => Service,
    /**
     * @deprecated Do not use this method, use `getHttpClient` instead
     */
    getServiceProxy: (options?: InitServiceOptions) => Service,
    getHttpClient(url: string, options?: HttpClientBaseOptions): HttpClient,
    USERID_HEADER_KEY: string,
    USER_PROPERTIES_HEADER_KEY: string,
    GROUPS_HEADER_KEY: string,
    CLIENTTYPE_HEADER_KEY: string,
    BACKOFFICE_HEADER_KEY: string,
    MICROSERVICE_GATEWAY_SERVICE_NAME: string,
    ADDITIONAL_HEADERS_TO_PROXY: string[]
  }

  //
  // CUSTOM PLUGIN
  //
  type BasicHandler<Config extends ServiceConfig = ServiceConfig, Request extends RequestGeneric = RequestGeneric, ResponseType = void | Promise<any>> = (this: DecoratedFastify<Config>, request: DecoratedRequest<Request>, reply: fastify.FastifyReply) => ResponseType
  type Handler<Config extends ServiceConfig = ServiceConfig, Request extends RequestGeneric = RequestGeneric> = BasicHandler<Config, Request, void>
  type AsyncHandler<Config extends ServiceConfig = ServiceConfig, Request extends RequestGeneric = RequestGeneric> = BasicHandler<Config, Request, Promise<any>>

  //
  // HTTP CLIENT
  //
  interface HttpClientBaseOptions {
    headers?: http.IncomingHttpHeaders,
    timeout?: number,
    cert?: string,
    key?: string,
    ca?: string,
  }
  interface BaseHttpClientResponse {
    headers: http.IncomingHttpHeaders
    statusCode: number
  }
  interface StreamResponse extends BaseHttpClientResponse {
    payload: NodeJS.ReadableStream
  }
  interface JSONResponse<Payload = any> extends BaseHttpClientResponse {
    payload: Payload
  }
  interface BufferResponse extends BaseHttpClientResponse {
    payload: Buffer
  }
  type Response<Payload = any> = StreamResponse | JSONResponse<Payload> | BufferResponse
  interface HttpClientProxy {
    protocol: 'http' | 'https'
    host: string
    port: number
    auth: {
      username: string
      password: string
    }
  }
  interface HttpClientOptions extends HttpClientBaseOptions {
    returnAs?: 'STREAM' | 'JSON' | 'BUFFER';
    validateStatus?: (statusCode: number) => boolean;
    isMiaHeaderInjected?: boolean;
    errorMessageKey?: string;
    proxy?: HttpClientProxy;
    query?: Record<string, string>;
  }

  interface HttpClient {
    get: <ResponseType = Response>(path: string, options?: HttpClientOptions) => Promise<ResponseType>
    post: <ResponseType = Response>(path: string, body: any | Buffer | ReadableStream, options?: HttpClientOptions) => Promise<ResponseType>
    put: <ResponseType = Response>(path: string, body: any | Buffer | ReadableStream, options?: HttpClientOptions) => Promise<ResponseType>
    patch: <ResponseType = Response>(path: string, body: any | Buffer | ReadableStream, options?: HttpClientOptions) => Promise<ResponseType>
    delete: <ResponseType = Response>(path: string, body: any | Buffer | ReadableStream, options?: HttpClientOptions) => Promise<ResponseType>
  }

  //
  // SERVICE
  //
  interface InitServiceOptions {
    port?: number,
    protocol?: 'http' | 'https',
    headers?: http.IncomingHttpHeaders,
    prefix?: string,
  }
  type Certificate = string | Buffer
  type ResponseFormats = 'JSON' | 'BUFFER' | 'STREAM'
  interface ServiceOptions extends InitServiceOptions{
    returnAs?: ResponseFormats
    allowedStatusCodes?: number[]
    isMiaHeaderInjected?: boolean
    cert?: Certificate
    key?: Certificate
    ca?: Certificate
  }
  interface BaseServiceResponse extends http.ServerResponse {
    headers: http.IncomingHttpHeaders
  }
  interface StreamedServiceResponse extends BaseServiceResponse {
  }
  interface JSONServiceResponse<Payload = any> extends BaseServiceResponse {
    payload: Payload
  }
  interface BufferServiceResponse extends BaseServiceResponse {
    payload: Buffer
  }
  type ServiceResponse<Payload = any> = StreamedServiceResponse | JSONServiceResponse<Payload> | BufferServiceResponse
  type QueryString = string | NodeJS.Dict<string | ReadonlyArray<string>> | Iterable<[string, string]> | ReadonlyArray<[string, string]>

  interface Service {
    get: <ResponseType = ServiceResponse>(path: string, queryString?: QueryString, options?: ServiceOptions) => Promise<ResponseType>,
    post: <ResponseType = ServiceResponse>(path: string, body: any | Buffer | ReadableStream, queryString?: QueryString, options?: ServiceOptions) => Promise<ResponseType>,
    put: <ResponseType = ServiceResponse>(path: string, body: any | Buffer | ReadableStream, queryString?: QueryString, options?: ServiceOptions) => Promise<ResponseType>,
    patch: <ResponseType = ServiceResponse>(path: string, body: any | Buffer | ReadableStream, queryString?: QueryString, options?: ServiceOptions) => Promise<ResponseType>,
    delete: <ResponseType = ServiceResponse>(path: string, body: any | Buffer | ReadableStream, queryString?: QueryString, options?: ServiceOptions) => Promise<ResponseType>,
  }

  //
  // PRE DECORATOR
  //
  interface LeaveRequestUnchangedAction { }
  interface ChangeRequestAction {
    setBody: (newBody: any) => ChangeRequestAction,
    setQuery: (newQuery: QueryString) => ChangeRequestAction,
    setHeaders: (newHeaders: http.IncomingHttpHeaders) => ChangeRequestAction
  }
  interface AbortRequestAction { }
  type PreDecoratorAction = LeaveRequestUnchangedAction | ChangeRequestAction | AbortRequestAction;
  type preDecoratorHandler<Config extends ServiceConfig = ServiceConfig, Request extends RequestGeneric = RequestGeneric> = (this: DecoratedFastify<Config>, request: PreDecoratorDecoratedRequest<Request>, reply: fastify.FastifyReply) => Promise<PreDecoratorAction>;

  interface OriginalRequest {
    method: string,
    path: string,
    query: QueryString,
    headers: http.IncomingHttpHeaders,
    body?: any
  }

  interface OriginalResponse {
    statusCode: number,
    headers: http.OutgoingHttpHeaders,
    body?: any
  }

  interface PreDecoratorDecoratedRequest<Request extends RequestGeneric = RequestGeneric> extends DecoratedRequest<Request> {
    getOriginalRequest: () => OriginalRequest,
    getOriginalRequestMethod: () => string,
    getOriginalRequestPath: () => string,
    getOriginalRequestHeaders: () => http.IncomingHttpHeaders,
    getOriginalRequestQuery: () => QueryString
    getOriginalRequestBody: () => any,

    getMiaHeaders: () => NodeJS.Dict<string>,

    changeOriginalRequest: () => ChangeRequestAction,
    leaveOriginalRequestUnmodified: () => LeaveRequestUnchangedAction,
    abortChain: (statusCode: number, finalBody: any, headers?: http.IncomingHttpHeaders) => AbortRequestAction
  }

  //
  // POST DECORATOR
  //
  interface LeaveResponseUnchangedAction { }
  interface ChangeResponseAction {
    setBody: (newBody: any) => ChangeResponseAction,
    setStatusCode: (newStatusCode: number) => ChangeResponseAction,
    setHeaders: (newHeaders: http.IncomingHttpHeaders) => ChangeResponseAction
  }
  interface AbortResponseAction { }
  type PostDecoratorAction = LeaveResponseUnchangedAction | ChangeResponseAction | AbortResponseAction;
  type postDecoratorHandler<Config extends ServiceConfig = ServiceConfig, Request extends RequestGeneric = RequestGeneric> = (this: DecoratedFastify<Config>, request: PostDecoratorDecoratedRequest<Request>, reply: fastify.FastifyReply) => Promise<PostDecoratorAction>;

  interface PostDecoratorDecoratedRequest<Request extends RequestGeneric = RequestGeneric> extends DecoratedRequest<Request> {
    getOriginalRequest: () => OriginalRequest,
    getOriginalRequestMethod: () => string,
    getOriginalRequestPath: () => string,
    getOriginalRequestHeaders: () => http.IncomingHttpHeaders,
    getOriginalRequestQuery: () => QueryString
    getOriginalRequestBody: () => any,

    getOriginalResponse: () => OriginalResponse,
    getOriginalResponseHeaders: () => http.OutgoingHttpHeaders,
    getOriginalResponseBody: () => any,
    getOriginalResponseStatusCode: () => number,

    getMiaHeaders: () => NodeJS.Dict<string>,

    changeOriginalResponse: () => ChangeResponseAction,
    leaveOriginalResponseUnmodified: () => LeaveResponseUnchangedAction,
    abortChain: (statusCode: number, finalBody: any, headers?: http.IncomingHttpHeaders) => AbortResponseAction
  }

  // Utilities
  interface InputOutputSchemas extends fastify.FastifySchema {
    tags?: string[]
  }
}
