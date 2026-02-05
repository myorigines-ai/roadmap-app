import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Get custom columns for a project (includes global columns, excludes card-specific)
router.get('/:project', async (req, res) => {
  try {
    const { project } = req.params;

    const columns = await prisma.customColumn.findMany({
      where: {
        OR: [
          { project, cardId: null },
          { project: '__global__', cardId: null }
        ]
      },
      orderBy: { position: 'asc' }
    });

    res.json(columns);
  } catch (error) {
    console.error('Error fetching columns:', error);
    res.status(500).json({ error: 'Failed to fetch columns' });
  }
});

// Get custom columns for a specific card (card-specific fields)
router.get('/card/:cardId', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);

    const columns = await prisma.customColumn.findMany({
      where: { cardId },
      include: {
        values: {
          where: { cardId }
        }
      },
      orderBy: { position: 'asc' }
    });

    res.json(columns);
  } catch (error) {
    console.error('Error fetching card columns:', error);
    res.status(500).json({ error: 'Failed to fetch card columns' });
  }
});

// Create custom column (project-level or card-specific)
router.post('/', async (req, res) => {
  try {
    const { project, cardId, name, type = 'text', options, value } = req.body;

    // Get max position
    const maxPos = await prisma.customColumn.aggregate({
      where: cardId ? { cardId } : { project, cardId: null },
      _max: { position: true }
    });

    const column = await prisma.customColumn.create({
      data: {
        project,
        cardId: cardId || null,
        name,
        type,
        options: options ? JSON.stringify(options) : null,
        position: (maxPos._max.position || 0) + 1
      }
    });

    // If this is a card-specific column with an initial value, create the value
    if (cardId && value !== undefined) {
      await prisma.customFieldValue.create({
        data: {
          cardId,
          columnId: column.id,
          value: value || ''
        }
      });
    }

    res.status(201).json(column);
  } catch (error) {
    console.error('Error creating column:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'Une colonne avec ce nom existe deja' });
    }
    res.status(500).json({ error: 'Failed to create column' });
  }
});

// Update custom column
router.put('/:id', async (req, res) => {
  try {
    const { name, type, options, position } = req.body;

    const column = await prisma.customColumn.update({
      where: { id: parseInt(req.params.id) },
      data: {
        ...(name && { name }),
        ...(type && { type }),
        ...(options !== undefined && { options: options ? JSON.stringify(options) : null }),
        ...(position !== undefined && { position })
      }
    });

    res.json(column);
  } catch (error) {
    console.error('Error updating column:', error);
    res.status(500).json({ error: 'Failed to update column' });
  }
});

// Delete custom column
router.delete('/:id', async (req, res) => {
  try {
    await prisma.customColumn.delete({ where: { id: parseInt(req.params.id) } });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting column:', error);
    res.status(500).json({ error: 'Failed to delete column' });
  }
});

// Update custom field value for a card
router.put('/values/:cardId/:columnId', async (req, res) => {
  try {
    const cardId = parseInt(req.params.cardId);
    const columnId = parseInt(req.params.columnId);
    const { value } = req.body;

    const fieldValue = await prisma.customFieldValue.upsert({
      where: {
        cardId_columnId: { cardId, columnId }
      },
      create: { cardId, columnId, value },
      update: { value }
    });

    res.json(fieldValue);
  } catch (error) {
    console.error('Error updating field value:', error);
    res.status(500).json({ error: 'Failed to update field value' });
  }
});

export default router;
