// const path = require('path');
const request = require('supertest');
const assert = require('chai').assert;
const logger = require('../../lib/log').test;
let gateway = require('../../lib/gateway');
const _ = require('lodash');
let config = require('../../lib/config');

module.exports = function () {
  let app, httpsApp, originalGatewayConfig;
  let actions = require('../../lib/actions').init();
  return {
    registerAction: ({name, handler}) => {
      actions.register(name, (params) => {
        return handler;
      }, 'test');
    },
    setup: testSuite => () => {
      if (testSuite && testSuite.gatewayConfig) {
        originalGatewayConfig = config.gatewayConfig;
        config.gatewayConfig = testSuite.gatewayConfig;
      }
      testSuite && testSuite.fakeActions && testSuite.fakeActions.forEach((key) => {
        actions.register(key, (params) => {
          return (req, res) => {
            res.json({ result: key, params, hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
          };
        }, 'test');
      });

      return gateway()
        .then(apps => {
          app = apps.app;
          httpsApp = apps.httpsApp;
          return apps;
        });
    },
    cleanup: () => {
      if (originalGatewayConfig) {
        config.gatewayConfig = originalGatewayConfig;
      }
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
        let testScenario = request(app);
        if (testCase.setup.postData) {
          testScenario = testScenario.post(testCase.setup.url, testCase.setup.postData);
        } else {
          testScenario = testScenario.get(testCase.setup.url);
        }

        if (testCase.setup.host) {
          testScenario.set('Host', testCase.setup.host);
        }
        testScenario.set('Content-Type', 'application/json')
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
        let testScenario = request(app).options(testCase.setup.url);

        if (testCase.setup.host) {
          testScenario.set('Host', testCase.setup.host);
        }
        if (testCase.test.headers) {
          for (let el in testCase.test.headers) {
            let header = el;
            let value = testCase.test.headers[el];

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
        let testScenario = request(app);
        if (testCase.setup.postData) {
          testScenario = testScenario.post(testCase.setup.url, testCase.setup.postData);
        } else {
          testScenario = testScenario.get(testCase.setup.url);
        }
        if (testCase.setup.host) {
          testScenario.set('Host', testCase.setup.host);
        }
        testScenario.set('Content-Type', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .expect((res) => {
            if (testCase.test.result) {
              assert.equal(res.body.result, testCase.test.result);
            }
            assert.equal(res.body.url, testCase.test.url);
            if (testCase.test.host) {
              assert.equal(res.body.hostname, testCase.test.host);
            }
            if (testCase.test.scopes) {
              assert.ok(_.isEqual(res.body.apiEndpoint.scopes, testCase.test.scopes));
            }
          })
          .end((err, res) => {
            if (err) { logger.error(res.body); }
            err ? done(err) : done();
          });
      };
    }
  };
};
