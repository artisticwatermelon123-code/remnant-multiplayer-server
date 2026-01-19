const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });
console.log('Server running on port', PORT);
const sessions = {}; // sessionId -> array of clients

function generateId() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

wss.on('connection', function connection(ws) {
    ws.on('message', function message(data) {
        try {
            const msg = JSON.parse(data);
            if (msg.type === 'HOST') {
                const sessionId = generateId();
                ws.sessionId = sessionId;
                sessions[sessionId] = [ws];
                ws.send(JSON.stringify({ type: 'HOST_CREATED', sessionId }));
            } else if (msg.type === 'JOIN') {
                const { sessionId } = msg;
                if (sessions[sessionId]) {
                    ws.sessionId = sessionId;
                    sessions[sessionId].push(ws);
                    ws.send(JSON.stringify({ type: 'JOINED', sessionId }));
                    // notify host
                    sessions[sessionId].forEach(c => {
                        if (c !== ws) c.send(JSON.stringify({ type: 'NEW_PLAYER', sessionId }));
                    });
                } else {
                    ws.send(JSON.stringify({ type: 'ERROR', message: 'Session not found' }));
                }
            } else if (msg.type === 'BROADCAST') {
                const sess = sessions[ws.sessionId] || [];
                sess.forEach(c => {
                    if (c !== ws) c.send(JSON.stringify(msg));
                });
            }
        } catch (e) {
            console.error(e);
        }
    });

    ws.on('close', function () {
        if (ws.sessionId && sessions[ws.sessionId]) {
            sessions[ws.sessionId] = sessions[ws.sessionId].filter(c => c !== ws);
            if (sessions[ws.sessionId].length === 0) delete sessions[ws.sessionId];
        }
    });
});

console.log('WebSocket server running on port', process.env.PORT || 8080);
