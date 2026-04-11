import express from 'express';
import { supabase } from '../utils/db.js';
import { hashPassword, comparePassword, generateToken } from '../utils/auth.js';

const router = express.Router();

router.post('/signup', async (req, res) => {
  try {
    const { name, email, phone, password, role, state } = req.body;
    console.log(email)
    if (!name || !email || !phone || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (role === 'government' && !state) {
      return res.status(400).json({ error: 'State is required for government users' });
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await hashPassword(password);

    const { data: newUser, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email,
          phone,
          password: hashedPassword,
          role,
          state: role === 'government' ? state : null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;

    const token = generateToken(newUser.id, newUser.role);

    res.status(201).json({
      message: 'Signup successful',
      token,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        state: newUser.state,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Signup failed' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log(password)
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isPasswordValid = await comparePassword(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user.id, user.role);
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        state: user.state,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

export default router;
