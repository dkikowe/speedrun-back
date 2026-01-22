const { models } = require('../models/database');

const { Category } = models;

async function getCategories(req, res) {
  try {
    const categories = await Category.find({}, 'id name').lean();

    res.json({
      items: categories,
      total: categories.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении списка категорий' });
  }
}

async function getCategoryById(req, res) {
  try {
    const { categoryId } = req.params;
    const category = await Category.findOne({ id: categoryId }).lean();

    if (!category) {
      return res.status(404).json({ error: 'Категория не найдена' });
    }

    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Ошибка при получении категории' });
  }
}

module.exports = {
  getCategories,
  getCategoryById
};
