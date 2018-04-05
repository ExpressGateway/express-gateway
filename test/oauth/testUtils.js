const should = require('should');
const uuid = require('uuid62');

const services = require('../../lib/services');
const db = require('../../lib/db');

const credentialService = services.credential;
const userService = services.user;
const applicationService = services.application;

module.exports = {
  checkTokenResponse: (response, additionalProps = []) => {
    should(response).have.properties('access_token', 'expires_in', ...additionalProps);
    should(response.token_type).be.eql('Bearer');
    should(response.access_token.length).be.greaterThan(15);
  },

  createOAuthScenario: () => {
    const user1 = {
      username: uuid.v4(),
      firstname: 'irfan',
      lastname: 'baqui',
      email: 'irfan@eg.com'
    };

    const app1 = {
      name: 'irfan_app',
      redirectUri: 'https://some.host.com/some/route'
    };

    let fromDbUser, fromDbApp;

    return db.flushdb()
      .then(() => userService.insert(user1))
      .then((_fromDbUser) => {
        should.exist(_fromDbUser);

        fromDbUser = _fromDbUser;

        return applicationService.insert(app1, fromDbUser.id);
      })
      .then(_fromDbApp => {
        should.exist(_fromDbApp);
        fromDbApp = _fromDbApp;

        return credentialService.insertScopes(['someScope']);
      })
      .then(() => Promise.all([
        credentialService.insertCredential(fromDbUser.id, 'basic-auth', { password: 'user-secret' }),
        credentialService.insertCredential(fromDbApp.id, 'oauth2', { secret: 'app-secret', scopes: ['someScope'] })
      ]))
      .then(([userRes, appRes]) => {
        should.exist(userRes);
        should.exist(appRes);

        return [fromDbUser, fromDbApp];
      });
  }
};
