const User = require('../models/User');
const { verifyToken } = require('../utils/auth');

exports.protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Vui lòng đăng nhập để tiếp tục' });
    }

    const token = authHeader.slice(7).trim();
    const decoded = verifyToken(token);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: 'Tài khoản không còn tồn tại' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Xác thực thất bại', error: error.message });
  }
};
