// Maya — AI Teacher (integrated product server). Zero dependencies, plain Node.js.
// - Serves the Teacher Studio + Learner app from public/
// - GET  /api/lessons        -> lesson catalog (lessons.json)
// - POST /api/conversation   -> mints a Tavus conversation URL for a lesson
//        body: { lessonId, grade, curriculum, subject }
// - The Tavus API key stays server-side; the browser never sees it.
//
// Run locally:  node server.js   (reads .env; see .env.example)
// Deploy:       see README.md "Deploy to Render" — set TAVUS_API_KEY + TAVUS_PAL_ID
//               as environment variables on the host.
const http = require('node:http');
const https = require('node:https');
const fs = require('node:fs');
const path = require('node:path');

// ---- .env autoload (local dev) ----
try {
  const envText = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
  for (const line of envText.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && m[1] && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
} catch (e) { /* no .env — environment variables are used as-is */ }

const PORT = process.env.PORT || 3000;
const TAVUS_API_KEY = process.env.TAVUS_API_KEY;
const TAVUS_PAL_ID = process.env.TAVUS_PAL_ID;
const PUBLIC_DIR = __dirname; // flat layout: index.html + assets live beside server.js
const HIDDEN = new Set(['server.js', '.env', 'QA-CHECKLIST.md']);

let LESSONS = [];
try {
  LESSONS = JSON.parse(fs.readFileSync(path.join(__dirname, 'lessons.json'), 'utf8')).lessons || [];
} catch (e) { console.log('WARNING: lessons.json not found or invalid.'); }

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
};

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function serveStatic(req, res) {
  let p = req.url.split('?')[0];
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p)).replace(/^(\.\.[\/\\])+/, '');
  if (!file.startsWith(PUBLIC_DIR)) { res.writeHead(403); res.end('forbidden'); return; }
  if (HIDDEN.has(path.basename(file))) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end('not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
}

function createConversation(body, done) {
  if (!TAVUS_API_KEY || !TAVUS_PAL_ID) {
    done(500, { error: 'Server not configured: set TAVUS_API_KEY and TAVUS_PAL_ID' });
    return;
  }
  const lesson = LESSONS.find((l) => l.id === body.lessonId) || LESSONS[0];
  const grade = body.grade || '5';
  const curriculum = body.curriculum || 'IB';
  const subject = body.subject || (lesson && lesson.subject) || 'Science';
  const topic = lesson ? lesson.topic : 'science';

  const context =
    `You are teaching a live lesson. Curriculum: ${curriculum}, Grade: ${grade}, ` +
    `Subject: ${subject}, Topic: ${topic}. ` +
    (lesson ? lesson.context + ' ' : '') +
    'Address the student warmly. Keep every response to 2-4 short sentences in clear, slow English. ' +
    'After each explanation ask ONE simple check-in question and wait for the answer.';

  const payload = JSON.stringify({
    pal_id: TAVUS_PAL_ID,
    conversation_name: `Maya — ${topic} (${curriculum} Grade ${grade})`,
    conversational_context: context,
    custom_greeting: (lesson && lesson.greeting
      ? lesson.greeting
      : `Namaste! I am Maya. Today we will discover ${topic.toLowerCase()} together. Are you ready?`),
    // No participant_tags -> stateless: nothing about the speaker is remembered.
  });

  const r = https.request(
    {
      hostname: 'tavusapi.com',
      path: '/v2/conversations',
      method: 'POST',
      headers: {
        'x-api-key': TAVUS_API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    },
    (resp) => {
      let d = '';
      resp.on('data', (c) => (d += c));
      resp.on('end', () => {
        let parsed = {};
        try { parsed = JSON.parse(d); } catch (e) { parsed = { raw: d }; }
        done(resp.statusCode, parsed);
      });
    }
  );
  r.on('error', (e) => done(502, { error: 'tavusapi.com unreachable: ' + e.message }));
  r.write(payload);
  r.end();
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url.split('?')[0] === '/api/lessons') {
    return sendJson(res, 200, { lessons: LESSONS });
  }
  if (req.method === 'POST' && req.url === '/api/conversation') {
    let b = '';
    req.on('data', (c) => (b += c));
    req.on('end', () => {
      let body = {};
      try { body = b ? JSON.parse(b) : {}; } catch (e) { /* ignore */ }
      createConversation(body, (status, data) => sendJson(res, status, data));
    });
    return;
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Maya — AI Teacher running at http://localhost:${PORT}`);
  console.log(`Lessons loaded: ${LESSONS.length}`);
  if (!TAVUS_API_KEY || !TAVUS_PAL_ID) {
    console.log('WARNING: TAVUS_API_KEY / TAVUS_PAL_ID not set - /api/conversation will return 500.');
  }
});
