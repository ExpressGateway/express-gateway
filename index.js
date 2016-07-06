'use strict';

let express = require('express');
let httpProxy = require('http-proxy');
let fs = require('fs');
let url = require('url');
let morgan = require('morgan');

function createApp(config) {
  let app = express();

  let urlObj = url.parse(config.rootPath);
  let vhost = `${urlObj.hostname}:${urlObj.port}`;
  if (urlObj.protocol !== 'http:') {
    console.log('Only the HTTP protocol is currently supported.');
    return null;
  }

  let proxies = [];
  for (let pipeline of config.pipelines) {
    for (let proxyConfig of pipeline.proxies) {
      let proxy = httpProxy.createProxyServer({
        target: proxyConfig.privateEndpoint,
        changeOrigin: true
      });
      proxy.on('error', (err, req, res) => {
        console.warn('Error', err);
        res.status(502).send('Bad gateway.');
      });
      proxies.push({
        context: new RegExp(proxy.contextPath),
        proxy: proxy,
        target: proxyConfig.privateEndpoint
      });
    }
  }

  function lookupProxy(path) {
    let matches = proxies.filter(({context, proxy}) => path.match(context));
    if (matches.length == 0) {
      return null;
    } else if (matches.length > 1) {
      console.warn(`Multiple matches for path ${path}, using first found`);
    }
    return matches[0];
  }

  attachMiddleware(app, config);

  app.all('*', (req, res) => {
    let match = lookupProxy(req.path);
    if (match) {
      req.target = match.target;
      match.proxy.web(req, res);
    } else {
      res.status(404).send('Not found');
    }
  });

  return app;
}

function loadConfig(fileName) {
  if (fs.existsSync(fileName)) {
    return JSON.parse(fs.readFileSync(fileName));
  } else {
    console.log(`Cannot find config file ${fileName}`);
    return null;
  }
}

function attachMiddleware(app, config) {
  morgan.token('target', (req, res) => req.target ? req.target : '-');
  let logger = morgan(
    ':method (:target) :url :status :response-time ms - :res[content-length]');
  app.use(logger);
}

if (require.main === module) {
  let config = loadConfig(process.argv[2] || '/etc/lunchbadger/gateway.conf');
  if (!config) {
    process.exit(1);
  }

  let app = createApp(config);
  if (!app) {
    process.exit(1);
  }

  app.listen(config.bindPort, config.bindHost, () => {
    console.log(`Listening on ${config.bindHost}:${config.bindPort}`);
  });
}
