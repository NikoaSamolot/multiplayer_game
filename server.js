const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let players = {};
let chat = [];

function broadcast() {
    const data = JSON.stringify({
        type: "state",
        players,
        chat
    });

    wss.clients.forEach(ws => {
        if (ws.readyState === 1) {
            ws.send(data);
        }
    });
}

setInterval(broadcast, 100);

// AFK CHECK
setInterval(() => {

    const now = Date.now();

    wss.clients.forEach(ws => {

        if (
            ws.playerId &&
            players[ws.playerId] &&
            now - players[ws.playerId].lastActive > 600000
        ) {

            ws.send(JSON.stringify({
                type: "kick"
            }));

            ws.close();

            delete players[ws.playerId];
        }
    });

    broadcast();

}, 30000);

wss.on("connection", (ws) => {

    const id = Math.random().toString(36).substring(2, 9);

    ws.playerId = id;

    players[id] = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        name: "",
        color: `hsl(${Math.random() * 360},80%,60%)`,
        lastActive: Date.now()
    };

    ws.send(JSON.stringify({
        type: "id",
        id
    }));

    broadcast();

    ws.on("message", (msg) => {

        let data;

        try {
            data = JSON.parse(msg);
        } catch {
            return;
        }

        if (!players[id]) return;

        players[id].lastActive = Date.now();

        // JOIN
        if (data.type === "join") {

            let nick = data.name
                .trim()
                .slice(0, 12);

            if (!nick) return;

            let taken = Object.values(players).some(p =>
                p.name.toLowerCase() === nick.toLowerCase()
            );

            if (taken) {

                ws.send(JSON.stringify({
                    type: "nick_taken"
                }));

                return;
            }

            players[id].name = nick;

            ws.send(JSON.stringify({
                type: "join_ok"
            }));
        }

        // MOVE
        if (data.type === "move") {

            players[id].x = data.x;
            players[id].y = data.y;
        }

        // CHAT
        if (data.type === "chat") {

            if (!players[id].name) return;

            chat.push({
                name: players[id].name,
                text: data.text.slice(0, 100)
            });

            if (chat.length > 30) {
                chat.shift();
            }
        }
    });

    ws.on("close", () => {

        if (players[id]) {
            delete players[id];
        }

        broadcast();
    });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server running on " + PORT);
});

