# 👑 Uma Maheshwari Jewellers — Luxury Showroom Website

> **Where Tradition Meets Timeless Elegance**  
> 📍 Gandhi Chowk, Sattenapalli - 522403  
> 📞 9966991008  
> ✉️ [umj.gold@gmail.com](mailto:umj.gold@gmail.com)

A modern, premium, and elegant jewellery showroom web application designed specifically for **Uma Maheshwari Jewellers**. Built with a deep obsidian black and metallic gold luxury aesthetic, instant WhatsApp enquiry integration, real-time search & category filtering, and an intuitive **Admin Product Management Portal** that allows the showroom owner to easily upload jewellery photographs, manage products, create categories, and update daily gold rates without writing code.

---

## 🌟 Key Features

### 1. Showroom Experience (`index.html`)
- **Luxury Aesthetic**: Deep obsidian backgrounds (`#070709`), metallic gold gradients (`#D4AF37`), subtle gold dust particle animations, and royal serif typography (`Cinzel` & `Playfair Display`).
- **Live Showroom Gold Rate Ticker**: Real-time display of 22K (916) and 24K gold rates per gram with live status indicator.
- **Sticky Navigation**: Responsive navbar with gold monogram emblem, fast navigation, mobile hamburger drawer, and direct owner admin access.
- **Curated Featured Collections**:
  1. Chains
  2. Rings
  3. Bracelets
  4. Necklaces
  5. Earrings
  6. Bangles
  7. Pendants
  8. Bridal Jewellery
  *(Plus support for custom categories created in Admin!)*
- **Product Gallery & Search (Pure Showroom Catalogue)**:
  - Live instant search filter by name, category, or purity.
  - Sorting by Newest and Net Weight (Low to High / High to Low).
  - Purity badge (`22K 916 BIS Hallmarked`).
  - Net weight display (`e.g. 24.50 gms`).
  - **No online pricing or online booking**: Customers contact the showroom directly for in-person viewing, weight calculations, and custom orders based on daily gold rates.
  - Quick **"Enquire Now"** button opening direct WhatsApp chat with pre-filled enquiry.
- **Detailed Product Modal**:
  - High-resolution photograph viewer with multi-image thumbnail switcher.
  - Complete specifications (Gold Purity, Net Weight, Category / Type, Showroom Location).
  - **"Enquire on WhatsApp"** button pre-filled with:
    `Hello Uma Maheshwari Jewellers, I am interested in [PRODUCT NAME]. (Weight: [WEIGHT]) Please provide more details and availability.`
    Directly connected to phone: **9966991008**.
  - One-click **"Call Showroom"** link (`tel:9966991008`).
  - Share link button.
- **About Uma Maheshwari Jewellers**:
  - Authentic showroom heritage focused on trust, 100% 916 hallmarked purity, and craftsmanship at Gandhi Chowk, Sattenapalli.
- **Why Choose Us**:
  - 4 core showroom pillars: Quality Jewellery, Elegant Designs, Customer-Focused Service, Traditional & Contemporary Collections.
- **Contact & Showroom Location**:
  - Gandhi Chowk, Sattenapalli - 522403.
  - Call Now (`9966991008`), WhatsApp, and Email buttons.
  - Embedded Google Map centered on Gandhi Chowk, Sattenapalli.
  - Showroom visiting hours (10:00 AM – 9:00 PM).
  - Customer enquiry form with direct WhatsApp forwarding.
- **Mobile Responsive & Floating Action Bar**:
  - 100% mobile-first design with 1–2 cards per row.
  - Sticky bottom action bar with quick "Call Showroom" and "WhatsApp Us" buttons on mobile screens.

---

### 2. Admin & Product Management Portal (`admin.html`)
- **No Code Editing Required**: The showroom owner can add, edit, or delete items right from their browser.
- **Photo Upload**:
  - Drag-and-drop or click to browse jewellery photographs.
  - Supports multiple photographs per item.
  - Automatic thumbnail preview and remove controls.
  - Option to add images by web URL.
- **Product Details**:
  - Category selector (Chains, Rings, Necklaces, Bridal, etc.).
  - Gold Karat / Purity selector (22K 916 BIS, 18K, 24K 999, Antique Temple Gold).
  - Product Name.
  - Optional Net Weight (e.g. `24.50 gms`).
  - Description.
  - Homepage Featured toggle.
- **Edit & Delete**:
  - Edit existing products, update weights, change photos, or move products between categories.
  - Delete items with confirmation protection.
- **Dynamic Category Manager**:
  - Create new showroom categories (e.g., *Mangalsutras*, *Temple Jewellery*, *Diamond Collection*).
  - Automatically updates filters on both the website and admin portal.
- **Daily Gold Rate Manager**:
  - Easily update today's 22K and 24K gold rates per gram.
- **Backup & Restore**:
  - 1-click **Download Inventory Backup (JSON)**.
  - Restore previous backups anytime to prevent data loss.

---

## 🚀 How to Run the Website

### Option 1: Using the Python Backend (Recommended)
```bash
cd /Users/akhil/Downloads/umj
python3 server.py
```

Then open your browser to:
- **Customer Showroom**: [http://localhost:8000/index.html](http://localhost:8000/index.html)
- **Owner Admin Portal**: [http://localhost:8000/admin.html](http://localhost:8000/admin.html)

### Option 2: Static Hosting / Direct Browser Opening
The website features a **Dual-Engine Persistence system**:
If opened without the Python backend (e.g., deployed to GitHub Pages, Netlify, Vercel, or opened directly), it uses browser `localStorage` and `IndexedDB` with the built-in seed catalogue from `data/products.json`. All admin edits, new products, and gold rates will persist seamlessly!

---

## 📁 Project Structure

```
umj/
├── index.html              # Customer Showroom Website
├── admin.html              # Owner Admin & Product Management Portal
├── server.py               # Lightweight Python 3 API & static file server
├── README.md               # Showroom documentation and guides
├── css/
│   ├── style.css           # Luxury dark & gold aesthetic design system
│   ├── admin.css           # Admin dashboard UI styling
│   └── responsive.css      # Mobile-first adaptive layout styles
├── js/
│   ├── app.js              # Customer showroom UI, filters, modal & WhatsApp links
│   ├── admin.js            # Admin CRUD, photo uploader & category manager
│   ├── store.js            # Dual-sync data layer (API + LocalStorage fallback)
│   └── particles.js        # Shimmering ambient gold dust particles
├── data/
│   └── products.json       # Seed inventory database (8 categories & products)
└── uploads/                # Directory for uploaded product images
```

---

## 💎 Showroom Contact Reference
- **Business Name**: UMA MAHESHWARI JEWELLERS
- **Address**: Gandhi Chowk, Sattenapalli - 522403
- **Phone**: 9966991008
- **WhatsApp**: +91 9966991008
- **Email**: umj.gold@gmail.com
