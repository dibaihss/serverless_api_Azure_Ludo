const db = require('./database');

const User = {
  async create(userData) {
    const [user] = await db('users')
      .insert(userData)
      .returning(['id', 'name', 'email', 'status', 'is_guest', 'created_at']);
    return user;
  }
};

module.exports = User;
