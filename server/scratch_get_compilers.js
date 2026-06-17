const https = require('https');

https.get('https://wandbox.org/api/list.json', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    const list = JSON.parse(body);
    const compilers = list.map(c => c.name);
    console.log(compilers.filter(c => c.includes('gcc') || c.includes('cpython') || c.includes('openjdk') || c.includes('nodejs') || c.includes('R-')));
  });
});
