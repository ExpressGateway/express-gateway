const supertest = require('supertest');
const should = require('should');
const dns = require('dns');
const os = require('os');
const config = require('../lib/config');
const testHelper = require('./common/routing.helper');

describe('hostname', () => {
  let helper, address;

  before('setup', (done) => {
    dns.lookup(os.hostname(), (err, add) => {
      address = add;
      if (err) {
        return done(err);
      }

      helper = testHelper();
      helper.addPolicy('test', () => (req, res) => {
        res.json({ result: 'test', hostname: req.hostname, url: req.url, apiEndpoint: req.egContext.apiEndpoint });
      });

      config.gatewayConfig = {
        http: {
          port: 10441,
          hostname: add
        },
        apiEndpoints: { test: {} },
        policies: ['test'],
        pipelines: {
          pipeline1: {
            apiEndpoint: 'test',
            policies: { test: {} }
          }
        }
      };
      helper.setup().then(() => done()).catch(err => done(err));
    });
  });

  it('should not answer on localhost', (done) => {
    supertest('http://localhost:10441').get('/').end(err => {
      should(err.message).containEql('ECONNREFUSED');
      done();
    });
  });

  it('should answer on the provided interface', () => {
    return supertest(`http://${address}:10441`).get('/').expect(200);
  });

  after(() => helper.cleanup());
});
