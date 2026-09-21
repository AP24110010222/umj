#!/usr/bin/env python3
"""
Uma Maheshwari Jewellers - Luxury Showroom Backend Server
Provides static asset serving and RESTful API endpoints for:
- Product CRUD
- Category management
- Daily Gold Rate management
- Image photo upload handling
"""

import os
import sys
import json
import time
import base64
import re
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

PORT = 8000
DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "products.json")
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")

os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(os.path.dirname(DATA_FILE), exist_ok=True)

def load_data():
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading data: {e}")
    return {"categories": [], "products": [], "goldRates": {"rate22K": 6650, "rate24K": 7255, "lastUpdated": "2026-09-18"}}

def save_data(data):
    try:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        return True
    except Exception as e:
        print(f"Error saving data: {e}")
        return False

class JewelleryHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def send_json(self, status_code, payload):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.end_headers()
        self.wfile.write(json.dumps(payload).encode("utf-8"))

    def read_json_body(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            return {}
        body = self.rfile.read(content_length).decode("utf-8")
        try:
            return json.loads(body)
        except json.JSONDecodeError:
            return {}

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/api/products":
            data = load_data()
            self.send_json(200, data)
            return

        if path == "/api/categories":
            data = load_data()
            self.send_json(200, {"categories": data.get("categories", [])})
            return

        if path == "/api/rates":
            data = load_data()
            self.send_json(200, {"goldRates": data.get("goldRates", {})})
            return

        if path.startswith("/api/products/"):
            prod_id = path.split("/api/products/")[1].strip("/")
            data = load_data()
            for prod in data.get("products", []):
                if prod.get("id") == prod_id:
                    self.send_json(200, prod)
                    return
            self.send_json(404, {"error": "Product not found"})
            return

        # Fallback to serving static files
        super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        # Handle image file upload (supports Base64 dataURL or binary payload)
        if path == "/api/upload":
            payload = self.read_json_body()
            data_url = payload.get("image", "")
            filename = payload.get("filename", "")

            if not data_url:
                self.send_json(400, {"error": "No image data provided"})
                return

            try:
                # Match data:image/(png|jpeg|webp);base64,...
                match = re.match(r"data:image/(\w+);base64,(.+)", data_url)
                if match:
                    ext = match.group(1).lower()
                    if ext == "jpeg":
                        ext = "jpg"
                    img_data = base64.b64decode(match.group(2))
                else:
                    # Raw base64 or fallback
                    img_data = base64.b64decode(data_url)
                    ext = "jpg"

                timestamp = int(time.time() * 1000)
                safe_name = f"jewel_{timestamp}.{ext}"
                target_path = os.path.join(UPLOADS_DIR, safe_name)

                with open(target_path, "wb") as f:
                    f.write(img_data)

                url = f"/uploads/{safe_name}"
                self.send_json(200, {"success": True, "url": url, "filename": safe_name})
            except Exception as e:
                self.send_json(500, {"error": f"Failed to save image: {str(e)}"})
            return

        # Handle creating a new product
        if path == "/api/products":
            payload = self.read_json_body()
            if not payload.get("name") or not payload.get("category"):
                self.send_json(400, {"error": "Product name and category are required"})
                return

            data = load_data()
            new_id = f"prod-{int(time.time() * 1000)}"
            product = {
                "id": new_id,
                "name": payload.get("name").strip(),
                "category": payload.get("category").strip(),
                "images": payload.get("images", []),
                "weight": payload.get("weight") or None,
                "purity": payload.get("purity", "22K 916 BIS Hallmarked"),
                "description": payload.get("description", ""),
                "featured": bool(payload.get("featured", False)),
                "createdAt": time.strftime("%Y-%m-%dT%H:%M:%S.000Z", time.gmtime())
            }

            data.setdefault("products", []).insert(0, product)
            save_data(data)
            self.send_json(201, {"success": True, "product": product})
            return

        # Handle adding a new category
        if path == "/api/categories":
            payload = self.read_json_body()
            cat_name = payload.get("name", "").strip()
            if not cat_name:
                self.send_json(400, {"error": "Category name is required"})
                return

            cat_id = payload.get("id") or re.sub(r"[^a-z0-9]+", "-", cat_name.lower()).strip("-")
            data = load_data()
            categories = data.setdefault("categories", [])

            # Check if exists
            for c in categories:
                if c.get("id") == cat_id:
                    self.send_json(400, {"error": "Category already exists"})
                    return

            new_cat = {
                "id": cat_id,
                "name": cat_name,
                "icon": payload.get("icon", "fa-gem"),
                "description": payload.get("description", f"Exclusive collection of handcrafted {cat_name}.")
            }
            categories.append(new_cat)
            save_data(data)
            self.send_json(201, {"success": True, "category": new_cat})
            return

        # Handle updating daily gold rates
        if path == "/api/rates":
            payload = self.read_json_body()
            data = load_data()
            rates = data.setdefault("goldRates", {})
            if "rate22K" in payload and payload["rate22K"]:
                rates["rate22K"] = float(payload["rate22K"])
            if "rate24K" in payload and payload["rate24K"]:
                rates["rate24K"] = float(payload["rate24K"])
            rates["lastUpdated"] = time.strftime("%Y-%m-%d")
            save_data(data)
            self.send_json(200, {"success": True, "goldRates": rates})
            return

        # Handle full database import
        if path == "/api/import":
            payload = self.read_json_body()
            if "products" in payload and "categories" in payload:
                save_data(payload)
                self.send_json(200, {"success": True, "message": "Database successfully restored"})
            else:
                self.send_json(400, {"error": "Invalid database structure"})
            return

        self.send_json(404, {"error": "Endpoint not found"})

    def do_PUT(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/products/"):
            prod_id = path.split("/api/products/")[1].strip("/")
            payload = self.read_json_body()
            data = load_data()
            products = data.get("products", [])

            for idx, prod in enumerate(products):
                if prod.get("id") == prod_id:
                    prod["name"] = payload.get("name", prod["name"]).strip()
                    prod["category"] = payload.get("category", prod["category"]).strip()
                    if "images" in payload:
                        prod["images"] = payload["images"]
                    prod["weight"] = payload.get("weight") or None
                    if "description" in payload:
                        prod["description"] = payload["description"]
                    if "purity" in payload:
                        prod["purity"] = payload["purity"]
                    if "featured" in payload:
                        prod["featured"] = bool(payload["featured"])
                    
                    products[idx] = prod
                    save_data(data)
                    self.send_json(200, {"success": True, "product": prod})
                    return

            self.send_json(404, {"error": "Product not found"})
            return

        self.send_json(404, {"error": "Endpoint not found"})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path.startswith("/api/products/"):
            prod_id = path.split("/api/products/")[1].strip("/")
            data = load_data()
            products = data.get("products", [])
            initial_len = len(products)
            data["products"] = [p for p in products if p.get("id") != prod_id]

            if len(data["products"]) < initial_len:
                save_data(data)
                self.send_json(200, {"success": True, "deletedId": prod_id})
            else:
                self.send_json(404, {"error": "Product not found"})
            return

        if path.startswith("/api/categories/"):
            cat_id = path.split("/api/categories/")[1].strip("/")
            data = load_data()
            categories = data.get("categories", [])
            data["categories"] = [c for c in categories if c.get("id") != cat_id]
            save_data(data)
            self.send_json(200, {"success": True, "deletedCategory": cat_id})
            return

        self.send_json(404, {"error": "Endpoint not found"})

def run():
    server_address = ("", PORT)
    httpd = HTTPServer(server_address, JewelleryHandler)
    print(f"✨ Uma Maheshwari Jewellers Server running on http://localhost:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    run()
