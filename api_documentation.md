# 📡 CME Project API Documentation

This API provides real-time and historical financial data, market sentiment, and AI-driven analytics for the CME Project dashboard.

## ⚙️ Configuration

| Setting | Value |
| :--- | :--- |
| **Base URL (Remote)** | `https://randee-overpolitic-pearl.ngrok-free.dev` |
| **Base URL (Local)** | `http://localhost:8000` |
| **Auth Header** | `x-api-key` |
| **Demo Key** | `demo-key-123` |

---

## 🔑 Authentication
All requests from external networks (non-localhost) **must** include the API key in the header.

**Header Format:**
`x-api-key: demo-key-123`

---

## 🚀 Available Endpoints

Replace `{symbol}` with any valid stock ticker (e.g., `NIFTY`, `BANKNIFTY`, `RELIANCE`, `HDFCBANK`).

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| **GET** | `/api/v1/option-chain/{symbol}` | Full option chain (Greeks, OI, Price). |
| **GET** | `/api/v1/current-price/{symbol}` | Live price, day change, and % change. |
| **GET** | `/api/v1/historical-price/{symbol}` | Chart data. Query param: `?period=30d` or `intraday`. |
| **GET** | `/api/v1/sentiment/{symbol}` | Market sentiment (PCR & AI insight). |
| **GET** | `/api/v1/max-pain/{symbol}` | Max Pain strike price calculation. |
| **GET** | `/api/v1/open-interest/{symbol}` | Total Call vs. Put OI summary. |
| **GET** | `/api/v1/volatility-spread/{symbol}` | Implied vs. Realized Volatility spread. |
| **GET** | `/api/v1/news/{symbol}` | Latest news articles for the specific symbol. |
| **GET** | `/api/v1/social-buzz/{symbol}` | Social media sentiment & buzz score. |
| **GET** | `/api/v1/alerts/{symbol}` | Technical & PCR-based trading alerts. |

---

💻 Usage Examples
Terminal (cURL)
Use this to quickly test if the API is working.

Bash

# Test connection (Remote)
curl -H "x-api-key: demo-key-123" https://randee-overpolitic-pearl.ngrok-free.dev/api/v1/option-chain/NIFTY


## 💻 Integration Guide (JavaScript / React)

Use this code snippet to fetch data securely.

```javascript
// Config
const API_BASE_URL = "[https://randee-overpolitic-pearl.ngrok-free.dev](https://randee-overpolitic-pearl.ngrok-free.dev)"; // Use localhost:8000 if running locally
const API_KEY = "demo-key-123";

/**
 * Universal Fetcher Function
 * Handles Authentication headers and Error parsing automatically.
 */
const fetchMarketData = async (endpoint) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": API_KEY, // <--- CRITICAL: Authentication
      },
    });

    // Handle common errors
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Data for ${endpoint} is loading or not found.`);
        return null;
      }
      if (response.status === 401) {
        console.error("Unauthorized: Check your API Key.");
        return null;
      }
      throw new Error(`API Error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Network Error:", error);
    return null;
  }
};

// --- Usage Examples ---

// 1. Fetch Option Chain for NIFTY
const loadOptionChain = async () => {
  const data = await fetchMarketData("/api/v1/option-chain/NIFTY");
  if (data) {
    console.log("Underlying Price:", data.underlyingPrice);
    console.log("Legs:", data.legs);
  }
};

// 2. Fetch Market Sentiment
const loadSentiment = async () => {
  const data = await fetchMarketData("/api/v1/sentiment/RELIANCE");
  if (data) {
    console.log("PCR:", data.pcr);
    console.log("AI Insight:", data.detailed_insight);
  }
};

⚠️ Important Notes for Developers
Authentication: You must include the x-api-key header in every request if you are not running on localhost.

Rate Limiting:

Do not spam requests.

Recommended polling interval: Every 60 seconds.

Data Loading:

If you receive a 404 error with the message "Data is still loading", the backend is currently fetching fresh data. Please retry after 30 seconds.

Admin Controls:

To switch data sources (Dhan vs Scraper), contact the backend admin.

Symbol Format: Symbols are case-insensitive (e.g., nifty and NIFTY both work).