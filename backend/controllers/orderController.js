const Order = require('../models/Order');
const { ORDER_STATUSES, ORDER_STATUS_LABELS } = require('../models/Order');
const Product = require('../models/Product');

const FREE_SHIPPING_THRESHOLD = 300000;
const STANDARD_SHIPPING_FEE = 25000;

const VALID_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['shipping'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
};

const DEFAULT_STATUS_NOTES = {
  pending: 'Đơn hàng đã được tạo và đang chờ cửa hàng xác nhận',
  confirmed: 'Cửa hàng đã xác nhận đơn hàng của bạn',
  preparing: 'Nghệ nhân đang chọn hoa tươi và bó hoa cẩn thận',
  shipping: 'Shipper đã nhận hoa và đang trên đường giao tới bạn',
  delivered: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã mua sắm tại BHShop!',
  cancelled: 'Đơn hàng đã được hủy theo yêu cầu',
};

const parsePriceNumber = (price) => {
  if (typeof price === 'number' && !Number.isNaN(price)) return price;
  const digits = String(price || '0').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
};

const generateOrderCode = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `BH${y}${m}${d}-${rand}`;
};

// @desc    Lấy danh sách định nghĩa các trạng thái đơn hàng
// @route   GET /api/orders/statuses
exports.getOrderStatuses = (_req, res) => {
  const statuses = ORDER_STATUSES.map((code) => ({
    code,
    label: ORDER_STATUS_LABELS[code],
    nextStatuses: VALID_TRANSITIONS[code],
  }));
  res.json(statuses);
};

// @desc    Lấy danh sách đơn hàng (hỗ trợ xem trực tiếp API /api/orders & lọc theo ?status=)
// @route   GET /api/orders
exports.getAllOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const allOrders = await Order.find().select('status').lean();
    const counts = {
      all: allOrders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of allOrders) {
      if (counts[o.status] !== undefined) {
        counts[o.status] += 1;
      }
    }

    const query = {};
    if (status && status !== 'all' && ORDER_STATUSES.includes(status)) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'fullName email phone')
      .sort({ createdAt: -1 });

    res.json({
      totalOrders: orders.length,
      counts,
      orders,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách đơn hàng', error: error.message });
  }
};

// @desc    Tạo đơn hàng mới từ giỏ hàng
// @route   POST /api/orders
exports.createOrder = async (req, res) => {
  try {
    const { items, shippingInfo, paymentMethod = 'cod' } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Giỏ hàng đang trống, không thể đặt hàng' });
    }

    if (
      !shippingInfo ||
      !shippingInfo.fullName?.trim() ||
      !shippingInfo.phone?.trim() ||
      !shippingInfo.address?.trim()
    ) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ tên, số điện thoại và địa chỉ giao hoa' });
    }

    const validPayments = ['cod', 'bank_transfer', 'momo'];
    const selectedPayment = validPayments.includes(paymentMethod) ? paymentMethod : 'cod';

    // Chuẩn hóa danh sách sản phẩm và đối chiếu với DB
    const orderItems = [];
    let subtotal = 0;

    for (const rawItem of items) {
      const qty = Math.max(1, parseInt(rawItem.quantity, 10) || 1);
      const dbProduct = rawItem.productId
        ? await Product.findOne({ id: Number(rawItem.productId) })
        : null;

      const name = dbProduct ? dbProduct.name : rawItem.name;
      const image = dbProduct ? dbProduct.image : rawItem.image;
      const price = dbProduct ? dbProduct.price : rawItem.price;
      const slug = dbProduct ? dbProduct.slug : rawItem.slug || '';
      const productId = dbProduct ? dbProduct.id : Number(rawItem.productId) || 0;
      const unitPrice = parsePriceNumber(price);
      const itemSubtotal = unitPrice * qty;

      if (!name || unitPrice <= 0) {
        return res.status(400).json({ message: 'Thông tin sản phẩm trong giỏ hàng không hợp lệ' });
      }

      orderItems.push({
        productId,
        slug,
        name,
        image: image || '',
        price: price || `${unitPrice.toLocaleString('vi-VN')}đ`,
        unitPrice,
        quantity: qty,
        subtotal: itemSubtotal,
      });

      subtotal += itemSubtotal;
    }

    const shippingFee = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
    const totalAmount = subtotal + shippingFee;

    // Tạo mã đơn hàng duy nhất
    let orderCode = generateOrderCode();
    while (await Order.exists({ orderCode })) {
      orderCode = generateOrderCode();
    }

    const order = await Order.create({
      orderCode,
      userId: req.user._id,
      items: orderItems,
      shippingInfo: {
        fullName: shippingInfo.fullName.trim(),
        phone: shippingInfo.phone.trim(),
        address: shippingInfo.address.trim(),
        note: (shippingInfo.note || '').trim(),
      },
      paymentMethod: selectedPayment,
      subtotal,
      shippingFee,
      totalAmount,
      status: 'pending',
      statusHistory: [
        {
          status: 'pending',
          label: ORDER_STATUS_LABELS.pending,
          note: DEFAULT_STATUS_NOTES.pending,
          updatedAt: new Date(),
        },
      ],
    });

    // Cập nhật số lượt bán của sản phẩm (không chặn kết quả nếu lỗi nhỏ)
    await Promise.all(
      orderItems
        .filter((i) => i.productId > 0)
        .map((i) => Product.updateOne({ id: i.productId }, { $inc: { sold: i.quantity } }))
    ).catch(() => {});

    // Lưu lại phone & address mặc định cho user nếu chưa có
    let userChanged = false;
    if (!req.user.phone && shippingInfo.phone?.trim()) {
      req.user.phone = shippingInfo.phone.trim();
      userChanged = true;
    }
    if (!req.user.address && shippingInfo.address?.trim()) {
      req.user.address = shippingInfo.address.trim();
      userChanged = true;
    }
    if (userChanged) {
      await req.user.save().catch(() => {});
    }

    res.status(201).json({
      message: 'Đặt hàng thành công!',
      order,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi tạo đơn hàng', error: error.message });
  }
};

