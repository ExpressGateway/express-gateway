Express Gateway
=======

This is an API Gateway built using Express and Express middleware.

[![CircleCI](https://circleci.com/gh/ExpressGateway/express-gateway/tree/master.svg?style=shield&circle-token=ac6b0e86b46220da43a5ae63a267d12e81ccb2d5)](https://circleci.com/gh/ExpressGateway/express-gateway/tree/master)

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
        key: example/keys/eg.io.key.pem
        cert: example/keys/eg.io.cert.pem

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
  help: # name, used as reference in pipeline
    host: '*' # optional, by default accepts all hosts, same as '*'
    paths: /help #optional, by default will serve all requests - same as *

  api: # name, used as reference in pipeline
    host: '*.com' # wildcard pattern support
    paths:
      - '/v1/*' # string or array of strings
      - '/v2/*'

  example: # name, used as reference in pipeline
    host: 'example.com'
    paths: /v2/* # string or array of strings

```

#### Host
host - string that will be matched against the 'HOST' header of request

##### Host examples
+ \* - any domain will match cdn.test.example.com, test.example.com, example.com, etc.
  Will also work if no HOST header is provided
+ example.com - one domain match, will not match subdomains
+ *.example.com -
  - any subdomain will match. test.example.com
  - example.com will not match
  - deeper levels will not match cdn.test.example.com
+ \*.\*.example.com
  - will match 2nd level subdomains like cdn.test.example.com
  - will not match example.com host
  - will not match test.example.com host

For host resolution EG relies on "vhost" package.
See more examples here: https://www.npmjs.com/package/vhost

#### Path examples
Paths can be either string or array of strings. It supports wildcard patterns.
It behaves as ExpressJS routes https://expressjs.com/en/4x/api.html#router

##### Examples
* paths: /admin - exact string match
  + match: /admin
  + 404: /admin/new; /admin/new/1; /staff; /; etc.

* paths: /admin/\* - deep level sub directory matching (does not match the parent dir)
  + match: /admin/new /admin/new/1
  + 404: /admin

* paths: ['/admin', '/admin/\*']  - deep level sub directory matching and directory itself
  + match: /admin/new /admin/new/1 /admin

* paths: '/admin/:id' - one level sub directory matching without directory itself
  + match: /admin/new /admin/1 /admin/some-guid-here
  + 404: /admin; /admin/1/test; /admin/a/b/c;

* paths: '/admin/:group/:id' - two level sub directory matching without directory itself
  + match: /admin/eg/12
  + 404: /admin; /admin/1; /admin/a/b/c;

* paths: ['/student/\*', '/teacher/\*','/admin/\*']
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
    paths: '*'    # optional, default *
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
    paths: /             # optional, defaults to /
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
          condition: #optional,; defaults to always execute
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
  - `expression`. Matches execution result of JS code provided in `expression` property. Code is executed in limited space that has access only to egContext
  Example:
```yaml
  condition:
    name: expression
    expression: "req.url.length>5"
    # will match for for path /long_path
    # will not match /a
```

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
    paths: \*

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

#### Rate-limit
Use to limit repeated requests to public APIs and/or endpoints such as password reset.

By default it will limit based on client IP address (req.ip).
option `rateLimitBy` can be used to override the behaviour.

Consider example to rate-limit based on passed host:
```yml
apiEndpoints:
  example:
    host: '*'
serviceEndpoints:
  backend:
    url: 'http://www.example.com'
pipeline1:
    apiEndpoints:
      - 'example',
    policies:
      - rate-limit:
        -
          action:
            name: 'rate-limit'
            max: 10
            rateLimitBy: "${req.host}"
      - proxy:
        -
          action:
            name: proxy
            serviceEndpoint: backend

```

#####Supported options:

* `rateLimitBy`: JS template string to generate key. Requests will be counted based on this key. default is "${req.ip}"
* `windowMs`: milliseconds - how long to keep records of requests in memory. Defaults to 60000 (1 minute).
* `max`: max number of connections during windowMs milliseconds before sending a 429 response. Defaults to 5. Set to 0 to disable.
* `message`: Error message returned when max is exceeded. Defaults to 'Too many requests, please try again later.'
* `statusCode`: HTTP status code returned when max is exceeded. Defaults to 429.
* `headers`: Enable header to show request limit and current usage
* `delayAfter`: max number of connections during windowMs before starting to delay responses. Defaults to 1. Set to 0 to disable delaying.
* `delayMs`: milliseconds - how long to delay the response, multiplied by (number of recent hits - delayAfter). Defaults to 1000 (1 second). Set to 0 to disable delaying.

#####Here are some additional scenarious:

###### Limit only for specific domain
```yml
policies:
  -
    rate-limiter:
      -
        condition:
          name: hostMatch,
          pattern: example.com
        action:
          name: rate-limit
          max: 500
```


Implementation is based on [express-rate-limit](https://www.npmjs.com/package/express-rate-limit)
Please check for advanced information

#### Key Auth
Key auth is efficient way of securing your API. 
Keys are generated for apps or users using CLI tool.
API key has format of a key pair separated by colon: `1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA` 

EG supports several ways to authenticate with api key:
##### Using header (recommended)
By default Authorization header is used 
Example:
'Authorization':'Bearer 1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA'

Since api key scheme is not standardised, EG does not enforse it
This examples will also work:
'Authorization':'apikey 1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA'
'Authorization':'1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA'

Header is recommended way to pass your API key to the EG

##### Using query paramter (common approach for browser apps to avoid CORS Options request)
add `?apikey=key:secret` to query params in url and it will be read by EG

`https://example.com?q=search&apikey=1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA` 

##### Using in JSON body
```json
{
  "name":"eg-customer",
  "apikey":"1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA"
}

```

By default, the property EG is looking in query params or url is called `apikey`
And for expected header - `Authorization`

For now, the way to change the names is to change in lib/config/models/credentials.js `key-auth` credential definition

Config Example
```yaml
serviceEndpoints:
  example: # will be referenced in proxy policy
    url: 'http://example.com'

apiEndpoints:
  api:
    path: '*'

pipelines:
  example-pipeline:
    apiEndpoints:   # process all request matching "api" apiEndpoint
      - api
    policies:
      keyauth: # secure API with key auth
        -
          action:
            name: keyauth
      proxy: # name of the policy
        -   # list of actions
          action:
            name: proxy # proxy policy has one action - "proxy"
            serviceEndpoint: example # reference to serviceEndpoints Section
```

#### Proxying

Forwards the request to a service endpoint.
Accepts serviceEndpoint parameter that can be one of the names of serviceEndpoints section

- `serviceEndpoint`: the name of the service endpoint to forward to.

This Policy type should generally be placed last in the list.
```yaml
serviceEndpoints:
  example: # will be referenced in proxy policy
    url: 'http://example.com'

apiEndpoints:
  api:
    path: '*'

pipelines:
  example-pipeline:
    apiEndpoints:   # process all request matching "api" apiEndpoint
      - api
    policies:
      proxy: # name of the policy
        -   # list of actions
          condition:
            name: pathExact
            path: /admin
          action:
            name: proxy # proxy policy has one action - "proxy"
            serviceEndpoint: example # reference to serviceEndpoints Section
```

#### CORS

Provides [CORS](https://en.wikipedia.org/wiki/Cross-origin_resource_sharing)
support via the [cors](https://www.npmjs.com/package/cors) node package. The
parameters are passed through to the `cors`. See the module's documentation for
details.

Example:

```yml
...
policies:
  - cors:
      -
        action:
          name: cors
          origin: http://www.example.com
          credentials: true
}
```

#### Expression
Execute JS code against EGContext.
```yml
pipelines:
  api:
    policies:
      expression: # policy name
        - action:    # array of condition/actions objects
            name: expression # action name
            jscode: 'req.url = "/new/url"; ' #  code to execute against EG Context
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
// will log "[EG:log-policy] GET /v1"
```

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
    paths: '*'

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

There are 2 config files to take care of:
#### Gateway Config
The config file where you define endpoints, pipelines, port settings for gateway

#### System Config
Here you can define dabase connections, custom schemes for user\application entities
For the most cases default settings are good enough

There are several options how to do this:

##### Default
If nothing is provided EG will try to find config in **$HOME/.express-gateway/gateway.config.yml**
**$HOME/.express-gateway/system.config.yml**

You can put your config file there or somehow map it to real location

Docker example: docker run -v <source_path>:<dest_path> ...

##### Location to file in env variable EG\_GATEWAY\_CONFIG\_PATH
example:
EG\_GATEWAY\_CONFIG\_PATH=/some/path/config.yml EG\_SYSTEM\_CONFIG\_PATH=/some/path/config.yml npm start

##### Entire JSON serialized config env variable EG\_APP\_CONFIG
example:

EG\_GATEWAY\_CONFIG='{"apiEndpoints": ....}'  EG\_SYSTEM\_CONFIG='{"apiEndpoints": ....}' npm start

more grannular control over configs through env variables will arrive later

EG\_SYSTEM\_CONFIG\_db\_redis\_url='redis connection string'

##### Path as command line argument
npm start /path/here
