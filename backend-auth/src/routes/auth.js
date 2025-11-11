import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

function signToken(user) {
  const payload = { id: user._id };
  const secret = process.env.JWT_SECRET || 'dev_secret';
  const opts = { expiresIn: '7d' };
  return jwt.sign(payload, secret, opts);
}

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email already in use' });

    const user = await User.create({ name, email, password });
    const token = signToken(user);
    return res.status(201).json({ token, user: user.toJSON() });
  } catch (e) {
    return res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signToken(user);
    return res.json({ token, user: user.toJSON() });
  } catch (e) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
