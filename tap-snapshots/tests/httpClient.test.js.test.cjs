/* IMPORTANT
 * This snapshot file is auto-generated, but designed for humans.
 * It should be checked into source control and tracked carefully.
 * Re-generate by setting TAP_SNAPSHOT=1 and running tests.
 * Make sure to inspect the output below.  Do not ignore changes!
 */
'use strict'
exports[`tests/httpClient.test.js TAP httpClient logger log correctly - redact data > must match snapshot 1`] = `
Array [
  Object {
    "headers": Object {
      "authorization": "[REDACTED]",
      "content-type": "application/json;charset=utf-8",
      "cookie": "[REDACTED]",
    },
    "payload": Object {
      "email": "[REDACTED]",
      "password": "[REDACTED]",
      "username": "[REDACTED]",
    },
  },
  Object {
    "headers": Object {
      "content-length": "18",
      "content-type": "application/json",
    },
    "payload": Object {
      "the": "response",
    },
  },
]
`
