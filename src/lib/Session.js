const db = require('./database');

const SESSION_COLUMNS = [
  'id',
  'name',
  'status',
  'created_at',
  'updated_at',
  'max_players',
  'current_players'
];

function mapSession(row) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    status: row.status,
    maxPlayers: row.max_players,
    currentPlayers: row.current_players,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

const Session = {
  async create(data) {
    const now = new Date();
    const [session] = await db('sessions')
      .insert({
        name: data.name,
        status: data.status || 'waiting',
        max_players: data.maxPlayers || 4,
        current_players: 0,
        created_at: now,
        updated_at: now
      })
      .returning(SESSION_COLUMNS);
    return mapSession(session);
  },

  async getAll() {
    const rows = await db('sessions').select(SESSION_COLUMNS).orderBy('id', 'desc');
    return rows.map(mapSession);
  },

  async getById(id) {
    const row = await db('sessions').where({ id }).first(SESSION_COLUMNS);
    return mapSession(row);
  },

  async update(id, data) {
    const updates = {
      updated_at: new Date()
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.status !== undefined) updates.status = data.status;
    if (data.maxPlayers !== undefined) updates.max_players = data.maxPlayers;

    const [row] = await db('sessions')
      .where({ id })
      .update(updates)
      .returning(SESSION_COLUMNS);

    return mapSession(row);
  },

  async delete(id) {
    return db('sessions').where({ id }).del();
  },

  async getAvailable() {
    const rows = await db('sessions')
      .whereRaw('current_players < max_players')
      .select(SESSION_COLUMNS)
      .orderBy('id', 'desc');
    return rows.map(mapSession);
  },

  async getByStatus(status) {
    const rows = await db('sessions')
      .where({ status })
      .select(SESSION_COLUMNS)
      .orderBy('id', 'desc');
    return rows.map(mapSession);
  },

  async addUser(sessionId, userId) {
    return db.transaction(async (trx) => {
      const session = await trx('sessions')
        .where({ id: sessionId })
        .forUpdate()
        .first(['id', 'max_players', 'current_players']);

      if (!session) {
        return { ok: false, status: 404, message: 'Session not found' };
      }

      const user = await trx('users').where({ id: userId }).first(['id']);
      if (!user) {
        return { ok: false, status: 404, message: 'User not found' };
      }

      const existing = await trx('session_users')
        .where({ session_id: sessionId, user_id: userId })
        .first(['session_id']);
      if (existing) {
        return { ok: false, status: 409, message: 'User already in session' };
      }

      if (session.current_players >= session.max_players) {
        return { ok: false, status: 409, message: 'Session is full' };
      }

      await trx('session_users').insert({ session_id: sessionId, user_id: userId });
      await trx('sessions')
        .where({ id: sessionId })
        .update({
          current_players: session.current_players + 1,
          updated_at: new Date()
        });

      return { ok: true };
    });
  },

  async removeUser(sessionId, userId) {
    return db.transaction(async (trx) => {
      const session = await trx('sessions')
        .where({ id: sessionId })
        .forUpdate()
        .first(['id', 'current_players']);

      if (!session) {
        return { ok: false, status: 404, message: 'Session not found' };
      }

      const removed = await trx('session_users')
        .where({ session_id: sessionId, user_id: userId })
        .del();

      if (!removed) {
        return { ok: false, status: 404, message: 'User is not in this session' };
      }

      const nextCount = Math.max(0, session.current_players - 1);
      await trx('sessions')
        .where({ id: sessionId })
        .update({
          current_players: nextCount,
          updated_at: new Date()
        });

      return { ok: true };
    });
  },

  async getUsers(sessionId) {
    const rows = await db('session_users as su')
      .join('users as u', 'u.id', 'su.user_id')
      .where('su.session_id', sessionId)
      .select(['u.id', 'u.name', 'u.email', 'u.status', 'u.is_guest', 'u.created_at'])
      .orderBy('u.id', 'asc');

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      status: row.status,
      isGuest: row.is_guest,
      createdAt: row.created_at
    }));
  }
};

module.exports = Session;
