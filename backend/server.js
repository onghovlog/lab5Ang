require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const Product = require('./models/Product');
const Category = require('./models/Category');
const User = require('./models/User');
const Order = require('./models/Order');
const { ORDER_STATUS_LABELS } = require('./models/Order');
const { hashPassword } = require('./utils/auth');
const initialProducts = require('./data/initialProducts');
const initialCategories = require('./data/initialCategories');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Auto seed categories & products if database is empty or needs update
const autoSeedIfEmpty = async () => {
  try {
    // 1. Seed Categories if empty
    const categoryCount = await Category.countDocuments();
    if (categoryCount === 0) {
      console.log('[Seed] Categories collection is empty. Seeding categories...');
      await Category.insertMany(initialCategories);
      console.log(`[Seed] Seeded ${initialCategories.length} categories successfully!`);
    } else {
      console.log(`[Database] Found ${categoryCount} existing categories in database.`);
    }

    // 2. Check if products have slug and categoryId, if not or empty, re-seed
    const productCount = await Product.countDocuments();
    const productWithoutSlug = await Product.findOne({ slug: { $exists: false } });

    if (productCount === 0 || productWithoutSlug) {
      console.log('[Seed] Seeding products with slug and categoryId...');
      await Product.deleteMany({});
      await Product.insertMany(initialProducts);
      console.log(`[Seed] Seeded ${initialProducts.length} products with slug and categoryId successfully!`);
    } else {
      console.log(`[Database] Found ${productCount} existing products in database.`);
    }

    // 3. Seed demo customer account if users collection is empty
    let demoUser = await User.findOne({ email: 'khachhang@bhshop.vn' });
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      console.log('[Seed] Users collection is empty. Seeding demo customer account...');
      demoUser = await User.create({
        fullName: 'Nguyễn Ngọc Anh',
        email: 'khachhang@bhshop.vn',
        phone: '0909 123 456',
        address: '123 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
        passwordHash: hashPassword('123456'),
        role: 'customer',
      });
      console.log('[Seed] Seeded demo user: khachhang@bhshop.vn / 123456');
    } else {
      console.log(`[Database] Found ${userCount} existing users in database.`);
    }

    // 4. Seed sample orders if orders collection is empty
    const orderCount = await Order.countDocuments();
    if (orderCount === 0 && demoUser) {
      console.log('[Seed] Orders collection is empty. Seeding sample orders...');
      const sampleProducts = await Product.find().sort({ id: 1 }).limit(3);
      const p1 = sampleProducts[0] || initialProducts[0];
      const p2 = sampleProducts[1] || initialProducts[1];
      const p3 = sampleProducts[2] || initialProducts[2];
      const parseVnd = (s) => parseInt(String(s || '0').replace(/[^\d]/g, ''), 10) || 350000;
      const now = Date.now();
      const hour = 3600 * 1000;

      const u1 = parseVnd(p1.price);
      const u2 = parseVnd(p2.price);
      const u3 = parseVnd(p3.price);

      const sampleOrders = [
        {
          orderCode: 'BH20261126-1001',
          userId: demoUser._id,
          items: [
            {
              productId: p1.id,
              slug: p1.slug,
              name: p1.name,
              image: p1.image,
              price: p1.price,
              unitPrice: u1,
              quantity: 1,
              subtotal: u1,
            },
          ],
          shippingInfo: {
            fullName: demoUser.fullName,
            phone: demoUser.phone,
            address: demoUser.address,
            note: 'Chúc mừng sinh nhật thật vui vẻ!',
          },
          paymentMethod: 'cod',
          subtotal: u1,
          shippingFee: u1 >= 300000 ? 0 : 25000,
          totalAmount: u1 + (u1 >= 300000 ? 0 : 25000),
          status: 'pending',
          statusHistory: [
            {
              status: 'pending',
              label: ORDER_STATUS_LABELS.pending,
              note: 'Đơn hàng đã được tạo và đang chờ cửa hàng xác nhận',
              updatedAt: new Date(now - 1 * hour),
            },
          ],
        },
        {
          orderCode: 'BH20261125-1002',
          userId: demoUser._id,
          items: [
            {
              productId: p2.id,
              slug: p2.slug,
              name: p2.name,
              image: p2.image,
              price: p2.price,
              unitPrice: u2,
              quantity: 2,
              subtotal: u2 * 2,
            },
          ],
          shippingInfo: {
            fullName: demoUser.fullName,
            phone: demoUser.phone,
            address: demoUser.address,
            note: 'Giao giờ hành chính giúp mình',
          },
          paymentMethod: 'momo',
          subtotal: u2 * 2,
          shippingFee: 0,
          totalAmount: u2 * 2,
          status: 'shipping',
          statusHistory: [
            {
              status: 'pending',
              label: ORDER_STATUS_LABELS.pending,
              note: 'Đơn hàng đã được tạo và đang chờ cửa hàng xác nhận',
              updatedAt: new Date(now - 12 * hour),
            },
            {
              status: 'confirmed',
              label: ORDER_STATUS_LABELS.confirmed,
              note: 'Cửa hàng đã xác nhận đơn hàng của bạn',
              updatedAt: new Date(now - 10 * hour),
            },
            {
              status: 'preparing',
              label: ORDER_STATUS_LABELS.preparing,
              note: 'Nghệ nhân đang chọn hoa tươi và bó hoa cẩn thận',
              updatedAt: new Date(now - 6 * hour),
            },
            {
              status: 'shipping',
              label: ORDER_STATUS_LABELS.shipping,
              note: 'Shipper đã nhận hoa và đang trên đường giao tới bạn',
              updatedAt: new Date(now - 2 * hour),
            },
          ],
        },
        {
          orderCode: 'BH20261124-1003',
          userId: demoUser._id,
          items: [
            {
              productId: p3.id,
              slug: p3.slug,
              name: p3.name,
              image: p3.image,
              price: p3.price,
              unitPrice: u3,
              quantity: 1,
              subtotal: u3,
            },
          ],
          shippingInfo: {
            fullName: demoUser.fullName,
            phone: demoUser.phone,
            address: demoUser.address,
            note: 'Kèm thiệp cảm ơn',
          },
          paymentMethod: 'bank_transfer',
          subtotal: u3,
          shippingFee: u3 >= 300000 ? 0 : 25000,
          totalAmount: u3 + (u3 >= 300000 ? 0 : 25000),
          status: 'delivered',
          statusHistory: [
            {
              status: 'pending',
              label: ORDER_STATUS_LABELS.pending,
              note: 'Đơn hàng đã được tạo và đang chờ cửa hàng xác nhận',
              updatedAt: new Date(now - 48 * hour),
            },
            {
              status: 'confirmed',
              label: ORDER_STATUS_LABELS.confirmed,
              note: 'Cửa hàng đã xác nhận đơn hàng của bạn',
              updatedAt: new Date(now - 46 * hour),
            },
            {
              status: 'preparing',
              label: ORDER_STATUS_LABELS.preparing,
              note: 'Nghệ nhân đang chọn hoa tươi và bó hoa cẩn thận',
              updatedAt: new Date(now - 42 * hour),
            },
            {
              status: 'shipping',
              label: ORDER_STATUS_LABELS.shipping,
              note: 'Shipper đã nhận hoa và đang trên đường giao tới bạn',
              updatedAt: new Date(now - 38 * hour),
            },
            {
              status: 'delivered',
              label: ORDER_STATUS_LABELS.delivered,
              note: 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã mua sắm tại BHShop!',
              updatedAt: new Date(now - 36 * hour),
            },
          ],
        },
      ];

      await Order.insertMany(sampleOrders);
      console.log(`[Seed] Seeded ${sampleOrders.length} sample orders successfully!`);
    } else {
      console.log(`[Database] Found ${orderCount} existing orders in database.`);
    }
  } catch (error) {
    console.error('[Seed] Error auto seeding database:', error.message);
  }
};

// Start Server after connecting to MongoDB
connectDB().then(async () => {
  await autoSeedIfEmpty();
  app.listen(PORT, () => {
    console.log(`[Server] Backend running at http://localhost:${PORT}`);
    console.log(`[API] Products: http://localhost:${PORT}/api/products`);
    console.log(`[API] Categories: http://localhost:${PORT}/api/categories`);
    console.log(`[API] Auth: http://localhost:${PORT}/api/auth`);
    console.log(`[API] Orders: http://localhost:${PORT}/api/orders`);
  });
});
