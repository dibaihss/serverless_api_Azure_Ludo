const { app } = require('@azure/functions');
const Session = require('../lib/Session');
const { verifyJwt } = require('../lib/auth');
const { getCorsHeaders, preflightResponse } = require('../lib/cors');

function unauthorizedResponse(request, message, status = 401) {
  return {
    status,
    headers: getCorsHeaders(request),
    jsonBody: { message }
  };
}

function asId(value) {
  const id = Number.parseInt(value, 10);
  return Number.isNaN(id) ? null : id;
}

app.http('sessionsRoot', {
  methods: ['GET', 'POST', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sessions',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return preflightResponse(request);
    }

    if (request.method === 'GET') {
      try {
        const sessions = await Session.getAll();
        return {
          status: 200,
          headers: getCorsHeaders(request),
          jsonBody: sessions
        };
      } catch (error) {
        context.error('Get sessions failed', error);
        return {
          status: 500,
          headers: getCorsHeaders(request),
          jsonBody: { message: error.message || 'Internal Server Error' }
        };
      }
    }

    const auth = verifyJwt(request);
    if (!auth.ok) {
      return unauthorizedResponse(request, auth.message, auth.status);
    }

    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return {
        status: 400,
        headers: getCorsHeaders(request),
        jsonBody: { message: 'Invalid JSON body' }
      };
    }

    if (!body?.name) {
      return {
        status: 400,
        headers: getCorsHeaders(request),
        jsonBody: { message: 'name is required' }
      };
    }

    const maxPlayers = body.maxPlayers ?? 4;
    if (!Number.isInteger(maxPlayers) || maxPlayers < 2 || maxPlayers > 4) {
      return {
        status: 400,
        headers: getCorsHeaders(request),
        jsonBody: { message: 'maxPlayers must be an integer between 2 and 4' }
      };
    }

    try {
      const session = await Session.create({
        name: body.name,
        status: body.status || 'waiting',
        maxPlayers
      });

      return {
        status: 201,
        headers: getCorsHeaders(request),
        jsonBody: session
      };
    } catch (error) {
      context.error('Create session failed', error);
      return {
        status: 500,
        headers: getCorsHeaders(request),
        jsonBody: { message: error.message || 'Internal Server Error' }
      };
    }
  }
});

app.http('sessionById', {
  methods: ['GET', 'PUT', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sessions/{id:int}',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return preflightResponse(request);
    }

    const id = asId(request.params.id);
    if (!id) {
      return {
        status: 400,
        headers: getCorsHeaders(request),
        jsonBody: { message: 'Invalid session id' }
      };
    }

    if (request.method === 'GET') {
      try {
        const session = await Session.getById(id);
        if (!session) {
          return {
            status: 404,
            headers: getCorsHeaders(request),
            jsonBody: { message: 'Session not found' }
          };
        }

        return {
          status: 200,
          headers: getCorsHeaders(request),
          jsonBody: session
        };
      } catch (error) {
        context.error('Get session by id failed', error);
        return {
          status: 500,
          headers: getCorsHeaders(request),
          jsonBody: { message: error.message || 'Internal Server Error' }
        };
      }
    }

    const auth = verifyJwt(request);
    if (!auth.ok) {
      return unauthorizedResponse(request, auth.message, auth.status);
    }

    if (request.method === 'DELETE') {
      try {
        const deleted = await Session.delete(id);
        if (!deleted) {
          return {
            status: 404,
            headers: getCorsHeaders(request),
            jsonBody: { message: 'Session not found' }
          };
        }

        return {
          status: 200,
          headers: getCorsHeaders(request),
          jsonBody: { success: true, message: 'Session deleted successfully' }
        };
      } catch (error) {
        context.error('Delete session failed', error);
        return {
          status: 500,
          headers: getCorsHeaders(request),
          jsonBody: { message: error.message || 'Internal Server Error' }
        };
      }
    }

    let body;
    try {
      body = await request.json();
    } catch (_error) {
      return {
        status: 400,
        headers: getCorsHeaders(request),
        jsonBody: { message: 'Invalid JSON body' }
      };
    }

    if (body.maxPlayers !== undefined) {
      if (!Number.isInteger(body.maxPlayers) || body.maxPlayers < 2 || body.maxPlayers > 4) {
        return {
          status: 400,
          headers: getCorsHeaders(request),
          jsonBody: { message: 'maxPlayers must be an integer between 2 and 4' }
        };
      }
    }

    try {
      const updated = await Session.update(id, {
        name: body.name,
        status: body.status,
        maxPlayers: body.maxPlayers
      });

      if (!updated) {
        return {
          status: 404,
          headers: getCorsHeaders(request),
          jsonBody: { message: 'Session not found' }
        };
      }

      return {
        status: 200,
        headers: getCorsHeaders(request),
        jsonBody: updated
      };
    } catch (error) {
      context.error('Update session failed', error);
      return {
        status: 500,
        headers: getCorsHeaders(request),
        jsonBody: { message: error.message || 'Internal Server Error' }
      };
    }
  }
});

