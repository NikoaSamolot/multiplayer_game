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

let ttt = {
    board: Array(9).fill(null),
    turn: "X"
};

function broadcast() {
    const data = JSON.stringify({
        type: "state",
        players,
        chat,
        ttt
    });

    wss.clients.forEach(ws => {
        if (ws.readyState === 1) ws.send(data);
    });
}

// sync co 100ms (mniej lagów niż spam)
setInterval(broadcast, 100);

wss.on("connection", (ws) => {
    const id = Math.random().toString(36).substring(2, 9);

    players[id] = {
        x: 100 + Math.random() * 200,
        y: 100 + Math.random() * 200,
        name: "Guest",
        color: `hsl(${Math.random() * 360},80%,60%)`
    };

    ws.send(JSON.stringify({ type: "id", id }));

    broadcast();

    ws.on("message", (msg) => {
        const data = JSON.parse(msg);

        // nick
        if (data.type === "join") {
            players[id].name = data.name.slice(0, 12);
        }

        // movement (rzadko)
        if (data.type === "move") {
            if (!players[id]) return;
            players[id].x = data.x;
            players[id].y = data.y;
        }

        // chat
        if (data.type === "chat") {
            chat.push({
                name: players[id].name,
                text: data.text
            });

            if (chat.length > 30) chat.shift();
        }

        // tic tac toe
        if (data.type === "ttt") {
            const i = data.index;

            if (!ttt.board[i]) {
                ttt.board[i] = data.symbol;
                ttt.turn = ttt.turn === "X" ? "O" : "X";
            }
        }
    });

    ws.on("close", () => {
        delete players[id];
        broadcast();
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running on " + PORT));
