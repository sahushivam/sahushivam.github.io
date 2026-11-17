"use strict";

const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".ttf": "font/ttf"
};

http.createServer(async (request, response) => {
  if (!["GET", "HEAD"].includes(request.method)) {
    response.writeHead(405, { Allow: "GET, HEAD" }).end();
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filename = path.resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
    const relative = path.relative(root, filename);
    if (relative.startsWith("..") || path.isAbsolute(relative) ||
        relative.split(path.sep).some(part => part.startsWith("."))) {
      response.writeHead(403).end("Forbidden");
      return;
    }
    const content = await fs.readFile(filename);
    response.writeHead(200, {
      "Content-Type": types[path.extname(filename)] || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(request.method === "HEAD" ? undefined : content);
  } catch {
    response.writeHead(404).end("Not found");
  }
}).listen(port, "127.0.0.1", () => {
  console.log("Portfolio preview: http://127.0.0.1:" + port);
});
