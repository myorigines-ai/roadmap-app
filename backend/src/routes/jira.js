import express from 'express';
import { PrismaClient } from '@prisma/client';
import { testConnection, syncFromJira, searchIssues, getIssue } from '../services/jiraService.js';

const router = express.Router();
const prisma = new PrismaClient();

// Test Jira connection
router.get('/test', async (req, res) => {
  try {
    const result = await testConnection();
    res.json(result);
  } catch (error) {
    console.error('Jira connection test failed:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Search Jira issues
router.get('/search', async (req, res) => {
  try {
    const { jql, project } = req.query;
    const issues = await searchIssues(jql, project);
    res.json(issues);
  } catch (error) {
    console.error('Jira search failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Sync issues from Jira to local DB
router.post('/sync', async (req, res) => {
  try {
    const { jql, project } = req.body;
    const results = await syncFromJira(jql, project);
    res.json(results);
  } catch (error) {
    console.error('Jira sync failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Import selected issues from Jira
router.post('/import', async (req, res) => {
  try {
    const { issues } = req.body;
    const results = { created: 0, updated: 0, skipped: 0, errors: [], importedCards: [] };

    for (const issue of issues) {
      try {
        // Check if already exists
        const existing = await prisma.card.findUnique({
          where: { jiraKey: issue.jiraKey }
        });

        if (existing) {
          // Update existing
          const updated = await prisma.card.update({
            where: { jiraKey: issue.jiraKey },
            data: {
              summary: issue.summary,
              status: issue.status,
              jiraPriority: issue.jiraPriority,
              jiraUrl: issue.jiraUrl
            }
          });
          results.updated++;
          results.importedCards.push(updated);
        } else {
          // Create new
          const created = await prisma.card.create({
            data: {
              jiraKey: issue.jiraKey,
              jiraUrl: issue.jiraUrl,
              summary: issue.summary,
              status: issue.status,
              jiraPriority: issue.jiraPriority,
              project: issue.project,
              createdAt: new Date(issue.createdAt),
              dateKnown: true
            }
          });
          results.created++;
          results.importedCards.push(created);
        }
      } catch (error) {
        results.errors.push({ key: issue.jiraKey, error: error.message });
      }
    }

    res.json(results);
  } catch (error) {
    console.error('Jira import failed:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single issue from Jira
router.get('/issue/:key', async (req, res) => {
  try {
    const issue = await getIssue(req.params.key);
    res.json(issue);
  } catch (error) {
    console.error('Failed to get Jira issue:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
