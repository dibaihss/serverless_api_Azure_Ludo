const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:8081'];

function getAllowedOrigins() {
  const raw = process.env.CORS_ALLOWED_ORIGINS;
  if (!raw) {
    return DEFAULT_ALLOWED_ORIGINS;
  }

  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function getCorsHeaders(request) {
  const allowedOrigins = getAllowedOrigins();
  const origin = request.headers.get('origin');
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0];

  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    Vary: 'Origin'
  };
}

function preflightResponse(request) {
  return {
    status: 204,
    headers: getCorsHeaders(request)
  };
}

module.exports = {
  getCorsHeaders,
  preflightResponse
};
