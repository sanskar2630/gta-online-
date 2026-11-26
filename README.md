# Sanskar Studios Multiplayer Starter (v0.1)

This is a small local-testing prototype using Node.js and WebSockets.

## Requirements
- Node.js 20 or newer
- Internet access for the first `npm install` (to download the `ws` package)

## Run on Windows
1. Extract the ZIP.
2. Open the extracted folder in File Explorer.
3. Click the address bar, type `cmd`, and press Enter.
4. Run `node -v` and confirm it reports v20 or newer.
5. Run `npm install`.
6. Run `npm start`.
7. Open http://localhost:3000 in your browser.
8. Open a second tab to the same address, use the same room code, and join.

Move with WASD or the arrow keys.

## What this prototype does
- Hosts a small WebSocket server.
- Creates a room when a player joins a new room code.
- Allows up to 16 players in a room.
- Sends basic player position snapshots at 20 updates per second.
- Serves the test arena page from the same Node.js process.

## Important limitations
This is a separate 2D test arena. It is NOT integrated with the Sanskar Studios 3D/WASM game yet. It does not provide a public dedicated server deployment, accounts, invites, persistence, moderation, production-grade security, or anti-cheat. Do not expose it publicly as a production service. Public cross-network testing requires hosting the Node.js process on a suitable persistent server that supports WebSockets.

The actual 3D game needs an engine-side adapter/API to read local player state, send movement/state updates, receive remote player state, and create/update remote entities. A separate lobby server alone cannot make the 3D game multiplayer.
