const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect } = require('../middleware/authMiddleware');

router.get('/', orderController.getAllOrders);
router.get('/statuses', orderController.getOrderStatuses);
router.post('/', protect, orderController.createOrder);
router.get('/my', protect, orderController.getMyOrders);
router.get('/:id', protect, orderController.getOrderById);
router.patch('/:id/cancel', protect, orderController.cancelOrder);
router.patch('/:id/status', protect, orderController.updateOrderStatus);

module.exports = router;
