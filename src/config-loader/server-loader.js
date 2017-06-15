const https = require('https');
const minimatch = require('minimatch');
const tls = require('tls');
const http = require('http');
const fs = require('fs');
const path = require('path');
const logger = require('../log').gateway;

module.exports.bootstrap = function (app, config) {
  let httpServer = config.http ? http.createServer(app) : null;
  let httpsServer = config.https && config.https.tls ? createTlsServer(config.https, app) : null;
  return {
    httpServer,
    httpsServer
  };
};

function createTlsServer (httpsConfig, app) {
  let defaultCert = null;
  let sniCerts = [];

  for (let [domain, certPaths] of Object.entries(httpsConfig.tls)) {
    let cert;
    if (domain === 'default') {
      cert = defaultCert = {};
    } else {
      cert = {};
      sniCerts.push([domain, cert]);
    }

    cert.key = fs.readFileSync(path.resolve(certPaths.key), 'utf-8');
    cert.cert = fs.readFileSync(path.resolve(certPaths.cert), 'utf-8');
    if (certPaths.ca && certPaths.ca.length) {
      cert.ca = certPaths.ca.map(ca => fs.readFileSync(path.resolve(ca), 'utf-8'));
    }
  }

  // see possible options https://nodejs.org/api/tls.html#tls_tls_createserver_options_secureconnectionlistener
  let options = Object.assign({}, httpsConfig.options);

  if (defaultCert) {
    options.key = defaultCert.key;
    options.cert = defaultCert.cert;
    options.ca = defaultCert.ca;
  }

  if (sniCerts.length > 0) {
    options.SNICallback = (servername, cb) => {
      for (let [domain, cert] of sniCerts) {
        if (minimatch(servername, domain)) {
          logger.debug(`sni: using cert for ${domain}`);
          cb(null, tls.createSecureContext(cert));
          return;
        }
      }
      if (defaultCert) {
        logger.debug('sni: using default cert');
        cb(null, tls.createSecureContext(defaultCert));
      } else {
        logger.error('sni: no cert!');
        cb(new Error('cannot start TLS SNI - no cert configured'));
      }
    };
  }

  return https.createServer(options, app);
}
