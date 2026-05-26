import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// 🔐 LOGIN
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });

  } catch (error) {
    return res.status(500).json({ message: 'Server error while logging in' });
  }
};

// 👤 GET CURRENT USER
export const me = async (req, res) => {
  res.json(req.user);
};

// 🔄 UPDATE CREDENTIALS (FINAL FIXED)
export const updateCredentials = async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // ✅ Update name/email (NO PASSWORD REQUIRED)
    if (name) user.name = name;
    if (email) user.email = email;

    // 🔐 If user wants to change password
    if (newPassword || confirmPassword) {

      if (!currentPassword) {
        return res.status(400).json({ message: 'Current password is required' });
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }

      user.password = newPassword; // will hash via model
    }

    await user.save();

    return res.json({
      message: 'Credentials updated successfully',
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    return res.status(500).json({ message: 'Server error while updating credentials' });
  }
};