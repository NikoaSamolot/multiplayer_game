const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const path = require("path");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, "public")));

let players = {};
let messages = [];

function broadcast() {
    const data = JSON.stringify({
        type: "state",
        players,
        messages
    });

    wss.clients.forEach(ws => {
        if (ws.readyState === 1) {
            ws.send(data);
        }
    });
}

wss.on("connection", (ws) => {
    let id = Math.random().toString(36).substring(2, 9);

    players[id] = {
        x: Math.random() * 400,
        y: Math.random() * 400,
        name: "Guest",
        color: `hsl(${Math.random() * 360}, 80%, 60%)`
    };

    ws.send(JSON.stringify({ type: "id", id }));

    broadcast();

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        if (data.type === "join") {
            players[id].name = data.name.slice(0, 12);
        }

        if (data.type === "move") {
            if (!players[id]) return;
            players[id].x = data.x;
            players[id].y = data.y;
        }

        if (data.type === "chat") {
            messages.push({
                name: players[id].name,
                text: data.text
            });

            if (messages.length > 20) messages.shift();
        }

        broadcast();
    });

    ws.on("close", () => {
        delete players[id];
        broadcast();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server on " + PORT));
