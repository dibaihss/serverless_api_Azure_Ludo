require('dotenv').config();

const parseBoolean = (value) => {
  if (typeof value !== 'string') return false;
  return value.toLowerCase() === 'true';
};

const useSsl = parseBoolean(process.env.DB_SSL);
if (!useSsl) {
  process.env.PGSSLMODE = 'disable';
}

const knex = require('knex')({
  client: 'pg',
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'ludo',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    ssl: useSsl ? { rejectUnauthorized: false } : false
  },
  pool: {
    min: 2,
    max: 10
  }
});

module.exports = knex;
