// let policies = require('../src/policies');
const path = require('path');
const request = require('supertest');
const assert = require('chai').assert;
const debug = require('debug')('EG:test:plugin')
let app;
let gateway = require('../src/gateway');
describe('Should load plugins', function() {
  before(function(done) {
    // registering test policies, they will collect data that is validateSuccessd in the "validateSuccess" method


    gateway.start({
      configPath: path.join(__dirname, './configs/plugins-config.yml'),
      defaultBindPort: 9017,
      defaultBindHost: '127.0.0.1'
    }).then(result => {
      app = result.app
      app;
      done()
    }).catch(done);
  });
  it('should provide custom route', (done) => {
    request(app).get('/testing')
      .expect(200)
      .expect((res) => {
        assert.ok(res.body.plugin);
      }).end(function(err, res) {
        if (err) { debug(res.body) }
        err ? done(err) : done();
      });
  })
  it('should provide policy for route /', (done) => {
    request(app).get('/')
      .set('Host', 'cats.com')
      .set('Content-Type', 'application/json')
      .expect(200)
      .expect((res) => {
        assert.equal(res.body.conditional, true);
        assert.equal(res.body.result, 'plugin-policy');
      }).end(function(err, res) {
        if (err) { debug(res.body) }
        err ? done(err) : done();
      });
  })

  after('stop server', () => {
    app.close();
  })
})