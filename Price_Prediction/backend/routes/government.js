import express from 'express';
import { supabase } from '../utils/db.js';
import { authenticateToken, authorizeGovernment } from '../middleware/auth.js';
import XLSX from 'xlsx';
import { appendToExcel } from '../utils/excelwriter.js';
const router = express.Router();

router.use(authenticateToken, authorizeGovernment);

router.post('/msp', async (req, res) => {
  try {
    const { commodity, price, year } = req.body;

    if (!commodity || !price || !year) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('msp')
      .insert([{ commodity, price, year, created_by: req.userId }])
      .select()
      .single();

    if (error) throw error;
    appendToExcel("msp_data", "MSP", data);
    res.status(201).json({ message: 'MSP added successfully', data });
  } catch (error) {
    console.error('Error adding MSP:', error);
    res.status(500).json({ error: 'Failed to add MSP' });
  }
});

router.put('/msp/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { commodity, price, year } = req.body;

    const { data, error } = await supabase
      .from('msp')
      .update({ commodity, price, year })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'MSP updated successfully', data });
  } catch (error) {
    console.error('Error updating MSP:', error);
    res.status(500).json({ error: 'Failed to update MSP' });
  }
});

router.delete('/msp/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('msp').delete().eq('id', id);

    if (error) throw error;

    res.json({ message: 'MSP deleted successfully' });
  } catch (error) {
    console.error('Error deleting MSP:', error);
    res.status(500).json({ error: 'Failed to delete MSP' });
  }
});

router.post('/cold-storage', async (req, res) => {
  try {
    const { date, state, fci_owned, private_owned, total_units, storage_capacity } = req.body;

    if (!date || !state || total_units === undefined || !storage_capacity) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('cold_storage')
      .insert([
        {
          date,
          state,
          fci_owned: fci_owned || 0,
          private_owned: private_owned || 0,
          total_units,
          storage_capacity,
          created_by: req.userId,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    appendToExcel("cold_storage", "ColdStorage", data);

    res.status(201).json({ message: 'Cold storage data added successfully', data });
  } catch (error) {
    console.error('Error adding cold storage:', error);
    res.status(500).json({ error: 'Failed to add cold storage data' });
  }
});

router.put('/cold-storage/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, state, fci_owned, private_owned, total_units, storage_capacity } = req.body;

    const { data, error } = await supabase
      .from('cold_storage')
      .update({ date, state, fci_owned, private_owned, total_units, storage_capacity })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Cold storage data updated successfully', data });
  } catch (error) {
    console.error('Error updating cold storage:', error);
    res.status(500).json({ error: 'Failed to update cold storage data' });
  }
});

router.delete('/cold-storage/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('cold_storage').delete().eq('id', id);

    if (error) throw error;

    res.json({ message: 'Cold storage data deleted successfully' });
  } catch (error) {
    console.error('Error deleting cold storage:', error);
    res.status(500).json({ error: 'Failed to delete cold storage data' });
  }
});

router.post('/fuel-prices', async (req, res) => {
  try {
    const { date, cng, petrol, diesel } = req.body;

    if (!date || cng === undefined || petrol === undefined || diesel === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('fuel_prices')
      .insert([{ date, cng, petrol, diesel, created_by: req.userId }])
      .select()
      .single();

    if (error) throw error;
    appendToExcel("fuel_prices", "FuelPrices", data);
    res.status(201).json({ message: 'Fuel price added successfully', data });
  } catch (error) {
    console.error('Error adding fuel price:', error);
    res.status(500).json({ error: 'Failed to add fuel price' });
  }
});

router.put('/fuel-prices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, cng, petrol, diesel } = req.body;

    const { data, error } = await supabase
      .from('fuel_prices')
      .update({ date, cng, petrol, diesel })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Fuel price updated successfully', data });
  } catch (error) {
    console.error('Error updating fuel price:', error);
    res.status(500).json({ error: 'Failed to update fuel price' });
  }
});

router.delete('/fuel-prices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('fuel_prices').delete().eq('id', id);

    if (error) throw error;

    res.json({ message: 'Fuel price deleted successfully' });
  } catch (error) {
    console.error('Error deleting fuel price:', error);
    res.status(500).json({ error: 'Failed to delete fuel price' });
  }
});

router.post('/market-prices', async (req, res) => {
  try {
    const { commodity, state, date, price_per_quintal } = req.body;

    if (!commodity || !state || !date || price_per_quintal === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { data, error } = await supabase
      .from('market_prices')
      .insert([{ commodity, state, date, price_per_quintal, created_by: req.userId }])
      .select()
      .single();

    if (error) throw error;
    appendToExcel("market_prices", "MarketPrices", data);
    res.status(201).json({ message: 'Market price added successfully', data });
  } catch (error) {
    console.error('Error adding market price:', error);
    res.status(500).json({ error: 'Failed to add market price' });
  }
});

router.put('/market-prices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { commodity, state, date, price_per_quintal } = req.body;

    const { data, error } = await supabase
      .from('market_prices')
      .update({ commodity, state, date, price_per_quintal })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    res.json({ message: 'Market price updated successfully', data });
  } catch (error) {
    console.error('Error updating market price:', error);
    res.status(500).json({ error: 'Failed to update market price' });
  }
});

router.delete('/market-prices/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase.from('market_prices').delete().eq('id', id);

    if (error) throw error;

    res.json({ message: 'Market price deleted successfully' });
  } catch (error) {
    console.error('Error deleting market price:', error);
    res.status(500).json({ error: 'Failed to delete market price' });
  }
});

router.get('/export/msp', async (req, res) => {
  try {
    const { data: mspData, error } = await supabase
      .from('msp')
      .select('*')
      .order('year', { ascending: false });

    if (error) throw error;

    const workbook = ExcelJS.utils.book_new();
    const worksheet = ExcelJS.utils.json_to_sheet(mspData);
    ExcelJS.utils.book_append_sheet(workbook, worksheet, 'MSP');

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=MSP_Data.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting MSP:', error);
    res.status(500).json({ error: 'Failed to export MSP' });
  }
});

export default router;
