const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const {
  getCategories,
  getCategoryById
} = require('../controllers/categoryController');

router.use(authenticateToken);

router.get('/', getCategories);
router.get('/:categoryId', getCategoryById);

module.exports = router;
