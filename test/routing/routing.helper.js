const path = require('path');
const request = require('supertest');
const assert = require('chai').assert;
const logger = require('../../src/log').test;
let gateway = require('../../src/gateway');
const _ = require('lodash');

module.exports = function () {
  let app, httpsApp;
  return {
    setup: testSuite => () => {
      let actions = require('../../src/actions').init();
      testSuite.fakeActions.forEach((key) => {
        actions.register(key, (params) => {
          return (req, res) => {
            res.json({ result: key, params, hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
          };
        }, 'test');
      });
      let options = {};
      if (testSuite.gatewayConfigPath) {
        options.gatewayConfigPath = path.join(__dirname, testSuite.gatewayConfigPath);
      } else {
        options.gatewayConfig = testSuite.gatewayConfig;
      }
      return gateway.start(options)
        .then(result => {
          app = result.app;
          httpsApp = result.httpsApp;
          return result;
        });
    },
    cleanup: () => done => {
      app && app.close();
      httpsApp && httpsApp.close();
      done();
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
          for (let [ header, value ] of Object.entries(testCase.test.headers)) {
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
