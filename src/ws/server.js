import { WebSocket, WebSocketServer } from "ws";

/**
 * Send a JSON-serializable payload over a WebSocket if the socket is open.
 *
 * If the socket is not in the OPEN state, the function returns without sending.
 * @param {WebSocket} socket - The WebSocket to send the payload on.
 * @param {*} payload - The value to serialize to JSON and send.
 */
function sendJson(socket, payload) {
  if (socket.readyState !== WebSocket.OPEN) return;

  socket.send(JSON.stringify(payload));
}

/**
 * Send a JSON-serialized payload to every connected client whose socket is open.
 * @param {import('ws').WebSocketServer} wss - WebSocketServer whose clients will receive the payload.
 * @param {*} payload - Value to serialize to JSON and send to each open client.
 */
function broadcast(wss, payload) {
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;

    client.send(JSON.stringify(payload));
  }
}

/**
 * Attach a WebSocket server to an existing HTTP(S) server and provide a helper to notify clients about newly created matches.
 * @param {import('http').Server|import('https').Server} server - The HTTP or HTTPS server to bind the WebSocketServer to.
 * @returns {{ broadcastMatchCreated: (match: any) => void }} An object exposing `broadcastMatchCreated(match)`, which sends a `{ type: "match_created", data: match }` payload to all connected clients.
export function attachWebSocketServer(server) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024 * 1024,
  });

  wss.on("connection", (socket) => {
    socket.isAlive = true;
    socket.on("pong", () => {
      socket.isAlive = true;
    });

    sendJson(socket, { type: "welcome" });

    socket.on("error", console.error);
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => clearInterval(interval));

  function broadcastMatchCreated(match) {
    broadcast(wss, { type: "match_created", data: match });
  }

  return { broadcastMatchCreated };
}