import http from "node:http";

const port = Number(process.env.MGE_LAB_LIVE_PORT ?? 5190);
const clients = new Set();
const history = [];

function writeSse(res, event) {
  res.write(`id: ${event.id}\n`);
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    "content-type": "application/json",
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET,POST,OPTIONS",
    "access-control-allow-headers": "content-type"
  });
  res.end(JSON.stringify(body));
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    sendJson(res, 200, {
      ok: true,
      service: "mgelectronics_lab_live_relay",
      stream: `http://127.0.0.1:${port}/stream`
    });
    return;
  }

  if (req.method === "GET" && req.url === "/events") {
    sendJson(res, 200, { events: history });
    return;
  }

  if (req.method === "GET" && req.url === "/stream") {
    res.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
      "access-control-allow-origin": "*"
    });
    res.write(": mgelectronics lab live relay\n\n");
    history.slice(-25).forEach((event) => writeSse(res, event));
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  if (req.method === "POST" && req.url === "/events") {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
    });
    req.on("end", () => {
      try {
        const event = JSON.parse(body);
        history.push(event);
        if (history.length > 300) history.shift();
        clients.forEach((client) => writeSse(client, event));
        sendJson(res, 202, { ok: true, event_id: event.id });
      } catch (error) {
        sendJson(res, 400, { ok: false, error: "invalid JSON event" });
      }
    });
    return;
  }

  sendJson(res, 404, { ok: false, error: "not found" });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`MGElectronics live relay listening on http://127.0.0.1:${port}`);
  console.log(`SSE stream: http://127.0.0.1:${port}/stream`);
});
