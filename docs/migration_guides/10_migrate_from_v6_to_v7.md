# Migrate from v6 to v7

With v7 the `getServiceProxy` and `getDirectServiceProxy` methods have been removed.

In order to upgrade to v7 you need to change the implementation using such methods to use another HTTP Client.

Custom Plugin Lib provides the [`getHttpClient`](../http_client.md) method to build an axios-based HTTP client.

## Migrate getDirectServiceProxy

```js
const proxy = fastify.getServiceProxy('my-service', {})
// becomes
const proxy = fastify.getHttpClient('http://microservice-gateway/', {})
```

## Migrate getServiceProxy

```js
const proxy = fastify.getServiceProxy('my-service', {})
// becomes
const proxy = fastify.getHttpClient('http://my-service/', {})
```
