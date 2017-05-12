'use strict';

const run = require('../src/conditionals').run;
const assert = require('chai').assert;

describe('always', function() {
  it('should always return true', function() {
    assert.isTrue(run({}, ['always']));
  });
});

describe('never', function() {
  it('should always return false', function() {
    assert.isFalse(run({}, ['never']));
  });
});

describe('allOf', function() {
  it('should return true if all of the arguments is true', function() {
    assert.isTrue(run({}, ['allOf', ['always'], ['always'], ['always']]));
    assert.isTrue(run({}, ['allOf', ['always']]));
  });
  it('should return false if one of the arguments is false', function() {
    assert.isFalse(run({}, ['allOf', ['always'], ['always'], ['never']]));
    assert.isFalse(run({}, ['allOf', ['always'], ['never'], ['always']]));
    assert.isFalse(run({}, ['allOf', ['never']]));
  });
});

describe('oneOf', function() {
  it('should return true if one of the arguments is true', function() {
    assert.isTrue(run({}, ['oneOf', ['never'], ['always'], ['never']]));
    assert.isTrue(run({}, ['oneOf', ['always']]));
  });
  it('should return true if more than one of the arguments is true',
    function() {
      assert.isTrue(run({}, ['oneOf', ['always'], ['always'], ['always']]));
      assert.isTrue(run({}, ['oneOf', ['always'], ['always']]));
    });
  it('should return false if none of the arguments are true', function() {
    assert.isFalse(run({}, ['oneOf', ['never']]));
    assert.isFalse(run({}, ['oneOf', ['never'], ['never'], ['never']]));
  });
});

describe('not', function() {
  it('should return true if the argument is false', function() {
    assert.isTrue(run({}, ['not', ['never']]));
  });
  it('should return false if the argument is true', function() {
    assert.isFalse(run({}, ['not', ['always']]));
  });
});

describe('pathExact', function() {
  it('should return true if request url is the same', function() {
    assert.isTrue(run({
      url: '/foo/bar/baz'
    }, ['pathExact', '/foo/bar/baz']));
  });
  it('should return false if request url is not the same', function() {
    assert.isFalse(run({
      url: '/foo/bar'
    }, ['pathExact', '/foo/bar/baz']));
    assert.isFalse(run({
      url: '/foo/bar'
    }, ['pathExact', '/flippyflip']));
    assert.isFalse(run({
      url: '/foo/bar'
    }, ['pathExact', 'is this even a url?']));
  });
});

describe('pathMatch', function() {
  it('should return true if request url matches', function() {
    assert.isTrue(run({
      url: '/foo/bar'
    }, ['pathMatch', '(/(foo|bar|baz))+/?']));
    assert.isTrue(run({
      url: '/foo/bar/baz'
    }, ['pathMatch', '(/(foo|bar|baz))+/?']));
    assert.isTrue(run({
      url: '/foo/bar/baz/blahblah'
    }, ['pathMatch', '(/(foo|bar|baz))+/?']));
  });
  it('should return false if request url does not match', function() {
    assert.isTrue(run({
      url: '/foo/bar/baz/blahblah'
    }, ['pathMatch', '(/(foo|bar|baz))+/?']));
    assert.isFalse(run({
      url: '/froo/brar'
    }, ['pathMatch', '(/(foo|bar|baz))/?']));
  });
});

describe('method', function() {
  it('should return true if param is string and matches', function() {
    assert.isTrue(run({method: 'GET'}, ['method', 'GET']));
    assert.isTrue(run({method: 'POST'}, ['method', 'POST']));
  });

  it('should return true if param is list and method is member', function() {
    assert.isTrue(run({method: 'GET'}, ['method', ['GET', 'POST', 'PUT']]));
    assert.isTrue(run({method: 'POST'}, ['method', ['GET', 'POST', 'PUT']]));
  });

  it('should return false if param is string and does not match', function() {
    assert.isFalse(run({method: 'HEAD'}, ['method', 'GET']));
    assert.isFalse(run({method: 'POST'}, ['method', 'PUT']));
  });

  it('should return false if param is list and method is not member',
    function() {
      assert.isFalse(run({method: 'HEAD'}, ['method', ['GET', 'POST', 'PUT']]));
    });
});

describe('run', function() {
  it('correctly handles complex conditional rule', function() {
    let control = ['never'];
    let rule = ['allOf',
      ['oneOf',
        'never',
        ['pathExact', '/foo/bar'],
        ['not', ['always']]],
      ['not',
        ['oneOf',
          control,
          ['pathExact', '/path/path/path']]],
      ['pathMatch', '/foo(/baz)?(/bar)?']
    ];

    assert.isTrue(run({url: '/foo/bar'}, rule));
    control[0] = 'always';
    assert.isFalse(run({url: '/foo/bar'}, rule));
  });
});
