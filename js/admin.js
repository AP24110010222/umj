/**
 * Uma Maheshwari Jewellers - Admin & Product Management System
 */

document.addEventListener("DOMContentLoaded", async () => {
  await Store.init();

  // State
  let editingProductId = null;
  let stagedImages = [];
  let currentAdminFilter = "all";
  let adminSearchQuery = "";

  // Elements
  const navTabs = document.querySelectorAll(".admin-nav-item button");
  const tabPanels = document.querySelectorAll(".admin-tab-panel");
  const productsTableBody = document.getElementById("admin-products-table-body");
  const productForm = document.getElementById("admin-product-form");
  const formTitle = document.getElementById("admin-form-title");
  const cancelEditBtn = document.getElementById("cancel-edit-btn");
  const categorySelect = document.getElementById("prod-category-select");
  const tableFilterSelect = document.getElementById("admin-cat-filter");
  const adminSearchInput = document.getElementById("admin-search-input");
  const dropzone = document.getElementById("image-dropzone");
  const fileInput = document.getElementById("file-input");
  const imagePreviews = document.getElementById("image-previews");
  const categoriesList = document.getElementById("categories-manager-grid");
  const newCatForm = document.getElementById("new-category-form");
  const goldRatesForm = document.getElementById("gold-rates-form");
  const exportBtn = document.getElementById("export-backup-btn");
  const importInput = document.getElementById("import-backup-input");

  // Format INR
  function formatINR(val) {
    if (!val) return "—";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
  }

  // Toast
  function notify(msg, icon = "fa-check-circle") {
    let toast = document.querySelector(".toast-notice");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast-notice";
      document.body.appendChild(toast);
    }
    toast.innerHTML = `<i class="fa-solid ${icon}" style="color:var(--gold-primary)"></i> <span>${msg}</span>`;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3500);
  }

  // 1. Tab Navigation
  navTabs.forEach(tab => {
    tab.addEventListener("click", () => {
      const targetId = tab.getAttribute("data-tab");
      navTabs.forEach(t => t.classList.remove("active"));
      tabPanels.forEach(p => p.classList.remove("active"));

      tab.classList.add("active");
      const targetPanel = document.getElementById(targetId);
      if (targetPanel) targetPanel.classList.add("active");

      if (targetId === "tab-products") {
        renderProductsTable();
        updateStats();
      } else if (targetId === "tab-categories") {
        renderCategoriesManager();
      }
    });
  });

  // Switch to tab programmatically
  function switchTab(tabId) {
    const tabBtn = document.querySelector(`.admin-nav-item button[data-tab="${tabId}"]`);
    if (tabBtn) tabBtn.click();
  }

  // 2. Populate Category Selects
  function populateCategoryDropdowns() {
    const categories = Store.getCategories();
    if (categorySelect) {
      categorySelect.innerHTML = categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    }
    if (tableFilterSelect) {
      tableFilterSelect.innerHTML = `<option value="all">All Categories</option>` +
        categories.map(c => `<option value="${c.id}">${c.name}</option>`).join("");
    }
  }

  // 3. Render Dashboard Stats
  function updateStats() {
    const products = Store.getProducts("all");
    const categories = Store.getCategories();

    const totalProdEl = document.getElementById("stat-total-products");
    const totalCatEl = document.getElementById("stat-total-categories");
    const bridalCountEl = document.getElementById("stat-bridal-count");
    const featuredCountEl = document.getElementById("stat-featured-count");

    if (totalProdEl) totalProdEl.textContent = products.length;
    if (totalCatEl) totalCatEl.textContent = categories.length;
    if (bridalCountEl) bridalCountEl.textContent = products.filter(p => p.category === "bridal-jewellery").length;
    if (featuredCountEl) featuredCountEl.textContent = products.filter(p => p.featured).length;
  }

  // 4. Render Products Table
  function renderProductsTable() {
    if (!productsTableBody) return;
    const products = Store.getProducts(currentAdminFilter, adminSearchQuery);

    if (products.length === 0) {
      productsTableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 40px; color:var(--text-muted);">
            <i class="fa-solid fa-gem" style="font-size:2rem; color:var(--gold-primary); margin-bottom:12px; display:block;"></i>
            No jewellery products found. Click "Add New Jewellery" to create your first item.
          </td>
        </tr>
      `;
      return;
    }

    productsTableBody.innerHTML = products.map((p, idx) => {
      const cat = Store.getCategoryById(p.category);
      const catName = cat ? cat.name : p.category;
      const thumb = (p.images && p.images.length > 0) ? p.images[0] : "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=150&q=80";

      return `
        <tr>
          <td style="color:var(--text-muted); font-size:0.85rem;">${idx + 1}</td>
          <td>
            <img src="${thumb}" alt="${p.name}" class="table-thumb" />
          </td>
          <td>
            <strong style="color:var(--text-cream); display:block;">${p.name}</strong>
            <small style="color:var(--text-dim);">${p.purity || '22K 916'}</small>
          </td>
          <td>
            <span class="cat-badge">${catName}</span>
          </td>
          <td style="color:var(--gold-champagne); font-weight:600;">
            ${p.weight || '—'}
          </td>
          <td>
            <div class="action-btns">
              <button class="btn-icon" onclick="editProduct('${p.id}')" title="Edit Jewellery">
                <i class="fa-solid fa-pen-to-square"></i>
              </button>
              <button class="btn-icon delete" onclick="deleteProduct('${p.id}')" title="Delete Jewellery">
                <i class="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join("");
  }

  // 5. Image Dropzone and File Staging
  if (dropzone && fileInput) {
    dropzone.addEventListener("click", () => fileInput.click());

    dropzone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    });

    dropzone.addEventListener("dragleave", () => dropzone.classList.remove("dragover"));

    dropzone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    });
  }

  async function handleFiles(files) {
    notify("Processing jewellery photograph(s)...", "fa-spinner");
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) continue;
      try {
        const uploadedUrl = await Store.uploadImage(file, file.name);
        stagedImages.push(uploadedUrl);
      } catch (err) {
        console.error("Upload error:", err);
      }
    }
    renderImagePreviews();
    notify("Photograph(s) ready!", "fa-check");
  }

  function renderImagePreviews() {
    if (!imagePreviews) return;
    imagePreviews.innerHTML = stagedImages.map((src, idx) => `
      <div class="preview-box">
        <img src="${src}" alt="Preview ${idx + 1}" />
        <button type="button" class="preview-remove-btn" onclick="removeStagedImage(${idx})">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
    `).join("");
  }

  window.removeStagedImage = function(index) {
    stagedImages.splice(index, 1);
    renderImagePreviews();
  };

  // Add Image via direct URL prompt
  const addUrlBtn = document.getElementById("add-image-url-btn");
  if (addUrlBtn) {
    addUrlBtn.addEventListener("click", () => {
      const url = prompt("Enter online image URL (JPEG/PNG/WebP):");
      if (url && url.trim()) {
        stagedImages.push(url.trim());
        renderImagePreviews();
      }
    });
  }

  // 6. Form Submission (Add or Edit Product)
  if (productForm) {
    productForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = document.getElementById("prod-name").value.trim();
      const category = document.getElementById("prod-category-select").value;
      const weight = document.getElementById("prod-weight").value.trim();
      const purity = document.getElementById("prod-purity").value;
      const description = document.getElementById("prod-description").value.trim();
      const featured = document.getElementById("prod-featured").checked;

      if (!name) {
        alert("Please enter a product name.");
        return;
      }

      // Default placeholder image if none uploaded
      const finalImages = stagedImages.length > 0 
        ? stagedImages 
        : ["https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80"];

      const productPayload = {
        name,
        category,
        images: finalImages,
        weight: weight || null,
        purity: purity || "22K 916 BIS Hallmarked",
        description,
        featured
      };

      if (editingProductId) {
        await Store.updateProduct(editingProductId, productPayload);
        notify(`Updated: "${name}" successfully!`);
      } else {
        await Store.addProduct(productPayload);
        notify(`Added: "${name}" to collection!`);
      }

      resetProductForm();
      switchTab("tab-products");
      renderProductsTable();
      updateStats();
    });
  }

  function resetProductForm() {
    editingProductId = null;
    stagedImages = [];
    if (productForm) productForm.reset();
    if (formTitle) formTitle.textContent = "Add New Jewellery Item";
    if (cancelEditBtn) cancelEditBtn.style.display = "none";
    renderImagePreviews();
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", () => {
      resetProductForm();
      switchTab("tab-products");
    });
  }

  // Edit Product
  window.editProduct = function(id) {
    const prod = Store.getProductById(id);
    if (!prod) return;

    editingProductId = id;
    if (formTitle) formTitle.textContent = `Edit Product: ${prod.name}`;
    if (cancelEditBtn) cancelEditBtn.style.display = "inline-flex";

    document.getElementById("prod-name").value = prod.name;
    document.getElementById("prod-category-select").value = prod.category;
    document.getElementById("prod-weight").value = prod.weight || "";
    document.getElementById("prod-purity").value = prod.purity || "22K 916 BIS Hallmarked";
    document.getElementById("prod-description").value = prod.description || "";
    document.getElementById("prod-featured").checked = Boolean(prod.featured);

    stagedImages = prod.images ? [...prod.images] : [];
    renderImagePreviews();

    switchTab("tab-add-product");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Delete Product
  window.deleteProduct = async function(id) {
    const prod = Store.getProductById(id);
    if (!prod) return;

    if (confirm(`Are you sure you want to delete "${prod.name}"? This action cannot be undone.`)) {
      await Store.deleteProduct(id);
      notify(`Deleted "${prod.name}"`, "fa-trash-can");
      renderProductsTable();
      updateStats();
    }
  };

  // Filter and Search Listeners in Table
  if (tableFilterSelect) {
    tableFilterSelect.addEventListener("change", (e) => {
      currentAdminFilter = e.target.value;
      renderProductsTable();
    });
  }

  if (adminSearchInput) {
    adminSearchInput.addEventListener("input", (e) => {
      adminSearchQuery = e.target.value;
      renderProductsTable();
    });
  }

  // 7. Categories Manager
  function renderCategoriesManager() {
    if (!categoriesList) return;
    const categories = Store.getCategories();
    const allProducts = Store.getProducts("all");

    categoriesList.innerHTML = categories.map(cat => {
      const count = allProducts.filter(p => p.category === cat.id).length;
      return `
        <div class="category-admin-card">
          <div>
            <h4><i class="fa-solid ${cat.icon || 'fa-gem'}" style="color:var(--gold-primary); margin-right:8px;"></i>${cat.name}</h4>
            <small style="color:var(--text-muted);">${count} ${count === 1 ? 'Product' : 'Products'}</small>
          </div>
          <span style="font-size:0.75rem; color:var(--text-dim); text-transform:uppercase;">ID: ${cat.id}</span>
        </div>
      `;
    }).join("");
  }

  if (newCatForm) {
    newCatForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const nameInput = document.getElementById("new-cat-name");
      const descInput = document.getElementById("new-cat-desc");
      const name = nameInput.value.trim();
      const desc = descInput.value.trim();

      if (!name) return;

      await Store.addCategory(name, desc);
      notify(`Category "${name}" created!`);
      nameInput.value = "";
      descInput.value = "";
      populateCategoryDropdowns();
      renderCategoriesManager();
      updateStats();
    });
  }

  // 8. Daily Gold Rates Form
  if (goldRatesForm) {
    const currentRates = Store.getGoldRates();
    const r22k = document.getElementById("rate-22k-input");
    const r24k = document.getElementById("rate-24k-input");
    if (r22k) r22k.value = currentRates.rate22K;
    if (r24k) r24k.value = currentRates.rate24K;

    goldRatesForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const rate22K = parseFloat(r22k.value);
      const rate24K = parseFloat(r24k.value);

      if (!rate22K || !rate24K) {
        alert("Please enter valid gold rates.");
        return;
      }

      await Store.updateGoldRates({ rate22K, rate24K });
      notify("Showroom gold rates updated successfully!");
    });
  }

  // 9. Export & Import Backup
  if (exportBtn) {
    exportBtn.addEventListener("click", () => {
      Store.exportData();
      notify("Inventory JSON backup downloaded!");
    });
  }

  if (importInput) {
    importInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          await Store.importData(parsed);
          notify("Inventory successfully restored from backup!");
          populateCategoryDropdowns();
          renderProductsTable();
          updateStats();
          renderCategoriesManager();
        } catch (err) {
          alert("Error parsing backup file: " + err.message);
        }
      };
      reader.readAsText(file);
    });
  }

  // Initial Load
  populateCategoryDropdowns();
  renderProductsTable();
  updateStats();
  renderCategoriesManager();

  // 10. Supabase Authentication System
  const SUPABASE_URL = "https://bppqkiworrqjgkwiebjw.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJwcHFraXdvcnJxamdrd2llYmp3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwMDY5NTMsImV4cCI6MjEwNTU4Mjk1M30.7zofbcEriTkALRj6YX6ScQnfs5g0MYLOUb6nIPTU2_g";

  let supabaseClient = null;
  const authOverlay = document.getElementById("admin-auth-overlay");
  const loginForm = document.getElementById("admin-login-form");
  const loginError = document.getElementById("admin-auth-error");
  const loginErrorText = document.getElementById("admin-auth-error-text");
  const loginSubmitBtn = document.getElementById("admin-login-submit");
  const userInfoBadge = document.getElementById("admin-user-info");
  const userDisplaySpan = document.getElementById("admin-user-display");
  const logoutBtn = document.getElementById("admin-logout-btn");

  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  }

  function showLoginModal(errorMsg = null) {
    if (authOverlay) authOverlay.classList.remove("hidden");
    if (userInfoBadge) userInfoBadge.style.display = "none";
    if (errorMsg && loginError && loginErrorText) {
      loginErrorText.textContent = errorMsg;
      loginError.classList.add("show");
    }
  }

  function hideLoginModal(userEmail) {
    if (authOverlay) authOverlay.classList.add("hidden");
    if (loginError) loginError.classList.remove("show");
    if (userInfoBadge && userDisplaySpan) {
      userDisplaySpan.textContent = userEmail || "Admin User";
      userInfoBadge.style.display = "flex";
    }
  }

  async function checkSession() {
    if (!supabaseClient) {
      if (authOverlay) authOverlay.classList.add("hidden");
      return;
    }

    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      if (session && session.access_token) {
        localStorage.setItem("supabase_token", session.access_token);
        hideLoginModal(session.user?.email);
      } else {
        localStorage.removeItem("supabase_token");
        showLoginModal();
      }
    } catch (err) {
      console.warn("Session check error:", err);
      showLoginModal();
    }
  }

  // Handle Login
  if (loginForm && supabaseClient) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = document.getElementById("admin-email").value.trim();
      const password = document.getElementById("admin-password").value;

      if (!email || !password) return;

      if (loginSubmitBtn) {
        loginSubmitBtn.disabled = true;
        loginSubmitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Authenticating...';
      }
      if (loginError) loginError.classList.remove("show");

      try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
        if (error) {
          showLoginModal(error.message || "Invalid login credentials.");
        } else if (data.session) {
          localStorage.setItem("supabase_token", data.session.access_token);
          hideLoginModal(data.user?.email);
          notify(`Welcome back, ${data.user?.email || "Admin"}!`, "fa-shield-halved");
          await Store.init();
          populateCategoryDropdowns();
          renderProductsTable();
          updateStats();
          renderCategoriesManager();
        }
      } catch (err) {
        showLoginModal("Authentication failed: " + err.message);
      } finally {
        if (loginSubmitBtn) {
          loginSubmitBtn.disabled = false;
          loginSubmitBtn.innerHTML = '<i class="fa-solid fa-lock-open"></i> Sign In to Portal';
        }
      }
    });
  }

  // Handle Logout
  if (logoutBtn && supabaseClient) {
    logoutBtn.addEventListener("click", async () => {
      await supabaseClient.auth.signOut();
      localStorage.removeItem("supabase_token");
      showLoginModal();
      notify("Logged out from admin portal.", "fa-arrow-right-from-bracket");
    });
  }

  // Listen to Auth state changes (token refresh, etc.)
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((event, session) => {
      if (session && session.access_token) {
        localStorage.setItem("supabase_token", session.access_token);
      } else if (event === "SIGNED_OUT") {
        localStorage.removeItem("supabase_token");
        showLoginModal();
      }
    });
  }

  // Check auth session
  await checkSession();
});
