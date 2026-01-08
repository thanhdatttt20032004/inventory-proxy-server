const axios = require("axios");
const config = require("../config");

async function callFarmersAPI(company, barcode) {
  const params = {
    apikey: config.FARMERS_API_KEY,
    Company: company,
    keysearch: barcode
  };

  let lastError;

  for (let i = 1; i <= config.RETRY; i++) {
    try {
      console.log(`[FarmersAPI] Try ${i}`, params);

      const res = await axios.get(
        config.FARMERS_API_URL,
        {
          params,
          timeout: config.TIMEOUT
        }
      );

      return res.data;
    } catch (err) {
      lastError = err;
      console.error(
        `[FarmersAPI] Failed try ${i}`,
        err.response?.data || err.message
      );
    }
  }

  throw lastError;
}

module.exports = { callFarmersAPI };
