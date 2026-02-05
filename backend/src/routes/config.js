import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get Jira config (hide token)
router.get('/jira', async (req, res) => {
  try {
    const config = await prisma.jiraConfig.findFirst();
    if (!config) {
      return res.json(null);
    }
    res.json({
      id: config.id,
      email: config.email,
      baseUrl: config.baseUrl,
      hasToken: !!config.apiToken
    });
  } catch (error) {
    console.error('Error fetching Jira config:', error);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// Save Jira config
router.post('/jira', async (req, res) => {
  try {
    const { email, apiToken, baseUrl } = req.body;

    if (!email || !apiToken || !baseUrl) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Delete existing config
    await prisma.jiraConfig.deleteMany();

    // Create new config
    const config = await prisma.jiraConfig.create({
      data: {
        email,
        apiToken,
        baseUrl
      }
    });

    res.json({
      id: config.id,
      email: config.email,
      baseUrl: config.baseUrl,
      hasToken: true
    });
  } catch (error) {
    console.error('Error saving Jira config:', error);
    res.status(500).json({ error: 'Failed to save config' });
  }
});

// Delete Jira config
router.delete('/jira', async (req, res) => {
  try {
    await prisma.jiraConfig.deleteMany();
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting Jira config:', error);
    res.status(500).json({ error: 'Failed to delete config' });
  }
});

export default router;
