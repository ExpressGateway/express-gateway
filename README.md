Express Gateway
=======

This is an API Gateway built using Express and Express middleware.

Configuration
-------------

The configuration file is a YAML(or JSON) document.
It consists of the following sections:
* http
* https
* apiEndpoints
* serviceEndpoints
* policies
* pipelines

### http
The section defines how to setup EG HTTP server.
If http section is not provided EG will not listen to HTTP protocol
- `port`: the port to listen to
```yaml
http:
  port: 9080
```

### https
Configures EG HTTPS server. If not provided EG will not serve HTTPS requests (useful for dev environment or if https resolving is handled by upstream proxy)
- `port`: the port to listen to
- `tls`: list of certificates

The gateway supports TLS, including SNI (domain-specific TLS certificates). To
configure, use the `https.tls` option. Each key
should be a wildcard pattern for matching the domain, and the value should be
an object with `key` and `cert` as keys and paths to the files containing the
data in PEM format.

The special key `default` specifies the cert data to be used if none of the
other domain patterns can be matched, or if SNI is not being used by the
client.

For example:
```yaml

https:
  port: 9443
  tls:
    - "*.demo.io":
        key: example/keys/demo.io.key.pem
        cert: example/keys/demo.io.cert.pem
    - "api.acme.com":
        key: example/keys/acme.com.key.pem
        cert: example/keys/acme.com.cert.pem
    - "default":
        key: example/keys/lunchbadger.io.key.pem
        cert: example/keys/lunchbadger.io.cert.pem

```
### apiEndpoints:
A list of host + paths combinations that your EG will listen to

#### minimalistic usage
```yaml
apiEndpoints:
  api:
```
This declaration fallbacks to defaults for host and paths properties
It will serve all host names and all possible urls

#### Standard usage
```yaml
apiEndpoints:
  api: # name, used as reference in pipeline
    host: '*.com' # wildcard pattern support
    paths: ['/v1/**'] # string or array of string
  example: # name, used as reference in pipeline
    host: 'example.com' # wildcard pattern support
    paths:
      - /v2/** # string or array of string
  help: # name, used as reference in pipeline
    host: '*' # by default accepts all hosts, same as '*'
    paths: /help #by default will serve all requests - same as **
```

#### Host
host - string that will be matched against 'HOST' header of request

##### Host examples
+ example.com - one domain match, will not match subdomains
+ *.example.com -
  - any subdomain will match. test.example.com
  - example.com will not match
  - deeper levels will not match cdn.test.example.com
+ **.example.com
  - will match any level subdomain
  - will not match example.com host

See more examples here https://www.npmjs.com/package/vhost

#### Path examples
Paths can be either string or array of strings. It supports wildcard patterns

##### Examples
* paths: /admin - exact string match
  + match: /admin
  + 404: /admin/ /admin/new /admin/new/1

