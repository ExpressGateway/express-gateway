Gateway
=======

This is a PoC of a simple HTTP proxy.

Configuration
-------------

The configuration file is a JSON document. It should be a JSON object at the
top level, with the following keys:

- `bindPort`: the port to listen on. Defaults to 8080
- `bindHost`: the IP address to listen on. Defaults to "0.0.0.0"
- `tls`: described below
- `privateEndpoints`: the URLs that the gateway will proxy to. Represented as a
  mapping of endpoint name to an object with the following keys:
  - `url`: the URL to forward requests to
- `pipelines`: a list of objects with the following keys:
  - `name`: the name of the pipeline
  - `publicEndpoints`: the list of URL paths for which requests will be
     handled. Represented as a list of objects with the following keys:
      - `path`: the URL path, e.g. "/products" or "/orders". The gateway will
        listen for requests for any URL that starts with the given string.
  - `processors`: the set of actions that should take place when a request is
    received on one of the public endpoints. Represented as a list of objects
    with the following keys (see below for more information):
    - `condition`. This condition must be satisfied to trigger the action.
    - `action`. The name of the action to carry out.
    - `params`. The parameters for the action.

### TLS

The gateway supports TLS, including SNI (domain-specific TLS certificates). To
configure, use the `tls` option. This option should be an object. Each key
should be a wildcard pattern for matching the domain, and the value should be
an object with `key` and `cert` as keys and paths to the files containing the
data in PEM format.

The special key `default` specifies the cert data to be used if none of the
other domain patterns can be matched, or if SNI is not being used by the
client.

For example:

```json
  {
    "*.lunchbadger.io": {
      "key": "example/keys/lunchbadger.io.key.pem",
      "cert": "example/keys/lunchbadger.io.cert.pem"
    },
    "api.lunchbadger.com": {
      "key": "example/keys/lunchbadger.com.key.pem",
      "cert": "example/keys/lunchbadger.com.cert.pem"
    },
    "default": {
      "key": "example/keys/lunchbadger.io.key.pem",
      "cert": "example/keys/lunchbadger.io.cert.pem"
    }
  }
```

### Processor conditions

Each processor in a pipeline can be gated with a condition specification. Each
condition specification is in the format:

```js
[name, ...params]
```

The name specifies a conditional function. This can be one of the following:

  - `always`: Always matches. If the conditional is missing, it will default to
    this.
  - `never`: Never matches.
  - `pathExact`: Matches if the request's path is an exact match for the
    parameter. Example:

        ["pathExact", "/foo/bar"]

  - `pathMatch`. Matches if the request's path matches the given regular
    expression parameter. Example:

        ["pathMatch", "/foo(/bar)?"]

  - `method`. Parameter can be either a string (e.g. 'GET') or an array of such
    strings. Matches if the request's method matches the parameter.
  - `hostMatch`. Parameter should be a regular expression. Matches if the
    `Host` header passed with the request matches the parameter.

In addition, several functions are provided that allow you to create logical
combinations of conditions. The parameters to these functions should be other
conditional statements:

  - `allOf`: Matches only if all of its parameters match.
  - `oneOf`: Matches if at least one of its parameters matches.
  - `not`: Matches only if its parameter does not.

Example:

```json
["allOf",
  ["pathExact", "/foo/bar"],
  ["not"
    ["method", ["POST", "HEAD"]]]]
```

The above will match only if the exact request path is "/foo/bar" and the
request is *not* a POST or HEAD.

### Processors

Several processors are available. Please note that the order of processors
is important.

#### Throttling

Throttles the requests to a specific rate limit. If the rate limit is reached,
the gateway will return an HTTP 429 return code with an error message.

Each request can be attached to one or more _throttle groups_. Each throttle
group can be specified with its own rate limit. When a request is a member of
multiple groups, each rate limit will be evaluated; exceeding any of the limits
will cause the request to be rejected.

To add a request to a throttle group, use the `throttleGroup` action. The
params format is an object with the following keys:

- `key`: the name of the throttle group to add the request to.

To specify a rate limit use the `throttle` action. The params format is an
object. Each key corresponds to the name of the throttle group. Each value is
an object with the keys:

