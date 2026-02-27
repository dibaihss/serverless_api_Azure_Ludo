const jwt = require('jsonwebtoken');

function getBearerToken(request) {
  const authHeader = request.headers.get('authorization') || '';
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) {
    return null;
  }
  return token;
}

function verifyJwt(request) {
  const token = getBearerToken(request);
  if (!token) {
    return { ok: false, status: 401, message: 'Missing or invalid Authorization header' };
  }

  const secret = process.env.JWT_SECRET || 'dev-secret-change-me';
  try {
    const payload = jwt.verify(token, secret);
    return { ok: true, payload };
  } catch (error) {
    return { ok: false, status: 401, message: 'Invalid or expired token' };
  }
}

module.exports = {
  verifyJwt
};
