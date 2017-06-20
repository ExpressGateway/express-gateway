let mock = require('mock-require');
mock('redis', require('fakeredis'));

const {EgContextBase} = require('../src/gateway/context');
require('../src/conditions').init();
const express = require('express');
const assert = require('chai').assert;

describe('always', function () {
  let req = Object.create(express.request);
  it('should always return true', function () {
    assert.isTrue(req.matchEGCondition({ name: 'always' }));
  });
});

describe('never', function () {
  let req = Object.create(express.request);
  it('should always return false', function () {
    assert.isFalse(req.matchEGCondition({ name: 'never' }));
  });
});

describe('allOf', function () {
  let req = Object.create(express.request);
  it('should return true if all of the arguments is true', function () {
    assert.isTrue(req.matchEGCondition({
      name: 'allOf',
      conditions: [{ name: 'always' }, { name: 'always' }]
    }));
  });
  it('should return false if one of the arguments is false', function () {
    assert.isFalse(req.matchEGCondition({
      name: 'allOf',
      conditions: [{ name: 'always' }, { name: 'never' }]
    }));
  });
});

describe('oneOf', function () {
  let req = Object.create(express.request);
  it('should return true if one of the arguments is true', function () {
    assert.isTrue(req.matchEGCondition({
      name: 'oneOf',
      conditions: [{ name: 'never' }, { name: 'always' }]
    }));
  });
  it('should return true if more than one of the arguments is true',
    function () {
      assert.isTrue(req.matchEGCondition({
        name: 'oneOf',
        conditions: [{ name: 'always' }, { name: 'always' }]
      }));
    });
  it('should return false if none of the arguments are true', function () {
    assert.isFalse(req.matchEGCondition({
      name: 'oneOf',
      conditions: [{ name: 'never' }, { name: 'never' }]
    }));
  });
});

describe('not', function () {
  let req = Object.create(express.request);
  it('should return true if the argument is false', function () {
    assert.isTrue(req.matchEGCondition({ name: 'not', condition: { name: 'never' } }));
  });
  it('should return false if the argument is true', function () {
    assert.isFalse(req.matchEGCondition({ name: 'not', condition: { name: 'always' } }));
  });
});

describe('pathExact', function () {
  let req = Object.create(express.request);
  it('should return true if request url is the same', function () {
    req.url = '/foo/bar/baz';
    assert.isTrue(req.matchEGCondition({ name: 'pathExact', path: '/foo/bar/baz' }));
  });
  it('should return false if request url is not the same', function () {
    req.url = '/foo/bar';
    assert.isFalse(req.matchEGCondition({ name: 'pathExact', path: '/foo/bar/baz' }));
  });
});

describe('pathMatch', function () {
  let req = Object.create(express.request);
  it('should return true if request url matches', function () {
    req.url = '/foo/bar';
    assert.isTrue(req.matchEGCondition({ name: 'pathMatch', pattern: '(/(foo|bar|baz))+/?' }));
  });
  it('should return false if request url does not match', function () {
    req.url = '/froo/brar';
    assert.isFalse(req.matchEGCondition({ name: 'pathMatch', pattern: '(/(foo|bar|baz))/?' }));
  });
});

describe('expression', () => {
  let req = Object.create(express.request);
  req.egContext = Object.create(new EgContextBase());
  req.egContext.req = req;
  it('should return false if expression does not match', function () {
    req.url = 'test';
    assert.isFalse(req.matchEGCondition({
      name: 'expression',
      expression: 'req.url.length>5'
    }));
  });
  it('should pass if expression match', function () {
    req.url = 'test_123';
    assert.isTrue(req.matchEGCondition({
      name: 'expression',
      expression: 'req.url.length>5'
    }));
  });
});

describe('method', function () {
  let req = Object.create(express.request);
  it('should return true if methods param is string and matches', function () {
    req.method = 'GET';
    assert.isTrue(req.matchEGCondition({
      name: 'method',
      methods: 'GET'
    }));
  });

  it('should return true if methods param is list and method is member', function () {
    req.method = 'POST';
    assert.isTrue(req.matchEGCondition({
      name: 'method',
      methods: ['GET', 'POST', 'PUT']
    }));
  });

  it('should return false if methods param is string and does not match', function () {
    req.method = 'POST';
    assert.isFalse(req.matchEGCondition({
      name: 'method',
      methods: 'GET'
    }));
  });

  it('should return false if param is list and method is not member',
    function () {
      req.method = 'HEAD';
      assert.isFalse(req.matchEGCondition({
        name: 'method',
        methods: ['GET', 'POST', 'PUT']
      }));
    });
});

describe('req.matchEGCondition', function () {
  let req = Object.create(express.request);
  it('correctly handles complex conditional rule', function () {
    let control = { name: 'never' };
    let rule = {
      name: 'allOf',
      conditions: [{
        name: 'oneOf',
        conditions: [
            { name: 'pathExact', path: '/foo/bar' },
            { name: 'not', condition: { name: 'always' } }
        ]
      },
      {
        name: 'not',
        condition: {
          name: 'oneOf',
          conditions: [
            control,
              { name: 'pathExact', path: '/path/path/path' }
          ]
        }
      }
      ]
    };
    req.url = '/foo/bar';
    assert.isTrue(req.matchEGCondition(rule));
    control.name = 'always';
    assert.isFalse(req.matchEGCondition(rule));
  });
});
