'use strict';

const run = require('../src/conditionals').run;
const assert = require('chai').assert;

describe('always', function() {
  it('should always return true', function() {
    assert.isTrue(run({}, { name: 'always' }));
  });
});

describe('never', function() {
  it('should always return false', function() {
    assert.isFalse(run({}, { name: 'never' }));
  });
});

describe('allOf', function() {
  it('should return true if all of the arguments is true', function() {
    assert.isTrue(run({}, {
      name: 'allOf',
      conditions: [{ name: 'always' }, { name: 'always' }]
    }));
    assert.isTrue(run({}, {
      name: 'allOf',
      conditions: [{ name: 'always' }]
    }));
  });
  it('should return false if one of the arguments is false', function() {
    assert.isFalse(run({}, {
      name: 'allOf',
      conditions: [{ name: 'always' }, { name: 'never' }]
    }));
    assert.isFalse(run({}, {
      name: 'allOf',
      conditions: [{ name: 'never' }, { name: 'always' }]
    }));
    assert.isFalse(run({}, {
      name: 'allOf',
      conditions: [{ name: 'always' }, { name: 'never' }, { name: 'always' }]
    }));
    assert.isFalse(run({}, {
      name: 'allOf',
      conditions: [{ name: 'never' }]
    }));
  });
});

describe('oneOf', function() {
  it('should return true if one of the arguments is true', function() {
    assert.isTrue(run({}, {
      name: 'oneOf',
      conditions: [{ name: 'never' }, { name: 'always' }]
    }));
    assert.isTrue(run({}, {
      name: 'oneOf',
      conditions: [{ name: 'always' }, { name: 'never' }]
    }));
    assert.isTrue(run({}, {
      name: 'oneOf',
      conditions: [{ name: 'always' }]
    }));
  });
  it('should return true if more than one of the arguments is true',
    function() {
      assert.isTrue(run({}, {
        name: 'oneOf',
        conditions: [{ name: 'always' }, { name: 'always' }]
      }));
      assert.isTrue(run({}, {
        name: 'oneOf',
        conditions: [{ name: 'always' }]
      }));
    });
  it('should return false if none of the arguments are true', function() {
    assert.isFalse(run({}, {
      name: 'oneOf',
      conditions: [{ name: 'never' }, { name: 'never' }]
    }));
    assert.isFalse(run({}, {
      name: 'oneOf',
      conditions: [{ name: 'never' }]
    }));
  });
});

describe('not', function() {
  it('should return true if the argument is false', function() {
    assert.isTrue(run({}, { name: 'not', condition: { name: 'never' } }));
  });
  it('should return false if the argument is true', function() {
    assert.isFalse(run({}, { name: 'not', condition: { name: 'always' } }));
  });
});

describe('pathExact', function() {
  it('should return true if request url is the same', function() {
    assert.isTrue(run({
      url: '/foo/bar/baz'
    }, { name: 'pathExact', path: '/foo/bar/baz' }));
  });
  it('should return false if request url is not the same', function() {
    assert.isFalse(run({
      url: '/foo/bar'
    }, { name: 'pathExact', path: '/foo/bar/baz' }));
    assert.isFalse(run({
      url: '/foo/bar'
    }, { name: 'pathExact', path: '/flippyflip' }));
    assert.isFalse(run({
      url: '/foo/bar'
    }, { name: 'pathExact', path: 'is this even a url?' }));
  });
});

describe('pathMatch', function() {
  it('should return true if request url matches', function() {
    assert.isTrue(run({
      url: '/foo/bar'
    }, { name: 'pathMatch', pattern: '(/(foo|bar|baz))+/?' }));
    assert.isTrue(run({
      url: '/foo/bar/baz'
    }, { name: 'pathMatch', pattern: '(/(foo|bar|baz))+/?' }));
    assert.isTrue(run({
      url: '/foo/bar/baz/blahblah'
    }, { name: 'pathMatch', pattern: '(/(foo|bar|baz))+/?' }));
  });
  it('should return false if request url does not match', function() {
    assert.isFalse(run({
      url: '/froo/brar'
    }, { name: 'pathMatch', pattern: '(/(foo|bar|baz))/?' }));
  });
});

describe('method', function() {
  it('should return true if param is string and matches', function() {
    assert.isTrue(run({ method: 'GET' }, {
      name: 'method',
      methods: ['GET']
    }));
    assert.isTrue(run({ method: 'POST' }, {
      name: 'method',
      methods: ['POST']
    }));
  });

  it('should return true if param is list and method is member', function() {
    assert.isTrue(run({ method: 'GET' }, {
      name: 'method',
      methods: ['GET', 'POST', 'PUT']
    }));
    assert.isTrue(run({ method: 'POST' }, {
      name: 'method',
      methods: ['GET', 'POST', 'PUT']
    }));
  });

  it('should return false if param is string and does not match', function() {
    assert.isFalse(run({ method: 'HEAD' }, {
      name: 'method',
      methods: ['GET']
    }));
    assert.isFalse(run({ method: 'POST' }, {
      name: 'method',
      methods: ['PUT']
    }));
  });

  it('should return false if param is list and method is not member',
    function() {
      assert.isFalse(run({ method: 'HEAD' }, {
        name: 'method',
        methods: ['GET', 'POST', 'PUT']
      }));
    });
});

describe('run', function() {
  it('correctly handles complex conditional rule', function() {
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
              { name: 'pathExact', path: '/path/path/path' },
            ]
          }
        }
      ]
    }

    assert.isTrue(run({ url: '/foo/bar' }, rule));
    control.name = 'always';
    assert.isFalse(run({ url: '/foo/bar' }, rule));
  });
});