// @desc    Lấy danh sách đơn hàng của tôi (có lọc theo trạng thái + thống kê số lượng từng trạng thái)
// @route   GET /api/orders/my
exports.getMyOrders = async (req, res) => {
  try {
    const { status } = req.query;
    const baseFilter = { userId: req.user._id };

    // Đếm số đơn theo từng trạng thái
    const allUserOrders = await Order.find(baseFilter).select('status').lean();
    const counts = {
      all: allUserOrders.length,
      pending: 0,
      confirmed: 0,
      preparing: 0,
      shipping: 0,
      delivered: 0,
      cancelled: 0,
    };
    for (const o of allUserOrders) {
      if (counts[o.status] !== undefined) {
        counts[o.status] += 1;
      }
    }

    const query = { ...baseFilter };
    if (status && status !== 'all' && ORDER_STATUSES.includes(status)) {
      query.status = status;
    }

    const orders = await Order.find(query).sort({ createdAt: -1 });
    res.json({ orders, counts });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy đơn hàng của bạn', error: error.message });
  }
};

// @desc    Xem chi tiết 1 đơn hàng của tôi
// @route   GET /api/orders/:id
exports.getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = id.match(/^[0-9a-fA-F]{24}$/) ? { _id: id } : { orderCode: id };
    const order = await Order.findOne(query);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    if (!order.userId.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền xem đơn hàng này' });
    }

    res.json(order);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy chi tiết đơn hàng', error: error.message });
  }
};

// @desc    Hủy đơn hàng (chỉ cho phép khi đang pending hoặc confirmed)
// @route   PATCH /api/orders/:id/cancel
exports.cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body || {};
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    if (!order.userId.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền hủy đơn hàng này' });
    }
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        message: 'Chỉ có thể hủy đơn hàng ở trạng thái Chờ xác nhận hoặc Đã xác nhận',
      });
    }

    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      label: ORDER_STATUS_LABELS.cancelled,
      note: reason?.trim() ? `Lý do hủy: ${reason.trim()}` : DEFAULT_STATUS_NOTES.cancelled,
      updatedAt: new Date(),
    });

    await order.save();
    res.json({ message: 'Đã hủy đơn hàng thành công', order });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi hủy đơn hàng', error: error.message });
  }
};

// @desc    Cập nhật trạng thái đơn hàng theo luồng hợp lệ
// @route   PATCH /api/orders/:id/status
exports.updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};

    if (!ORDER_STATUSES.includes(status)) {
      return res.status(400).json({ message: 'Trạng thái đơn hàng không hợp lệ' });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
    }
    if (!order.userId.equals(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Bạn không có quyền cập nhật đơn hàng này' });
    }

    const allowedNext = VALID_TRANSITIONS[order.status] || [];
    if (!allowedNext.includes(status)) {
      return res.status(400).json({
        message: `Không thể chuyển từ "${ORDER_STATUS_LABELS[order.status]}" sang "${ORDER_STATUS_LABELS[status]}"`,
      });
    }

    order.status = status;
    order.statusHistory.push({
      status,
      label: ORDER_STATUS_LABELS[status],
      note: note?.trim() || DEFAULT_STATUS_NOTES[status],
      updatedAt: new Date(),
    });

    await order.save();
    res.json({
      message: `Đã cập nhật trạng thái: ${ORDER_STATUS_LABELS[status]}`,
      order,
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi cập nhật trạng thái đơn hàng', error: error.message });
  }
};
