let should = require('should');
let config = require('./config.models.js');
let uuid = require('node-uuid');
let services = require('../src/consumers')(config);
let applicationService = services.applicationService;
let userService = services.userService;
let db = require('../src/db')(config.redis.host, config.redis.port);

describe('Application service tests', function () {

  describe('Insert tests', function () {
    let user;
    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should insert an application', function (done) {
      let _user = createRandomUserObject();
      let app;

      userService
      .insert(_user)
      .then(function(newUser) {
        user = newUser;
        should.exist(user.id);
        app = {
          name: 'test-app-1'
        };

        applicationService
        .insert(app, user.id)
        .then(function(newApp) {
          should.exist(newApp);
          should.exist(newApp.id);
          should.exist(newApp.name);
          newApp.name.should.eql(app.name);
          should.exist(newApp.createdAt);
          should.exist(newApp.userId);
          newApp.userId.should.eql(user.id);
          done();
        })
        .catch(function(err) {
          console.log(err)
          should.not.exist(err);
          done();
        })
      })
    });

    it('should throw an error when inserting an app with missing properties', function (done) {
      let app = {};

      applicationService
      .insert(app, user.id)
      .then(function(newApp) {
        should.not.exist(newApp);
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('Failed to insert application: name is required');
        done();
      });
    });

    it('should allow inserting multiple applications per user', function (done) {
      let app = {
          name: 'test-app-2'
        };

      applicationService
      .insert(app, user.id)
      .then(function(newApp) {
        should.exist(newApp);
        should.exist(newApp.id);
        should.exist(newApp.name);
        newApp.name.should.eql(app.name);
        should.exist(newApp.createdAt);
        should.exist(newApp.userId);
        newApp.userId.should.eql(user.id);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      })
    });
  });

  describe('Get application tests', function () { 
    let user, app;

    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        let _user = createRandomUserObject();
        userService
        .insert(_user)
        .then(function(newUser) {
          should.exist(newUser);
          user = newUser
          app = {
            name: 'test-app'
          }
          applicationService
          .insert(app, user.id)
          .then(function(newApp) {
            should.exist(newApp);
            app = newApp;
            done();
          });
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get app by id', function (done) {
      applicationService
      .get(app.id)
      .then(function(_app) {
        should.exist(_app);
        should.exist(_app.id);
        _app.id.should.eql(app.id);
        should.exist(_app.name);
        _app.name.should.eql(app.name);
        should.exist(_app.createdAt);
        should.exist(_app.updatedAt);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      })
    });

    it('should not get app by invalid id', function (done) {
      applicationService.get('invalid_id')
        .then(function(_app) {
          should.not.exist(_app);
          done();
        })
        .catch(function(err) {
          should.exist(err);
          err.message.should.eql('app not found');
          done();
        })
    });

    it('should get all apps belonging to a user', function(done) {
      let user1, app1, app2;

      userService
      .insert(createRandomUserObject())
      .then(function(newUser) {
        should.exist(newUser);
        user1 = newUser;
        app1 = {
          name: 'test-app-1'
        }
        return applicationService
        .insert(app1, user1.id)
        .then(function(newApp) {
          should.exist(newApp);
          app1 = newApp;
          return; 
        })
      })
      .then(function() {
        app2 = {
          name: 'test-app-2'
        }
        return applicationService
        .insert(app2, user1.id)
        .then(function(newApp) {
          should.exist(newApp);
          app2 = newApp;
          return; 
        })
      })
      .then(function() {
        return applicationService
        .getAll(user1.id)
        .then(function(apps) {
          should.exist(apps);
          apps.length.should.eql(2);
          [app1.id, app2.id].includes(apps[0]['id']).should.eql(true);
          [app1.id, app2.id].includes(apps[1]['id']).should.eql(true);
          done();
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Delete app tests', function() {
    let user, app;

    before(function(done) {
      db.flushdbAsync()
      .then(function(didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        let _user = createRandomUserObject();
        userService
        .insert(_user)
        .then(function(newUser) {
          should.exist(newUser);
          user = newUser
          app = {
            name: 'test-app'
          }
          applicationService
          .insert(app, user.id)
          .then(function(newApp) {
            should.exist(newApp);
            app = newApp;
            done();
          });
        });
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should delete app', function(done) {
      applicationService.remove(app.id)
      .then(function(deleted) {
        should.exist(deleted);
        deleted.should.eql(true);
        done();
      })
      .catch(function(err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not get deleted app', function(done) {
      applicationService
      .get(app.id)
      .then(function(_app) {
        should.not.exist(_app);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        err.message.should.eql('app not found')
        done();
      });
    });

    it('should not delete app with invalid id', function(done) {
      applicationService.remove('invalid_id')
      .then(function(deleted) {
        should.not.exist(deleted);
        done();
      })
      .catch(function(err) {
        should.exist(err);
        done();
      });
    });

    it('should delete all apps belonging to a user', function(done) {
      let user1, app1, app2;

      userService
      .insert(createRandomUserObject())
      .then(function(newUser) {
        should.exist(newUser);
        user1 = newUser;
        app1 = {
          name: 'test-app-1'
        }
        return applicationService
        .insert(app1, user1.id)
        .then(function(newApp) {
          should.exist(newApp);
          app1 = newApp;
          return; 
        })
      })
      .then(function() {
        app2 = {
          name: 'test-app-2'
        }
        return applicationService
        .insert(app2, user1.id)
        .then(function(newApp) {
          should.exist(newApp);
          app2 = newApp;
          return; 
        })
      })
      .then(function() {
        return applicationService
        .removeAll(user1.id)
        .then(function(deleted) {
          should.exist(deleted);
          deleted.should.eql(true);
          return;
        })
      })
      .then(function() {
        applicationService
        .get(app1.id)
        .then(function(_app) {
          should.not.exist(_app);
          done();
        })
        .catch(function(err) {
          should.exist(err);
          err.message.should.eql('app not found');
          return;
        });
      })
      .then(function() {
        applicationService
        .get(app2.id)
        .then(function(_app) {
          should.not.exist(_app);
          done();
        })
        .catch(function(err) {
          should.exist(err);
          err.message.should.eql('app not found');
          done();
        });
      });
    });

    it('should cascade delete app upon deleting user', function(done) {
      let user1, app1;

      userService
      .insert(createRandomUserObject())
      .then(function(newUser) {
        should.exist(newUser);
        user1 = newUser;
        app1 = {
          name: 'test-app-1'
        }
        return applicationService
        .insert(app1, user1.id)
        .then(function(newApp) {
          should.exist(newApp);
          app1 = newApp;
          return app1; 
        })
      })
      .then(function() {
        return userService
        .remove(user1.id)
        .then(function(deleted) {
          should.exist(deleted);
          return;
        })
      })
      .then(function() {
        applicationService
        .get(app1.id)
        .then(function(_app) {
          should.not.exist(_app);
          return done();
        })
        .catch(function(err) {
          should.exist(err);
          err.message.should.eql('app not found');
          done();
        });
      })
    });
  });
});

function createRandomUserObject() {
  return {
    username: uuid.v4(),
    firstname: uuid.v4(),
    lastname: uuid.v4(),
    email: uuid.v4()
  }
}