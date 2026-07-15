// Tiny dependency-free static file server.
// Usage:
//   node scripts/dev-server.js        -> serves the project root
//   node scripts/dev-server.js dist   -> serves the built dist/ folder
const http = require("http");
const fs = require("fs");
const path = require("path");

const rootArg = process.argv[2];
const root = rootArg
  ? path.join(__dirname, "..", rootArg)
  : path.join(__dirname, "..");

const port = Number(process.env.PORT) || 5173;

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

function safeJoin(base, requestPath) {
  const decoded = decodeURIComponent(requestPath.split("?")[0]);
  const resolved = path.normalize(path.join(base, decoded));
  if (!resolved.startsWith(path.normalize(base))) {
    return null;
  }
  return resolved;
}

const server = http.createServer((req, res) => {
  let filePath = safeJoin(root, req.url === "/" ? "/index.html" : req.url);

  if (!filePath) {
    res.writeHead(400);
    res.end("Bad request");
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) {
      filePath = path.join(filePath, "index.html");
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("404 Not Found");
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const contentType = CONTENT_TYPES[ext] || "application/octet-stream";
      res.writeHead(200, { "Content-Type": contentType });
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Move Quest server running at http://localhost:${port}/`);
  console.log(`Serving: ${root}`);
});
