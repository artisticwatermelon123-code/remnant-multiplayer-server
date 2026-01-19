const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const wss = new WebSocket.Server({ port: PORT });

const sessions = {}; // store sessions by ID

wss.on('connection', (ws) => {
    ws.on('message', (msg) => {
        try {
            const data = JSON.parse(msg);
            if(data.type === 'join') {
                const id = data.session;
                ws.sessionId = id;
                if(!sessions[id]) sessions[id] = [];
                sessions[id].push(ws);

                // Notify everyone in the session
                sessions[id].forEach(client => {
                    if(client.readyState === WebSocket.OPEN)
                        client.send(JSON.stringify({ type:'update', players: sessions[id].length }));
                });
            }
            if(data.type === 'broadcast' && ws.sessionId) {
                const id = ws.sessionId;
                sessions[id].forEach(client => {
                    if(client !== ws && client.readyState === WebSocket.OPEN)
                        client.send(JSON.stringify({ type:'message', payload: data.payload }));
                });
            }
        } catch(e) {
            console.error('Invalid message:', msg);
        }
    });

    ws.on('close', () => {
        const id = ws.sessionId;
        if(id && sessions[id]) {
            sessions[id] = sessions[id].filter(c => c !== ws);
        }
    });
});

console.log(`WebSocket server running on port ${PORT}`);
