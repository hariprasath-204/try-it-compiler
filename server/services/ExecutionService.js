const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const https = require('https');

const TIMEOUT_MS = 5000;
const TEMP_DIR = path.join(__dirname, '..', 'temp');

if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Map frontend languages to Judge0 language IDs
const judge0Map = {
  cpp: 54, // C++ (GCC 9.2.0)
  c: 50,   // C (GCC 9.2.0)
  python: 100, // Python (3.12.5)
  java: 91  // Java (JDK 17.0.6)
};

const executeCode = (lang, code) => {
  return new Promise((resolve, reject) => {
    const languageId = judge0Map[lang];
    if (!languageId) {
      return reject(new Error(`Unsupported language: ${lang}`));
    }

    const data = JSON.stringify({
      source_code: code,
      language_id: languageId
    });

    const options = {
      hostname: 'ce.judge0.com',
      path: '/submissions?base64_encoded=false&wait=true',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          const stdout = result.stdout || '';
          const stderr = result.stderr || result.compile_output || '';
          resolve({ stdout, stderr });
        } catch (e) {
          reject(new Error('Failed to parse remote execution response'));
        }
      });
    });

    req.on('error', error => {
      reject(new Error('Failed to contact remote execution API: ' + error.message));
    });

    req.write(data);
    req.end();
  });
};

module.exports = { executeCode };
