import axios from 'axios';

// ----------------------------------------------------
// 1. Judge0 Provider
// ----------------------------------------------------
const judge0Map = { cpp: 54, c: 50, python: 100, java: 91 };
const executeJudge0 = async (lang, code, stdin) => {
  if (!judge0Map[lang]) throw new Error('Unsupported language for Judge0');
  
  const response = await axios.post('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    source_code: code,
    language_id: judge0Map[lang],
    stdin: stdin
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  const result = response.data;
  return { 
    stdout: result.stdout || '', 
    stderr: result.stderr || result.compile_output || result.message || '' 
  };
};

// ----------------------------------------------------
// 2. Paiza Provider
// ----------------------------------------------------
const paizaMap = { cpp: 'cpp', c: 'c', python: 'python3', java: 'java' };
const executePaiza = async (lang, code, stdin) => {
  if (!paizaMap[lang]) throw new Error('Unsupported language for Paiza');
  
  const createRes = await axios.post('https://api.paiza.io/runners/create', new URLSearchParams({
    source_code: code,
    language: paizaMap[lang],
    input: stdin || '',
    api_key: 'guest'
  }), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const id = createRes.data.id;
  if (!id) throw new Error('No id from Paiza');

  // Poll for completion
  let attempts = 0;
  while (attempts < 15) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusRes = await axios.get(`https://api.paiza.io/runners/get_details?id=${id}&api_key=guest`);
    if (statusRes.data.status === 'completed') {
      return { 
        stdout: statusRes.data.stdout || '', 
        stderr: statusRes.data.build_stderr || statusRes.data.stderr || '' 
      };
    }
    attempts++;
  }
  throw new Error('Paiza polling timeout');
};

// ----------------------------------------------------
// 3. Wandbox Provider
// ----------------------------------------------------
const wandboxMap = { cpp: 'gcc-head', c: 'gcc-head-c', python: 'cpython-3.14.0', java: 'openjdk-jdk-22+36' };
const executeWandbox = async (lang, code, stdin) => {
  if (!wandboxMap[lang]) throw new Error('Unsupported language for Wandbox');
  
  const response = await axios.post('https://wandbox.org/api/compile.json', {
    code: code,
    compiler: wandboxMap[lang],
    stdin: stdin || ''
  }, {
    headers: { 'Content-Type': 'application/json' }
  });

  const result = response.data;
  const stderr = result.program_error || result.compiler_error || '';
  if (stderr.includes('OCI runtime error')) throw new Error('Wandbox OCI Error');
  
  return { 
    stdout: result.program_output || '', 
    stderr: stderr 
  };
};

// ----------------------------------------------------
// Main Execute Logic with Failover Array
// ----------------------------------------------------
export const executeCodeDirectly = async (lang, code, stdin) => {
  const providers = [
    { name: 'Judge0', fn: executeJudge0 },
    { name: 'Paiza', fn: executePaiza },
    { name: 'Wandbox', fn: executeWandbox }
  ];

  for (const provider of providers) {
    try {
      console.log(`Attempting execution via ${provider.name} directly from browser...`);
      const result = await provider.fn(lang, code, stdin);
      return result;
    } catch (error) {
      console.error(`Provider ${provider.name} failed:`, error.message);
    }
  }

  throw new Error('All remote execution services are currently unavailable. Please try again later.');
};
