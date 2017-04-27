const path = require('path');
const request = require('supertest');
const assert = require('chai').assert;
const debug = require('debug')('EG:test:hostnames')
let app;
let gateway = require('../src/gateway');

let policies = require('../src/policies');
describe('Should process host names', function() {
  before(function(done) {
    // registering test policies, they will collect data that is validateSuccessd in the "validateSuccess" method
    ['kittens_policy', 'cats_policy', 'parrot_policy', 'animals_dogs_policy'].forEach((key) => {
      policies.register(key, (params) => {
        return (req, res) => {
          res.json({ result: key, params, hostname: req.hostname, url: req.url })
        }
      })
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

  describe('exact host name configuration', () => {
    it('kitten.com/', validateSuccess({
      setup: {
        host: 'kitten.com',
        url: '/'
      },
      test: {
        host: 'kitten.com',
        url: '/',
        result: 'kittens_policy'
      }
    }));
    it('kitten.com', validateSuccess({
      setup: {
        host: 'kitten.com',
        url: ''
      },
      test: {
        host: 'kitten.com',
        url: '/',
        result: 'kittens_policy'
      }
    }));
    it('kitten.com/pretty', validateSuccess({
      setup: {
        host: 'kitten.com',
        url: '/pretty'
      },
      test: {
        host: 'kitten.com',
        url: '/pretty',
        result: 'kittens_policy'
      }
    }));
  })

  describe('filtering by part of url animals.com/dogs....', () => {
    it('animals.com/dogs/lassie', validateSuccess({
      setup: {
        host: 'animals.com',
        url: '/dogs/lassie'
      },
      test: {
        host: 'animals.com',
        url: '/lassie', // Note how it filters out /dogs part out
        result: 'animals_dogs_policy'
      }
    }));
    it('root dorectory processing animals.com/dogs', validateSuccess({
      setup: {
        host: 'animals.com',
        url: '/dogs'
      },
      test: {
        host: 'animals.com',
        url: '/',
        result: 'animals_dogs_policy'
      }
    }));
    it('animals.com/cats', validate404({
      setup: {
        host: 'animals.com',
        url: '/cats'
      }
    }));
    it('mathing regex animals.com/cats-id-123', validateSuccess({
      setup: {
        host: 'animals.com',
        url: '/cats-id-123'
      },
      test: {
        host: 'animals.com',
        url: '/',
        result: 'cats_policy'
      }
    }));
    it('mathing regex animals.com/cats-id-123/', validateSuccess({
      setup: {
        host: 'animals.com',
        url: '/cats-id-123/'
      },
      test: {
        host: 'animals.com',
        url: '/',
        result: 'cats_policy'
      }
    }));
    it('mathing regex animals.com/cats-id-123/cat', validateSuccess({
      setup: {
        host: 'animals.com',
        url: '/cats-id-123/cat'
      },
      test: {
        host: 'animals.com',
        url: '/cat',
        result: 'cats_policy'
      }
    }));
  })



  describe('wildcard host name configuration *.cats.com', () => {
    describe('should not load root domain cats.com', () => {
      it('cats.com', validate404({
        setup: {
          host: 'cats.com',
          url: '/'
        },
      }));
      it('cats.com', validate404({
        setup: {
          host: 'cats.com',
          url: ''
        },
      }));
      it('cats.com/pretty', validate404({
        setup: {
          host: 'cats.com',
          url: '/pretty'
        }
      }));
    })

    describe('should load subdomain little.cats.com', () => {
      it('little.cats.com/', validateSuccess({
        setup: {
          host: 'little.cats.com',
          url: '/'
        },
        test: {
          host: 'little.cats.com',
          url: '/',
          result: 'cats_policy'
        }
      }));
      it('little.cats.com', validateSuccess({
        setup: {
          host: 'little.cats.com',
          url: ''
        },
        test: {
          host: 'little.cats.com',
          url: '/',
          result: 'cats_policy'
        }
      }));
      it('little.cats.com/pretty', validateSuccess({
        setup: {
          host: 'little.cats.com',
          url: '/pretty'
        },
        test: {
          host: 'little.cats.com',
          url: '/pretty',
          result: 'cats_policy'
        }
      }));
    })
  })

  describe('regex host name configuration /[a-z]{3}.parrots.com/i', () => {
    describe('should not load root domain parrots.com', () => {
      it('parrots.com/', validate404({
        setup: {
          host: 'parrots.com',
          url: '/'
        },
      }));
      it('parrots.com', validate404({
        setup: {
          host: 'parrots.com',
          url: ''
        },
      }));
      it('parrots.com/pretty', validate404({
        setup: {
          host: 'parrots.com',
          url: '/pretty'
        }
      }));
    })
    describe('should not load subdomain not matching regexp', () => {
      it('parrots.com/', validate404({
        setup: {
          host: '1234.parrots.com',
          url: '/'
        },
      }));
      it('parrots.com', validate404({
        setup: {
          host: '1234.parrots.com',
          url: ''
        },
      }));
      it('parrots.com/pretty', validate404({
        setup: {
          host: '1234.parrots.com',
          url: '/pretty'
        }
      }));
    })

    describe('should load subdomain matching regext abc.parrots.com', () => {
      it('abc.parrots.com/', validateSuccess({
        setup: {
          host: 'abc.parrots.com',
          url: '/'
        },
        test: {
          host: 'abc.parrots.com',
          url: '/',
          result: 'parrot_policy'
        }
      }));
      it('abc.parrots.com', validateSuccess({
        setup: {
          host: 'abc.parrots.com',
          url: ''
        },
        test: {
          host: 'abc.parrots.com',
          url: '/',
          result: 'parrot_policy'
        }
      }));
      it('abc.parrots.com/pretty', validateSuccess({
        setup: {
          host: 'abc.parrots.com',
          url: '/pretty'
        },
        test: {
          host: 'abc.parrots.com',
          url: '/pretty',
          result: 'parrot_policy'
        }
      }));
    })
  })



  function validateSuccess(testCase) {
    return (done) => {
      request(app)
        .get(testCase.setup.url)
        .set('Host', testCase.setup.host)
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /json/)
        .expect(200)
        .expect((res) => {
          assert.equal(res.body.result, testCase.test.result)
          assert.equal(res.body.url, testCase.test.url)
          assert.equal(res.body.hostname, testCase.test.host)
        })
        .end(function(err, res) {
          if (err) { debug(res.body) }
          err ? done(err) : done();
        });
    }
  }

  function validate404(testCase) {
    return (done) => {
      request(app)
        .get(testCase.setup.url)
        .set('Host', testCase.setup.host)
        .set('Content-Type', 'application/json')
        .expect('Content-Type', /text\/html/)
        .expect(404)
        .end(function(err, res) {
          if (err) { debug(res.body) }
          err ? done(err) : done();
        });
    }
  }
});