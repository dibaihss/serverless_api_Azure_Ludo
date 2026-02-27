const { app } = require('@azure/functions');
const User = require('../lib/User');
const { getCorsHeaders, preflightResponse } = require('../lib/cors');

app.http('guestLogin', {
    methods: ['POST', 'OPTIONS'],
    authLevel: 'anonymous',
    route: 'guest-login',
    handler: async (request, context) => {
        context.log('Processing guest login request');
        if (request.method === 'OPTIONS') {
            return preflightResponse(request);
        }

        try {
            const randomName = `Guest_${Math.random().toString(36).substring(2, 10)}`;
            const user = await User.create({
                name: randomName,
                email: null,
                password: null,
                status: true,
                is_guest: true
            });

            return {
                status: 200,
                headers: getCorsHeaders(request),
                jsonBody: {
                    id: user.id,
                    name: user.name,
                    status: user.status,
                    isGuest: user.is_guest,
                    createdAt: user.created_at
                }
            };
        } catch (error) {
            context.error('Guest login failed', error);
            return {
                status: 500,
                headers: getCorsHeaders(request),
                jsonBody: {
                    message: error.message || 'Internal Server Error'
                }
            };
        }
    }
});
