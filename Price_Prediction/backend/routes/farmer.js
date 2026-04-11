import express from 'express';
import { supabase } from '../utils/db.js';
import { authenticateToken, authorizeFarmer } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticateToken);

router.get('/msp', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('msp')
      .select('*')
      .order('year', { ascending: false });

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching MSP:', error);
    res.status(500).json({ error: 'Failed to fetch MSP' });
  }
});

router.get('/market-prices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('market_prices')
      .select('*')
      .order('date', { ascending: false })
      .limit(100);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({ error: 'Failed to fetch market prices' });
  }
});

router.get('/cold-storage', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('cold_storage')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching cold storage data:', error);
    res.status(500).json({ error: 'Failed to fetch cold storage data' });
  }
});

router.get('/fuel-prices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fuel_prices')
      .select('*')
      .order('date', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json(data);
  } catch (error) {
    console.error('Error fetching fuel prices:', error);
    res.status(500).json({ error: 'Failed to fetch fuel prices' });
  }
});

router.post('/predict', async (req, res) => {
  try {
    const { commodity, state, historicalPrices } = req.body;

    if (!commodity || !state || !historicalPrices) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    res.json({
      commodity,
      state,
      predictedPrice: 0,
      confidence: 0,
      message: 'ML model integration pending',
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ error: 'Prediction failed' });
  }
});

export default router;
