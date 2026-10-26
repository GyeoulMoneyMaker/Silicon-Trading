/* Minimal zero-dependency static server for the Silicon Trading demo. */
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = Number(process.env.PORT) || 4173;

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

function notFound(res, message) {
  res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
  res.end(
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">" +
      "<link rel=\"icon\" href=\"/assets/logo.svg\" type=\"image/svg+xml\">" +
      "<title>Not found — Silicon Trading</title></head>" +
      "<body style=\"font-family:system-ui,sans-serif;background:#eaeff6;color:#0b1220;display:grid;place-items:center;height:100vh;margin:0\">" +
      "<div style=\"text-align:center\"><h1 style=\"font-size:2rem;margin:0 0 8px\">404</h1>" +
      "<p style=\"color:#5b6b82;margin:0 0 18px\">" +
      (message || "That page does not exist in this demo.") +
      "</p><a href=\"/\" style=\"color:#1d4ed8;font-weight:600\">Back to the marketplace</a></div></body></html>"
  );
}

const server = http.createServer(function (req, res) {
  let pathname;
  try {
    pathname = decodeURIComponent((req.url || "/").split("?")[0].split("#")[0]);
  } catch (err) {
    res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  if (pathname === "/") pathname = "/index.html";

  const filePath = path.join(ROOT, path.normalize(pathname));
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) {
      notFound(res, "We could not find " + pathname + ".");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": TYPES[ext] || "application/octet-stream",
      "Content-Length": data.length,
      "Cache-Control": ext === ".html" ? "no-store" : "no-cache"
    });
    res.end(data);
  });
});

server.listen(PORT, function () {
  console.log("Silicon Trading demo running at http://localhost:" + PORT);
});
