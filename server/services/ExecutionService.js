const fs = require('fs');
const path = require('path');
const https = require('https');
const querystring = require('querystring');

const TEMP_DIR = path.join(__dirname, '..', 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ----------------------------------------------------
// 1. Judge0 Provider
// ----------------------------------------------------
const judge0Map = { cpp: 54, c: 50, python: 100, java: 91 };
const executeJudge0 = (lang, code) => new Promise((resolve, reject) => {
  if (!judge0Map[lang]) return reject(new Error('Unsupported language for Judge0'));
  const data = JSON.stringify({ source_code: code, language_id: judge0Map[lang] });
  const req = https.request({
    hostname: 'ce.judge0.com', path: '/submissions?base64_encoded=false&wait=true', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        if (res.statusCode >= 400 && res.statusCode !== 422) return reject(new Error(`Judge0 HTTP Error: ${res.statusCode}`));
        resolve({ stdout: result.stdout || '', stderr: result.stderr || result.compile_output || result.message || '' });
      } catch (e) { reject(new Error('Failed to parse Judge0 response')); }
    });
  });
  req.on('error', reject);
  req.write(data); req.end();
});

// ----------------------------------------------------
// 2. Paiza Provider
// ----------------------------------------------------
const paizaMap = { cpp: 'cpp', c: 'c', python: 'python3', java: 'java' };
const executePaiza = (lang, code) => new Promise((resolve, reject) => {
  if (!paizaMap[lang]) return reject(new Error('Unsupported language for Paiza'));
  const data = querystring.stringify({ source_code: code, language: paizaMap[lang], api_key: 'guest' });
  const req = https.request({
    hostname: 'api.paiza.io', path: '/runners/create', method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(data) }
  }, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        if (!result.id) return reject(new Error('No id from Paiza'));
        
        let attempts = 0;
        const poll = () => {
          if (attempts > 10) return reject(new Error('Paiza polling timeout'));
          attempts++;
          https.get(`https://api.paiza.io/runners/get_details?id=${result.id}&api_key=guest`, pRes => {
            let pBody = '';
            pRes.on('data', d => pBody += d);
            pRes.on('end', () => {
              try {
                const pResult = JSON.parse(pBody);
                if (pResult.status === 'completed') {
                  resolve({ stdout: pResult.stdout || '', stderr: pResult.build_stderr || pResult.stderr || '' });
                } else {
                  setTimeout(poll, 1000);
                }
              } catch (e) { reject(new Error('Failed to parse Paiza details')); }
            });
          }).on('error', reject);
        };
        setTimeout(poll, 1000);
      } catch (e) { reject(new Error('Failed to parse Paiza create response')); }
    });
  });
  req.on('error', reject);
  req.write(data); req.end();
});

// ----------------------------------------------------
// 3. Wandbox Provider
// ----------------------------------------------------
const wandboxMap = { cpp: 'gcc-head', c: 'gcc-head-c', python: 'cpython-3.14.0', java: 'openjdk-jdk-22+36' };
const executeWandbox = (lang, code) => new Promise((resolve, reject) => {
  if (!wandboxMap[lang]) return reject(new Error('Unsupported language for Wandbox'));
  const data = JSON.stringify({ code: code, compiler: wandboxMap[lang] });
  const req = https.request({
    hostname: 'wandbox.org', path: '/api/compile.json', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
  }, res => {
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      try {
        const result = JSON.parse(body);
        const stderr = result.program_error || result.compiler_error || '';
        if (stderr.includes('OCI runtime error')) return reject(new Error('Wandbox OCI Error'));
        resolve({ stdout: result.program_output || '', stderr });
      } catch (e) { reject(new Error('Failed to parse Wandbox response')); }
    });
  });
  req.on('error', reject);
  req.write(data); req.end();
});

// ----------------------------------------------------
// Main Execute Logic with Failover Array
// ----------------------------------------------------
const executeCode = async (lang, code) => {
  const providers = [
    { name: 'Judge0', fn: executeJudge0 },
    { name: 'Paiza', fn: executePaiza },
    { name: 'Wandbox', fn: executeWandbox }
  ];

  for (const provider of providers) {
    try {
      console.log(`Attempting execution with ${provider.name}...`);
      const result = await provider.fn(lang, code);
      return result; // If successful, return immediately
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error.message);
      // Continue to the next provider
    }
  }

  // If all providers fail
  return { 
    stdout: '', 
    stderr: 'Error: All remote execution services are currently unavailable due to high server load. Please try again later.' 
  };
};

module.exports = { executeCode };
