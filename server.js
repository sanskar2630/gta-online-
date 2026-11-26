const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { WebSocketServer, WebSocket } = require("ws");

const PORT = Number(process.env.PORT || 3000);
const ROOT = path.join(__dirname, "public");
const MAX_PLAYERS_PER_ROOM = 16;
const TICK_MS = 50; // 20 updates per second
const rooms = new Map();

function safeText(value, max = 20) {
  return String(value ?? "").replace(/[<>]/g, "").trim().slice(0, max);
}
function send(ws, data) {
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data));
}
function getRoom(code) {
  if (!rooms.has(code)) rooms.set(code, new Map());
  return rooms.get(code);
}
function snapshot(room) {
  return [...room.values()].map(({ id, name, x, y }) => ({ id, name, x, y }));
}
function contentType(file) {
  return ({ ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8" })[path.extname(file)] || "application/octet-stream";
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  if (url.pathname === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify({ ok: true, rooms: rooms.size }));
  }
  const requested = url.pathname === "/" ? "index.html" : decodeURIComponent(url.pathname).replace(/^\/+/, "");
  const file = path.resolve(ROOT, requested);
  if (!file.startsWith(ROOT + path.sep) && file !== path.join(ROOT, "index.html")) {
    res.writeHead(403); return res.end("Forbidden");
  }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end("Not found"); }
    res.writeHead(200, { "content-type": contentType(file) });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server });
wss.on("connection", (ws) => {
  const player = { id: Math.random().toString(36).slice(2, 10), name: "Player", x: 0, y: 0, roomCode: null };
  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(raw.toString()); } catch { return; }

    if (msg.type === "join") {
      const code = safeText(msg.roomCode, 12).toUpperCase().replace(/[^A-Z0-9_-]/g, "") || "LOBBY";
      const name = safeText(msg.name, 20) || "Player";
      if (player.roomCode) return;
      const room = getRoom(code);
      if (room.size >= MAX_PLAYERS_PER_ROOM) return send(ws, { type: "error", message: "That room is full." });
      player.name = name;
      player.roomCode = code;
      room.set(player.id, player);
      send(ws, { type: "joined", id: player.id, roomCode: code, players: snapshot(room) });
      for (const other of wss.clients) {
        if (other !== ws && other.player?.roomCode === code) send(other, { type: "players", players: snapshot(room) });
      }
      ws.player = player;
      return;
    }

    if (!player.roomCode) return;
    const room = rooms.get(player.roomCode);
    if (!room) return;
    if (msg.type === "move") {
      const dx = Math.max(-1, Math.min(1, Number(msg.dx) || 0));
      const dy = Math.max(-1, Math.min(1, Number(msg.dy) || 0));
      const length = Math.hypot(dx, dy) || 1;
      const speed = 0.12;
      player.x = Math.max(-10, Math.min(10, player.x + (dx / length) * speed));
      player.y = Math.max(-10, Math.min(10, player.y + (dy / length) * speed));
    }
  });

  ws.on("close", () => {
    if (!player.roomCode) return;
    const room = rooms.get(player.roomCode);
    if (!room) return;
    room.delete(player.id);
    if (room.size === 0) rooms.delete(player.roomCode);
    else for (const other of wss.clients) {
      if (other.player?.roomCode === player.roomCode) send(other, { type: "players", players: snapshot(room) });
    }
  });
});

setInterval(() => {
  for (const room of rooms.values()) {
    const message = JSON.stringify({ type: "players", players: snapshot(room) });
    for (const ws of wss.clients) {
      if (ws.readyState === WebSocket.OPEN && ws.player?.roomCode && room.has(ws.player.id)) ws.send(message);
    }
  }
}, TICK_MS);

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Sanskar Studios multiplayer prototype listening on http://localhost:${PORT}`);
});
