/**
 * Uma Maheshwari Jewellers - Customer Application Script
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize Store
  await Store.init();

  // Initialize Particles
  if (typeof initGoldParticles === "function") {
    initGoldParticles("hero-particles");
  }

  // App State
  let activeModalCategory = "all";
  let modalSearchQuery = "";

  // Elements
  const header = document.querySelector(".site-header");
  const mobileToggle = document.querySelector(".mobile-toggle");
  const navMenu = document.querySelector(".nav-menu");
  const navLinks = document.querySelectorAll(".nav-link");
  const collectionsFeaturedGrid = document.getElementById("featured-collections-grid");
  
  // Modals
  const categoryModal = document.getElementById("category-gallery-modal");
  const catModalCloseBtn = document.getElementById("cat-modal-close-btn");
  const catModalTitle = document.getElementById("cat-modal-title");
  const catModalDesc = document.getElementById("cat-modal-desc");
  const modalSearchInput = document.getElementById("modal-search-input");
  const categoryModalGrid = document.getElementById("category-modal-grid");

  const productModal = document.getElementById("product-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const goldRateTicker22K = document.getElementById("rate-22k");
  const goldRateTicker24K = document.getElementById("rate-24k");

  // Generate WhatsApp Link
  function getWhatsAppUrl(productName = "", productWeight = "") {
    const phone = "919966991008";
    let text = `Hello Uma Maheshwari Jewellers, I am interested in ${productName || "your jewellery collection"}.`;
    if (productWeight) {
      text += ` (Weight: ${productWeight})`;
    }
    text += " Please provide more details and availability.";
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  // Show Toast
  function showToast(message, icon = "fa-check-circle") {
    let toast = document.querySelector(".toast-notice");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notice";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:var(--gold-primary)"></i> <span>${message}</span>`;
    toast.classList.add("show");
    setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  }

  // 1. Render Gold Rates
  function renderGoldRates() {
    const rates = Store.getGoldRates();
    if (goldRateTicker22K) goldRateTicker22K.textContent = `₹${rates.rate22K.toLocaleString("en-IN")}/g`;
    if (goldRateTicker24K) goldRateTicker24K.textContent = `₹${rates.rate24K.toLocaleString("en-IN")}/g`;
  }
  renderGoldRates();

  // 2. Header Scroll Effect
  window.addEventListener("scroll", () => {
    if (window.scrollY > 40) {
      header.classList.add("scrolled");
    } else {
      header.classList.remove("scrolled");
    }
  });

  // Mobile Menu Toggle
  if (mobileToggle && navMenu) {
    mobileToggle.addEventListener("click", () => {
      mobileToggle.classList.toggle("active");
      navMenu.classList.toggle("active");
    });

    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        mobileToggle.classList.remove("active");
        navMenu.classList.remove("active");
      });
    });
  }

  // 3. Render Featured Collections on Homepage
  function renderFeaturedCategories() {
    if (!collectionsFeaturedGrid) return;
    const categories = Store.getCategories();
    const allProducts = Store.getProducts("all");

    const categoryBanners = {
      "chains": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
      "rings": "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=600&q=80",
      "bracelets": "https://images.unsplash.com/photo-1611591475155-4284fa2c2e7f?auto=format&fit=crop&w=600&q=80",
      "necklaces": "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=600&q=80",
      "earrings": "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=600&q=80",
      "bangles": "https://images.unsplash.com/photo-1599643477877-530eb83abc8e?auto=format&fit=crop&w=600&q=80",
      "pendants": "https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=600&q=80",
      "bridal-jewellery": "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80"
    };

    collectionsFeaturedGrid.innerHTML = categories.map(cat => {
      const count = allProducts.filter(p => p.category === cat.id).length;
      let imgUrl = categoryBanners[cat.id];
      if (!imgUrl) {
        const prod = allProducts.find(p => p.category === cat.id && p.images && p.images.length > 0);
        imgUrl = prod ? prod.images[0] : "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80";
      }

      return `
        <div class="collection-card" data-cat-id="${cat.id}" role="button" tabindex="0">
          <div class="collection-img-wrap">
            <img src="${imgUrl}" alt="${cat.name}" class="collection-img" loading="lazy" />
          </div>
          <div class="collection-overlay"></div>
          <div class="collection-info">
            <span class="collection-badge"><i class="fa-solid fa-gem"></i> Collection</span>
            <h3 class="collection-name">${cat.name}</h3>
            <p class="collection-count">${count} ${count === 1 ? 'Design' : 'Designs'} &bull; Tap to View</p>
          </div>
        </div>
      `;
    }).join("");

    // Clicking a category opens its dedicated gallery
    collectionsFeaturedGrid.querySelectorAll(".collection-card").forEach(card => {
      card.addEventListener("click", () => {
        const catId = card.getAttribute("data-cat-id");
        openCategoryGallery(catId);
      });
      card.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          const catId = card.getAttribute("data-cat-id");
          openCategoryGallery(catId);
        }
      });
    });
  }

  // 4. Open Category Product Gallery Modal
  window.openCategoryGallery = function(catId) {
    if (!categoryModal) return;
    activeModalCategory = catId;
    modalSearchQuery = "";
    if (modalSearchInput) modalSearchInput.value = "";

    const cat = Store.getCategoryById(catId);
    if (cat) {
      if (catModalTitle) catModalTitle.textContent = `${cat.name} Collection`;
      if (catModalDesc) catModalDesc.textContent = cat.description || `Explore our masterfully handcrafted ${cat.name} in 22K 916 hallmarked pure gold.`;
    } else {
      if (catModalTitle) catModalTitle.textContent = "Showroom Collection";
      if (catModalDesc) catModalDesc.textContent = "Explore our certified 22K 916 hallmarked pure gold jewellery.";
    }

    renderCategoryModalProducts();
    categoryModal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  function renderCategoryModalProducts() {
    if (!categoryModalGrid) return;
    let products = Store.getProducts(activeModalCategory, modalSearchQuery);

    if (products.length === 0) {
      categoryModalGrid.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-gem"></i>
          <h3 style="margin-bottom:8px; font-family:var(--font-serif)">No designs found</h3>
          <p style="color:var(--text-muted); font-size:0.92rem; margin-bottom: 20px;">We currently do not have designs matching this search in this category. Visit our showroom at Gandhi Chowk, Sattenapalli or connect with us on WhatsApp.</p>
          <a href="https://wa.me/919966991008?text=Hello%20Uma%20Maheshwari%20Jewellers,%20I%20am%20looking%20for%20custom%20jewellery%20designs." target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm">
            <i class="fa-brands fa-whatsapp"></i> Enquire on WhatsApp
          </a>
        </div>
      `;
      return;
    }

    categoryModalGrid.innerHTML = products.map(prod => {
      const cat = Store.getCategoryById(prod.category);
      const catName = cat ? cat.name : prod.category;
      const mainImg = (prod.images && prod.images.length > 0) ? prod.images[0] : "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=600&q=80";
      const waLink = getWhatsAppUrl(prod.name, prod.weight);

      const weightDisplay = prod.weight 
        ? `<span class="product-weight"><i class="fa-solid fa-weight-hanging" style="color:var(--gold-primary);font-size:0.8rem"></i> ${prod.weight}</span>`
        : `<span class="product-weight" style="color:var(--text-dim);"><i class="fa-solid fa-scale-balanced" style="color:var(--gold-primary);font-size:0.78rem"></i> Weight on enquiry</span>`;

      return `
        <div class="product-card" data-prod-id="${prod.id}">
          <div class="product-image-container" onclick="openProductModal('${prod.id}')">
            <span class="badge-purity">${prod.purity || '22K 916 BIS'}</span>
            ${prod.featured ? '<span class="badge-featured">Featured</span>' : ''}
            <img src="${mainImg}" alt="${prod.name}" class="product-image" loading="lazy" />
          </div>
          <div class="product-details">
            <span class="product-category-name">${catName}</span>
            <h3 class="product-title" onclick="openProductModal('${prod.id}')">${prod.name}</h3>
            <div class="product-meta">
              ${weightDisplay}
              <span style="font-size:0.78rem; color:var(--gold-champagne); font-weight:500;">
                <i class="fa-solid fa-gem" style="font-size:0.7rem; margin-right:4px;"></i> Showroom Piece
              </span>
            </div>
            ${prod.description ? `<p class="product-desc-snippet">${prod.description}</p>` : ''}
            <div class="product-card-actions">
              <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-whatsapp btn-sm" title="Enquire on WhatsApp">
                <i class="fa-brands fa-whatsapp"></i> Enquire Now
              </a>
              <button class="btn btn-outline btn-sm" onclick="openProductModal('${prod.id}')" title="View Full Details">
                <i class="fa-solid fa-eye"></i> Details
              </button>
            </div>
          </div>
        </div>
      `;
    }).join("");
  }

  // Live Search in Modal
  if (modalSearchInput) {
    modalSearchInput.addEventListener("input", (e) => {
      modalSearchQuery = e.target.value;
      renderCategoryModalProducts();
    });
  }

  // Close Category Gallery Modal
  window.closeCategoryGallery = function() {
    if (categoryModal) {
      categoryModal.classList.remove("active");
      if (!productModal || !productModal.classList.contains("active")) {
        document.body.style.overflow = "";
      }
    }
  };

  if (catModalCloseBtn) {
    catModalCloseBtn.addEventListener("click", closeCategoryGallery);
  }

  if (categoryModal) {
    categoryModal.addEventListener("click", (e) => {
      if (e.target === categoryModal) {
        closeCategoryGallery();
      }
    });
  }

  // 5. Product Detail Modal
  window.openProductModal = function(id) {
    const prod = Store.getProductById(id);
    if (!prod || !productModal) return;

    const cat = Store.getCategoryById(prod.category);
    const catName = cat ? cat.name : prod.category;
    const images = (prod.images && prod.images.length > 0) 
      ? prod.images 
      : ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80"];

    const waLink = getWhatsAppUrl(prod.name, prod.weight);

    const modalContent = document.getElementById("modal-content-area");
    if (modalContent) {
      modalContent.innerHTML = `
        <div class="modal-body-grid">
          <div class="modal-gallery-col">
            <div class="modal-main-img-wrap">
              <img id="modal-active-img" src="${images[0]}" alt="${prod.name}" class="modal-main-img" />
            </div>
            ${images.length > 1 ? `
              <div class="modal-thumbs-row">
                ${images.map((img, idx) => `
                  <div class="modal-thumb ${idx === 0 ? 'active' : ''}" onclick="switchModalThumb('${img}', this)">
                    <img src="${img}" alt="Thumbnail ${idx + 1}" />
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
          <div class="modal-info-col">
            <span class="modal-cat-tag"><i class="fa-solid fa-gem"></i> ${catName}</span>
            <h2 class="modal-prod-title">${prod.name}</h2>
            
            <div class="modal-specs-box">
              <div class="spec-entry">
                <span class="label">Gold Purity</span>
                <span class="val gold">${prod.purity || '22K 916 BIS Hallmarked'}</span>
              </div>
              <div class="spec-entry">
                <span class="label">Net Weight</span>
                <span class="val gold">${prod.weight || 'Available on enquiry'}</span>
              </div>
              <div class="spec-entry">
                <span class="label">Category / Type</span>
                <span class="val">${catName}</span>
              </div>
              <div class="spec-entry">
                <span class="label">Showroom Location</span>
                <span class="val">Gandhi Chowk, Sattenapalli</span>
              </div>
            </div>

            <p class="modal-prod-desc">
              ${prod.description || 'Exquisitely handcrafted jewellery piece from Uma Maheshwari Jewellers. Visit our showroom at Gandhi Chowk, Sattenapalli or connect via WhatsApp for customized weights and showroom viewing.'}
            </p>

            <div class="modal-actions">
              <a href="${waLink}" target="_blank" rel="noopener" class="btn btn-whatsapp" style="font-size:1.02rem; padding:15px 24px;">
                <i class="fa-brands fa-whatsapp" style="font-size:1.3rem"></i> Enquire on WhatsApp
              </a>
              <div style="display:flex; gap:12px; width:100%;">
                <a href="tel:9966991008" class="btn btn-outline" style="flex:1;">
                  <i class="fa-solid fa-phone"></i> Call Showroom
                </a>
                <button class="btn btn-outline" onclick="copyShareLink('${prod.name}')" title="Share Piece" style="flex:1;">
                  <i class="fa-solid fa-share-nodes"></i> Share
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    productModal.classList.add("active");
    document.body.style.overflow = "hidden";
  };

  window.switchModalThumb = function(imgSrc, thumbEl) {
    const mainImg = document.getElementById("modal-active-img");
    if (mainImg) mainImg.src = imgSrc;
    document.querySelectorAll(".modal-thumb").forEach(t => t.classList.remove("active"));
    if (thumbEl) thumbEl.classList.add("active");
  };

  window.closeProductModal = function() {
    if (productModal) {
      productModal.classList.remove("active");
      if (!categoryModal || !categoryModal.classList.contains("active")) {
        document.body.style.overflow = "";
      }
    }
  };

  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", closeProductModal);
  }

  if (productModal) {
    productModal.addEventListener("click", (e) => {
      if (e.target === productModal) {
        closeProductModal();
      }
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (productModal && productModal.classList.contains("active")) {
        closeProductModal();
      } else if (categoryModal && categoryModal.classList.contains("active")) {
        closeCategoryGallery();
      }
    }
  });

  window.copyShareLink = function(name) {
    const url = window.location.href.split("#")[0];
    navigator.clipboard.writeText(`${url} - Check out ${name} at Uma Maheshwari Jewellers!`);
    showToast("Product link copied to clipboard!");
  };

  // 6. Contact Form submission
  const contactForm = document.getElementById("showroom-enquiry-form");
  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("contact-name").value;
      const phone = document.getElementById("contact-phone").value;
      const message = document.getElementById("contact-message").value;

      const waText = `Hello Uma Maheshwari Jewellers, my name is ${name} (Phone: ${phone}). Showroom enquiry: ${message}`;
      const waUrl = `https://wa.me/919966991008?text=${encodeURIComponent(waText)}`;

      showToast("Opening WhatsApp with your enquiry...");
      setTimeout(() => {
        window.open(waUrl, "_blank");
        contactForm.reset();
      }, 500);
    });
  }

  // Initial Renders
  renderFeaturedCategories();

  // Listen for storage updates across tabs
  window.addEventListener("storage", () => {
    Store.init().then(() => {
      renderGoldRates();
      renderFeaturedCategories();
      if (categoryModal && categoryModal.classList.contains("active")) {
        renderCategoryModalProducts();
      }
    });
  });
});
