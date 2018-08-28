module.exports = {
  policy: require('./proxy'),
  schema: {
    $id: 'http://express-gateway.io/schemas/policies/proxy.json',
    type: 'object',
    properties: {
      auth: {
        type: 'string',
        description: ' Basic authentication i.e. \'user:password\' to compute an Authorization header.'
      },
      autoRewrite: {
        type: 'boolean',
        default: false,
        description: 'Rewrites the location host/port on (201/301/302/307/308) redirects based on requested host/port.'
      },
      changeOrigin: {
        type: 'boolean',
        default: true,
        description: 'Changes the origin of the host header to the target URL'
      },
      followRedirects: {
        type: 'boolean',
        default: false,
        description: 'Specify whether you want to follow redirects'
      },
      hostRewrite: {
        type: 'string',
        description: 'Rewrites the location hostname on (201/301/302/307/308) redirects.'
      },
      ignorePath: {
        type: 'boolean',
        default: false,
        description: 'Specify whether you want to ignore the proxy path of the incoming request'
      },
      prependPath: {
        type: 'boolean',
        default: true,
        description: 'Specify whether you want to prepend the target\'s path to the proxy path'
      },
      preserveHeaderKeyCase: {
        type: 'boolean',
        default: false,
        description: 'Specify whether you want to keep letter case of response header key'
      },
      protocolRewrite: {
        type: 'string',
        enum: ['http', 'https'],
        description: 'Forces the protocol on the proxied request'
      },
      proxyUrl: {
        type: 'string',
        description: 'An intermediate HTTP Proxy where send the requests to instead of the service endpoint directly'
      },
      secure: {
        type: 'boolean',
        default: true,
        description: 'Flag specifying if you want to verify the SSL Certs'
      },
      serviceEndpoint: {
        type: 'string',
        description: 'The serviceEndpoint reference where to proxy the requests to'
      },
      stripPath: {
        type: 'boolean',
        default: false,
        description: 'Specifies whether you want to strip the apiEndpoint path from the final URL.'
      },
      strategy: {
        type: 'string',
        enum: ['round-robin'],
        default: 'round-robin',
        description: 'Specifies how to balance the requests between multiple urls in the same service endpoint'
      },
      toProxy: {
        type: 'boolean',
        default: false,
        description: 'Passes the absolute URL as the path'
      },
      xfwd: {
        type: 'boolean',
        default: false,
        description: 'Adds x-forward headers to the proxied request'
      }
    },
    required: ['strategy', 'changeOrigin', 'stripPath', 'ignorePath', 'prependPath', 'followRedirects']
  }
};
