const assert = require('assert');
const config = require('../../lib/config');
const { encrypt, decrypt } = require('../../lib/services/utils');

describe('legacy OAuth token encryption', () => {
  it('preserves tokens stored by the previous Node.js crypto APIs', () => {
    const crypto = config.systemConfig.crypto;
    config.systemConfig.crypto = { algorithm: 'aes256', cipherKey: 'sensitiveKey' };
    try {
      const ciphertext = '2f9e70d31b1ecf033900d81ad95e68ae';
      assert.strictEqual(decrypt(ciphertext), 'legacy-token');
      assert.strictEqual(encrypt('legacy-token'), ciphertext);
    } finally {
      config.systemConfig.crypto = crypto;
    }
  });
});
