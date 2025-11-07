# API Integration Guide

## Overview
The frontend is now connected to your FastAPI backend running at `http://127.0.0.1:8000`.

## API Service (`src/services/apiService.ts`)

### Configuration
```typescript
const USE_LIVE_API = true;  // Master switch: true = live API, false = mock data
const API_URL = 'http://127.0.0.1:8000/api/v1';  // Your FastAPI base URL
```

### Available Functions

#### `getOptionChain(symbol: string)`
Fetches live option chain data for a given symbol (NIFTY, BANKNIFTY, etc.).

**Endpoint**: `GET /api/v1/option-chain/{symbol}`

**Response Format**:
```typescript
{
  symbol: string;
  underlyingPrice: number;
  timestamp: string;
  expiryDate: string;
  legs: OptionLeg[];
}
```

**Error Handling**: Falls back to mock data if API call fails.

#### `getVolatilityData(symbol: string)`
Currently returns mock data. Uncomment the live API code when backend endpoint is ready.

## Components Using Live Data

### OptionChainTable
- Fetches data on mount
- Auto-refreshes every 60 seconds
- Shows loading indicator
- Displays live underlying price, expiry, and last updated time
- Highlights ATM strikes based on live data

**Usage**:
```tsx
const [chainData, setChainData] = useState<OptionChainData>(MOCK_NIFTY_CHAIN);
const data = await getOptionChain(currentSymbol);
setChainData(data);
```

## How to Switch Between Live and Mock Data

1. **Use Live API**: Set `USE_LIVE_API = true` in `apiService.ts`
2. **Use Mock Data**: Set `USE_LIVE_API = false` in `apiService.ts`

## Adding New Endpoints

When you create new backend endpoints:

1. Add the endpoint function to `apiService.ts`:
```typescript
export const getNewData = async (symbol: string): Promise<NewDataType> => {
  if (USE_LIVE_API) {
    try {
      const response = await axios.get(`${API_URL}/new-endpoint/${symbol}`);
      return response.data;
    } catch (err) {
      console.error(`Error:`, err);
      return MOCK_NEW_DATA;
    }
  } else {
    return simulateDelay(MOCK_NEW_DATA) as Promise<NewDataType>;
  }
};
```

2. Use it in your component:
```tsx
const [data, setData] = useState<NewDataType>(MOCK_NEW_DATA);

useEffect(() => {
  const fetchData = async () => {
    const result = await getNewData(symbol);
    setData(result);
  };
  fetchData();
}, [symbol]);
```

## CORS Configuration

Make sure your backend allows requests from your frontend:

**Backend (`main.py`)**:
```python
origins = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000").split(',')
```

**Environment Variable (`.env`)**:
```
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

## Testing the Connection

1. **Start Backend**:
```bash
cd backend
.\venv\Scripts\Activate.ps1
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

2. **Start Frontend**:
```bash
cd frontend
npm run dev
```

3. **Check Browser Console** for API requests:
   - You should see network requests to `http://127.0.0.1:8000`
   - Check for any CORS errors or connection issues

4. **Verify Data**:
   - Navigate to "Option Chain" tab
   - Data should load within a few seconds
   - Check "Last Updated" timestamp for live data

## Troubleshooting

### CORS Errors
- Make sure backend CORS middleware includes your frontend URL
- Restart backend after changing CORS settings

### Connection Refused
- Verify backend is running on port 8000
- Check `API_URL` in `apiService.ts` matches backend URL

### Data Not Updating
- Check browser console for errors
- Verify backend `/api/v1/option-chain/{symbol}` endpoint returns valid JSON
- Test endpoint directly: `http://127.0.0.1:8000/api/v1/option-chain/NIFTY`

### Fallback to Mock Data
- If API call fails, the frontend automatically uses mock data
- Check console for error messages to diagnose the issue

