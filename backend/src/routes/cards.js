import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get all cards with optional filters
router.get('/', async (req, res) => {
  try {
    const { project, status, search } = req.query;

    const where = {};
    if (project) where.project = project;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { summary: { contains: search } },
        { jiraKey: { contains: search } },
        { comment: { contains: search } }
      ];
    }

    const cards = await prisma.card.findMany({
      where,
      include: {
        comments: { orderBy: { createdAt: 'desc' }, take: 3 },
        customValues: { include: { column: true } },
        _count: { select: { comments: true, history: true } }
      },
      orderBy: [
        { businessPriority: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    res.json(cards);
  } catch (error) {
    console.error('Error fetching cards:', error);
    res.status(500).json({ error: 'Failed to fetch cards' });
  }
});

// Get single card with full details
router.get('/:id', async (req, res) => {
  try {
    const card = await prisma.card.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        comments: { orderBy: { createdAt: 'desc' } },
        history: { orderBy: { changedAt: 'desc' } }
      }
    });

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json(card);
  } catch (error) {
    console.error('Error fetching card:', error);
    res.status(500).json({ error: 'Failed to fetch card' });
  }
});

// Create card
router.post('/', async (req, res) => {
  try {
    const { jiraKey, jiraUrl, summary, status, jiraPriority, businessPriority, project, comment } = req.body;

    const card = await prisma.card.create({
      data: {
        jiraKey,
        jiraUrl,
        summary,
        status,
        jiraPriority,
        businessPriority,
        project,
        comment
      }
    });

    res.status(201).json(card);
  } catch (error) {
    console.error('Error creating card:', error);
    res.status(500).json({ error: 'Failed to create card' });
  }
});

// Update card with history tracking
router.put('/:id', async (req, res) => {
  try {
    const cardId = parseInt(req.params.id);
    const { changedBy = 'Utilisateur', ...updates } = req.body;

    // Get current card for history
    const currentCard = await prisma.card.findUnique({ where: { id: cardId } });
    if (!currentCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    // Handle date update - if createdAt is being set and dateKnown was false, mark as known
    if (updates.createdAt) {
      updates.createdAt = new Date(updates.createdAt);
      if (!currentCard.dateKnown) {
        updates.dateKnown = true;
      }
    }

    // Track changes
    const historyEntries = [];
    for (const [field, newValue] of Object.entries(updates)) {
      const oldValue = currentCard[field];
      // Compare dates properly
      const oldStr = oldValue instanceof Date ? oldValue.toISOString() : oldValue?.toString();
      const newStr = newValue instanceof Date ? newValue.toISOString() : newValue?.toString();
      if (oldStr !== newStr) {
        historyEntries.push({
          cardId,
          field,
          oldValue: oldStr || null,
          newValue: newStr || null,
          changedBy
        });
      }
    }

    // Update card and create history in transaction
    const [updatedCard] = await prisma.$transaction([
      prisma.card.update({
        where: { id: cardId },
        data: updates
      }),
      ...historyEntries.map(entry => prisma.history.create({ data: entry }))
    ]);

    res.json(updatedCard);
  } catch (error) {
    console.error('Error updating card:', error);
    res.status(500).json({ error: 'Failed to update card' });
  }
});

// Delete card
router.delete('/:id', async (req, res) => {
  try {
    await prisma.card.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting card:', error);
    res.status(500).json({ error: 'Failed to delete card' });
  }
});

// Add comment to card
router.post('/:id/comments', async (req, res) => {
  try {
    const { author, content } = req.body;

    const comment = await prisma.comment.create({
      data: {
        cardId: parseInt(req.params.id),
        author,
        content
      }
    });

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get projects list
router.get('/meta/projects', async (req, res) => {
  try {
    const projects = await prisma.card.findMany({
      select: { project: true },
      distinct: ['project']
    });
    res.json(projects.map(p => p.project));
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get statuses list
router.get('/meta/statuses', async (req, res) => {
  try {
    const statuses = await prisma.card.findMany({
      select: { status: true },
      distinct: ['status']
    });
    res.json(statuses.map(s => s.status));
  } catch (error) {
    console.error('Error fetching statuses:', error);
    res.status(500).json({ error: 'Failed to fetch statuses' });
  }
});

export default router;
