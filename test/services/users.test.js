const should = require('should');
const uuid = require('uuid');
const redisConfig = require('../../lib/config').systemConfig.db.redis;
const services = require('../../lib/services');
const userService = services.user;
const credentialService = services.credential;
const db = require('../../lib/db');

describe('User service tests', () => {
  describe('Insert tests', () => {
    before(() => db.flushdb());

    it('should insert a user', () => {
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
          should(Object.keys(newUser)).containDeep(expectedUserProps);
          newUser.should.have.properties(user);
          should.ok(newUser.isActive);
          return db.hgetall(redisConfig.namespace.concat('-', 'user').concat(':', newUser.id))
            .then(function (userObj) {
              userObj.isActive = userObj.isActive === 'true';
              should.deepEqual(userObj, newUser);
            });
        });
    });

    it('should throw an error when inserting a user with missing properties', () => {
      const user = {
        username: 'irfanbaqui-1',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      return should(userService.insert(user))
        .be.rejectedWith('data should have required property \'firstname\'');
    });

    it('should throw an error when inserting a user with existing username', () => {
      const user = {
        username: 'irfanbaqui',
        firstname: 'irfan',
        lastname: 'baqui',
        email: 'irfan@eg.com'
      };

      return should(userService.insert(user))
        .be.rejectedWith('username already exists');
    });
  });

  describe('Get and Find User tests', () => {
    let user;
    before(() => db.flushdb().then(() => {
      user = createRandomUserObject();
      return userService.insert(user);
    }).then(newUser => {
      should.exist(newUser);
      user.id = newUser.id;
    }));

    it('should get user by userId', () => {
      return userService.get(user.id)
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
        });
    });

    it('should get user all users', () => {
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

    it('should not get user by invalid userId', () => {
      return userService.get(uuid.v4())
        .then(function (user) {
          should.exist(user);
          user.should.eql(false);
        });
    });

    it('should find user by username', () => {
      return userService.find(user.username)
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
        });
    });

    it('should not find user by invalid username', () => {
      return userService.find('invalid_username')
        .then(function (user) {
          should.exist(user);
          user.should.eql(false);
        });
    });
  });

  describe('Update user tests', () => {
    let user, updatedUser;
    before(() => {
      return db.flushdb()
        .then(() => {
          user = createRandomUserObject();
          return userService
            .insert(user)
            .then(function (newUser) {
              should.exist(newUser);
              user.id = newUser.id;
              user.createdAt = newUser.createdAt;
            });
        });
    });

    it('should update user', () => {
      updatedUser = createRandomUserObject();
      return userService.update(user.id, updatedUser)
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
            });
        });
    });

    it('should allow update of any single user property user', function () {
      const anotherUpdatedUser = {
        email: 'baq@eg.com'
      };

      return userService.update(user.id, anotherUpdatedUser)
        .then(function (res) {
          res.should.eql(true);
          return userService.get(user.id)
            .then(function (_user) {
              _user.email.should.eql(anotherUpdatedUser.email);
              _user.firstname.should.eql(updatedUser.firstname);
              _user.lastname.should.eql(updatedUser.lastname);
              _user.createdAt.should.eql(user.createdAt);
            });
        });
    });

    it('should not update user with unvalid id', function () {
      const updatedUser = {
        username: 'joecamper',
        firstname: 'Joe',
        lastname: 'Camper',
        email: 'joecamper@eg.com'
      };

      return userService.update('invalid_id', updatedUser)
        .then(function (res) {
          should.exist(res);
          res.should.eql(false);
        });
    });

    it('should not update user with invalid properties', function () {
      const updatedUser = {
        username: 'joecamper',
        invalid_prop: 'xyz111'
      };

      return should(userService.update(user.id, updatedUser))
        .be.rejectedWith('one or more properties is invalid');
    });
  });

  describe('Activate and deactivate user tests', () => {
    let user;
    before(() => db.flushdb().then(() => {
      user = createRandomUserObject();
      return userService.insert(user);
    }).then(newUser => {
      should.exist(newUser);
      user.id = newUser.id;
    }));

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

  describe('Delete user tests', () => {
    let user;
    beforeEach(() => db.flushdb().then(() => {
      user = createRandomUserObject();
      return userService.insert(user);
    }).then(newUser => {
      should.exist(newUser);
      user.id = newUser.id;
    }));

    it('should delete user', () => {
      return userService.remove(user.id)
        .then(function (deleted) {
          should.exist(deleted);
          deleted.should.eql(true);
        });
    });

    it('should not delete user with invalid id', () => {
      return userService.remove('invalid_id')
        .then(function (deleted) {
          should.exist(deleted);
          deleted.should.eql(false);
        });
    });

    describe('should delete all the related credentials', () => {
      const credentials = [];
      beforeEach(() =>
        Promise.all([
          credentialService.insertScopes(['someScope']),
          credentialService.insertCredential(user.id, 'jwt'),
          credentialService.insertCredential(user.id, 'jwt')]
        ).then(([scope, jwt1, jwt2]) =>
          Promise.all([jwt1, jwt2].map(cred => {
            credentials.push(cred);
            return credentialService.addScopesToCredential(cred.id, 'jwt', ['someScope']);
          }))
        ));

      it('should remove the user', () => {
        return should(userService.remove(user.id)).resolvedWith(true);
      });

      it('should remove the credentials', () => {
        return should(credentialService.getCredential(credentials[0].id, 'jwt')).resolvedWith(null);
      });
    });
  });
});

function createRandomUserObject () {
  return {
    username: uuid.v4(),
    firstname: uuid.v4(),
    lastname: uuid.v4(),
    email: `${uuid.v4()}@testmail.it`
  };
}
