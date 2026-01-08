const axios = require("axios");
const config = require("../config");

/**
 * Call Farmers Market API
 * @param {string} company
 * @param {string} barcode
 * @returns {object} API response data
 */
async function callFarmersAPI(company, barcode) {
  if (!company || !barcode) {
    throw new Error("Missing company or barcode");
  }

  const params = {
    apikey: config.FARMERS_API_KEY,
    Company: company,
    keysearch: barcode
  };

  let lastError = null;

  for (let attempt = 1; attempt <= (config.RETRY || 3); attempt++) {
    try {
      console.log(`🔵 [FarmersAPI] Attempt ${attempt}`, params);

      const response = await axios.get(config.FARMERS_API_URL, {
        params,
        timeout: config.TIMEOUT || 30000,
        headers: {
          Accept: "application/json"
        }
      });

      // API OK nhưng không có dữ liệu
      if (!response.data) {
        return { value: [] };
      }

      // Chuẩn hóa: đảm bảo luôn có value là array
      if (!Array.isArray(response.data.value)) {
        return { value: [] };
      }

      return response.data;

    } catch (error) {
      lastError = error;

      const status = error.response?.status;
      const msg =
        error.response?.data?.message ||
        error.response?.data ||
        error.message;

      console.error(
        `🔴 [FarmersAPI] Failed attempt ${attempt}`,
        `Status: ${status}`,
        msg
      );

      // Nếu lỗi 4xx (sai API, sai barcode) → không retry vô ích
      if (status && status >= 400 && status < 500) {
        break;
      }
    }
  }

  // Sau tất cả retry đều fail
  throw lastError || new Error("Farmers API failed");
}

module.exports = { callFarmersAPI };
