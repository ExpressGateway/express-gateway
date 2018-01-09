const { fork } = require('child_process');
const { runCLICommand } = require('../common/cli.helper');
const fs = require('fs');
const path = require('path');
const url = require('url');
const util = require('util');

const should = require('should');
const cpr = require('cpr');
const express = require('express');
const phantomjs = require('phantomjs-prebuilt');
const request = require('superagent');
const rimraf = require('rimraf');
const tmp = require('tmp');
const webdriver = require('selenium-webdriver');
const yaml = require('js-yaml');
let tempPath;

require('util.promisify/shim')();

const { findOpenPortNumbers, generateBackendServer } =
  require('../common/server-helper');

const baseConfigDirectory = path.join(__dirname, '..', 'fixtures', 'authorization-code');

describe('oauth2 authorization code grant type', () => {
  const username = 'kate';
  const state = 'ABC123xyz';

  let password = null;
  let clientID = null;
  let clientSecret = null;

  let testGatewayConfigPath = null;
  let testGatewayConfigData = null;

  let gatewayProcess = null;

  let gatewayPort = null;
  let adminPort = null;
  let backendPort = null;
  let redirectPort = null;

  let redirectParams = null;

  before(function () {
    return startGatewayInstance()
      .then(() => {
        const args = [
          '-p', `username=${username}`,
          '-p', 'firstname=Kate',
          '-p', 'lastname=Smith'
        ];

        return createUser(args);
      })
      .then(() => {
        const args = [
          '-c', username,
          '-t', 'basic-auth'
        ];

        return createCredential(args);
      })
      .then(credentials => {
        password = credentials.password;

        const args = [
          '-u', username,
          '-p', 'name=apptastic',
          '-p', `redirectUri=http://localhost:${redirectPort}/cb`
        ];

        return createApp(args);
      })
      .then(app => {
        const args = [
          '-c', app.id,
          '-t', 'oauth2'
        ];

        return createCredential(args);
      })
      .then(credential => {
        clientID = credential.id;
        clientSecret = credential.secret;
      });
  });

  after(done => {
    gatewayProcess.kill();
    rimraf(path.join(testGatewayConfigPath, '..'), done);
  });

  it('authorizes a valid user', () => {
    const authURL = url.format({
      protocol: 'http',
      hostname: 'localhost',
      port: gatewayPort,
      pathname: '/oauth2/authorize',
      query: {
        response_type: 'code',
        client_id: clientID,
        state: state,
        redirect_uri: `http://localhost:${redirectPort}/cb`
      }
    });

    const phantomCaps = webdriver.Capabilities.phantomjs();
    phantomCaps.set('phantomjs.binary.path', phantomjs.path);

    const driver = new webdriver.Builder()
      .withCapabilities(phantomCaps)
      .build();

    const By = webdriver.By;

    const checkUnauthorized = new Promise((resolve, reject) => {
      request
        .get(`http://localhost:${gatewayPort}`)
        .end((err, res) => {
          // Verify Unauthorized when calling without access token.
          should(!!err).be.undefined();
          should(res.unauthorized).not.be.undefined();
          should(res.statusCode).be.eql(401);
          resolve();
        });
    });

    return checkUnauthorized
      .then(() => driver.get(authURL))
      .then(() => driver
        .findElement(By.name('username'))
        .sendKeys(username)
      )
      .then(() => driver
        .findElement(By.name('password'))
        .sendKeys(password)
      )
      .then(() => driver
        .findElement(By.xpath('//form//input[@type="submit"]'))
        .click()
      )
      .then(() => driver
        .findElement(By.id('allow'))
        .click()
      )
      .then(() => {
        const params = {
          grant_type: 'authorization_code',
          client_id: clientID,
          client_secret: clientSecret,
          code: redirectParams.code,
          redirect_uri: `http://localhost:${redirectPort}/cb`
        };

        return request
          .post(`http://localhost:${gatewayPort}/oauth2/token`)
          .send(params)
          .then(res => {
            return res.body.access_token;
          });
      })
      .then(accessToken => {
        return request
          .get(`http://localhost:${gatewayPort}`)
          .set('Authorization', `Bearer ${accessToken}`);
      })
      .then(res => {
        should(res.statusCode).be.eql(200);
      })
      .then(() => driver.quit());
  });

  function startGatewayInstance (done) {
    const _cpr = util.promisify(cpr);

    return util.promisify(tmp.dir)()
      .then(tmpPath => Promise.all([
        tmpPath,
        _cpr(baseConfigDirectory, tmpPath),
        _cpr(path.join(__dirname, '../../lib/config/models'), path.join(tmpPath, 'models'))
      ]))
      .then(([tmpPath]) => {
        tempPath = tmpPath;
        testGatewayConfigPath = path.join(tmpPath, 'gateway.config.yml');
        return findOpenPortNumbers(4);
      })
      .then(ports => {
        gatewayPort = ports[0];
        backendPort = ports[1];
        adminPort = ports[2];
        redirectPort = ports[3];

        return util.promisify(fs.readFile)(testGatewayConfigPath);
      })
      .then(configData => {
        testGatewayConfigData = yaml.load(configData);

        testGatewayConfigData.http.port = gatewayPort;
        testGatewayConfigData.admin.port = adminPort;

        testGatewayConfigData.serviceEndpoints.backend.url =
          `http://localhost:${backendPort}`;

        return generateBackendServer(backendPort);
      })
      .then(() => generateRedirectServer(redirectPort))
      .then(() => {
        return util.promisify(fs.writeFile)(testGatewayConfigPath,
          yaml.dump(testGatewayConfigData));
      })
      .then(() => {
        return new Promise((resolve, reject) => {
          const childEnv = Object.assign({}, process.env);
          childEnv.EG_CONFIG_DIR = tempPath;

          // Tests, by default have config watch disabled.
          // Need to remove this paramter in the child process.
          delete childEnv.EG_DISABLE_CONFIG_WATCH;

          const modulePath = path.join(__dirname, '..', '..',
            'lib', 'index.js');
          gatewayProcess = fork(modulePath, [], {
            cwd: tempPath,
            env: childEnv
          });

          gatewayProcess.on('error', err => {
            reject(err);
          });

          setTimeout(() => {
            request
              .get(`http://localhost:${gatewayPort}/not-found`)
              .end((err, res) => {
                should(err).not.be.undefined();
                should(res.clientError).not.be.undefined();
                should(res.statusCode).be.eql(404);
                resolve();
              });
          }, 4000);
        });
      });
  }

  function createUser (args, done) {
    return runCLICommand({
      cliArgs: ['users', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function createCredential (args, done) {
    return runCLICommand({
      cliArgs: ['credentials', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function createApp (args, done) {
    return runCLICommand({
      cliArgs: ['apps', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function generateRedirectServer (port) {
    const app = express();

    app.get('/cb', (req, res) => {
      const parsed = url.parse(req.url, true);
      redirectParams = parsed.query;
      res.sendStatus(200);
    });

    return new Promise((resolve) => {
      app.listen(port, () => {
        resolve(app);
      });
    });
  }
});
