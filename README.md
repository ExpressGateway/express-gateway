#### A Microservices API Gateway Built Using ExpressJS and Express Middleware
----

[![CircleCI][circleci-badge]][circleci-master-url]

[![Express-Gateway][eg-wordmark-companion]][eg-url]

Express Gateway is an API Gateway that sits at the heart of any microservices architecture, regardless of what language or platform you're using. Express Gateway secures your microservices and exposes them through APIs using Node.js, ExpressJS and Express middleware. Developing microservices, orchestrating and managing them now can be done all one one seamless platform without having to introduce additional infrastructure.

# Configuration

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
    url: http://localhost:3000
    paths: /             # optional, defaults to /
  dogs_service:
    url: http://localhost:4000
```
Use name of properties (`cats_service` etc.) to reference in pipelines


policies (PHASE 2)
--------
White-list Array of enabled policies with settings (if needed)

#### Referencing well-known policies (Phase2)
```yaml
policies:
  - name: 'name-test'
```
EG will try to find and load package with prefix `express-gateway-policy-`

in this case  `express-gateway-policy-name-test` npm package

#### Referencing custom package in system.config (Phase2)
```yaml
policies:
  - package: 'plugin-test'
    someParam: "plugin test param"
```
if property `package` is used instead of `name` EG will try to install exactly what is in the value.

`package` accepts any variant supported by [npm install](https://docs.npmjs.com/cli/install), e.g. git url, github, tarball etc.

See custom plugin development guideline (TBD)

Pipelines
---------
Pipeline is a list of policies that will be executed for requests from specified apiEndpoints

Pipelines are registered as properties for pipelines section\object in the gateway.config

##### General structure
```yaml
pipelines:
  name_of_pipeline:
    apiEdnpoints:
      - api1
      - api2
    policies:
      policy_name_1:
        - 
          #condition/action
        - 
          #condition/action
      policy_name_2:
        - 
          #condition/action
```

##### Example
This gateway.config will start EG on port 3000 and proxy all requests to http://example.com
And requests that have url started with `/v1` will be logged

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

Each policy in the policies can have a list of condition\action objects: 

- `condition`. Optional. This condition is a check rule that must be satisfied to trigger the action.
- `action`. The name of the action to execute.

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
```yml
name: allOf
conditions:
    - 
        name: pathExact
        path: /foo/bar
    - 
        name: not
        condition:
            name: method
            methods:
                - POST
                - HEAD

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
The rate limiter policy is used to limit the number of requests received and processed by the API endpoint. Limits are useful to prevent your system from being overwhelmed in both benign and malevolent situations where the number of requests processed can overwhelm your underlying APIs and supporting services. Rate limits are also useful to control the amount of API consumption to a known capacity of quantity.

##### Example use case:
Use to limit repeated requests to public APIs and/or endpoints such as password reset.
Limit access by host name in order to provide different service plans for customers. 

#### Reference

* `rateLimitBy`: The criteria that is used to limit the number of requests by. By default will limit based on IP address. Use JS template string to configure. Example "${req.ip}", "${req.hostname}" etc.
* `windowMs`: milliseconds - how long to keep records of requests in memory. Defaults to 60000 (1 minute).
* `max`: max number of connections during windowMs milliseconds before sending a 429 response. Defaults to 5. Set to 0 to disable.
* `message`: Error message returned when max is exceeded. Defaults to 'Too many requests, please try again later.'
* `statusCode`: HTTP status code returned when max is exceeded. Defaults to 429.
* `headers`: Enable header to show request limit and current usage
* `delayAfter`: max number of connections during windowMs before starting to delay responses. Defaults to 1. Set to 0 to disable delaying.
* `delayMs`: milliseconds - how long to delay the response, multiplied by (number of recent hits - delayAfter). Defaults to 1000 (1 second). Set to 0 to disable delaying.



#### Usage Example

#####Consider full example to rate-limit based on passed host to 10 requests per 2 minutes interval:

```yml
http:
  port: 9090
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
            windowMs: 120000 
            rateLimitBy: "${req.hostname}"
      - proxy:
        -
          action:
            name: proxy
            serviceEndpoint: backend

```

###### Here is policy configuration only for specific domain to allow up to 500 requests per minute
```yml
policies:
  -
    rate-limiter:
      -
        condition: # will execute action only for host matching example.com
          name: hostMatch, 
          pattern: example.com
        action:
          name: rate-limit
          max: 500 # limit to 500 req per default period windowMs=60000 (1 minute)
```



#### Key Auth
Key auth is efficient way of securing your API. 
Keys are generated for apps or users using CLI tool.

##### Example Use case:
Restricting access to api endpoints for applications


EG API key has format of a key pair separated by colon: `1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA` 

EG supports several ways to authenticate with api key:
##### Using header (recommended)
By default Authorization header is used and enforsed Schema is `apiKey`
Example:
`'Authorization':'apiKey 1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA'`

Since api key scheme and header is not standardised you can override them

You can define another Scheme name using `apiKeyHeaderScheme`  
'Authorization':'my-scheme 1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA'

and to disable set 
`apiKeyHeaderScheme:''`

This will make EG accept that format:
'Authorization':'1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA'

You And to change header name use `apiKeyHeader:'MY-KEY-HEADER'`  


##### Using query paramter (common approach for browser apps to avoid CORS Options request)
add `?apiKey=key:secret` to query params in url and it will be read by EG

`https://example.com?q=search&apiKey=1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA` 

##### Using in JSON body
```json
{
  "name":"eg-customer",
  "apiKey":"1fa4Y52SWEhii7CmYiMOcv:4ToXczFz0ZyCgLpgKIkyxA"
}

```

##### Reference 
```yml
apiKeyHeader: 'Authorization', # name of the header that should contain api key 
apiKeyHeaderScheme: 'apiKey', # Enforce schema in header.
disableHeaders: false # disable apikey lookup in headers 
disableHeadersScheme: false # disable verification of Scheme in header 
apiKeyField: 'apiKey', # name of field to check in query param or body
disableQueryParam: false # set to true to disable api key lookup in query string
disableBody: false # set to true to disable api key lookup in body
```


Config Example
```yaml
http:
  port: 8790
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
            disableBody: true # do not look for api key in body
            apiKeyHeader: COMPANY-CUSTOM-API-KEY-HEADER # custom header name 
            disableHeadersScheme: true # will accept "key:secret" format instead of "scheme key:secret"
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
Implemented using [cors](https://www.npmjs.com/package/cors) node package. The
parameters are passed through to the `cors`. See the module's documentation for
details.

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

There are 2 main config files for main setup. And model configurations for fine-tuning:
#### Gateway Config
The config file where you define endpoints, pipelines, port settings for gateway

#### System Config
Here you can define dabase connections, custom schemes for user\application entities
For the most cases default settings are good enough

The config files must be in one directory and this is how to point EG to it:

##### Default
If nothing is provided EG will use config in local config /lib/config

use `npm start` to start Express-gateway

##### Location to config folder in env variable EG\_CONFIG\_DIR
example:
EG\_CONFIG\_DIR=/some/path/config  npm start


[eg-wordmark-companion]: logo/wordmark-and-companion-graphic/ExpressGateway_Wordmark+Companion.png
[eg-url]: https://www.express-gateway.io
[circleci-badge]: https://circleci.com/gh/ExpressGateway/express-gateway/tree/master.svg?style=shield&circle-token=ac6b0e86b46220da43a5ae63a267d12e81ccb2d5
[circleci-master-url]: https://circleci.com/gh/ExpressGateway/express-gateway/tree/master
