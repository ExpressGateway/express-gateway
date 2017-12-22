const should = require('should');
const uuid = require('uuid');
const config = require('../../lib/config');
const services = require('../../lib/services');
const applicationService = services.application;
const userService = services.user;
const db = require('../../lib/db');

describe('Application service tests', function () {
  describe('Insert tests', function () {
    let user, originalAppModelConfig;

    before(() => {
      originalAppModelConfig = Object.assign({}, config.models.applications.properties);
      Object.assign(config.models.applications.properties, {
        group: { type: 'string', default: 'someGroup' },
        irrelevantProp: { type: 'string' }
      });

      return db.flushdb();
    });

    after(function () {
      config.models.applications.properties = originalAppModelConfig;
    });

    it('should insert an application and application should have default value of properties if not defined, and un-required properties ignored if not defined', function () {
      const _user = createRandomUserObject();
      let app;

      return userService
        .insert(_user)
        .then(function (newUser) {
          user = newUser;
          should.exist(user.id);
          app = {
            name: 'test-app-1'
          };

          return applicationService.insert(app, user.id);
        })
        .then(function (newApp) {
          should.exist(newApp);
          should(newApp).have.properties(['id', 'name', 'isActive', 'group', 'createdAt', 'userId']);
          newApp.isActive.should.eql(true);
          newApp.name.should.eql(app.name);
          newApp.group.should.eql('someGroup');
          should(newApp).not.have.property('irrelevantProp');
          newApp.userId.should.eql(user.id);
        });
    });

    it('should throw when inserting an app with missing properties that are required', function () {
      return should(applicationService.insert({}, user.id))
        .be.rejectedWith('Failed to insert application: data should have required property \'name\'');
    });

    it('should allow inserting multiple applications per user', function () {
      const app = {
        name: 'test-app-2'
      };

      return applicationService
        .insert(app, user.id)
        .then(function (newApp) {
          should.exist(newApp);
          should(newApp).have.properties(['id', 'name', 'isActive', 'createdAt', 'userId']);
          newApp.name.should.eql(app.name);
          newApp.userId.should.eql(user.id);
        });
    });
  });

  describe('Get application tests', function () {
    let user, app, originalAppModelConfig;

    before(function () {
      originalAppModelConfig = Object.assign({}, config.models.applications.properties);
      Object.assign(config.models.applications.properties, {
        group: { type: 'string', default: 'someGroup' },
        irrelevantProp: { type: 'string' }
      });

      return db.flushdb()
        .then(function () {
          const _user = createRandomUserObject();
          return userService.insert(_user);
        })
        .then(function (newUser) {
          should.exist(newUser);
          user = newUser;
          app = {
            name: 'test-app'
          };
          return applicationService.insert(app, user.id);
        }
        ).then(function (newApp) {
          should.exist(newApp);
          app = newApp;
        });
    });

    after(function () {
      config.models.applications.properties = originalAppModelConfig;
    });

    it('should get app by id', function () {
      return applicationService
        .get(app.id)
        .then(function (_app) {
          should.exist(_app);
          should(_app).have.properties(['id', 'name', 'createdAt', 'updatedAt']);
          _app.id.should.eql(app.id);
          _app.name.should.eql(app.name);
        });
    });

    it('should get all apps', function () {
      return applicationService
        .findAll()
        .then(function (data) {
          should.exist(data.apps);
          data.apps.length.should.eql(1);
          const app = data.apps[0];
          should.exist(app);
          should(app).have.properties(['id', 'name', 'createdAt', 'updatedAt']);
          app.id.should.eql(app.id);
          app.name.should.eql(app.name);
        });
    });

    it('should not get app by invalid id', function () {
      return applicationService.get('invalid_id')
        .then(function (_app) {
          should.exist(_app);
          _app.should.eql(false);
        });
    });

    it('should get all apps belonging to a user', function () {
      let user1, app1, app2;

      return userService
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
            });
        });
    });
  });

  describe('Update tests', function () {
    let user, app, originalAppModelConfig;

    before(function () {
      originalAppModelConfig = Object.assign({}, config.models.applications.properties);
      Object.assign(config.models.applications.properties, {
        group: { type: 'string', default: 'admin' }
      });

      return db.flushdb();
    });

    after(function () {
      config.models.applications.properties = originalAppModelConfig;
    });

    it('should update an application', function () {
      const _user = createRandomUserObject();

      return userService
        .insert(_user)
        .then(function (newUser) {
          user = newUser;
          should.exist(user.id);
          app = {
            name: 'test-app-1'
          };

          return applicationService.insert(app, user.id);
        })
        .then(function (newApp) {
          app = newApp;
          should.exist(newApp);
          should(newApp).have.properties(['id', 'name', 'createdAt', 'userId']);
          newApp.name.should.eql(app.name);
          newApp.userId.should.eql(user.id);
          const updatedApp = {
            name: 'test-app-updated'
          };
          return Promise.all([updatedApp, applicationService.update(app.id, updatedApp)]);
        }).then(([updatedApp, res]) => {
          res.should.eql(true);
          return applicationService
            .get(app.id)
            .then(function (_app) {
              should.exist(_app);
              should(_app).have.properties(['id', 'name', 'createdAt', 'updatedAt']);
              _app.id.should.eql(app.id);
              _app.name.should.eql(updatedApp.name);
              _app.createdAt.should.eql(app.createdAt);
            });
        });
    });

    it('should throw an error when updating an app with invalid properties', function () {
      const updatedApp = { invalid: 'someVal' };

      return should(applicationService
        .update(app.id, updatedApp)).be.rejectedWith('one or more properties is invalid');
    });
  });

  describe('activate/deactivate application tests', function () {
    let user, app, originalAppModelConfig;

    before(function () {
      originalAppModelConfig = Object.assign({}, config.models.applications.properties);
      Object.assign(config.models.applications.properties, {
        group: { type: 'string', default: 'admin' }
      });

      return db.flushdb();
    });

    after(function () {
      config.models.applications.properties = originalAppModelConfig;
    });

    it('should deactivate an application', function () {
      const _user = createRandomUserObject();

      return userService
        .insert(_user)
        .then(function (newUser) {
          user = newUser;
          should.exist(user.id);
          app = {
            name: 'test-app-1'
          };

          return applicationService.insert(app, user.id);
        })
        .then(function (newApp) {
          app = newApp;
          should.exist(newApp);
          should(newApp).have.properties(['id', 'name', 'createdAt', 'userId']);
          newApp.name.should.eql(app.name);
          newApp.userId.should.eql(user.id);
          return applicationService.deactivate(app.id);
        })
        .then((res) => {
          res.should.eql(true);
          return applicationService.get(app.id);
        })
        .then(function (_app) {
          should.exist(_app);
          should(_app).have.properties(['id', 'isActive', 'name', 'createdAt', 'updatedAt']);
          _app.id.should.eql(app.id);
          _app.isActive.should.eql(false);
          _app.name.should.eql(app.name);
          _app.createdAt.should.eql(app.createdAt);
        });
    });

    it('should reactivate an application', function () {
      return applicationService.activate(app.id)
        .then((res) => {
          res.should.eql(true);
          return applicationService.get(app.id);
        }).then(function (_app) {
          should.exist(_app);
          should(_app).have.properties(['id', 'isActive', 'name', 'createdAt', 'updatedAt']);
          _app.id.should.eql(app.id);
          _app.isActive.should.eql(true);
          _app.name.should.eql(app.name);
          _app.createdAt.should.eql(app.createdAt);
        });
    });

    it('should cascade deactivate app upon deactivating user', function () {
      let user1;
      let app1 = {
        name: 'test-app-1'
      };

      let app2 = {
        name: 'test-app-2'
      };

      return userService
        .insert(createRandomUserObject())
        .then(function (newUser) {
          should.exist(newUser);
          user1 = newUser;
          return applicationService.insert(app1, user1.id);
        })
        .then((newApp) => {
          should.exist(newApp);
          app1 = newApp;
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
          return applicationService
            .get(app1.id)
            .then(function (_app) {
              should.exist(_app);
              _app.isActive.should.eql(false);
            });
        })
        .then(function () {
          return applicationService
            .get(app2.id)
            .then(function (_app) {
              should.exist(_app);
              _app.isActive.should.eql(false);
            });
        });
    });
  });

  describe('Delete app tests', function () {
    let user, app, originalAppModelConfig;

    before(function () {
      originalAppModelConfig = Object.assign({}, config.models.applications.properties);
      Object.assign(config.models.applications.properties, {
        group: { type: 'string', default: 'someGroup' },
        irrelevantProp: { type: 'string' }
      });

      return db.flushdb()
        .then(function () {
          const _user = createRandomUserObject();
          return userService.insert(_user);
        })
        .then(function (newUser) {
          should.exist(newUser);
          user = newUser;
          app = {
            name: 'test-app'
          };
          return applicationService.insert(app, user.id);
        })
        .then(function (newApp) {
          should.exist(newApp);
          app = newApp;
        });
    });

    after(function () {
      config.models.applications.properties = originalAppModelConfig;
    });

    it('should delete app', function () {
      return applicationService.remove(app.id)
        .then(function (deleted) {
          should.exist(deleted);
          deleted.should.eql(true);
        });
    });

    it('should not get deleted app', function () {
      return applicationService
        .get(app.id)
        .then(function (_app) {
          should.exist(_app);
          _app.should.eql(false);
        });
    });

    it('should not delete app with invalid id', function () {
      return should(applicationService.remove('invalid_id')).be.rejected();
    });

    it('should delete all apps belonging to a user', function () {
      let user1, app1, app2;

      return userService
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
          return applicationService
            .get(app1.id)
            .then(function (_app) {
              should.exist(_app);
              _app.should.eql(false);
            });
        })
        .then(function () {
          return applicationService
            .get(app2.id)
            .then(function (_app) {
              should.exist(_app);
              _app.should.eql(false);
            });
        });
    });

    it('should cascade delete app upon deleting user', function () {
      let user1, app1;

      return userService
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
          return applicationService
            .get(app1.id)
            .then(function (_app) {
              should.exist(_app);
              _app.should.eql(false);
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
    email: `${uuid.v4()}@hello.it`
  };
}
