const url = require('url');
const should = require('should');
const express = require('express');
const request = require('superagent');
const puppeteer = require('puppeteer');

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
        backendServer = gwInfo.backendServers[0];
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

    const checkUnauthorized = new Promise((resolve, reject) => {
      request
        .get(`http://localhost:${gatewayPort}`)
        .end((err, res) => {
          if (!err) reject(new Error('Error should be defined'));
          should(err).not.be.undefined();
          should(res.unauthorized).not.be.undefined();
          should(res.statusCode).be.eql(401);
          resolve();
        });
    });

    return checkUnauthorized
      .then(() => puppeteer.launch())
      .then(browser => Promise.all([browser, browser.pages()]))
      .then(([browser, [page]]) => Promise.all([browser, page, page.goto(authURL)]))
      .then(([browser, page]) => Promise.all([browser, page, page.type('[name="username"]', username)]))
      .then(([browser, page]) => Promise.all([browser, page, page.type('[name="password"]', password)]))
      .then(([browser, page]) => Promise.all([browser, page, page.click('[type="submit"]')]))
      .then(([browser, page]) => Promise.all([browser, page, page.click('#allow')]))
      .then(([browser, page]) => Promise.all([page.url(), browser.close()]))
      .then(([pageUrl]) => {
        const parsedPageUrl = url.parse(pageUrl, true);
        const { code } = parsedPageUrl.query;

        const params = {
          grant_type: 'authorization_code',
          client_id: clientID,
          client_secret: clientSecret,
          code,
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
      .then(res => should(res.statusCode).be.eql(200));
  });

  function createUser(args) {
    return cliHelper.runCLICommand({
      cliArgs: ['users', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function createCredential(args) {
    return cliHelper.runCLICommand({
      cliArgs: ['credentials', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function createApp(args) {
    return cliHelper.runCLICommand({
      cliArgs: ['apps', 'create'].concat(args),
      adminPort,
      configDirectoryPath: tempPath
    });
  }

  function generateRedirectServer(port) {
    const app = express();

    app.get('/cb', (req, res) => res.sendStatus(200));

    return new Promise((resolve) => {
      const runningApp = app.listen(port, () => {
        resolve(runningApp);
      });
    });
  }
});
