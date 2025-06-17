const express = require('express');
const cors = require('cors');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_PATH = path.join(__dirname, 'all_properties.json');
let busy = false;   // simple lock

app.use(cors());
app.set('timeout', 0);  // disable Express request timeout

app.get('/all_properties', (req, res) => {
  if (busy) {
    return res.status(429).json({ error: 'Scraper is already running. Try again later.' });
  }

  console.log('⚙️  Running scraper...');
  busy = true;

  const child = spawn('node', ['updated_script.js'], { stdio: 'inherit' });

  child.on('close', (code) => {
    busy = false;

    if (code !== 0) {
      console.error(`❌ Scraper exited with code ${code}`);
      return res.status(500).json({ error: `Scraper failed with exit code ${code}` });
    }

    console.log('✅ Scraper finished. Reading JSON...');
    try {
      const data = fs.readFileSync(DATA_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      res.json(parsed);
    } catch (err) {
      res.status(500).json({ error: 'Could not read all_properties.json', details: err.message });
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
