const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load .env
const env = {};
try {
  const envContent = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  envContent.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).forEach(line => {
    const [key, ...val] = line.split('=');
    if (key && val.length) {
      let value = val.join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      env[key] = value;
    }
  });
} catch(e) {}
process.env = { ...process.env, ...env };

// Load API handlers
const handlers = {
  '/api/auth': require('./api/auth'),
  '/api/chat': require('./api/chat'),
  '/api/profile': require('./api/profile'),
  '/api/admin': require('./api/admin')
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Static files
  if (!pathname.startsWith('/api')) {
    let filePath = pathname === '/' ? 'index.html' : pathname.slice(1);
    const absPath = path.join(__dirname, filePath);
    if (fs.existsSync(absPath) && fs.statSync(absPath).isFile()) {
      const ext = path.extname(absPath);
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[ext] || 'text/plain';
      res.writeHead(200, { 'Content-Type': mime });
      return fs.createReadStream(absPath).pipe(res);
    }
    res.writeHead(404);
    return res.end();
  }

  // API handling
  const handler = handlers[pathname];
  if (!handler) {
    res.writeHead(404);
    return res.end(JSON.stringify({ error: 'Not found' }));
  }

  // Body parsing for POST
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      const mockReq = {
        method: req.method,
        headers: req.headers,
        body: body ? JSON.parse(body) : {},
        query: parsedUrl.query
      };
      const mockRes = {
        status(code) { this._status = code; return this; },
        json(data) {
          res.writeHead(this._status || 200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(data));
          return this;
        },
        end(data) { res.end(data); }
      };
      await handler(mockReq, mockRes);
    } catch (e) {
      console.error("API Error:", e);
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
});