* paths: /admin/* - 1 level child matching (does not match to parent dir)
  + match: /admin/new
  + 404: /admin  /admin/new/1 /admin/

* paths: /admin/\*\* - deep level child matching (does not match to parent dir)
  + match: /admin/new /admin/new/1 /admin/
  + 404: /admin

* paths: ['/admin', '/admin/\*\*']  - deep level child matching and directory itself
  alternative syntax  paths: /{admin,admin/\*\*}
  + match: /admin/new /admin/new/1 /admin /admin/

* paths: ['/student/\*\*', '/teacher/\*\*','/admin/\*\*']
  + match:
      - /admin/... multi-level
      - /student/... multi-level
      - /teacher/... multi-level
  + 404:
      - /
      - /admin; /teacher; /student
      - /random etc.


#### Overlapping api endpoints usage
Note: If not possible to avoid overlapping wildcard patterns, ~~try again~~ be aware that order of registration is important, put more specific patterns higher.

```yaml
apiEndpoints:
  ci:
    host: '*.ci.zu.com'
    paths: '**'    # optional default **
  zu:
    host: '*.zu.com'
  com:
    host: '*.com'
```

serviceEndpoints
----------------
serviceEndpoints map of URLs that the gateway will proxy to.

```yaml
serviceEndpoints: # urls to downstream services
  cats_service:
    url: "http://localhost"
    port: 3000
    paths: /             # optional defaults to /
  dogs_service:
    url: http://localhost
    port: 4000
```
Use name of properties (`cats_service` etc.) to reference in pipelines


policies
--------
White-list Array of enabled policies with settings (if needed)

#### Referencing well-known policies
```yaml
policies:
  - name: 'name-test'
```
EG will try to find and load package with prefix `express-gateway-policy-`

in this case  `express-gateway-policy-name-test` npm package

#### Referencing custom package
```yaml
policies:
  - package: 'plugin-test'
    someParam: "plugin test param"
```
if property `package` is used instead of `name` EG will try to install exactly what is in the value.

`package` accepts any variant supported by [npm install](https://docs.npmjs.com/cli/install), e.g. git url, github, tarball etc.

See custom policy development manual

Pipelines
---------

Represented as a
  mapping of endpoint name to an object with the following keys:
  - `url`: the URL to forward requests to
- `pipelines`: a list of objects with the following keys:
  - `name`: the name of the pipeline
  - `Policies`: the set of policies that should take place when a request is
    received on one of the public endpoints. Each policy is represented as a list of objects
    with the following keys (see below for more information):
    - `condition`. This condition must be satisfied to trigger the action.
    - `action`. The name of the action to carry out.

```yaml
http:
  port: 3000
serviceEndpoints:
  example: # will be referenced in proxy policy
    url: 'http://example.com'
apiEndpoints:
  api:
    host: '*'
    paths: /
pipelines:
  api:
    apiEndpoints:
      - api
    policies:
      simple-logger: # policy name
        -   # array of objects with condition\action properties
          condition: #optional; defaults to always execute
            name: pathExact
            paths: /v1
          action:
            name: log
            message: "${method} ${originalUrl}"
      proxy: # policy name
        -    # array of objects with condition\action properties
          action:
            name: proxy
            serviceEndpoint: example # see declaration above

```


### Policy conditions

Each Policy in a pipeline can be gated with a condition specification. Each
condition specification is in the format:

```yaml
  condition:
    name: condition-name # examples: proxy; log;
    some-param-1: p1 # if condition requires parameters this is where to put them
    some-param-2: p1 #
```

The name specifies a condition function. This can be one of the following:

  - `always`: Always matches. If the condition is missing, it will default to
    this.
  - `never`: Never matches.
  - `pathExact`: Matches if the request's path is an exact match for the
    parameter. Example:
```yaml
  condition:
    name: pathExact
    path: "/foo/bar"
```
  - `pathMatch`. Matches if the request's path matches the given regular
    expression parameter. Example:
```yaml
  condition:
    name: pathMatch
    path: "/foo(/bar)?"
```

  - `method`. Matches if the request's method matches the `methods` parameter.
    Accepts can be either a string (e.g. 'GET') or an array of such strings.
  - `hostMatch`. Parameter should be a regular expression. Matches if the
    `Host` header passed with the request matches the parameter.

In addition, several functions are provided that allow you to create logical
combinations of conditions. The parameters to these functions should be other
condition statements:

  - `allOf`: Matches only if all of its parameters match.
  - `oneOf`: Matches if at least one of its parameters matches.
  - `not`: Matches only if its parameter does not.

Example:

```json
{
  "name" :"allOf",
    "conditions": [
      {"name":"pathExact", "path": "/foo/bar"},
      { "name":"not",
        "condition":{ "name":"method", "methods": ["POST", "HEAD"]}
      }
    ]
}
```

The above will match only if the exact request path is "/foo/bar" and the
request is *not* a POST or HEAD.

Best Practise Note: While it is possible to build quite complicated condition tree, huge trees could greatly affect readability of your EG configuration. In such cases it could be better to have multiple api endpoints and pipelines

The following two configs are equivalent, however we believe variant B is easier to read

##### Condition based config (variant A)
```yaml
serviceEndpoints:
  admin: # will be referenced in proxy policy
    url: 'http://admin.com'
  staff: # will be referenced in proxy policy
    url: 'http://staff.com'

apiEndpoints:
  api:
    paths: /*

pipelines:
  api:
    apiEndpoints:
      - api
    policies:
      proxy:
        -
          condition:
            name: pathExact
            paths: /admin
          action:
            name: proxy
            serviceEndpoint: admin # see declaration above
        -
          condition:
            name: pathExact
            paths: /staff
          action:
            name: proxy
            serviceEndpoint: staff # see declaration above
```

##### Api Endpoint based config (variant B)
```yaml
serviceEndpoints:
  admin: # will be referenced in proxy policy
    url: 'http://admin.com'
  staff: # will be referenced in proxy policy
    url: 'http://staff.com'

apiEndpoints:
  admin:
    paths: /admin
  staff:
    paths: /staff

pipelines:
  admin:
    apiEndpoints:
      - admin
    policies:
      proxy:
        -   # note: no condition at all
          action:
            name: proxy
            serviceEndpoint: admin
  staff:
    apiEndpoints:
      - staff
    policies:
      proxy:
        -   # note: no condition at all
          action:
            name: proxy
            serviceEndpoint: staff
```


### Policies

Several Policies are available. Please note that the order of Policies
is important.

#### Throttling (TODO:Update doc, non relevant)

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
  "condition": {
    "name": "pathExact",
     "path" :"/foo"
  },
  "action": {
    "name":"throttleGroup",
    "key": "foo"
  }
},
{
  "action": {
    "name":"throttleGroup",
    "key": "all"
  }
},
{
  "action":{
    "name": "throttle",
    "all": {
      "rate": 1000,
      "period": "minute"
    },
    "foo": {
      "rate": 100,
      "period": "minute"
    }
  }
}
```

The above example sets up an overall rate limit of 1000 req/minute, and a more
specific limit for requests to `/foo` of 100 req/minute. Note that since the
overall limit matches *all* requests, successful `/foo` requests will also
count against the overall limit.

#### Proxying (TODO:Update doc, non relevant)

Forwards the request to a service endpoint. The params format is an object
with the following keys:

- `serviceEndpoint`: the name of the service endpoint to forward to.

This Policy type should generally be placed last in the list.

#### JWT authentication (TODO:Update doc, non relevant)

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
  "action": {
    "name": "jwt",
    "issuer": "https://www.lunchbadger.com",
    "audience": "4kzhU5LqlUpQJmjbMevWkWyt9adeKK",
    "algorithms": ["RS256"],
    "key": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
  }
}
```

#### CORS (TODO:Update doc, non relevant)

Provides [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
support via the [cors](https://www.npmjs.com/package/cors) node package. The
parameters are passed through to the `cors`. See the module's documentation for
details.

Example:

```json
...
"policies": {
  "cors":[{
    "condition": {"name":"always"},
    "action": { "name":"cors",
                "origin": ["http://www.example.com"],
                "credentials": true
    }
  }]
}
```

#### Logging

Provides capability for simple logging. The only parameter is `message`, with
a string specifying the message to log. This can include placeholders using
the JavaScript [ES6 template literal syntax](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Template_literals).

It will allow dumping all parameters of express Request object
[ExpressJS Request](https://expressjs.com/en/api.html#req)

Example:
```yml
pipelines:
  api:
    policies:
      simple-logger: # policy name
        - action:    # array of condition/actions objects
            name: log
            message: ${method} ${originalUrl} # parameter for log action
```

```js
// let say we have incomming request
req = { method:'GET', originalUrl:'/v1' }
// will log record "[EG:log-policy] GET /v1" will appear
```

#### URL Rewriting (TODO:Update doc, non relevant)

Allows the URL path to be modified using regular expressions. This can be
useful if the target URL that needs to be proxied to is different from the
request. Takes the following parameters:

- `match`: the regular expression to match. Can include capturing groups.
- `replace`: the string to replace the matched text with. Can include
   references to the captured groups.
- `flags`: flags for the regular expression engine, described
  [here](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/RegExp#Parameters)
- `redirect`: if this is not specified then all following Policies, including
  the proxy, will treat the request as if it had been made to the rewritten
  URL. This parameter changes the operation into a redirection instead. The
  value of the parameter should be the HTTP status code to return (must be in
  the 300-range). Note that this will terminate the flow and no subsequent
  Policies will be executed.

### Full config example

```yaml
http:
  port: 3000
serviceEndpoints:
  google: # will be referenced in proxy policy
    url: 'http://google.com'
  example: # will be referenced in proxy policy
    url: 'http://example.com'

apiEndpoints:
  api:
    host: '*'
    paths: /*

pipelines:
  api:
    apiEndpoints:
      - api
    policies:
      simple-logger:
        - action:
            name: log
            message: "${method} ${originalUrl}"
      proxy:
        -
          condition:
            name: pathExact
            paths: /google
          action:
            name: proxy
            serviceEndpoint: google # see declaration above
            transform: "{segment['0']}/{segment['2']}?q={segment.foo}"
        -
          condition:
            name: pathExact
            paths: /example
          action:
            name: proxy
            serviceEndpoint: example # see declaration above
            transform: "{originalUrl?q={qs[0]}"

```

In the above example, a request to `http://127.0.0.1:3000/example` will be
forwarded to `http://www.example.com`, while a request to
`http://127.0.0.1:3000/google` will be forwarded to `http://www.google.com`.


API Consumer Management
-------------
Consumer management consists of managing users and applications.

### Users
A user, in its base form, consisits of an ID and a username. You define additional user properties in the configuration like below:

```
Config: {
...
  User: {
  ...
    properties: {
      username:   { type: 'string', isMutable: false, isRequired: true}, #default, can be overridden
      firstName:  { type: 'string', isMutable: true, isRequired: true},
      lastName:   { type: 'string', isMutable: true, isRequired: true}
      ...
    }
  }
...
}
```

### Applications
An Application is another type of API consumer and is tied to a user.
In its base form, an application consists of an Id and userId. You can define additional application perperties in configuration like below:

```
Config: {
...
  Application: {
  ...
    properties: {
      name:   { type: 'string', isMutable: false, isRequired: true},
      group:  { type: 'string', isMutable: true, isRequired: false},
      ...
    }
  }
...
}
```

API Credential Management
-------------
Credential management consists of managing credentials associated with users and applications.
Types of credentials may include username/password, id/secret and API-Key.

Any type of credential can be associated with a user or application.

### Scope
Scope is a pre-defined string that is used to associate a user's or application's permission to use an api endpoint.

Scopes are assigned to credentials and need to be pre-defined before assignment.

Hot Reload vs Manual Restart
-------------
Express gateway automatically monitors changes of the config file provided at start.
Once the change is detected the system automatically reconfigures without shutdown and dropping requests.

TBD: how to disable

Hot Reload will work for:
* Api Endpoints
* Service Endpoints
* Pipeline
* Plugins  (TBD: review after plugins impl)
  + Custom Policy registration
  + Plugin Configuration changes
  + Enable/Disable

Manual Restart is required for changes in:
* http section (port)
* https section (port and certificates)
* consumer management configuration (schema, connection string details)


Troubleshooting
---------------
set env variable ```LOG_LEVEL=debug``` to see full logging

Build and run
-------------

```bash
# build
npm run build

# start
npm start

# test
npm test

# create Docker container
docker build -t gateway .
```
Providing Configuration
-----------------
Express-Gateway requires application configuration to be passed during start.
YML and JSON formats are supported.

There are several options how to do this:

##### Default
If nothing is provided EG will try to find config in **$HOME/.express-gateway/config.yml**

You can put your config file there or somehow map it to real location

Docker example: docker run -v <source_path>:<dest_path> ...

##### Location to file in env variable EG\_CONFIG\_PATH
example: EG\_CONFIG\_PATH=/some/path/config.yml npm start

##### Entire JSON serialized config env variable EG\_APP\_CONFIG
example: EG\_APP\_CONFIG='{"apiEndpoints": ....}' npm start

##### Path as command line argument
npm start /path/here
