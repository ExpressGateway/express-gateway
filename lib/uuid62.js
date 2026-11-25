const { randomUUID } = require('crypto');
const baseX = require('base-x').default;

const base62 = baseX('0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');

exports.v4 = () => {
  const bytes = Buffer.from(randomUUID().replace(/-/g, ''), 'hex');
  return base62.encode(bytes).padStart(22, '0');
};
