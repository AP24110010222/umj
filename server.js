/**
 * Uma Maheshwari Jewellers - Production Node.js Backend Server
 * Architecture: Express.js + Supabase (PostgreSQL + Storage + Auth)
 * Features:
 *  - RESTful API endpoints for Products, Categories, Daily Gold Rates, Image Uploads
 *  - Supabase Auth JWT verification for mutating (admin) routes
 *  - Supabase Storage image upload with local filesystem fallback
 *  - Dual-Engine resilience: fallback to data/products.json if DB is offline
 *  - Auto-seeding: automatically populates Supabase if tables are newly created
 *  - Robust CORS & pre-flight handling
 *  - Health check endpoint (/healthz) for Render zero-downtime deployments
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// -------------------------------------------------------------
// 1. CONFIGURATION
// -------------------------------------------------------------
const PORT = process.env.PORT || 8000;
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DATA_FILE = path.join(__dirname, 'data', 'products.json');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

// Ensure local directories exist
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// -------------------------------------------------------------
// 2. SUPABASE CLIENT INITIALIZATION
// -------------------------------------------------------------
let supabase = null;
let isSupabaseConfigured = false;

if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY && !SUPABASE_SERVICE_ROLE_KEY.includes('truncated')) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    isSupabaseConfigured = true;
    console.log('✅ Supabase client initialized with Service Role credentials.');
  } catch (err) {
    console.warn('⚠️ Failed to initialize Supabase client:', err.message);
  }
} else {
  console.warn('⚠️ Supabase credentials missing or invalid in environment. Operating in local JSON fallback mode.');
}

// -------------------------------------------------------------
// 3. LOCAL DATA FALLBACK HELPERS
// -------------------------------------------------------------
function readLocalData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error reading local data file:', err.message);
  }
  return {
    categories: [],
    products: [],
    goldRates: { rate22K: 6650, rate24K: 7255, lastUpdated: new Date().toISOString().split('T')[0] }
  };
}

function writeLocalData(data) {
  try {
    const dir = path.dirname(DATA_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing local data file:', err.message);
    return false;
  }
}

// -------------------------------------------------------------
// 4. AUTO-SEED SUPABASE (If DB is connected but empty)
// -------------------------------------------------------------
async function autoSeedDatabase() {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data: existingCats, error: catErr } = await supabase.table('categories').select('id').limit(1);
    if (catErr) {
      console.log('ℹ️ Supabase tables might not exist yet. Run schema.sql in Supabase SQL Editor.');
      return;
    }

    if (!existingCats || existingCats.length === 0) {
      const seed = readLocalData();
      console.log('🌱 Empty database detected. Seeding initial categories and products into Supabase...');

      if (seed.categories && seed.categories.length > 0) {
        await supabase.table('categories').insert(seed.categories);
        console.log(`✅ Seeded ${seed.categories.length} categories.`);
      }

      if (seed.products && seed.products.length > 0) {
        const mappedProducts = seed.products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          images: p.images || [],
          weight: p.weight || null,
          purity: p.purity || '22K 916 BIS Hallmarked',
          description: p.description || '',
          featured: Boolean(p.featured),
          created_at: p.createdAt || new Date().toISOString()
        }));
        await supabase.table('products').insert(mappedProducts);
        console.log(`✅ Seeded ${mappedProducts.length} products.`);
      }

      if (seed.goldRates) {
        await supabase.table('gold_rates').upsert({
          id: 1,
          rate22k: seed.goldRates.rate22K || 6650,
          rate24k: seed.goldRates.rate24K || 7255,
          last_updated: seed.goldRates.lastUpdated || new Date().toISOString().split('T')[0]
        });
        console.log('✅ Seeded gold rates.');
      }
    }
  } catch (seedErr) {
    console.warn('Notice on auto-seed:', seedErr.message);
  }
}

// Run auto-seed asynchronously
autoSeedDatabase();

// -------------------------------------------------------------
// 5. EXPRESS APP SETUP & MIDDLEWARE
// -------------------------------------------------------------
const app = express();

// CORS Middleware
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['*'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow during transition; restrict once domains are final
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

// Body parsing with 50MB limit for high-res jewelry photos
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

// -------------------------------------------------------------
// 6. ADMIN AUTHENTICATION MIDDLEWARE
// -------------------------------------------------------------
async function verifyAdmin(req, res, next) {
  // If explicitly disabled in dev environment
  if (process.env.REQUIRE_AUTH === 'false') {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ 
      error: 'Authentication required. Please log in to the admin portal.',
      code: 'UNAUTHORIZED' 
    });
  }

  const token = authHeader.split(' ')[1];

  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { user }, error } = await supabase.auth.getUser(token);
      if (error || !user) {
        return res.status(401).json({ 
          error: 'Invalid or expired session token. Please log in again.', 
          code: 'TOKEN_INVALID' 
        });
      }
      req.adminUser = user;
      return next();
    } catch (err) {
      return res.status(401).json({ 
        error: 'Token verification failed: ' + err.message, 
        code: 'AUTH_ERROR' 
      });
    }
  }

  // Fallback: If Supabase not yet configured, allow request with a warning
  console.warn('⚠️ Admin mutating request permitted without Supabase Auth verification because SUPABASE_SERVICE_ROLE_KEY is not configured.');
  next();
}

// -------------------------------------------------------------
// 7. API ENDPOINTS
// -------------------------------------------------------------

// Health Check (For Render Zero-Downtime Probes)
app.get('/healthz', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'uma-maheshwari-jewellers-backend',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    supabaseConfigured: isSupabaseConfigured
  });
});

// ---------------- PRODUCTS ----------------
// GET /api/products
app.get('/api/products', async (req, res) => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: products, error: prodErr } = await supabase
        .table('products')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: categories, error: catErr } = await supabase
        .table('categories')
        .select('*');

      if (!prodErr && !catErr && products) {
        // Normalize createdAt for frontend compatibility
        const normalized = products.map(p => ({
          ...p,
          createdAt: p.createdAt || p.created_at
        }));
        return res.json({ products: normalized, categories: categories || [] });
      }
    } catch (err) {
      console.warn('Supabase products fetch failed, using local fallback:', err.message);
    }
  }

  const local = readLocalData();
  return res.json(local);
});

// GET /api/products/:id
app.get('/api/products/:id', async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .table('products')
        .select('*')
        .eq('id', id)
        .single();

      if (!error && data) {
        return res.json({ ...data, createdAt: data.createdAt || data.created_at });
      }
    } catch (err) {
      console.warn('Supabase single product fetch failed:', err.message);
    }
  }

  const local = readLocalData();
  const prod = (local.products || []).find(p => p.id === id);
  if (prod) return res.json(prod);

  return res.status(404).json({ error: 'Product not found' });
});

// POST /api/products (Admin)
app.post('/api/products', verifyAdmin, async (req, res) => {
  const payload = req.body;
  if (!payload.name || !payload.category) {
    return res.status(400).json({ error: 'Product name and category are required' });
  }

  const newId = payload.id || `prod-${Date.now()}`;
  const now = new Date().toISOString();
  const newProduct = {
    id: newId,
    name: payload.name.trim(),
    category: payload.category.trim(),
    images: Array.isArray(payload.images) ? payload.images : [],
    weight: payload.weight ? String(payload.weight).trim() : null,
    purity: payload.purity ? String(payload.purity).trim() : '22K 916 BIS Hallmarked',
    description: payload.description ? String(payload.description).trim() : '',
    featured: Boolean(payload.featured),
    created_at: now
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.table('products').insert([newProduct]).select().single();
      if (!error && data) {
        return res.status(201).json({
          success: true,
          product: { ...data, createdAt: data.created_at }
        });
      }
      console.warn('Supabase product insert failed:', error?.message);
    } catch (err) {
      console.warn('Supabase product insert error:', err.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  local.products = local.products || [];
  const localProduct = { ...newProduct, createdAt: now };
  local.products.unshift(localProduct);
  writeLocalData(local);

  return res.status(201).json({ success: true, product: localProduct });
});

// PUT /api/products/:id (Admin)
app.put('/api/products/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;
  const payload = req.body;

  const updates = {};
  if (payload.name !== undefined) updates.name = payload.name.trim();
  if (payload.category !== undefined) updates.category = payload.category.trim();
  if (payload.images !== undefined) updates.images = payload.images;
  if (payload.weight !== undefined) updates.weight = payload.weight ? String(payload.weight).trim() : null;
  if (payload.purity !== undefined) updates.purity = String(payload.purity).trim();
  if (payload.description !== undefined) updates.description = String(payload.description).trim();
  if (payload.featured !== undefined) updates.featured = Boolean(payload.featured);

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .table('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return res.json({
          success: true,
          product: { ...data, createdAt: data.createdAt || data.created_at }
        });
      }
    } catch (err) {
      console.warn('Supabase product update failed:', err.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  const idx = (local.products || []).findIndex(p => p.id === id);
  if (idx !== -1) {
    local.products[idx] = { ...local.products[idx], ...updates };
    writeLocalData(local);
    return res.json({ success: true, product: local.products[idx] });
  }

  return res.status(404).json({ error: 'Product not found' });
});

// DELETE /api/products/:id (Admin)
app.delete('/api/products/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.table('products').delete().eq('id', id);
      if (!error) {
        return res.json({ success: true, deletedId: id });
      }
    } catch (err) {
      console.warn('Supabase product delete failed:', err.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  const initialCount = (local.products || []).length;
  local.products = (local.products || []).filter(p => p.id !== id);
  if (local.products.length < initialCount) {
    writeLocalData(local);
    return res.json({ success: true, deletedId: id });
  }

  return res.status(404).json({ error: 'Product not found' });
});

// ---------------- CATEGORIES ----------------
// GET /api/categories
app.get('/api/categories', async (req, res) => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.table('categories').select('*');
      if (!error && data) {
        return res.json({ categories: data });
      }
    } catch (err) {
      console.warn('Supabase categories fetch failed:', err.message);
    }
  }

  const local = readLocalData();
  return res.json({ categories: local.categories || [] });
});

// POST /api/categories (Admin)
app.post('/api/categories', verifyAdmin, async (req, res) => {
  const { name, icon, description, id } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const catId = id || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const newCat = {
    id: catId,
    name: name.trim(),
    icon: icon || 'fa-gem',
    description: description || `Exclusive collection of handcrafted ${name.trim()}.`
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.table('categories').insert([newCat]).select().single();
      if (!error && data) {
        return res.status(201).json({ success: true, category: data });
      }
      if (error && error.code === '23505') {
        return res.status(400).json({ error: 'Category already exists' });
      }
    } catch (err) {
      console.warn('Supabase category insert failed:', err.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  local.categories = local.categories || [];
  if (local.categories.some(c => c.id === catId)) {
    return res.status(400).json({ error: 'Category already exists' });
  }
  local.categories.push(newCat);
  writeLocalData(local);

  return res.status(201).json({ success: true, category: newCat });
});

// DELETE /api/categories/:id (Admin)
app.delete('/api/categories/:id', verifyAdmin, async (req, res) => {
  const { id } = req.params;

  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.table('categories').delete().eq('id', id);
      if (!error) {
        return res.json({ success: true, deletedCategory: id });
      }
    } catch (err) {
      console.warn('Supabase category delete failed:', err.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  const initialCount = (local.categories || []).length;
  local.categories = (local.categories || []).filter(c => c.id !== id);
  if (local.categories.length < initialCount) {
    writeLocalData(local);
    return res.json({ success: true, deletedCategory: id });
  }

  return res.status(404).json({ error: 'Category not found' });
});

// ---------------- GOLD RATES ----------------
// GET /api/rates
app.get('/api/rates', async (req, res) => {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.table('gold_rates').select('*').limit(1).single();
      if (!error && data) {
        return res.json({
          goldRates: {
            rate22K: parseFloat(data.rate22k),
            rate24K: parseFloat(data.rate24k),
            lastUpdated: data.last_updated
          }
        });
      }
    } catch (err) {
      console.warn('Supabase rates fetch failed:', err.message);
    }
  }

  const local = readLocalData();
  return res.json({ goldRates: local.goldRates || {} });
});

// POST /api/rates (Admin)
app.post('/api/rates', verifyAdmin, async (req, res) => {
  const { rate22K, rate24K } = req.body;
  if (!rate22K || !rate24K) {
    return res.status(400).json({ error: 'Valid 22K and 24K gold rates are required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const updatedRates = {
    rate22K: parseFloat(rate22K),
    rate24K: parseFloat(rate24K),
    lastUpdated: today
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.table('gold_rates').upsert({
        id: 1,
        rate22k: updatedRates.rate22K,
        rate24k: updatedRates.rate24K,
        last_updated: today
      }).select().single();

      if (!error && data) {
        return res.json({ success: true, goldRates: updatedRates });
      }
    } catch (err) {
      console.warn('Supabase gold rates update failed:', err.message);
    }
  }

  // Local fallback
  const local = readLocalData();
  local.goldRates = updatedRates;
  writeLocalData(local);

  return res.json({ success: true, goldRates: updatedRates });
});

// ---------------- IMAGE UPLOAD (Supabase Storage + Local Fallback) ----------------
// POST /api/upload (Admin)
app.post('/api/upload', verifyAdmin, async (req, res) => {
  const { image: dataUrl, filename } = req.body;
  if (!dataUrl) {
    return res.status(400).json({ error: 'No image data provided' });
  }

  try {
    // Parse Base64 Data URL
    let ext = 'jpg';
    let mimeType = 'image/jpeg';
    let base64Data = dataUrl;

    const match = dataUrl.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
    if (match) {
      ext = match[1].toLowerCase() === 'jpeg' ? 'jpg' : match[1].toLowerCase();
      mimeType = `image/${ext}`;
      base64Data = match[2];
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const uniqueFilename = `jewel_${Date.now()}_${Math.random().toString(36).substr(2, 6)}.${ext}`;

    // 1. Try uploading to Supabase Storage bucket 'product-images'
    if (isSupabaseConfigured && supabase) {
      try {
        const bucket = supabase.storage.from('product-images');
        const { error: uploadError } = await bucket.upload(uniqueFilename, buffer, {
          contentType: mimeType,
          upsert: true
        });

        if (!uploadError) {
          const { data: urlData } = bucket.getPublicUrl(uniqueFilename);
          if (urlData && urlData.publicUrl) {
            return res.json({
              success: true,
              url: urlData.publicUrl,
              filename: uniqueFilename,
              storage: 'supabase'
            });
          }
        } else {
          console.warn('Supabase storage upload error:', uploadError.message);
        }
      } catch (storageErr) {
        console.warn('Supabase storage exception:', storageErr.message);
      }
    }

    // 2. Local filesystem fallback
    const targetPath = path.join(UPLOADS_DIR, uniqueFilename);
    fs.writeFileSync(targetPath, buffer);
    const localUrl = `/uploads/${uniqueFilename}`;

    return res.json({
      success: true,
      url: localUrl,
      filename: uniqueFilename,
      storage: 'local'
    });
  } catch (err) {
    console.error('Image processing error:', err);
    return res.status(500).json({ error: 'Failed to process and save image: ' + err.message });
  }
});

// ---------------- FULL DATABASE IMPORT/RESTORE ----------------
// POST /api/import (Admin)
app.post('/api/import', verifyAdmin, async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.products || !payload.categories) {
    return res.status(400).json({ error: 'Invalid database structure for import' });
  }

  if (isSupabaseConfigured && supabase) {
    try {
      // Clear and re-populate
      await supabase.table('products').delete().neq('id', '');
      await supabase.table('categories').delete().neq('id', '');

      if (payload.categories.length > 0) {
        await supabase.table('categories').insert(payload.categories);
      }

      if (payload.products.length > 0) {
        const mappedProducts = payload.products.map(p => ({
          id: p.id,
          name: p.name,
          category: p.category,
          images: p.images || [],
          weight: p.weight || null,
          purity: p.purity || '22K 916 BIS Hallmarked',
          description: p.description || '',
          featured: Boolean(p.featured),
          created_at: p.createdAt || p.created_at || new Date().toISOString()
        }));
        await supabase.table('products').insert(mappedProducts);
      }

      if (payload.goldRates) {
        await supabase.table('gold_rates').upsert({
          id: 1,
          rate22k: payload.goldRates.rate22K,
          rate24k: payload.goldRates.rate24K,
          last_updated: payload.goldRates.lastUpdated || new Date().toISOString().split('T')[0]
        });
      }

      return res.json({ success: true, message: 'Database successfully restored to Supabase' });
    } catch (err) {
      console.warn('Supabase full import failed, falling back to local file:', err.message);
    }
  }

  writeLocalData(payload);
  return res.json({ success: true, message: 'Database successfully restored locally' });
});

// -------------------------------------------------------------
// 8. STATIC ASSET SERVING & FALLBACK
// -------------------------------------------------------------
// Serve uploaded images locally if needed
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve root static assets (HTML, CSS, JS, Images)
app.use(express.static(__dirname));

// 404 handler for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: `API route ${req.method} ${req.url} not found` });
});

// -------------------------------------------------------------
// 9. GLOBAL ERROR HANDLER
// -------------------------------------------------------------
app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    code: 'INTERNAL_ERROR'
  });
});

// -------------------------------------------------------------
// 10. SERVER START & GRACEFUL SHUTDOWN
// -------------------------------------------------------------
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`
  ════════════════════════════════════════════════════════════════════
  👑 UMA MAHESHWARI JEWELLERS - PRODUCTION BACKEND (Node.js)
  ════════════════════════════════════════════════════════════════════
  🚀 Server Running:    http://0.0.0.0:${PORT}
  📡 Health Check:      http://0.0.0.0:${PORT}/healthz
  📦 Supabase Status:   ${isSupabaseConfigured ? 'CONNECTED' : 'LOCAL FALLBACK'}
  📁 Uploads Directory: ${UPLOADS_DIR}
  ════════════════════════════════════════════════════════════════════
  `);
});

// Graceful shutdown handlers
function handleShutdown(signal) {
  console.log(`\n🛑 Received ${signal}. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('💤 HTTP server closed. Process exiting.');
    process.exit(0);
  });
  // Force exit after 10s if stuck
  setTimeout(() => {
    console.error('⚠️ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

module.exports = app;
