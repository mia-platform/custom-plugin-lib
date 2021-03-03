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

export = customPlugin

declare function customPlugin(envSchema?: customPlugin.environmentSchema): customPlugin.CustomService

declare namespace customPlugin {
  type CustomService = (asyncInitFunction: AsyncInitFunction) => any

  function getDirectServiceProxy(serviceName: string, options?: InitServiceOptions): Service
  function getServiceProxy(microserviceGatewayServiceName: string, options?: InitServiceOptions): Service
  interface environmentSchema {
    type: 'object',
    required?: string[],
    properties: object
  }

  type AsyncInitFunction = (service: DecoratedFastify) => Promise<void>

  type RawCustomPluginAdvancedConfig = Pick<fastify.RouteShorthandOptions,
    'schema' |
    'attachValidation' |
    'schemaCompiler' |
    'bodyLimit' |
    'logLevel' |
    'config' |
    'prefixTrailingSlash'
  >

  interface DecoratedFastify extends fastify.FastifyInstance {
    config: object,
    addRawCustomPlugin(method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD', path: string, handler: AsyncHandler | Handler, schema?: InputOutputSchemas, advancedConfigs?: RawCustomPluginAdvancedConfig): DecoratedFastify,
    addPreDecorator(path: string, handler: preDecoratorHandler): DecoratedFastify
    addPostDecorator(path: string, handler: postDecoratorHandler): DecoratedFastify
    getDirectServiceProxy: (serviceName: string, options?: InitServiceOptions) => Service,
    getServiceProxy: (options?: InitServiceOptions) => Service,
  }

  interface DecoratedRequest extends fastify.FastifyRequest<http.IncomingMessage> {
    getUserId: () => string | null,
    getUserProperties: () => object | null,
    getGroups: () => string[],
    getClientType: () => string | null,
    isFromBackOffice: () => boolean,
    getDirectServiceProxy: (serviceName: string, options?: InitServiceOptions) => Service,
    getServiceProxy: (options?: InitServiceOptions) => Service,
    USERID_HEADER_KEY: string,
    USER_PROPERTIES_HEADER_KEY: string,
    GROUPS_HEADER_KEY: string,
    CLIENTTYPE_HEADER_KEY: string,
    BACKOFFICE_HEADER_KEY: string
  }

  //
  // CUSTOM PLUGIN
  //
  type Handler = (this: DecoratedFastify, request: DecoratedRequest, reply: fastify.FastifyReply<http.ServerResponse>) => void
  type AsyncHandler = (this: DecoratedFastify, request: DecoratedRequest, reply: fastify.FastifyReply<http.ServerResponse>) => Promise<any>

  //
  // SERVICE
  //
  interface InitServiceOptions {
    port?: number,
    protocol?: 'http' | 'https',
    headers?: object,
    prefix?: string,
  }
  interface ServiceOptions extends InitServiceOptions{
    returnAs?: 'JSON' | 'BUFFER' | 'STREAM'
    allowedStatusCodes?: number[]
    isMiaHeaderInjected?: boolean
    cert?: string | Buffer
    key?: string | Buffer
    ca?: string | Buffer
  }
  interface BaseServiceResponse extends http.ServerResponse {
    headers: object
  }
  interface StreamedServiceResponse extends BaseServiceResponse {
  }
  interface JSONServiceResponse extends BaseServiceResponse {
    payload: any
  }
  interface BufferServiceResponse extends BaseServiceResponse {
    payload: Buffer
  }
  type ServiceResponse = StreamedServiceResponse | JSONServiceResponse | BufferServiceResponse

  interface Service {
    get: (path: string, queryString?: object, options?: ServiceOptions) => Promise<ServiceResponse>,
    post: (path: string, body: any | Buffer | ReadableStream, queryString?: object, options?: ServiceOptions) => Promise<ServiceResponse>,
    put: (path: string, body: any | Buffer | ReadableStream, queryString?: object, options?: ServiceOptions) => Promise<ServiceResponse>,
    patch: (path: string, body: any | Buffer | ReadableStream, queryString?: object, options?: ServiceOptions) => Promise<ServiceResponse>,
    delete: (path: string, body: any | Buffer | ReadableStream, queryString?: object, options?: ServiceOptions) => Promise<ServiceResponse>,
  }

  //
  // PRE DECORATOR
  //
  interface LeaveRequestUnchangedAction { }
  interface ChangeRequestAction {
    setBody: (newBody: any) => ChangeRequestAction,
    setQuery: (newQuery: object) => ChangeRequestAction,
    setHeaders: (newHeaders: object) => ChangeRequestAction
  }
  interface AbortRequestAction { }
  type PreDecoratorAction = LeaveRequestUnchangedAction | ChangeRequestAction | AbortRequestAction;
  type preDecoratorHandler = (this: DecoratedFastify, request: PreDecoratorDecoratedRequest, reply: fastify.FastifyReply<http.ServerResponse>) => Promise<PreDecoratorAction>;

  interface OriginalRequest {
    method: string,
    path: string,
    query: object,
    headers: object,
    body?: object
  }

  interface OriginalResponse {
    statusCode: number,
    headers: object,
    body?: object
  }

  interface PreDecoratorDecoratedRequest extends DecoratedRequest {
    getOriginalRequest: () => OriginalRequest,
    getOriginalRequestMethod: () => string,
    getOriginalRequestPath: () => string,
    getOriginalRequestHeaders: () => object,
    getOriginalRequestQuery: () => object
    getOriginalRequestBody: () => any,

    getMiaHeaders: () => object,

    changeOriginalRequest: () => ChangeRequestAction,
    leaveOriginalRequestUnmodified: () => LeaveRequestUnchangedAction,
    abortChain: (statusCode: number, finalBody: any, headers?: object) => AbortRequestAction
  }

  //
  // POST DECORATOR
  //
  interface LeaveResponseUnchangedAction { }
  interface ChangeResponseAction {
    setBody: (newBody: any) => ChangeResponseAction,
    setStatusCode: (newStatusCode: number) => ChangeResponseAction,
    setHeaders: (newHeaders: object) => ChangeResponseAction
  }
  interface AbortResponseAction { }
  type PostDecoratorAction = LeaveResponseUnchangedAction | ChangeResponseAction | AbortResponseAction;
  type postDecoratorHandler = (this: DecoratedFastify, request: PostDecoratorDecoratedRequest, reply: fastify.FastifyReply<http.ServerResponse>) => Promise<PostDecoratorAction>;

  interface PostDecoratorDecoratedRequest extends DecoratedRequest {
    getOriginalRequest: () => OriginalRequest,
    getOriginalRequestMethod: () => string,
    getOriginalRequestPath: () => string,
    getOriginalRequestHeaders: () => object,
    getOriginalRequestQuery: () => object
    getOriginalRequestBody: () => any,

    getOriginalResponse: () => OriginalResponse,
    getOriginalResponseHeaders: () => object,
    getOriginalResponseBody: () => any,
    getOriginalResponseStatusCode: () => number,

    getMiaHeaders: () => object,

    changeOriginalRequest: () => ChangeResponseAction,
    leaveOriginalResponseUnmodified: () => LeaveResponseUnchangedAction,
    abortChain: (statusCode: number, finalBody: any, headers?: object) => AbortResponseAction
  }

  // Utilities
  interface InputOutputSchemas {
    body?: JSONSchema,
    querystring?: JSONSchema,
    headers?: JSONSchema,
    params?: JSONSchema,
    response?: {
      [code: number]: JSONSchema,
      [code: string]: JSONSchema
    },
    tags?: string[]
  }
  type JSONSchema = object
}
