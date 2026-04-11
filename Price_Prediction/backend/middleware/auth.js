import { verifyToken } from '../utils/auth.js';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  req.userId = decoded.userId;
  req.role = decoded.role;
  next();
};

export const authorizeFarmer = (req, res, next) => {
  if (req.role !== 'farmer') {
    return res.status(403).json({ error: 'Farmer access required' });
  }
  next();
};

export const authorizeGovernment = (req, res, next) => {
  if (req.role !== 'government') {
    return res.status(403).json({ error: 'Government access required' });
  }
  next();
};
