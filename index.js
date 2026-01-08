const express = require("express");
const cors = require("cors");
const NodeCache = require("node-cache");

const { callFarmersAPI } = require("./services/farmersApi");

const app = express();
const cache = new NodeCache({ stdTTL: 300 }); // 5 phút

app.use(cors());
app.use(express.json());

/**
 * Health check
 */
app.get("/", (req, res) => {
  res.json({
    ok: true,
    msg: "API Server is running",
    time: new Date().toISOString()
  });
});

/**
 * MAIN API
 */
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
    return res.json({
      status: "OK",
      source: "cache",
      data: cache.get(cacheKey)
    });
  }

  try {
    const apiResult = await callFarmersAPI(company, barcode);

    const item =
      Array.isArray(apiResult?.value) && apiResult.value.length > 0
        ? apiResult.value[0]
        : null;

    if (!item) {
      return res.json({
        status: "NOT_FOUND",
        data: {
          item_code: "",
          item_name: "",
          qty_on_stock: 0
        }
      });
    }

    const normalized = {
      item_code: item.ItemCode || "",
      item_name: item.ItemName || "",
      qty_on_stock: item.QuantityOnStock || 0
    };

    cache.set(cacheKey, normalized);

    return res.json({
      status: "OK",
      source: "api",
      data: normalized
    });
  } catch (err) {
    console.error("❌ API ERROR:", err.message);
    return res.status(500).json({
      status: "ERROR",
      message: "Cannot get item"
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
