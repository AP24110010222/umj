/**
 * Uma Maheshwari Jewellers - Central Data Store (Production Grade)
 * Dual-Engine Persistence:
 *  1. Express + Supabase REST API (when backend is available)
 *  2. LocalStorage fallback (offline or static deployment)
 * Automatic Authorization: Bearer <token> attached for mutating operations.
 */

const Store = (function () {
  const STORAGE_KEY = "umj_jewellery_db_v1";

  // Dynamic API Base URL resolution
  function getApiBase() {
    if (window.UMJ_API_BASE) {
      return window.UMJ_API_BASE.replace(/\/+$/, "");
    }
    const saved = localStorage.getItem("umj_api_base");
    if (saved) {
      return saved.replace(/\/+$/, "");
    }
    // If testing on a different local port (like 5500), point to 8000
    if (window.location.hostname === "localhost" && window.location.port && window.location.port !== "8000") {
      return "http://localhost:8000";
    }
    return "";
  }

  // Helper to include Authorization header if Supabase JWT is present
  function authHeaders() {
    const token = localStorage.getItem("supabase_token");
    return token ? { "Authorization": `Bearer ${token}` } : {};
  }

  // Unified API fetch helper with base URL prepending
  async function apiFetch(endpoint, options = {}) {
    const base = getApiBase();
    const url = `${base}${endpoint}`;
    const headers = {
      "Accept": "application/json",
      ...(options.headers || {})
    };

    // Attach auth headers automatically on mutating methods
    if (["POST", "PUT", "DELETE", "PATCH"].includes(options.method?.toUpperCase())) {
      Object.assign(headers, authHeaders());
    }

    return fetch(url, { ...options, headers });
  }

  let cache = {
    categories: [],
    products: [],
    goldRates: { rate22K: 6650, rate24K: 7255, lastUpdated: new Date().toISOString().split("T")[0] }
  };

  let isBackendAvailable = null;

  async function checkBackend() {
    try {
      const res = await apiFetch("/api/rates", { method: "GET" });
      isBackendAvailable = res.ok;
    } catch (e) {
      isBackendAvailable = false;
    }
    return isBackendAvailable;
  }

  function getLocalData() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.warn("Could not read localStorage:", e);
    }
    return null;
  }

  function setLocalData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn("Could not save to localStorage:", e);
    }
  }

  async function loadInitialSeed() {
    try {
      const res = await fetch("data/products.json");
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn("Could not load data/products.json directly:", e);
    }
    return null;
  }

  return {
    getApiBase,

    setApiBase(url) {
      if (!url) {
        localStorage.removeItem("umj_api_base");
      } else {
        localStorage.setItem("umj_api_base", url.trim().replace(/\/+$/, ""));
      }
      isBackendAvailable = null;
    },

    async init() {
      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          const res = await apiFetch("/api/products");
          if (res.ok) {
            const data = await res.json();
            cache.products = data.products || [];
            if (data.categories && data.categories.length > 0) {
              cache.categories = data.categories;
            }
            if (data.goldRates) {
              cache.goldRates = data.goldRates;
            }
            setLocalData(cache);
            return cache;
          }
        } catch (e) {
          console.warn("Backend fetch failed, falling back to local:", e);
        }
      }

      // Check local storage
      let local = getLocalData();
      if (local && local.products && local.products.length > 0) {
        cache = local;
        return cache;
      }

      // Load initial seed
      const seed = await loadInitialSeed();
      if (seed) {
        cache = seed;
        setLocalData(cache);
        return cache;
      }

      return cache;
    },

    getData() {
      return cache;
    },

    getCategories() {
      return cache.categories || [];
    },

    getCategoryById(id) {
      return (cache.categories || []).find(c => c.id === id);
    },

    getProducts(category = "all", searchQuery = "") {
      let list = cache.products || [];
      if (category && category !== "all") {
        list = list.filter(p => p.category === category);
      }
      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        list = list.filter(p => {
          const nameMatch = p.name && p.name.toLowerCase().includes(q);
          const descMatch = p.description && p.description.toLowerCase().includes(q);
          const catMatch = p.category && p.category.toLowerCase().includes(q);
          const purityMatch = p.purity && p.purity.toLowerCase().includes(q);
          return nameMatch || descMatch || catMatch || purityMatch;
        });
      }
      return list;
    },

    getProductById(id) {
      return (cache.products || []).find(p => p.id === id);
    },

    getGoldRates() {
      return cache.goldRates || { rate22K: 6650, rate24K: 7255, lastUpdated: new Date().toISOString().split("T")[0] };
    },

    async uploadImage(fileOrBase64, filename = "jewel.jpg") {
      const hasBackend = await checkBackend();
      let base64String = fileOrBase64;

      if (fileOrBase64 instanceof File) {
        base64String = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBase64);
        });
        filename = fileOrBase64.name;
      }

      if (hasBackend) {
        try {
          const res = await apiFetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64String, filename })
          });
          if (res.ok) {
            const data = await res.json();
            return data.url;
          }
        } catch (e) {
          console.warn("Backend image upload failed, falling back to base64 DataURL:", e);
        }
      }

      // Fallback: return base64 DataURL directly
      return base64String;
    },

    async addProduct(productData) {
      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          const res = await apiFetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(productData)
          });
          if (res.ok) {
            const result = await res.json();
            cache.products.unshift(result.product);
            setLocalData(cache);
            return result.product;
          }
        } catch (e) {
          console.warn("Backend addProduct failed:", e);
        }
      }

      // Fallback: Local
      const newProduct = {
        id: "prod-" + Date.now(),
        name: productData.name.trim(),
        category: productData.category.trim(),
        images: productData.images || [],
        weight: productData.weight || null,
        purity: productData.purity || "22K 916 BIS Hallmarked",
        description: productData.description || "",
        featured: Boolean(productData.featured),
        createdAt: new Date().toISOString()
      };
      cache.products.unshift(newProduct);
      setLocalData(cache);
      return newProduct;
    },

    async updateProduct(id, updatedData) {
      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          const res = await apiFetch(`/api/products/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedData)
          });
          if (res.ok) {
            const result = await res.json();
            const idx = cache.products.findIndex(p => p.id === id);
            if (idx !== -1) cache.products[idx] = result.product;
            setLocalData(cache);
            return result.product;
          }
        } catch (e) {
          console.warn("Backend updateProduct failed:", e);
        }
      }

      // Fallback: Local
      const idx = cache.products.findIndex(p => p.id === id);
      if (idx !== -1) {
        cache.products[idx] = { ...cache.products[idx], ...updatedData };
        setLocalData(cache);
        return cache.products[idx];
      }
      return null;
    },

    async deleteProduct(id) {
      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          const res = await apiFetch(`/api/products/${id}`, { method: "DELETE" });
          if (res.ok) {
            cache.products = cache.products.filter(p => p.id !== id);
            setLocalData(cache);
            return true;
          }
        } catch (e) {
          console.warn("Backend deleteProduct failed:", e);
        }
      }

      cache.products = cache.products.filter(p => p.id !== id);
      setLocalData(cache);
      return true;
    },

    async addCategory(name, description = "") {
      const catId = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          const res = await apiFetch("/api/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: catId, name, description })
          });
          if (res.ok) {
            const data = await res.json();
            cache.categories.push(data.category);
            setLocalData(cache);
            return data.category;
          }
        } catch (e) {
          console.warn("Backend addCategory failed:", e);
        }
      }

      const existing = cache.categories.find(c => c.id === catId);
      if (existing) return existing;

      const newCat = {
        id: catId,
        name: name.trim(),
        icon: "fa-gem",
        description: description || `Exclusive collection of handcrafted ${name}.`
      };
      cache.categories.push(newCat);
      setLocalData(cache);
      return newCat;
    },

    async deleteCategory(id) {
      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
          if (res.ok) {
            cache.categories = cache.categories.filter(c => c.id !== id);
            setLocalData(cache);
            return true;
          }
        } catch (e) {
          console.warn("Backend deleteCategory failed:", e);
        }
      }

      cache.categories = cache.categories.filter(c => c.id !== id);
      setLocalData(cache);
      return true;
    },

    async updateGoldRates(rates) {
      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          const res = await apiFetch("/api/rates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(rates)
          });
          if (res.ok) {
            const data = await res.json();
            cache.goldRates = data.goldRates;
            setLocalData(cache);
            return cache.goldRates;
          }
        } catch (e) {
          console.warn("Backend updateGoldRates failed:", e);
        }
      }

      cache.goldRates = {
        ...cache.goldRates,
        ...rates,
        lastUpdated: new Date().toISOString().split("T")[0]
      };
      setLocalData(cache);
      return cache.goldRates;
    },

    exportData() {
      const jsonStr = JSON.stringify(cache, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `UMJ_Inventory_Backup_${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },

    async importData(importedObject) {
      if (!importedObject.products || !importedObject.categories) {
        throw new Error("Invalid inventory backup format");
      }
      cache = importedObject;
      setLocalData(cache);

      const hasBackend = await checkBackend();
      if (hasBackend) {
        try {
          await apiFetch("/api/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(importedObject)
          });
        } catch (e) {
          console.warn("Backend import sync failed:", e);
        }
      }
      return cache;
    }
  };
})();

window.Store = Store;