- `rate`: the number of requests to allow per period
- `period`: the period. Could be one of `second`, `minute`, `hour`.

Example:

```json
{
  "condition": ["pathExact", "/foo"],
  "action": "throttleGroup",
  "params": {
    "key": "foo"
  }
},
{
  "condition": ["always"],
  "action": "throttleGroup",
  "params": {
    "key": "all"
  }
},
{
  "condition": ["always"],
  "action": "throttle",
  "params": {
    "all": {
      "rate": 100,
      "period": "minute"
    },
    "foo": {
      "rate": 1000,
      "period": "minute"
    }
  }
}
```

The above example sets up an overall rate limit of 1000 req/minute, and a more
specific limit for requests to `/foo` of 100 req/minute. Note that since the
overall limit matches *all* requests, successful `/foo` requests will also
count against the overall limit.

#### Proxying

Forwards the request to a private endpoint. The params format is an object
with the following keys:

- `privateEndpoint`: the name of the private endpoint to forward to.

This processor type should generally be placed last in the list.

#### JWT authentication

Authenticates the request via a JWT token. Requests will need to supply an
`Authentication` header with the value formatted as `JWT <token>`.

The parameters are:

- `issuer`: the required issuer name. This will be matched against the value
  in the token provided with the request.
- `audience`: the required audience name. This will be matched against the
  value in the token provided with the request.
- `key`: the public key for verifying the token signature, in PEM format.
- `algorithms`: An array of the supported encryption/signing algorithms.

Example:

```json
{
  "params": {
    "issuer": "https://www.lunchbadger.com",
    "audience": "4kzhU5LqlUpQJmjbMevWkWyt9adeKK",
    "algorithms": ["RS256"],
    "key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
  }
}
```

#### CORS

Provides [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
support via the [cors](https://www.npmjs.com/package/cors) node package. The
parameters are passed through to the `cors`. See the module's documentation for
details.

Example:

```json
...
"processors": [
  {
    "condition": ["always"],
    "action": "cors",
    "params": {
      "origin": ["http://www.example.com"],
      "credentials": true
    }
  }
]
```

#### Logging

Provides capability for simple logging. The only parameter is `message`, with
a string specifying the message to log. This can include placeholders using
the JavaScript [ES6 template literal syntax](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals).

Example:

```json
...
"processors": [
  {
    "condition": ["always"],
    "action": "log",
    "params": {
      "message": "${req.method} ${req.originalUrl}"
    }
  }
]
```

#### URL Rewriting

Allows the URL path to be modified using regular expressions. This can be
useful if the target URL that needs to be proxied to is different from the
request. Takes the following parameters:

- `match`: the regular expression to match. Can include capturing groups.
- `replace`: the string to replace the matched text with. Can include
   references to the captured groups.
- `flags`: flags for the regular expression engine, described
  [here](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters)
- `redirect`: if this is not specified then all following processors, including
  the proxy, will treat the request as if it had been made to the rewritten
  URL. This parameter changes the operation into a redirection instead. The
  value of the parameter should be the HTTP status code to return (must be in
  the 300-range). Note that this will terminate the flow and no subsequent
  processors will be executed.

### Full config example

```json
{
  "bindPort": 3000,
  "bindHost": "127.0.0.1",
  "privateEndpoints": {
    "example": {
      "url": "http://www.example.com"
    },
    "google": {
      "url": "http://www.google.com"
    }
  },
  "pipelines": [
    {
      "name": "main_pipeline",
      "publicEndpoints": [
        {"path": "/example"},
        {"path": "/google"}
      ],
      "processors": [
        {
          "condition": ["pathMatch", "/example"],
          "action": "proxy",
          "params": {
            "privateEndpoint": "example"
          }
        },
        {
          "condition": ["pathMatch", "/google"],
          "action": "proxy",
          "params": {
            "privateEndpoint": "google"
          }
        }
      ]
    }
  ]
}
```

In the above example, a request to `http://127.0.0.1:3000/example` will be
forwarded to `http://www.example.com`, while a request to
`http://127.0.0.1:3000/google` will be forwarded to `http://www.google.com`.

Build and run
-------------

```bash
# build
npm run build

# start
npm start

# create Docker container
docker build -t gateway .
```
