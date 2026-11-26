const User = require('../models/User');
const { hashPassword, verifyPassword, signToken } = require('../utils/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// @desc    Danh sách người dùng (ẩn mật khẩu) & thông tin Auth API
// @route   GET /api/auth
exports.getAuthOverview = async (_req, res) => {
  try {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json({
      message: 'BHShop Auth API đang hoạt động',
      totalUsers: users.length,
      endpoints: [
        'POST /api/auth/register',
        'POST /api/auth/login',
        'GET /api/auth/me (Bearer token)',
        'PUT /api/auth/profile (Bearer token)',
      ],
      users: users.map((u) => u.toSafeObject()),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi lấy danh sách tài khoản', error: error.message });
  }
};

// @desc    Đăng ký tài khoản mới
// @route   POST /api/auth/register
exports.register = async (req, res) => {
  try {
    const { fullName, email, password, phone = '', address = '' } = req.body || {};

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ message: 'Vui lòng nhập họ và tên' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ message: 'Email không hợp lệ' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ message: 'Mật khẩu phải có ít nhất 6 ký tự' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ message: 'Email này đã được đăng ký' });
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      address: address.trim(),
      passwordHash: hashPassword(password),
    });

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });

    res.status(201).json({
      message: 'Đăng ký tài khoản thành công',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đăng ký', error: error.message });
  }
};

// @desc    Đăng nhập tài khoản
// @route   POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Vui lòng nhập đầy đủ email và mật khẩu' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ message: 'Email hoặc mật khẩu không chính xác' });
    }

    const token = signToken({ id: user._id.toString(), email: user.email, role: user.role });

    res.json({
      message: 'Đăng nhập thành công',
      token,
      user: user.toSafeObject(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server khi đăng nhập', error: error.message });
  }
};

// @desc    Lấy thông tin người dùng hiện tại
// @route   GET /api/auth/me
exports.getMe = async (req, res) => {
  res.json({ user: req.user.toSafeObject() });
};

// @desc    Cập nhật thông tin cá nhân
// @route   PUT /api/auth/profile
exports.updateProfile = async (req, res) => {
  try {
    const { fullName, phone, address } = req.body || {};

    if (fullName !== undefined && fullName.trim()) {
      req.user.fullName = fullName.trim();
    }
    if (phone !== undefined) {
      req.user.phone = phone.trim();
    }
    if (address !== undefined) {
      req.user.address = address.trim();
    }

    await req.user.save();
    res.json({
      message: 'Cập nhật thông tin thành công',
      user: req.user.toSafeObject(),
    });
  } catch (error) {
    res.status(500).json({ message: 'Lỗi cập nhật thông tin', error: error.message });
  }
};
