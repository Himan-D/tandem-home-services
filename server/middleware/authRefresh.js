const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

function generateRefreshToken() {
  return crypto.randomBytes(40).toString('hex');
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, name: user.name },
    config.auth.jwtSecret,
    { expiresIn: config.auth.accessTokenExpiry }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    config.auth.jwtSecret,
    { expiresIn: config.auth.refreshTokenExpiry }
  );
}

function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, config.auth.jwtSecret);
    if (decoded.type !== 'refresh') return null;
    return decoded;
  } catch {
    return null;
  }
}

module.exports = {
  generateRefreshToken,
  hashToken,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
};
