const https = require('https');

const data = JSON.stringify({
  code: "pint('Hello from Wandbox API!')",
  compiler: "cpython-3.14.0"
});

const options = {
  hostname: 'wandbox.org',
  path: '/api/compile.json',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = https.request(options, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Wandbox Response:', JSON.stringify(JSON.parse(body), null, 2)));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
