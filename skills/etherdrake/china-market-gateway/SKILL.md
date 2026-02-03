# China Market Gateway Skill

Retrieve Chinese finance data (A-shares, HK, funds, economic indicators) from Eastmoney, Sina, CLS, Baidu, and other Chinese sources.

## When to Use

Use this skill when you need:
- Real-time/historical stock prices for Chinese A-shares (Shanghai/Shenzhen)
- Hong Kong stock data
- Chinese company financial news
- Mainland China market information
- Baidu Gushitong stock analysis
- Fund NAV and performance data
- Macroeconomic indicators (GDP, CPI, PPI, PMI)
- Investment calendars and economic events

## Usage

```python
from china_market_gateway import YuanData, get_stock_price, get_fund_nav

# Initialize (optional proxy for restricted regions)
data = YuanData(proxy="http://localhost:10809")

# Get A-share price
quote = data.stock.get_quote("sh600519")  # Kweichow Moutai

# Get HK stock price
hk_quote = data.stock.get_quote("hk00700")  # Tencent

# Get fund NAV
fund = data.fund.get_quote("161039")

# Get GDP data
gdp = data.macro.get_gdp()

# Search news
news = data.news.search("茅台")
```

## Stock Code Formats

| Market | Format | Example |
|--------|--------|---------|
| Shanghai A-shares | `sh{code}` | `sh600519` (Moutai) |
| Shenzhen A-shares | `sz{code}` | `sz000001` |
| Hong Kong | `hk{code}` | `hk00700` (Tencent) |
| US ADRs | `us{symbol}` | `usAAPL` |

## Key Functions

### Stock Data
- `get_stock_price(code, proxy=None)` - Real-time stock quote
- `data.stock.get_quote(code)` - Detailed quote from Sina API
- `data.stock.get_quote_tencent(code)` - Tencent Finance alternative

### Fund Data
- `get_fund_nav(code, proxy=None)` - Fund NAV and growth rate
- `data.fund.get_details(code)` - Detailed fund information

### Macro Data
- `data.macro.get_gdp()` - GDP data
- `data.macro.get_cpi()` - Consumer Price Index
- `data.macro.get_ppi()` - Producer Price Index
- `data.macro.get_pmi()` - Purchasing Managers Index

### News
- `data.news.search(keyword, limit=20)` - Search CLS news
- `data.news.get_telegraph_list(limit=50)` - Latest market telegraphs

### Utilities
- `troubleshoot_ticker(code, proxy=None)` - Diagnose non-responsive tickers
- `check_hk_format(code)` - Fix HK stock code formatting

## Data Sources

| Source | Coverage |
|--------|----------|
| Sina Finance | Real-time A-share/HK quotes |
| Tencent Finance | Alternative real-time quotes |
| Eastmoney | Quotes, funds, macro data |
| CLS (财联社) | Market news and telegraphs |
| Baidu Gushitong | Stock analysis pages |

## Notes

- **Time Zone**: China Standard Time (UTC+8)
- **Trading Hours**: 9:30-11:30, 13:00-15:00 CST (with lunch break)
- **Proxy**: May be required outside China
- **Rate Limiting**: Built-in delays between requests
