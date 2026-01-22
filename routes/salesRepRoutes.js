const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getMySalesRepresentativeStores } = require('../controllers/distributorController');

router.use(authenticateToken);
router.get('/stores', getMySalesRepresentativeStores);

module.exports = router;

