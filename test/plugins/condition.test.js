const assert = require('chai').assert;
const gateway = require('../../lib/gateway');
const Config = require('../../lib/config/config');
const express = require('express');

const config = new Config();
config.gatewayConfig = {
  http: {
    port: 0
  },
  apiEndpoints: {
    api: {
      host: '*'}},
  serviceEndpoints: {
    backend: {
      url: 'http://www.example.com'
    }},
  policies: ['proxy'],
  pipelines: {
    ecommerce: {
      apiEndpoints: ['api'],
      policies: [{
        proxy: [{
          action: {
            serviceEndpoint: 'backend'
          }
        }]
      }]
    }}
};

describe('gateway condition with plugins', () => {
  let gatewaySrv;
  before('fires up a new gateway instance', function () {
    return gateway({
      plugins: {
        conditions: [{
          name: 'test-condition',
          handler: function (req, conditionConfig) {
            assert.ok(conditionConfig.param1);
            assert.equal(req.url, '/test');
            return (conditionConfig.param1 === req.url);
          }
        }]},
      config
    }).then(srv => {
      gatewaySrv = srv.app;
      return srv;
    });
  });

  it('should  return false for param1 not matching url', function () {
    const req = Object.create(express.request);
    req.url = '/test';
    assert.isFalse(req.matchEGCondition({ name: 'test-condition', param1: true }));
  });

  it('should  return true for param1 matching url', function () {
    const req = Object.create(express.request);
    req.url = '/test';
    assert.ok(req.matchEGCondition({ name: 'test-condition', param1: '/test' }));
  });

  after('close gateway srv', () => {
    gatewaySrv.close();
  });
});