app.http('availableSessions', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sessions/available',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return preflightResponse(request);
    }

    try {
      const sessions = await Session.getAvailable();
      return {
        status: 200,
        headers: getCorsHeaders(request),
        jsonBody: sessions
      };
    } catch (error) {
      context.error('Get available sessions failed', error);
      return {
        status: 500,
        headers: getCorsHeaders(request),
        jsonBody: { message: error.message || 'Internal Server Error' }
      };
    }
  }
});

app.http('sessionsByStatus', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sessions/status/{status}',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return preflightResponse(request);
    }

    try {
      const sessions = await Session.getByStatus(request.params.status);
      return {
        status: 200,
        headers: getCorsHeaders(request),
        jsonBody: sessions
      };
    } catch (error) {
      context.error('Get sessions by status failed', error);
      return {
        status: 500,
        headers: getCorsHeaders(request),
        jsonBody: { message: error.message || 'Internal Server Error' }
      };
    }
  }
});

app.http('sessionUsers', {
  methods: ['GET', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sessions/{sessionId:int}/users',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return preflightResponse(request);
    }

    const sessionId = asId(request.params.sessionId);
    if (!sessionId) {
      return {
        status: 400,
        headers: getCorsHeaders(request),
        jsonBody: { message: 'Invalid session id' }
      };
    }

    try {
      const session = await Session.getById(sessionId);
      if (!session) {
        return {
          status: 404,
          headers: getCorsHeaders(request),
          jsonBody: { message: 'Session not found' }
        };
      }

      const users = await Session.getUsers(sessionId);
      return {
        status: 200,
        headers: getCorsHeaders(request),
        jsonBody: users
      };
    } catch (error) {
      context.error('Get session users failed', error);
      return {
        status: 500,
        headers: getCorsHeaders(request),
        jsonBody: { message: error.message || 'Internal Server Error' }
      };
    }
  }
});

app.http('sessionUserMembership', {
  methods: ['POST', 'DELETE', 'OPTIONS'],
  authLevel: 'anonymous',
  route: 'sessions/{sessionId:int}/users/{userId:int}',
  handler: async (request, context) => {
    if (request.method === 'OPTIONS') {
      return preflightResponse(request);
    }

    const auth = verifyJwt(request);
    if (!auth.ok) {
      return unauthorizedResponse(request, auth.message, auth.status);
    }

    const sessionId = asId(request.params.sessionId);
    const userId = asId(request.params.userId);
    if (!sessionId || !userId) {
      return {
        status: 400,
        headers: getCorsHeaders(request),
        jsonBody: { message: 'Invalid sessionId or userId' }
      };
    }

    try {
      if (request.method === 'POST') {
        const result = await Session.addUser(sessionId, userId);
        if (!result.ok) {
          return {
            status: result.status,
            headers: getCorsHeaders(request),
            jsonBody: { message: result.message }
          };
        }
        return {
          status: 200,
          headers: getCorsHeaders(request),
          jsonBody: { success: true, message: 'User added to session successfully' }
        };
      }

      const result = await Session.removeUser(sessionId, userId);
      if (!result.ok) {
        return {
          status: result.status,
          headers: getCorsHeaders(request),
          jsonBody: { message: result.message }
        };
      }

      return {
        status: 200,
        headers: getCorsHeaders(request),
        jsonBody: { success: true, message: 'User removed from session successfully' }
      };
    } catch (error) {
      context.error('Modify session users failed', error);
      return {
        status: 500,
        headers: getCorsHeaders(request),
        jsonBody: { message: error.message || 'Internal Server Error' }
      };
    }
  }
});
