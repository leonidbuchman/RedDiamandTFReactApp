const http = require("http");
const fs = require("fs");
const path = require("path");
const httpProxy = require("http-proxy");

const buildDir = path.join(__dirname, "build");
const port = Number(process.env.PORT || 80);
const loggerTarget = {
  host: "182.168.2.45",
  port: 8085,
  protocol: "http:",
};
const proxy = httpProxy.createProxyServer({
  target: loggerTarget,
  ws: true,
  changeOrigin: true,
});

const mimeTypes = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
  ".otf": "font/otf",
};

function getContentType(filePath) {
  return mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sendFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Server error");
      return;
    }

    res.writeHead(200, { "Content-Type": getContentType(filePath) });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const requestPath = decodeURIComponent(req.url.split("?")[0]);

  if (requestPath === "/logpage") {
    const proxyReq = http.request(
      {
        hostname: loggerTarget.host,
        port: loggerTarget.port,
        path: "/",
        method: "GET",
      },
      (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, {
          "Content-Type": proxyRes.headers["content-type"] || "text/html; charset=utf-8",
          "Cache-Control": "no-cache",
        });
        proxyRes.pipe(res);
      }
    );

    proxyReq.on("error", (err) => {
      console.error("Log page proxy error:", err);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain" });
      }
      res.end(String(err));
    });

    req.on("close", () => {
      proxyReq.abort();
    });

    proxyReq.end();
    return;
  }

  if (requestPath === "/socket.io" || requestPath.startsWith("/socket.io/")) {
    proxy.web(req, res, (err) => {
      console.error("Socket.io proxy error:", err);
      if (!res.headersSent) {
        res.writeHead(502, { "Content-Type": "text/plain" });
      }
      res.end(String(err));
    });
    return;
  }

  let filePath = path.join(buildDir, requestPath);

  if (requestPath.endsWith("/")) {
    filePath = path.join(filePath, "index.html");
  }

  if (!filePath.startsWith(buildDir)) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Bad request");
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (!err && stats.isFile()) {
      sendFile(res, filePath);
      return;
    }

    const indexPath = path.join(buildDir, "index.html");
    sendFile(res, indexPath);
  });
});

server.on("upgrade", (req, socket, head) => {
  if (req.url && (req.url === "/socket.io" || req.url.startsWith("/socket.io/"))) {
    proxy.ws(req, socket, head, (err) => {
      console.error("Socket.io websocket proxy error:", err);
      socket.destroy();
    });
    return;
  }

  socket.destroy();
});

proxy.on("error", (err, req, res) => {
  console.error("Proxy server error:", err);
  if (res && !res.headersSent) {
    res.writeHead(502, { "Content-Type": "text/plain" });
    res.end(String(err));
  }
});

server.listen(port, () => {
  console.log(`Device Control Dashboard is available at http://localhost:${port}`);
});
