const url = require('url');
const should = require('should');
const express = require('express');
const phantomjs = require('phantomjs-prebuilt');
const request = require('superagent');
const webdriver = require('selenium-webdriver');

const cliHelper = require('../common/cli.helper');
const gwHelper = require('../common/gateway.helper');

let tempPath;

const { findOpenPortNumbers } = require('../common/server-helper');

describe('oauth2 authorization code grant type', () => {
  const username = 'kate';
  const state = 'ABC123xyz';

  let password = null;
  let clientID = null;
  let clientSecret = null;

  let gatewayProcess = null;

  let gatewayPort, adminPort, redirectPort, redirectServer, backendServer;

  let redirectParams = null;

  before(function () {
    const gatewayConfig = {
      http: {},
      admin: {},
      apiEndpoints: {
        api: {
          host: 'localhost'
        },
        ping: {
          path: '/not-found'
        }
      },
      policies: ['oauth2', 'proxy'],
      pipelines: {
        ping: {
          apiEndpoints: ['ping'],
          policies: [
            {
              proxy: [
                {
                  action: {
                    serviceEndpoint: 'backend',
                    changeOrigin: true
                  }
                }
              ]
            }
          ]
        },
        default: {
          apiEndpoints: ['api'],
          policies: [
            {
              oauth2: null
            },
            {
              proxy: [
                {
                  action: {
                    serviceEndpoint: 'backend',
                    changeOrigin: true
                  }
                }
              ]
            }
          ]
        }
      }
    };

    return findOpenPortNumbers(1)
      .then(([port]) => { redirectPort = port; return generateRedirectServer(redirectPort); })
      .then((server) => { redirectServer = server; })
      .then(cliHelper.bootstrapFolder)
      .then(dirInfo => gwHelper.startGatewayInstance({ dirInfo, gatewayConfig }))
      .then(gwInfo => {
        tempPath = gwInfo.dirInfo.configDirectoryPath;
        gatewayProcess = gwInfo.gatewayProcess;
        backendServer = gwInfo.backendServer;
        gatewayPort = gwInfo.gatewayPort;
        adminPort = gwInfo.adminPort;
      })
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
    backendServer.close(() => redirectServer.close(done));
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
          should(err).not.be.undefined();
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
          .then(res => res.body.access_token);
      })
      .then(accessToken => {
        return request
          .get(`http://localhost:${gatewayPort}`)
          .set('Authorization', `Bearer ${accessToken}`);
      })
      .then(res => should(res.statusCode).be.eql(200))
      .then(() => driver.quit());
  });

  function createUser (args, done) {
    return cliHelper.runCLICommand({
      cliArgs: ['users', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function createCredential (args, done) {
    return cliHelper.runCLICommand({
      cliArgs: ['credentials', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function createApp (args, done) {
    return cliHelper.runCLICommand({
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
      const runningApp = app.listen(port, () => {
        resolve(runningApp);
      });
    });
  }
});
