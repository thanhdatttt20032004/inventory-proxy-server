const express = require("express");
const cors = require("cors");
const NodeCache = require("node-cache");

const { callFarmersAPI } = require("./services/farmersApi");
const config = require("./config");

const app = express();
const cache = new NodeCache({ stdTTL: config.CACHE_TTL });

app.use(cors());
app.use(express.json());

app.post("/get-item", async (req, res) => {
  const { company, barcode } = req.body;

  if (!company || !barcode) {
    return res.status(400).json({
      status: "ERROR",
      message: "Missing company or barcode"
    });
  }

  const cacheKey = `${company}_${barcode}`;

  if (cache.has(cacheKey)) {
    console.log("[CACHE HIT]", cacheKey);
    return res.json({
      status: "OK",
      source: "cache",
      data: cache.get(cacheKey)
    });
  }

  try {
const apiResult = await callFarmersAPI(company, barcode);

// 🔍 lấy item đầu tiên trong mảng value
const item = Array.isArray(apiResult?.value) && apiResult.value.length > 0
  ? apiResult.value[0]
  : null;

const normalized = {
  item_code: item?.ItemCode || "",
  item_name: item?.ItemName || "",
  qty_on_stock: item?.QuantityOnStock || 0
};  
    cache.set(cacheKey, normalized);

    return res.json({
      status: "OK",
      source: "api",
      data: normalized
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      status: "ERROR",
      message: "Cannot get item"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Inventory Proxy Server running on port ${PORT}`);
});
