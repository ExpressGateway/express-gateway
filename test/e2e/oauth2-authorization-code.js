const { fork } = require('child_process');
const fs = require('fs');
const path = require('path');
const querystring = require('querystring');
const url = require('url');
const util = require('util');

const assert = require('chai').assert;
const cpr = require('cpr');
const express = require('express');
const request = require('superagent');
const rimraf = require('rimraf');
const tmp = require('tmp');
const webdriver = require('selenium-webdriver');
const yaml = require('js-yaml');

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
    // user login
    // consent to authorization
    // verify redirect URI endpoint gets auth code
    // get access token
    // make call to backend with access token, verify

    const authURL = new url.URL('http://localhost:' + gatewayPort);
    authURL.pathname = '/oauth2/authorize';
    authURL.search = querystring.stringify({
      response_type: 'code',
      client_id: clientID,
      state: state,
      redirect_uri: `http://localhost:${redirectPort}/cb`
    });

    const driver = new webdriver.Builder()
      .forBrowser('chrome')
      .build();

    const By = webdriver.By;

    const checkUnauthorized = new Promise((resolve, reject) => {
      request
        .get(`http://localhost:${gatewayPort}`)
        .end((err, res) => {
          // Verify Unauthorized when calling without access token.
          assert(!!err);
          assert(res.unauthorized);
          assert.equal(401, res.statusCode);
          resolve();
        });
    });

    return checkUnauthorized
      .then(() => driver.get(authURL.toString()))
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
        assert.equal(200, res.statusCode);
      })
      .then(() => driver.quit());
  });

  function startGatewayInstance (done) {
    let tempPath = null;

    return util.promisify(tmp.dir)()
      .then(temp => {
        tempPath = temp;
        return util.promisify(cpr)(baseConfigDirectory, tempPath);
      })
      .then(files => {
        testGatewayConfigPath = path.join(tempPath, 'gateway.config.yml');
        return util.promisify(findOpenPortNumbers)(4);
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
            env: childEnv,
            stdio: 'pipe'
          });

          gatewayProcess.on('error', err => {
            reject(err);
          });

          let checked = false;
          gatewayProcess.stdout.on('data', chunk => {
            if (!checked) {
              checked = true;
              request
              .get(`http://localhost:${gatewayPort}/not-found`)
              .end((err, res) => {
                assert(err);
                assert(res.clientError);
                assert(res.statusCode, 404);
                resolve();
              });
            }
          });
        });
      });
  }

  function runCLICommand (args) {
    return new Promise((resolve, reject) => {
      const childEnv = Object.assign({}, process.env);
      childEnv.EG_CONFIG_DIR = path.join(testGatewayConfigPath, '..');
      childEnv.EG_ADMIN_URL = `http://localhost:${adminPort}`;

      const modulePath = path.join(__dirname, '..', '..', 'bin', 'index.js');

      const child = fork(modulePath, args, {
        env: childEnv,
        stdio: 'pipe'
      });

      const buf = [];
      child.stdout.on('data', chunk => {
        buf.push(chunk);
      });

      child.stdout.on('end', () => {
        const data = Buffer.concat(buf).toString();

        try {
          const obj = JSON.parse(data);
          resolve(obj);
        } catch (err) {
          if (err instanceof SyntaxError) {
            resolve(data);
          } else {
            reject(err);
          }
        }
      });

      child.on('error', err => {
        reject(err);
      });
    });
  }

  function createUser (args, done) {
    return runCLICommand(['users', 'create'].concat(args));
  }

  function createCredential (args, done) {
    return runCLICommand(['credentials', 'create'].concat(args));
  }

  function createApp (args, done) {
    return runCLICommand(['apps', 'create'].concat(args));
  }

  function generateRedirectServer (port) {
    const app = express();

    app.get('/cb', (req, res) => {
      const parsed = url.parse(req.url, true);
      redirectParams = parsed.query;
      res.send(200);
    });

    return new Promise((resolve) => {
      app.listen(port, () => {
        resolve(app);
      });
    });
  }
});
