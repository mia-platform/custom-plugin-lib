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

declare function customPlugin<ServiceConfig = NodeJS.Dict<string>>(envSchema?: customPlugin.environmentSchema): customPlugin.CustomService<ServiceConfig>

declare namespace customPlugin {
  type CustomService<ServiceConfig> = (asyncInitFunction: AsyncInitFunction<ServiceConfig>, serviceOptions?: CustomServiceOptions) => any

  function getDirectServiceProxy(serviceNameOrURL: string, options?: InitServiceOptions): Service
  function getServiceProxy(microserviceGatewayServiceName: string, options?: InitServiceOptions): Service
  interface environmentSchema {
    type: 'object',
    required?: readonly string[],
    properties: object
  }

  type AsyncInitFunction<ServiceConfig = NodeJS.Dict<string>> = (service: DecoratedFastify<ServiceConfig>) => Promise<void>

  interface CustomServiceOptions {
    avj?: {
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

  interface DecoratedFastify<ServiceConfig = NodeJS.Dict<string>> extends fastify.FastifyInstance {
    config: ServiceConfig,
    addRawCustomPlugin<RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface>(method: RawCustomPluginMethod, path: string, handler: AsyncHandler<ServiceConfig, RequestGeneric> | Handler<ServiceConfig, RequestGeneric>, schema?: InputOutputSchemas, advancedConfigs?: RawCustomPluginAdvancedConfig): DecoratedFastify,
    addPreDecorator<RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface>(path: string, handler: preDecoratorHandler<ServiceConfig, RequestGeneric>): DecoratedFastify<ServiceConfig>
    addPostDecorator<RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface>(path: string, handler: postDecoratorHandler<ServiceConfig, RequestGeneric>): DecoratedFastify<ServiceConfig>
    getDirectServiceProxy: (serviceNameOrURL: string, options?: InitServiceOptions) => Service,
    getServiceProxy: (options?: InitServiceOptions) => Service,
    addValidatorSchema(schema: object): void,
    getValidatorSchema(schemaId: string): undefined | ((data: any) => boolean | Promise<any>),
  }

  interface DecoratedRequest<RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface> extends fastify.FastifyRequest<RequestGeneric> {
    getUserId: () => string | null,
    getUserProperties: () => object | null,
    getGroups: () => string[],
    getClientType: () => string | null,
    isFromBackOffice: () => boolean,
    getDirectServiceProxy: (serviceNameOrURL: string, options?: InitServiceOptions) => Service,
    getServiceProxy: (options?: InitServiceOptions) => Service,
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
  type BasicHandler<
    ServiceConfigType = NodeJS.Dict<string>,
    RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface,
    ResponseType = void | Promise<any>,
  > = (this: DecoratedFastify<ServiceConfigType>, request: DecoratedRequest<RequestGeneric>, reply: fastify.FastifyReply) => ResponseType
  type Handler<
    ServiceConfigType = NodeJS.Dict<string>,
    RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface,
  > = BasicHandler<ServiceConfigType, RequestGeneric, void>
  type AsyncHandler<
    ServiceConfigType = NodeJS.Dict<string>,
    RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface,
  > = BasicHandler<ServiceConfigType, RequestGeneric, Promise<any>>

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
  type preDecoratorHandler<
    ServiceConfigType = NodeJS.Dict<string>,
    RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface,
  > = (this: DecoratedFastify<ServiceConfigType>, request: PreDecoratorDecoratedRequest<RequestGeneric>, reply: fastify.FastifyReply) => Promise<PreDecoratorAction>;

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

  interface PreDecoratorDecoratedRequest<RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface> extends DecoratedRequest<RequestGeneric> {
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
  type postDecoratorHandler<
    ServiceConfigType = NodeJS.Dict<string>,
    RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface,
  > = (this: DecoratedFastify<ServiceConfigType>, request: PostDecoratorDecoratedRequest<RequestGeneric>, reply: fastify.FastifyReply) => Promise<PostDecoratorAction>;

  interface PostDecoratorDecoratedRequest<RequestGeneric extends fastify.RequestGenericInterface = fastify.RequestGenericInterface> extends DecoratedRequest<RequestGeneric> {
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
