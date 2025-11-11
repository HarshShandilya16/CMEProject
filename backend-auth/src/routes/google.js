import express from 'express';
import { verifyIdToken } from '../firebaseAdmin.js';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

function signToken(user) {
  const payload = { id: user._id };
  const secret = process.env.JWT_SECRET || 'dev_secret';
  const opts = { expiresIn: '7d' };
  return jwt.sign(payload, secret, opts);
}

// POST /api/auth/google
// Body: { idToken: string }
router.post('/', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ error: 'Missing idToken' });

    const decoded = await verifyIdToken(idToken);
    const { email, name, picture } = decoded;
    if (!email) return res.status(400).json({ error: 'Google token missing email' });

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: name || email.split('@')[0],
        email,
        googleUser: true,
        photo: picture,
      });
    } else if (!user.googleUser || user.photo !== picture || user.name !== name) {
      user.googleUser = true;
      if (picture) user.photo = picture;
      if (name && user.name !== name) user.name = name;
      await user.save();
    }

    const token = signToken(user);
    return res.json({ token, user: user.toJSON() });
  } catch (e) {
    return res.status(401).json({ error: 'Invalid Google token' });
  }
});

export default router;
