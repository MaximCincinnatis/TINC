# TINC Burn Tracker Dashboard

Web dashboard to track TINC token burns on Ethereum.

## Quick Start

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Run the application:
```bash
python app.py
```

3. Open browser to http://localhost:6000

## Features
- Displays TINC burns from last 15 days
- Auto-refreshes every 5 minutes
- Uses multiple RPC endpoints with fallback
- Caches data to minimize RPC calls

## Port Configuration
This project runs exclusively on port 6000. Do not change the port as other ports (3000, 4000, 5000) are reserved for other projects.Thu Aug 14 16:27:43 PDT 2025: Force deployment trigger
