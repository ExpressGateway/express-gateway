const should = require('should');
const uuid = require('uuid');
const redisConfig = require('../../lib/config').systemConfig.db.redis;
const services = require('../../lib/services');
const userService = services.user;
const db = require('../../lib/db');

describe('User service tests', function () {
  describe('Insert tests', function () {
    before(function () {
      return db.flushdb();
    });

    it('should insert a user', function () {
      const user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      return userService
        .insert(user)
        .then(function (newUser) {
          const expectedUserProps = ['firstname', 'lastname', 'email', 'isActive', 'username', 'id', 'createdAt', 'updatedAt'];
          Object.keys(newUser).should.eql(expectedUserProps);
          newUser.should.have.properties(user);
          should.ok(newUser.isActive);
          return db.hgetall(redisConfig.namespace.concat('-', 'user').concat(':', newUser.id))
            .then(function (userObj) {
              userObj.isActive = userObj.isActive === 'true';
              should.deepEqual(userObj, newUser);
            });
        });
    });

    it('should throw an error when inserting a user with missing properties', function (done) {
      const user = {
        username: 'irfanbaqui-1',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      userService
        .insert(user)
        .then(function (newUser) {
          should.not.exist(newUser);
        })
        .catch(function (err) {
          should.exist(err);
          err.message.should.eql('firstname is required');
          done();
        });
    });

    it('should throw an error when inserting a user with existing username', function (done) {
      const user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      userService
        .insert(user)
        .then(function (newUser) {
          should.not.exist(newUser);
        })
        .catch(function (err) {
          should.exist(err);
          err.message.should.eql('username already exists');
          done();
        });
    });
  });

  describe('Get and Find User tests', function () {
    let user;
    before(function (done) {
      db.flushdb()
        .then(function () {
          user = createRandomUserObject();
          userService
            .insert(user)
            .then(function (newUser) {
              should.exist(newUser);
              user.id = newUser.id;
              done();
            });
        })
        .catch(done);
    });

    it('should get user by userId', function (done) {
      userService.get(user.id)
        .then(function (_user) {
          const expectedUserProps = ['firstname', 'lastname', 'email', 'isActive', 'username', 'id', 'createdAt', 'updatedAt'];
          should.exist(_user);
          expectedUserProps.sort().should.eql(Object.keys(_user).sort());
          _user.id.length.should.be.greaterThan(10);
          _user.isActive.should.eql(true);

          _user.should.have.properties({
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            username: user.username
          });
          done();
        })
        .catch(done);
    });
    it('should get user all users', function () {
      return userService.findAll()
        .then(function (data) {
          should.exist(data.users);
          should.exist(data.nextKey);
          data.users.length.should.be.eql(1);
          const _user = data.users[0];
          const expectedUserProps = ['firstname', 'lastname', 'email', 'isActive', 'username', 'id', 'createdAt', 'updatedAt'];
          should.exist(user);
          expectedUserProps.sort().should.eql(Object.keys(_user).sort());
          _user.id.length.should.be.greaterThan(10);
          _user.isActive.should.eql(true);

          _user.should.have.properties({
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            username: user.username
          });
        });
    });

    it('should not get user by invalid userId', function (done) {
      userService.get(uuid.v4())
        .then(function (user) {
          should.exist(user);
          user.should.eql(false);
          done();
        })
        .catch(done);
    });

    it('should find user by username', function (done) {
      userService.find(user.username)
        .then(function (_user) {
          const expectedUserProps = ['firstname', 'lastname', 'email', 'isActive', 'username', 'id', 'createdAt', 'updatedAt'];
          should.exist(_user);
          expectedUserProps.sort().should.eql(Object.keys(_user).sort());
          _user.id.length.should.be.greaterThan(10);
          _user.isActive.should.eql(true);
          _user.should.have.properties({
            firstname: user.firstname,
            lastname: user.lastname,
            email: user.email,
            username: user.username
          });
          done();
        })
        .catch(done);
    });

    it('should not find user by invalid username', function (done) {
      userService.find('invalid_username')
        .then(function (user) {
          should.exist(user);
          user.should.eql(false);
          done();
        })
        .catch(done);
    });
  });

  describe('Update user tests', function () {
    let user, updatedUser;
    before(function (done) {
      db.flushdb()
        .then(function () {
          user = createRandomUserObject();
          userService
            .insert(user)
            .then(function (newUser) {
              should.exist(newUser);
              user.id = newUser.id;
              user.createdAt = newUser.createdAt;
              done();
            });
        })
        .catch(done);
    });

    it('should update user', function (done) {
      updatedUser = createRandomUserObject();
      userService.update(user.id, updatedUser)
        .then(function (res) {
          should.exist(res);
          res.should.eql(true);
          return userService.get(user.id)
            .then(function (_user) {
              _user.username.should.eql(user.username); // Cannot update username
              _user.email.should.eql(updatedUser.email);
              _user.firstname.should.eql(updatedUser.firstname);
              _user.lastname.should.eql(updatedUser.lastname);
              _user.createdAt.should.eql(user.createdAt);
              done();
            })
            .catch(done);
        });
    });

    it('should allow update of any single user property user', function (done) {
      const anotherUpdatedUser = {
        email: 'baq@eg.com'
      };
      userService.update(user.id, anotherUpdatedUser)
        .then(function (res) {
          res.should.eql(true);
          return userService.get(user.id)
            .then(function (_user) {
              _user.email.should.eql(anotherUpdatedUser.email);
              _user.firstname.should.eql(updatedUser.firstname);
              _user.lastname.should.eql(updatedUser.lastname);
              _user.createdAt.should.eql(user.createdAt);
              done();
            });
        })
        .catch(done);
    });

    it('should not update user with unvalid id', function (done) {
      const updatedUser = {
        username: 'joecamper',
        firstname: 'Joe',
        lastname: 'Camper',
        email: 'joecamper@eg.com'
      };
      userService.update('invalid_id', updatedUser)
        .then(function (res) {
          should.exist(res);
          res.should.eql(false);
          done();
        })
        .catch(done);
    });

    it('should not update user with invalid properties', function (done) {
      const updatedUser = {
        username: 'joecamper',
        invalid_prop: 'xyz111'
      };
      userService.update(user.id, updatedUser)
        .then(function (res) {
          should.not.exist(res);
          done();
        })
        .catch(function (err) {
          should.exist(err);
          err.message.should.eql('one or more properties is invalid');
          done();
        });
    });
  });

  describe('Activate and deactivate user tests', function () {
    let user;
    before(function (done) {
      db.flushdb()
        .then(function () {
          user = createRandomUserObject();
          userService
            .insert(user)
            .then(function (newUser) {
              should.exist(newUser);
              user = Object.assign(user, newUser);
              user.createdAt = newUser.createdAt;
              done();
            });
        })
        .catch(done);
    });

    it('should deactivate user', function (done) {
      userService.deactivate(user.id)
        .then(function (res) {
          should.exist(res);
          res.should.eql(true);
          return userService.get(user.id)
            .then(function (_user) {
              should.exist(_user.username);
              _user.username.should.eql(user.username);
              should.exist(_user.email);
              _user.email.should.eql(user.email);
              should.exist(_user.firstname);
              _user.firstname.should.eql(user.firstname);
              should.exist(_user.lastname);
              _user.lastname.should.eql(user.lastname);
              should.exist(_user.isActive);
              _user.isActive.should.eql(false);
              should.exist(_user.createdAt);
              _user.createdAt.should.eql(user.createdAt);
              should.exist(_user.updatedAt);
              done();
            })
            .catch(done);
        });
    });

    it('should reactivate user', function (done) {
      userService.activate(user.id)
        .then(function (res) {
          res.should.eql(true);
          return userService.get(user.id)
            .then(function (_user) {
              _user.username.should.eql(user.username);
              _user.email.should.eql(user.email);
              _user.firstname.should.eql(user.firstname);
              _user.lastname.should.eql(user.lastname);
              _user.isActive.should.eql(true);
              _user.createdAt.should.eql(user.createdAt);
              should.exist(_user.updatedAt);
              done();
            })
            .catch(done);
        });
    });
  });

  describe('Delete user tests', function () {
    let user;
    before(function (done) {
      db.flushdb()
        .then(function () {
          user = createRandomUserObject();
          userService
            .insert(user)
            .then(function (newUser) {
              should.exist(newUser);
              user.id = newUser.id;
              done();
            });
        })
        .catch(done);
    });

    it('should delete user', function (done) {
      userService.remove(user.id)
        .then(function (deleted) {
          should.exist(deleted);
          deleted.should.eql(true);
          done();
        })
        .catch(done);
    });

    it('should not delete user with invalid id', function (done) {
      userService.remove('invalid_id')
        .then(function (deleted) {
          should.exist(deleted);
          deleted.should.eql(false);
          done();
        })
        .catch(done);
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
