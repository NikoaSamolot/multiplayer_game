const express = require("express");
const http = require("http");
const WebSocket = require("ws");

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static("public"));

let clients = {};
let messages = [];

wss.on("connection", (ws) => {
    const id = Math.random().toString(36).substring(2, 9);
    clients[id] = ws;

    ws.send(JSON.stringify({
        type: "id",
        id: id
    }));

    ws.send(JSON.stringify({
        type: "chat",
        messages: messages
    }));

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        if (data.type === "chat") {
            messages.push({
                id: id,
                text: data.text
            });

            if (messages.length > 30) {
                messages.shift();
            }

            broadcast();
        }
    });

    ws.on("close", () => {
        delete clients[id];
    });
});

function broadcast() {
    const payload = JSON.stringify({
        type: "chat",
        messages: messages
    });

    for (let id in clients) {
        clients[id].send(payload);
    }
}

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log("Server działa na porcie " + PORT);
});