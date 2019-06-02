const EgContextBase = require('../lib/gateway/context');
const { init, conditions } = require('../lib/conditions');
const express = require('express');
const should = require('should');

describe('conditions', () => {
  before(init);

  describe('always', function () {
    const req = Object.create(express.request);
    it('should always return true', function () {
      should(conditions['always']()(req)).be.true();
    });
  });

  describe('never', function () {
    const req = Object.create(express.request);
    it('should always return false', function () {
      should(conditions['never']()(req)).be.false();
    });
  });

  describe('allOf', function () {
    const req = Object.create(express.request);
    it('should return true if all of the arguments is true', function () {
      should(conditions['allOf']({ conditions: [{ name: 'always' }, { name: 'always' }] })(req)).be.true();
    });
    it('should return false if one of the arguments is false', function () {
      should(conditions['allOf']({ conditions: [{ name: 'always' }, { name: 'never' }] })(req)).be.false();
    });
  });

  describe('oneOf', function () {
    const req = Object.create(express.request);
    it('should return true if one of the arguments is true', function () {
      should(conditions['oneOf']({ conditions: [{ name: 'never' }, { name: 'always' }] })(req)).be.true();
    });
    it('should return true if more than one of the arguments is true',
      function () {
        should(conditions['oneOf']({ conditions: [{ name: 'always' }, { name: 'always' }] })(req)).be.true();
      });
    it('should return false if none of the arguments are true', function () {
      should(conditions['oneOf']({ conditions: [{ name: 'never' }, { name: 'never' }] })(req)).be.false();
    });
  });

  describe('not', function () {
    const req = Object.create(express.request);
    it('should return true if the argument is false', function () {
      should(conditions['not']({ condition: { name: 'never' } })(req)).be.true();
    });
    it('should return false if the argument is true', function () {
      should(conditions['not']({ condition: { name: 'always' } })(req)).be.false();
    });
  });

  describe('pathExact', function () {
    const req = Object.create(express.request);
    it('should return true if request url is the same', function () {
      req.url = '/foo/bar/baz';
      should(conditions['pathExact']({ path: '/foo/bar/baz' })(req)).be.true();
    });
    it('should return false if request url is not the same', function () {
      req.url = '/foo/bar';
      should(conditions['pathExact']({ path: '/foo/bar/baz' })(req)).be.false();
    });
  });

  describe('pathMatch', function () {
    const req = Object.create(express.request);
    it('should return true if request url matches', function () {
      req.url = '/foo/bar';
      should(conditions['pathMatch']({ pattern: '(/(foo|bar|baz))+/?' })(req)).be.true();
    });
    it('should return false if request url does not match', function () {
      req.url = '/froo/brar';
      should(conditions['pathMatch']({ pattern: '(/(foo|bar|baz))/?' })(req)).be.false();
    });
  });

  describe('expression', () => {
    const req = Object.create(express.request);
    req.egContext = Object.create(new EgContextBase());
    req.egContext.req = req;
    it('should return false if expression does not match', function () {
      req.url = 'test';
      should(conditions['expression']({ expression: 'req.url.length>5' })(req)).be.false();
    });
    it('should pass if expression match', function () {
      req.url = 'test_123';
      should(conditions['expression']({ expression: 'req.url.length>5' })(req)).be.true();
    });
  });

  describe('method', function () {
    const req = Object.create(express.request);
    it('should return true if methods param is string and matches', function () {
      req.method = 'GET';
      should(conditions['method']({ methods: 'GET' })(req)).be.true();
    });

    it('should return true if methods param is list and method is member', function () {
      req.method = 'POST';
      should(conditions['method']({ methods: ['GET', 'POST', 'PUT'] })(req)).be.true();
    });

    it('should return false if methods param is string and does not match', function () {
      req.method = 'POST';
      should(conditions['method']({ methods: 'GET' })(req)).be.false();
    });

    it('should return false if param is list and method is not member',
      function () {
        req.method = 'HEAD';
        should(conditions['method']({ methods: ['GET', 'POST', 'PUT'] })(req)).be.false();
      });
  });

  describe('tlsClientAuthenticated', function () {
    const req = Object.create(express.request);

    it('should return true if request is client authenticated', function () {
      req.client = { authorized: true };
      should(conditions['tlsClientAuthenticated']()(req)).be.true();
    });

    it('should return false if request is client authenticated', function () {
      req.client.authorized = false;
      should(conditions['tlsClientAuthenticated']()(req)).be.false();
    });
  });

  describe('jsonSchema', function () {
    const req = Object.create(express.request);

    describe('with a local schema', function () {
      let conditionPromise;

      before(() => {
        conditionPromise = conditions['json-schema']({
          schema: {
            $id: 'schema1',
            type: 'object',
            properties: {
              name: {
                type: 'string'
              },
              surname: {
                type: 'string'
              },
              age: {
                type: 'number'
              }
            },
            required: ['name', 'surname', 'age']
          }
        });
      });

      it('should return true if the body matches the schema', () => {
        req.body = {
          name: 'Clark',
          surname: 'Kent',
          age: 30
        };

        return should(conditionPromise).be.resolved().then(fn => should(fn(req)).be.true());
      });

      it('should return false if the body does not match the schema', function () {
        req.body = {
          name: 'Clark',
          surname: 'Kent'
        };

        return should(conditionPromise).be.resolved().then(fn => {
          should(fn(req)).be.false();
        });
      });
    });

    describe('with a remote schema', function () {
      let conditionPromise;

      before(() => {
        conditionPromise = conditions['json-schema']({
          schema: {
            $id: 'oas',
            $ref: 'https://raw.githack.com/OAI/OpenAPI-Specification/master/schemas/v3.0/schema.json'
          }
        });
      });

      it('should match if the body matches the schema', () => {
        req.body = {
          openapi: '3.0.0',
          info: {
            version: '1',
            title: 'Nasino'
          },
          paths: {}
        };

        return should(conditionPromise).be.resolved().then(fn => {
          should(fn(req)).be.true();
        });
      });

      it('should not match if the body does not matches the schema', () => {
        req.body = {
          info: {},
          paths: {}
        };

        return should(conditionPromise).be.resolved().then(fn => {
          should(fn(req)).be.false();
        });
      });
    });
  });

  describe('complex conditions', function () {
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
      should(conditions['allOf'](rule)(req)).be.true();
      control.name = 'always';
      should(conditions['allOf'](rule)(req)).be.false();
    });
  });
});
