import express from 'express';
import cors from 'cors';
import cardsRouter from './routes/cards.js';
import jiraRouter from './routes/jira.js';
import configRouter from './routes/config.js';
import columnsRouter from './routes/columns.js';

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

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
