// Local directory. Bank coverage checked against RBI on 9 November 2026.
// Logo provenance is in assets/institutions/sources.json.
const INSTITUTIONS=[
  {
    "id": "au",
    "name": "AU Small Finance Bank",
    "kind": "bank",
    "website": "https://www.au.bank.in",
    "logo": "assets/institutions/au.png",
    "aliases": [
      "AU Bank",
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "https://www.au.bank.in/favicon.ico"
  },
  {
    "id": "axis",
    "name": "Axis Bank",
    "kind": "bank",
    "website": "https://www.axisbank.com",
    "logo": "assets/institutions/axis-hd.png",
    "logoSource": "User-provided bank logo",
    "aliases": [
      "Axis"
    ],
    "category": "private-sector"
  },
  {
    "id": "bob",
    "name": "Bank of Baroda",
    "kind": "bank",
    "website": "https://bankofbaroda.bank.in",
    "logo": null,
    "aliases": [
      "BOB",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "boi",
    "name": "Bank of India",
    "kind": "bank",
    "website": "https://bankofindia.bank.in",
    "logo": null,
    "aliases": [
      "BOI",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "bom",
    "name": "Bank of Maharashtra",
    "kind": "bank",
    "website": "https://bankofmaharashtra.bank.in",
    "logo": "assets/institutions/bom.ico",
    "aliases": [
      "BOM",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "https://bankofmaharashtra.bank.in/favicon.ico"
  },
  {
    "id": "canara",
    "name": "Canara Bank",
    "kind": "bank",
    "website": "https://canarabank.com",
    "logo": "assets/institutions/canara.png",
    "logoSource": "https://www.canarabank.bank.in:443/documents/20126/33915/fevicon.png/666e26af-cafc-b26d-eb4b-a33d3417c5ba",
    "aliases": [
      "Canara",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "capital",
    "name": "Capital Small Finance Bank",
    "kind": "bank",
    "website": "https://www.capital.bank.in",
    "logo": null,
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "central",
    "name": "Central Bank of India",
    "kind": "bank",
    "website": "https://centralbank.bank.in",
    "logo": null,
    "aliases": [
      "CBI",
      "Central Bank",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "equitas",
    "name": "Equitas Small Finance Bank",
    "kind": "bank",
    "website": "https://equitas.bank.in",
    "logo": null,
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "esaf",
    "name": "ESAF Small Finance Bank",
    "kind": "bank",
    "website": "https://www.esaf.bank.in",
    "logo": null,
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "hdfc",
    "name": "HDFC Bank",
    "kind": "bank",
    "website": "https://www.hdfcbank.com",
    "logo": "assets/institutions/hdfc-hd.png",
    "logoSource": "User-provided bank logo",
    "aliases": [
      "HDFC"
    ],
    "category": "private-sector"
  },
  {
    "id": "icici",
    "name": "ICICI Bank",
    "kind": "bank",
    "website": "https://www.icicibank.com",
    "logo": "assets/institutions/icici.ico",
    "logoSource": "https://www.icici.bank.in/favicon.ico",
    "aliases": [
      "ICICI"
    ],
    "category": "private-sector"
  },
  {
    "id": "idfc",
    "name": "IDFC FIRST Bank",
    "kind": "bank",
    "website": "https://www.idfcfirstbank.com",
    "logo": "assets/institutions/idfc.ico",
    "logoSource": "https://www.idfcfirst.bank.in/content/dam/idfcfirstbank/images/common/favicon.ico",
    "aliases": [
      "IDFC",
      "IDFC First"
    ],
    "category": "private-sector"
  },
  {
    "id": "indian",
    "name": "Indian Bank",
    "kind": "bank",
    "website": "https://indianbank.bank.in",
    "logo": null,
    "aliases": [
      "Indian Bank",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "iob",
    "name": "Indian Overseas Bank",
    "kind": "bank",
    "website": "https://www.iob.bank.in",
    "logo": "assets/institutions/iob.png",
    "aliases": [
      "IOB",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "https://www.iob.bank.in/documents/20117/34247/iob-favicon/6fbbedc9-a8f7-9403-4738-e3ea62b6865d"
  },
  {
    "id": "jana",
    "name": "Jana Small Finance Bank",
    "kind": "bank",
    "website": "https://www.jana.bank.in",
    "logo": null,
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "kotak",
    "name": "Kotak Mahindra Bank",
    "kind": "bank",
    "website": "https://www.kotak.bank.in",
    "logo": "assets/institutions/kotak.ico",
    "aliases": [
      "Kotak"
    ],
    "category": "private-sector",
    "logoSource": "https://www.kotak.bank.in/etc/designs/kotak/clientlib-site/images/favicon.ico"
  },
  {
    "id": "punjabsind",
    "name": "Punjab & Sind Bank",
    "kind": "bank",
    "website": "https://punjabandsind.bank.in",
    "logo": null,
    "aliases": [
      "Punjab and Sind Bank",
      "PSB",
      "government",
      "govt",
      "public sector",
      "Punjab Sind"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "pnb",
    "name": "Punjab National Bank",
    "kind": "bank",
    "website": "https://www.pnbindia.in",
    "logo": "assets/institutions/pnb-hd.svg",
    "logoSource": "User-provided bank logo",
    "aliases": [
      "PNB",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "shivalik",
    "name": "Shivalik Small Finance Bank",
    "kind": "bank",
    "website": "https://shivalik.bank.in",
    "logo": "assets/institutions/shivalik.ico",
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "https://shivalik.bank.in/public/frontendassets/favicon.ico"
  },
  {
    "id": "slice",
    "name": "slice Small Finance Bank",
    "kind": "bank",
    "website": "https://slice.bank.in",
    "logo": "assets/institutions/slice-hd.png",
    "aliases": [
      "Slice",
      "North East Small Finance Bank",
      "NorthEast",
      "NESFB",
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "User-provided bank logo"
  },
  {
    "id": "sbi",
    "name": "State Bank of India",
    "kind": "bank",
    "website": "https://sbi.bank.in",
    "logo": "assets/institutions/sbi-hd.png",
    "aliases": [
      "SBI",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "User-provided bank logo"
  },
  {
    "id": "suryoday",
    "name": "Suryoday Small Finance Bank",
    "kind": "bank",
    "website": "https://suryoday.bank.in",
    "logo": "assets/institutions/suryoday-hd.jpeg",
    "aliases": [
      "Suryodhay",
      "Suryodaya",
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "User-provided bank logo"
  },
  {
    "id": "uco",
    "name": "UCO Bank",
    "kind": "bank",
    "website": "https://www.uco.bank.in",
    "logo": null,
    "aliases": [
      "UCO",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "ujjivan",
    "name": "Ujjivan Small Finance Bank",
    "kind": "bank",
    "website": "https://www.ujjivansfb.bank.in",
    "logo": "assets/institutions/ujjivan.ico",
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "https://www.ujjivansfb.bank.in/favicon.ico?favicon.1i64lx3clu_hc.ico"
  },
  {
    "id": "union",
    "name": "Union Bank of India",
    "kind": "bank",
    "website": "https://www.unionbankofindia.bank.in",
    "logo": null,
    "aliases": [
      "Union Bank",
      "UBI",
      "government",
      "govt",
      "public sector"
    ],
    "category": "public-sector",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx"
  },
  {
    "id": "unity",
    "name": "Unity Small Finance Bank",
    "kind": "bank",
    "website": "https://unity.bank.in",
    "logo": "assets/institutions/unity.png",
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "https://unity.bank.in/apple-icon-57x57.png"
  },
  {
    "id": "utkarsh",
    "name": "Utkarsh Small Finance Bank",
    "kind": "bank",
    "website": "https://www.utkarsh.bank.in",
    "logo": "assets/institutions/utkarsh-hd.webp",
    "aliases": [
      "SFB"
    ],
    "category": "small-finance",
    "directorySource": "https://www.rbi.org.in/commonman/english/scripts/banksinindia.aspx",
    "logoSource": "User-provided bank logo"
  },
  {
    "id": "angel",
    "name": "Angel One",
    "kind": "broker",
    "website": "https://www.angelone.in",
    "logo": "assets/institutions/angel.ico",
    "logoSource": "https://www.angelone.in/favicon.ico?4c954757134ac408",
    "aliases": []
  },
  {
    "id": "groww",
    "name": "Groww",
    "kind": "broker",
    "website": "https://groww.in",
    "logo": "assets/institutions/groww.ico",
    "logoSource": "https://groww.in/favicon32x32-groww.ico",
    "aliases": []
  },
  {
    "id": "hdfcsec",
    "name": "HDFC Securities",
    "kind": "broker",
    "website": "https://www.hdfcsec.com",
    "logo": "assets/institutions/hdfcsec.ico",
    "logoSource": "https://www.hdfcsec.com/favicon.ico",
    "aliases": [
      "HDFC Sec"
    ]
  },
  {
    "id": "icicidirect",
    "name": "ICICI Direct",
    "kind": "broker",
    "website": "https://www.icicidirect.com",
    "logo": "assets/institutions/icicidirect.png",
    "logoSource": "https://www.icicidirect.com/Content/images/favicon.ico",
    "aliases": [
      "ICICI Direct"
    ]
  },
  {
    "id": "upstox",
    "name": "Upstox",
    "kind": "broker",
    "website": "https://upstox.com",
    "logo": "assets/institutions/upstox.ico",
    "logoSource": "https://upstox.com/marketing-page-assets/favicon/favicon.ico",
    "aliases": []
  },
  {
    "id": "zerodha",
    "name": "Zerodha",
    "kind": "broker",
    "website": "https://zerodha.com",
    "logo": "assets/institutions/zerodha.png",
    "logoSource": "https://zerodha.com/static/images/favicon.png",
    "aliases": []
  }
];
