const express = require("express");
const cors = require("cors");
const NodeCache = require("node-cache");

const { callFarmersAPI } = require("./services/farmersApi");
const config = require("./config");

const app = express();
const cache = new NodeCache({
  stdTTL: config.CACHE_TTL || 300, // default 5 phút
  checkperiod: 60
});

app.use(cors());
app.use(express.json());

/**
 * POST /get-item
 * Body:
 * {
 *   "company": "LARIA",
 *   "barcode": "8936189332811"
 * }
 */
app.post("/get-item", async (req, res) => {
  try {
    const { company, barcode } = req.body;

    // 1️⃣ Validate input
    if (!company || !barcode) {
      return res.json({
        status: "ERROR",
        message: "Missing company or barcode",
        data: {
          item_code: "",
          item_name: "",
          qty_on_stock: 0
        }
      });
    }

    const cacheKey = `${company}_${barcode}`;

    // 2️⃣ Cache hit
    if (cache.has(cacheKey)) {
      console.log("🟢 [CACHE HIT]", cacheKey);

      return res.json({
        status: "OK",
        source: "cache",
        data: cache.get(cacheKey)
      });
    }

    console.log("🔵 [API CALL]", { company, barcode });

    // 3️⃣ Call Farmers API
    const apiResult = await callFarmersAPI(company, barcode);

    // 4️⃣ Lấy item đầu tiên
    const item =
      Array.isArray(apiResult?.value) && apiResult.value.length > 0
        ? apiResult.value[0]
        : null;

    // 5️⃣ Không tìm thấy sản phẩm
    if (!item) {
      const emptyData = {
        item_code: "",
        item_name: "",
        qty_on_stock: 0
      };

      cache.set(cacheKey, emptyData);

      return res.json({
        status: "NOT_FOUND",
        source: "api",
        data: emptyData
      });
    }

    // 6️⃣ Chuẩn hóa dữ liệu cho AppSheet
    const normalized = {
      item_code: item.ItemCode ?? "",
      item_name: item.ItemName ?? "",
      qty_on_stock: Number(item.QuantityOnStock) || 0
    };

    // 7️⃣ Lưu cache
    cache.set(cacheKey, normalized);

    return res.json({
      status: "OK",
      source: "api",
      data: normalized
    });

  } catch (error) {
    console.error("🔴 Get-item error:", error.message);

    return res.json({
      status: "ERROR",
      message: "Server error",
      data: {
        item_code: "",
        item_name: "",
        qty_on_stock: 0
      }
    });
  }
});

// ===== START SERVER =====
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Inventory Proxy Server running on port ${PORT}`);
});
