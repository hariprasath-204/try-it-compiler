const express = require('express');
const cors = require('cors');
const { executeCode } = require('./services/ExecutionService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/run', async (req, res) => {
  const { lang, code } = req.body;
  if (!lang || !code) {
    return res.status(400).json({ error: 'Language and code are required.' });
  }

  try {
    const result = await executeCode(lang, code);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Execution service failed.', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
