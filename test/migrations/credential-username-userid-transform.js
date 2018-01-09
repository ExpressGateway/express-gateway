const migrate = require('migrate');
const tmp = require('tmp');
const idGen = require('uuid62');
const db = require('../../lib/db');
const fs = require('fs');
const { assert } = require('chai');
const userService = require('../../lib/services/consumers/user.service');
const credentialService = require('../../lib/services/credentials/credential.service');

describe('Migrations', () => {
  describe('Username -> UserID credential transform', () => {
    const username = idGen.v4();
    let tmpFile;
    let userId;
    let oldCredential;
    before('I insert some credentials by user name', () => {
      return userService.insert({
        username,
        firstname: 'Clark',
        lastname: 'Kent'
      }).then((user) => {
        userId = user.id;
        return credentialService
          .insertCredential(username, 'basic-auth', {})
          .then(() => credentialService.getCredentials(username))
          .then((creds) => { oldCredential = creds[0]; });
      });
    });

    before('I then run the migration script', (done) => {
      tmpFile = tmp.fileSync();
      fs.writeFileSync(tmpFile.name, JSON.stringify({
        lastRun: '1509389756097-model-to-jsonschema.js',
        migrations: [
          {
            title: '1509389756097-model-to-jsonschema.js',
            timestamp: 1515423465439
          }
        ]
      }, null, 2));
      migrate.load({ stateStore: tmpFile.name }, (err, set) => {
        if (err) {
          return done(err);
        }
        set.up('1509389756098-credential-username-userid-transform.js', done);
      });
    });

    it('should not find any active credential with user name any more', () => {
      return credentialService.getCredentials(username).then((credentials) => {
        assert.lengthOf(credentials.filter(c => c.isActive), 0);
      });
    });

    it('should find an active credential with user ID and SAME hashed password', () => {
      return credentialService.getCredentials(userId).then((credentials) => {
        assert.lengthOf(credentials.filter(c => c.isActive), 1);
        assert.equal(credentials[0].password, oldCredential.password);
      });
    });

    after(() => {
      tmpFile.removeCallback();
      return db.flushdb();
    });
  });
});
