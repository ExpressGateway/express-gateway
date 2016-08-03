'use strict';

const assert = require('chai').assert;
const sinon = require('sinon');

const parseConfig = require('../src/config').parseConfig;

describe('config parser', function() {
  let app = undefined;

  before(function() {
    app = {
      use: sinon.spy()
    };
    parseConfig(app, {
      privateEndpoints: {
        backend: {
          url: 'http://www.example.com'
        }
      },
      pipelines: [
        {
          name: 'pipeline1',
          publicEndpoints: [
            {path: '/foo'},
            {path: '/bar'}
          ],
          processors: [
            {
              condition: ['always'],
              action: 'throttle',
              params: {}
            },
            {
              condition: ['always'],
              action: 'proxy',
              params: {
                privateEndpoint: 'backend'
              }
            }
          ]
        }
      ]
    });
  });

  it('sets up handlers for each public endpoint', function() {
    assert(app.use.calledWithMatch('/foo', sinon.match.func));
    assert(app.use.calledWithMatch('/bar', sinon.match.func));
  });

  it('sets up processors correctly', function() {
    let router = app.use.getCall(0).args[1];
    assert.property(router, 'stack');
    assert.isArray(router.stack);
    assert.lengthOf(router.stack, 2);
  });
});
