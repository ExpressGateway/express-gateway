Gateway
=======

This is a PoC of a simple HTTP proxy.

Configuration
-------------

The configuration file is a JSON document. It should be a JSON object at the
top level, with the following keys:

- `bindPort`: the port to listen on. Defaults to 8080
- `bindHost`: the IP address to listen on. Defaults to "0.0.0.0"
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
