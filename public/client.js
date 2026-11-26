const statusEl = document.querySelector("#status");
const connectBtn = document.querySelector("#connect");
const canvas = document.querySelector("#arena");
const ctx = canvas.getContext("2d");
const playersEl = document.querySelector("#players");
let socket = null, myId = null, players = [];
const keys = new Set();

function status(message, color = "#9fe3c0") {
  statusEl.textContent = message;
  statusEl.style.color = color;
}
connectBtn.addEventListener("click", () => {
  if (socket && socket.readyState === WebSocket.OPEN) socket.close();
  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  socket = new WebSocket(`${protocol}//${location.host}`);
  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({
      type: "join",
      name: document.querySelector("#name").value,
      roomCode: document.querySelector("#room").value
    }));
    status("Connecting to room…");
  });
  socket.addEventListener("message", (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type === "joined") {
      myId = msg.id; players = msg.players;
      status(`Connected to room ${msg.roomCode}`);
      connectBtn.textContent = "Reconnect";
    } else if (msg.type === "players") players = msg.players;
    else if (msg.type === "error") status(msg.message, "#ff9c9c");
  });
  socket.addEventListener("close", () => status("Disconnected", "#ff9c9c"));
  socket.addEventListener("error", () => status("Connection error — check the server URL and hosting.", "#ff9c9c"));
});

window.addEventListener("keydown", e => {
  if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"," "].includes(e.key)) e.preventDefault();
  keys.add(e.key.toLowerCase());
});
window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));
window.addEventListener("blur", () => keys.clear());

setInterval(() => {
  if (!socket || socket.readyState !== WebSocket.OPEN || !myId) return;
  let dx = 0, dy = 0;
  if (keys.has("w") || keys.has("arrowup")) dy -= 1;
  if (keys.has("s") || keys.has("arrowdown")) dy += 1;
  if (keys.has("a") || keys.has("arrowleft")) dx -= 1;
  if (keys.has("d") || keys.has("arrowright")) dx += 1;
  if (dx || dy) socket.send(JSON.stringify({ type: "move", dx, dy }));
}, 50);

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#1c2c45"; ctx.lineWidth = 1;
  for (let x=0; x<canvas.width; x+=35) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for (let y=0; y<canvas.height; y+=35) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
  players.forEach(p => {
    const x = canvas.width/2 + p.x*28, y = canvas.height/2 + p.y*28;
    ctx.beginPath(); ctx.arc(x,y,12,0,Math.PI*2);
    ctx.fillStyle = p.id === myId ? "#8b7cff" : "#38d6a5"; ctx.fill();
    ctx.fillStyle = "#eef3ff"; ctx.font = "13px system-ui"; ctx.textAlign = "center";
    ctx.fillText(p.name, x, y-18);
  });
  playersEl.textContent = players.length ? players.map(p => `${p.name}${p.id===myId?" (you)":""}`).join(" • ") : "No players connected.";
  requestAnimationFrame(draw);
}
draw();
