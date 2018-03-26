const EgContextBase = require('../lib/gateway/context');
require('../lib/conditions').init();
const express = require('express');
const should = require('should');

describe('always', function () {
  const req = Object.create(express.request);
  it('should always return true', function () {
    should(req.matchEGCondition({ name: 'always' })).be.true();
  });
});

describe('never', function () {
  const req = Object.create(express.request);
  it('should always return false', function () {
    should(req.matchEGCondition({ name: 'never' })).be.false();
  });
});

describe('allOf', function () {
  const req = Object.create(express.request);
  it('should return true if all of the arguments is true', function () {
    should(req.matchEGCondition({
      name: 'allOf',
      conditions: [{ name: 'always' }, { name: 'always' }]
    })).be.true();
  });
  it('should return false if one of the arguments is false', function () {
    should(req.matchEGCondition({
      name: 'allOf',
      conditions: [{ name: 'always' }, { name: 'never' }]
    })).be.false();
  });
});

describe('oneOf', function () {
  const req = Object.create(express.request);
  it('should return true if one of the arguments is true', function () {
    should(req.matchEGCondition({
      name: 'oneOf',
      conditions: [{ name: 'never' }, { name: 'always' }]
    })).be.true();
  });
  it('should return true if more than one of the arguments is true',
    function () {
      should(req.matchEGCondition({
        name: 'oneOf',
        conditions: [{ name: 'always' }, { name: 'always' }]
      })).be.true();
    });
  it('should return false if none of the arguments are true', function () {
    should(req.matchEGCondition({
      name: 'oneOf',
      conditions: [{ name: 'never' }, { name: 'never' }]
    })).be.false();
  });
});

describe('not', function () {
  const req = Object.create(express.request);
  it('should return true if the argument is false', function () {
    should(req.matchEGCondition({ name: 'not', condition: { name: 'never' } })).be.true();
  });
  it('should return false if the argument is true', function () {
    should(req.matchEGCondition({ name: 'not', condition: { name: 'always' } })).be.false();
  });
});

describe('pathExact', function () {
  const req = Object.create(express.request);
  it('should return true if request url is the same', function () {
    req.url = '/foo/bar/baz';
    should(req.matchEGCondition({ name: 'pathExact', path: '/foo/bar/baz' })).be.true();
  });
  it('should return false if request url is not the same', function () {
    req.url = '/foo/bar';
    should(req.matchEGCondition({ name: 'pathExact', path: '/foo/bar/baz' })).be.false();
  });
});

describe('pathMatch', function () {
  const req = Object.create(express.request);
  it('should return true if request url matches', function () {
    req.url = '/foo/bar';
    should(req.matchEGCondition({ name: 'pathMatch', pattern: '(/(foo|bar|baz))+/?' })).be.true();
  });
  it('should return false if request url does not match', function () {
    req.url = '/froo/brar';
    should(req.matchEGCondition({ name: 'pathMatch', pattern: '(/(foo|bar|baz))/?' })).be.false();
  });
});

describe('expression', () => {
  const req = Object.create(express.request);
  req.egContext = Object.create(new EgContextBase());
  req.egContext.req = req;
  it('should return false if expression does not match', function () {
    req.url = 'test';
    should(req.matchEGCondition({
      name: 'expression',
      expression: 'req.url.length>5'
    })).be.false();
  });
  it('should pass if expression match', function () {
    req.url = 'test_123';
    should(req.matchEGCondition({
      name: 'expression',
      expression: 'req.url.length>5'
    })).be.true();
  });
});

describe('method', function () {
  const req = Object.create(express.request);
  it('should return true if methods param is string and matches', function () {
    req.method = 'GET';
    should(req.matchEGCondition({
      name: 'method',
      methods: 'GET'
    })).be.true();
  });

  it('should return true if methods param is list and method is member', function () {
    req.method = 'POST';
    should(req.matchEGCondition({
      name: 'method',
      methods: ['GET', 'POST', 'PUT']
    })).be.true();
  });

  it('should return false if methods param is string and does not match', function () {
    req.method = 'POST';
    should(req.matchEGCondition({
      name: 'method',
      methods: 'GET'
    })).be.false();
  });

  it('should return false if param is list and method is not member',
    function () {
      req.method = 'HEAD';
      should(req.matchEGCondition({
        name: 'method',
        methods: ['GET', 'POST', 'PUT']
      })).be.false();
    });
});

describe('tlsClientAuthenticated', function () {
  const req = Object.create(express.request);

  it('should return true if request is client authenticated', function () {
    req.client = { authorized: true };
    should(req.matchEGCondition({
      name: 'tlsClientAuthenticated'
    })).be.true();
  });

  it('should return true if request is client authenticated', function () {
    req.client.authorized = false;
    should(req.matchEGCondition({
      name: 'tlsClientAuthenticated'
    })).be.false();
  });
});

describe('req.matchEGCondition', function () {
  const req = Object.create(express.request);
  it('correctly handles complex conditional rule', function () {
    const control = { name: 'never' };
    const rule = {
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
    should(req.matchEGCondition(rule)).be.true();
    control.name = 'always';
    should(req.matchEGCondition(rule)).be.false();
  });
});
