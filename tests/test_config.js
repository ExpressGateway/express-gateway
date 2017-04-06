'use strict';

const assert = require('chai').assert;
const parseConfig = require('../src/config').parseConfig;

describe('config parser', function() {
  let router = undefined;

  before(function() {
    router = parseConfig({
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

  it('sets up handlers for public endpoint foo', function() {
    assert(router.stack[0].regexp.toString().indexOf('/foo') >= 0);
  });
  it('sets up handlers for public endpoint bar', function() {
    assert(router.stack[1].regexp.toString().indexOf('/bar') >= 0);
  });

  it('sets up processors correctly', function() {
    assert.property(router, 'stack');
    assert.isArray(router.stack);
    assert.lengthOf(router.stack, 2);
  });
});
