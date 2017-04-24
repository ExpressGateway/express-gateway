'use strict';

// const assert = require('chai').assert;
const path = require('path');
const request = require('supertest');
let app;
let gateway = require('../src/gateway');

let policies = require('../src/policies');
describe('config parser', function() {
  before(function(done) {
    policies.register('srv1', (params) => {
      return (req, res) => {
        console.log('aaaaa');
        res.json({ result: 'srv1', params })
      }
    })
    policies.register('srv2', (params) => {
      return (req, res) => { res.json({ result: 'srv2', params }) }
    })
    gateway.start({
      configPath: path.join(__dirname, './configs/route-config.yml'),
      defaultBindPort: 8080,
      defaultBindHost: '127.0.0.1'
    }).then(result => {
      app = result.app
      done()
    }).catch(done);
  });

  it('sets up handlers for public endpoint foo', function(done) {
    request(app)
      .get('/')
      .set('Host', 'cats.com')
      .expect('Content-Type', /json/)
      .expect('Content-Length', '16')
      .expect(200)
      .end(function(err, res) {
        console.log(res);
        err ? done(err) : done();
      });
  });
  // it('sets up handlers for public endpoint bar', function() {
  //   assert(router.stack[1].regexp.toString().indexOf('/bar') >= 0);
  // });

  // it('sets up processors correctly', function() {
  //   assert.property(router, 'stack');
  //   assert.isArray(router.stack);
  //   assert.lengthOf(router.stack, 2);
  // });
});