const express = require('express');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/categories – lista categorie attive
router.get('/', async (req, res, next) => {
  try {
    const categorie = await prisma.category.findMany({
      where  : { isActive: true },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(categorie);
  } catch (err) { next(err); }
});

module.exports = router;
