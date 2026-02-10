import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import cardsRouter from './routes/cards.js';
import jiraRouter from './routes/jira.js';
import configRouter from './routes/config.js';
import columnsRouter from './routes/columns.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/cards', cardsRouter);
app.use('/api/jira', jiraRouter);
app.use('/api/config', configRouter);
app.use('/api/columns', columnsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend static files
app.use(express.static(path.join(__dirname, '../../frontend/dist')));

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../frontend/dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
