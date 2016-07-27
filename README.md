Gateway
=======

This is a PoC of a simple HTTP proxy.

Configuration
-------------

The configuration file is a JSON document. It should be a JSON object at the
top level, with the following keys:

- `bindPort`: the port to listen on
- `bindHost`: the IP address to listen on, or 0.0.0.0 to listen on all IPs
- `pipelines`: a list of objects with the following keys:
  - `proxies`: a list of objects representing a proxy. Each proxy has the following keys:
    - `privateEndpoint`: the URL to proxy to
    - `contextPath`: the gateway path to proxy to.

Example:

```json
{
  "bindPort": 3000,
  "bindHost": "127.0.0.1",
  "pipelines": [
    {
      "proxies": [{
        "privateEndpoint": "http://www.example.com",
        "contextPath": "/example"
      }, {
        "privateEndpoint": "http://www.google.com",
        "contextPath": "/google"
      }]
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
