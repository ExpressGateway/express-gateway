const request = require('supertest');
const should = require('should');
const logger = require('../../lib/logger').test;
const gateway = require('../../lib/gateway');
const config = require('../../lib/config');
let policies = require('../../lib/policies');

module.exports = function () {
  let app, httpsApp, originalGatewayConfig, originalPolicies;
  function prepareScenario (testCase) {
    let testScenario = request(app);
    if (testCase.setup.putData) {
      testScenario = testScenario.put(testCase.setup.url, testCase.setup.putData);
    } else if (testCase.setup.postData) {
      testScenario = testScenario.post(testCase.setup.url, testCase.setup.postData);
    } else {
      testScenario = testScenario.get(testCase.setup.url);
    }

    testScenario.set('Content-Type', 'application/json');

    if (testCase.setup.host) {
      testScenario.set('Host', testCase.setup.host);
    }
    return testScenario;
  }
  return {
    addPolicy: (name, handler) => { // TODO: make it plugin
      policies.register({ policy: handler, name });
    },
    setup: ({ config, plugins } = {}) => {
      originalPolicies = policies;

      return gateway({ config, plugins })
        .then(apps => {
          app = apps.app;
          httpsApp = apps.httpsApp;
          return apps;
        });
    },
    setupApp: (preparedApp) => {
      app = preparedApp;
    },
    cleanup: () => {
      if (originalGatewayConfig) {
        config.gatewayConfig = originalGatewayConfig;
      }
      policies = originalPolicies;
      app && app.close();
      httpsApp && httpsApp.close();
    },
    validate404: function (testCase) {
      testCase.test = testCase.test || {};
      testCase.test.errorCode = 404;
      return this.validateError(testCase);
    },
    validateError: (testCase) => {
      return (done) => {
        const testScenario = prepareScenario(testCase);
        testScenario
          .expect(testCase.test.errorCode)
          .expect('Content-Type', /text\/html/)
          .end((err, res) => {
            if (err) { logger.error(res.body); }
            err ? done(err) : done();
          });
      };
    },
    validateOptions: (testCase) => {
      return (done) => {
        const testScenario = request(app).options(testCase.setup.url);

        if (testCase.setup.host) {
          testScenario.set('Host', testCase.setup.host);
        }
        if (testCase.test.headers) {
          for (const el in testCase.test.headers) {
            const header = el;
            const value = testCase.test.headers[el];

            testScenario.expect(header, value);
          }
        }
        testScenario.expect(204)
          .end((err, res) => {
            err ? done(err) : done();
          });
      };
    },
    validateSuccess: (testCase) => {
      return (done) => {
        const testScenario = prepareScenario(testCase);
        testScenario
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            if (testCase.test.result) {
              should(res.body.result).be.eql(testCase.test.result);
            }
            should(res.body.url).be.eql(testCase.test.url);
            if (testCase.test.host) {
              should(res.body.hostname).be.eql(testCase.test.host);
            }
            if (testCase.test.scopes) {
              should(res.body.apiEndpoint.scopes).be.deepEqual(testCase.test.scopes);
            }
          })
          .end((err, res) => {
            if (err) { logger.error(res.body); }
            err ? done(err) : done();
          });
      };
    },
    validateParams: (testCase) => {
      return (done) => {
        const testScenario = prepareScenario(testCase);
        testScenario
          .expect((res) => {
            should(res.body.params).be.deepEqual(testCase.test.params);
          })
          .end((err, res) => {
            if (err) { logger.error(res.body); }
            err ? done(err) : done();
          });
      };
    }
  };
};
