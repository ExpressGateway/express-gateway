let mock = require('mock-require');
mock('redis', require('fakeredis'));

let should = require('should');
let uuid = require('uuid');
let config = require('../../lib/config');
let services = require('../../lib/services');
let applicationService = services.application;
let userService = services.user;
let db = require('../../lib/db')();

describe('Application service tests', function () {
  let originalUserModelConfig;

  before(function (done) {
    originalUserModelConfig = config.models.users.properties;
    config.models.users.properties = {
      firstname: {isRequired: true, isMutable: true},
      lastname: {isRequired: true, isMutable: true},
      email: {isRequired: false, isMutable: true}
    };
    done();
  });

  after(function (done) {
    config.models.users.properties = originalUserModelConfig;
    done();
  });

  describe('Insert tests', function () {
    let user, originalAppModelConfig;

    before(function (done) {
      originalAppModelConfig = config.models.applications.properties;
      config.models.applications.properties = {
        group: { defaultValue: 'someGroup', isMutable: false },
        irrelevantProp: { isMutable: true } // isRequired is false by default
      };

      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    after(function (done) {
      config.models.applications.properties = originalAppModelConfig;
      done();
    });

    it('should insert an application and application should have default value of properties if not defined, and un-required properties ignored if not defined', function (done) {
      let _user = createRandomUserObject();
      let app;

      userService
      .insert(_user)
      .then(function (newUser) {
        user = newUser;
        should.exist(user.id);
        app = {
          name: 'test-app-1'
        };

        applicationService
        .insert(app, user.id)
        .then(function (newApp) {
          should.exist(newApp);
          should.exist(newApp.id);
          should.exist(newApp.name);
          should.exist(newApp.isActive);
          should.exist(newApp.group);
          newApp.isActive.should.eql(true);
          newApp.name.should.eql(app.name);
          newApp.group.should.eql('someGroup');
          should.not.exist(newApp.irrelevantProp);
          should.exist(newApp.createdAt);
          should.exist(newApp.userId);
          newApp.userId.should.eql(user.id);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
      });
    });

    it('should throw an error when inserting an app with missing properties that are required', function (done) {
      let app = {};

      applicationService
      .insert(app, user.id)
      .then(function (newApp) {
        should.not.exist(newApp);
      })
      .catch(function (err) {
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
      .then(function (newApp) {
        should.exist(newApp);
        should.exist(newApp.id);
        should.exist(newApp.name);
        newApp.name.should.eql(app.name);
        should.exist(newApp.createdAt);
        should.exist(newApp.userId);
        newApp.userId.should.eql(user.id);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Get application tests', function () {
    let user, app, originalAppModelConfig;

    before(function (done) {
      originalAppModelConfig = config.models.applications.properties;
      config.models.applications.properties = {
        group: { defaultValue: 'someGroup', isMutable: false },
        irrelevantProp: { isMutable: true } // isRequired is false by default
      };

      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        let _user = createRandomUserObject();
        userService
        .insert(_user)
        .then(function (newUser) {
          should.exist(newUser);
          user = newUser;
          app = {
            name: 'test-app'
          };
          applicationService
          .insert(app, user.id)
          .then(function (newApp) {
            should.exist(newApp);
            app = newApp;
            done();
          });
        });
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    after(function (done) {
      config.models.applications.properties = originalAppModelConfig;
      done();
    });

    it('should get app by id', function (done) {
      applicationService
      .get(app.id)
      .then(function (_app) {
        should.exist(_app);
        should.exist(_app.id);
        _app.id.should.eql(app.id);
        should.exist(_app.name);
        _app.name.should.eql(app.name);
        should.exist(_app.createdAt);
        should.exist(_app.updatedAt);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should get all apps', function (done) {
      applicationService
      .findAll()
      .then(function (data) {
        should.exist(data.apps);
        data.apps.length.should.eql(1);
        let app = data.apps[0];
        should.exist(app);
        should.exist(app.id);
        app.id.should.eql(app.id);
        should.exist(app.name);
        app.name.should.eql(app.name);
        should.exist(app.createdAt);
        should.exist(app.updatedAt);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not get app by invalid id', function (done) {
      applicationService.get('invalid_id')
        .then(function (_app) {
          should.exist(_app);
          _app.should.eql(false);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
    });

    it('should get all apps belonging to a user', function (done) {
      let user1, app1, app2;

      userService
      .insert(createRandomUserObject())
      .then(function (newUser) {
        should.exist(newUser);
        user1 = newUser;
        app1 = {
          name: 'test-app-1'
        };
        return applicationService
        .insert(app1, user1.id)
        .then(function (newApp) {
          should.exist(newApp);
          app1 = newApp;
        });
      })
      .then(function () {
        app2 = {
          name: 'test-app-2'
        };
        return applicationService
        .insert(app2, user1.id)
        .then(function (newApp) {
          should.exist(newApp);
          app2 = newApp;
        });
      })
      .then(function () {
        return applicationService
        .getAll(user1.id)
        .then(function (apps) {
          should.exist(apps);
          apps.length.should.eql(2);
          app1.should.oneOf(apps);
          app2.should.oneOf(apps);
          done();
        });
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Update tests', function () {
    let user, app, originalAppModelConfig;

    before(function (done) {
      originalAppModelConfig = config.models.applications.properties;
      config.models.applications.properties = {
        requiredProp: { isRequired: true },
        group: { defaultValue: 'admin', isMutable: false }
      };

      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    after(function (done) {
      config.models.applications.properties = originalAppModelConfig;
      done();
    });

    it('should update an application', function (done) {
      let _user = createRandomUserObject();

      userService
      .insert(_user)
      .then(function (newUser) {
        user = newUser;
        should.exist(user.id);
        app = {
          name: 'test-app-1',
          requiredProp: 'prop-1'
        };

        applicationService
        .insert(app, user.id)
        .then(function (newApp) {
          app = newApp;
          should.exist(newApp);
          should.exist(newApp.id);
          should.exist(newApp.name);
          newApp.name.should.eql(app.name);
          should.exist(newApp.createdAt);
          should.exist(newApp.userId);
          newApp.userId.should.eql(user.id);
        })
        .then(() => {
          let updatedApp = {
            requiredProp: 'prop-2'
          };
          applicationService.update(app.id, updatedApp)
          .then((res) => {
            res.should.eql(true);
            applicationService
            .get(app.id)
            .then(function (_app) {
              should.exist(_app);
              should.exist(_app.id);
              _app.id.should.eql(app.id);
              should.exist(_app.name);
              _app.requiredProp.should.eql(updatedApp.requiredProp);
              should.exist(_app.createdAt);
              _app.createdAt.should.eql(app.createdAt);
              should.exist(_app.updatedAt);
              done();
            });
          });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
      });
    });

    it('should throw an error when updating an app with invalid properties', function (done) {
      let updatedApp = { invalid: 'someVal' };

      applicationService
      .update(app.id, updatedApp)
      .then(function (newApp) {
        should.not.exist(newApp);
      })
      .catch(function (err) {
        should.exist(err);
        err.message.should.eql('one or more properties is invalid');
        done();
      });
    });

    it('should throw an error when updating an immutable property', function (done) {
      let updatedApp = { group: 'marketing' };

      applicationService
      .update(app.id, updatedApp)
      .then(function (newApp) {
        should.not.exist(newApp);
      })
      .catch(function (err) {
        should.exist(err);
        err.message.should.eql('invalid property group');
        done();
      });
    });
  });

  describe('activate/deactivate application tests', function () {
    let user, app, originalAppModelConfig;

    before(function (done) {
      originalAppModelConfig = config.models.applications.properties;
      config.models.applications.properties = {
        group: { defaultValue: 'admin', isMutable: false }
      };

      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    after(function (done) {
      config.models.applications.properties = originalAppModelConfig;
      done();
    });

    it('should deactivate an application', function (done) {
      let _user = createRandomUserObject();

      userService
      .insert(_user)
      .then(function (newUser) {
        user = newUser;
        should.exist(user.id);
        app = {
          name: 'test-app-1'
        };

        applicationService
        .insert(app, user.id)
        .then(function (newApp) {
          app = newApp;
          should.exist(newApp);
          should.exist(newApp.id);
          should.exist(newApp.name);
          newApp.name.should.eql(app.name);
          should.exist(newApp.createdAt);
          should.exist(newApp.userId);
          newApp.userId.should.eql(user.id);
        })
        .then(() => {
          applicationService.deactivate(app.id)
          .then((res) => {
            res.should.eql(true);
            applicationService
            .get(app.id)
            .then(function (_app) {
              should.exist(_app);
              should.exist(_app.id);
              _app.id.should.eql(app.id);
              should.exist(_app.isActive);
              _app.isActive.should.eql(false);
              should.exist(_app.name);
              _app.name.should.eql(app.name);
              should.exist(_app.createdAt);
              _app.createdAt.should.eql(app.createdAt);
              should.exist(_app.updatedAt);
              done();
            });
          });
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
      });
    });

    it('should reactivate an application', function (done) {
      applicationService.activate(app.id)
      .then((res) => {
        res.should.eql(true);
        applicationService
        .get(app.id)
        .then(function (_app) {
          should.exist(_app);
          should.exist(_app.id);
          _app.id.should.eql(app.id);
          should.exist(_app.isActive);
          _app.isActive.should.eql(true);
          should.exist(_app.name);
          _app.name.should.eql(app.name);
          should.exist(_app.createdAt);
          _app.createdAt.should.eql(app.createdAt);
          should.exist(_app.updatedAt);
          done();
        });
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should cascade deactivate app upon deactivating user', function (done) {
      let user1;
      let app1 = {
        name: 'test-app-1'
      };

      let app2 = {
        name: 'test-app-2'
      };

      userService
      .insert(createRandomUserObject())
      .then(function (newUser) {
        should.exist(newUser);
        user1 = newUser;
        return applicationService
        .insert(app1, user1.id)
        .then(function (newApp) {
          should.exist(newApp);
          app1 = newApp;
        });
      })
      .then(() => {
        return applicationService
        .insert(app2, user1.id)
        .then(function (newApp) {
          should.exist(newApp);
          app2 = newApp;
        });
      })
      .then(function () {
        return userService
        .deactivate(user1.id)
        .then(function (success) {
          should.exist(success);
        });
      })
      .then(function () {
        applicationService
        .get(app1.id)
        .then(function (_app) {
          should.exist(_app);
          _app.isActive.should.eql(false);
        });
      })
      .then(function () {
        applicationService
        .get(app2.id)
        .then(function (_app) {
          should.exist(_app);
          _app.isActive.should.eql(false);
          done();
        });
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });
  });

  describe('Delete app tests', function () {
    let user, app, originalAppModelConfig;

    before(function (done) {
      originalAppModelConfig = config.models.applications.properties;
      config.models.applications.properties = {
        group: { defaultValue: 'someGroup', isMutable: false },
        irrelevantProp: { isMutable: true } // isRequired is false by default
      };

      db.flushdbAsync()
      .then(function (didSucceed) {
        if (!didSucceed) {
          console.log('Failed to flush the database');
        }
        let _user = createRandomUserObject();
        userService
        .insert(_user)
        .then(function (newUser) {
          should.exist(newUser);
          user = newUser;
          app = {
            name: 'test-app'
          };
          applicationService
          .insert(app, user.id)
          .then(function (newApp) {
            should.exist(newApp);
            app = newApp;
            done();
          });
        });
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    after(function (done) {
      config.models.applications.properties = originalAppModelConfig;
      done();
    });

    it('should delete app', function (done) {
      applicationService.remove(app.id)
      .then(function (deleted) {
        should.exist(deleted);
        deleted.should.eql(true);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not get deleted app', function (done) {
      applicationService
      .get(app.id)
      .then(function (_app) {
        should.exist(_app);
        _app.should.eql(false);
        done();
      })
      .catch(function (err) {
        should.not.exist(err);
        done();
      });
    });

    it('should not delete app with invalid id', function (done) {
      applicationService.remove('invalid_id')
      .then(function (deleted) {
        should.not.exist(deleted);
        done();
      })
      .catch(function (err) {
        should.exist(err);
        done();
      });
    });

    it('should delete all apps belonging to a user', function (done) {
      let user1, app1, app2;

      userService
      .insert(createRandomUserObject())
      .then(function (newUser) {
        should.exist(newUser);
        user1 = newUser;
        app1 = {
          name: 'test-app-1'
        };
        return applicationService
        .insert(app1, user1.id)
        .then(function (newApp) {
          should.exist(newApp);
          app1 = newApp;
        });
      })
      .then(function () {
        app2 = {
          name: 'test-app-2'
        };
        return applicationService
        .insert(app2, user1.id)
        .then(function (newApp) {
          should.exist(newApp);
          app2 = newApp;
        });
      })
      .then(function () {
        return applicationService
        .removeAll(user1.id)
        .then(function (deleted) {
          should.exist(deleted);
          deleted.should.eql(true);
        });
      })
      .then(function () {
        applicationService
        .get(app1.id)
        .then(function (_app) {
          should.exist(_app);
          _app.should.eql(false);
        })
        .catch(function (err) {
          should.not.exist(err);
        });
      })
      .then(function () {
        applicationService
        .get(app2.id)
        .then(function (_app) {
          should.exist(_app);
          _app.should.eql(false);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
      });
    });

    it('should cascade delete app upon deleting user', function (done) {
      let user1, app1;

      userService
      .insert(createRandomUserObject())
      .then(function (newUser) {
        should.exist(newUser);
        user1 = newUser;
        app1 = {
          name: 'test-app-1'
        };
        return applicationService
        .insert(app1, user1.id)
        .then(function (newApp) {
          should.exist(newApp);
          app1 = newApp;
          return app1;
        });
      })
      .then(function () {
        return userService
        .remove(user1.id)
        .then(function (deleted) {
          should.exist(deleted);
        });
      })
      .then(function () {
        applicationService
        .get(app1.id)
        .then(function (_app) {
          should.exist(_app);
          _app.should.eql(false);
          done();
        })
        .catch(function (err) {
          should.not.exist(err);
          done();
        });
      });
    });
  });
});

function createRandomUserObject () {
  return {
    username: uuid.v4(),
    firstname: uuid.v4(),
    lastname: uuid.v4(),
    email: uuid.v4()
  };
}
