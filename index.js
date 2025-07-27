const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;
const DATA_PATH = path.join(__dirname, 'properties.json');

app.use(cors());

app.get('/properties', (req, res) => {
  try {
    const data = fs.readFileSync(DATA_PATH, 'utf-8');
    const json = JSON.parse(data);
    res.json(json);
  } catch (err) {
    console.error('❌ Failed to read properties.json:', err.message);
    res.status(500).json({ error: 'Failed to read properties.json', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Properties server running at http://localhost:${PORT}/properties`);
});
