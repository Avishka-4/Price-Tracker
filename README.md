# 📉 Serverless Price Watcher

A fully serverless product-price tracker running on AWS. Add any product URL, and the system scrapes the price every 6 hours and sends you an email when it drops.

## Architecture

```
┌──────────────┐        ┌──────────────┐      ┌──────────────┐
│  Next.js 14  │─────▶ │ API Gateway │─────▶│  Lambda API  │
│  Dashboard   │        │   (REST)     │       │  (CRUD)      │
└──────────────┘        └──────────────┘       └──────┬───────┘
                                                   │
                      ┌──────────────┐      ┌──────▼───────┐
                      │ EventBridge  │─────▶│  Lambda      │
                      │ (every 6 hr) │      │  Scraper     │
                      └──────────────┘      └──────┬───────┘
                                                   │
                                       ┌───────────┼───────────┐
                                       ▼           ▼           ▼
                                 ┌──────────┐ ┌────────┐ ┌─────────┐
                                 │ DynamoDB │ │  SNS   │ │ Email   │
                                 │          │ │ Topic  │ │ Alert   │
                                 └──────────┘ └────────┘ └─────────┘
```

## DynamoDB Schema

| Attribute      | Type   | Description                                        |
| ------------   | ------ | ------------------------------------------------   |
| `productUrl`   | String | **Partition Key** — the tracked product URL        |
| `sk`           | String | **Sort Key** — `"META"` for latest info, or ISO timestamp for history |
| `currentPrice` | Number | Latest scraped price (META item only)              |
| `price`        | Number | Price at point in time (history items only)        |
| `createdAt`    | String | ISO timestamp when tracking started                |
| `updatedAt`    | String | ISO timestamp of last scrape                       |

**Item patterns:**

```
META item → { productUrl: "https://…", sk: "META", currentPrice: 29.99, createdAt: "…", updatedAt: "…" }
History   → { productUrl: "https://…", sk: "2026-03-08T12:00:00Z", price: 29.99 }
```

## Project Structure

```
price-tracker/
├── .github/workflows/deploy.yml   # CI/CD pipeline
├── template.yaml                  # AWS SAM (IaC)
├── lambda/
│   ├── index.js                   # Scraper (EventBridge → Lambda)
│   ├── api.js                     # REST API (API Gateway → Lambda)
│   └── package.json
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx
    │   │   └── globals.css
    │   ├── components/
    │   │   ├── AddUrlForm.tsx
    │   │   └── ProductCard.tsx
    │   └── lib/api.ts
    ├── .env.example
    └── package.json
```

## Prerequisites

- **AWS CLI** configured with credentials
- **AWS SAM CLI** installed
- **Node.js 20+**

## Getting Started

### 1. Deploy the Backend

```bash
cd lambda && npm install && cd ..

sam build
sam deploy --guided
#  Stack Name:    price-watcher
#  Region:        us-east-1
#  Parameter AlertEmail: your@email.com
#  Confirm the SNS subscription email you receive
```

### 2. Run the Frontend Locally

```bash
cd frontend
cp .env.example .env.local
# Edit .env.local → paste the ApiEndpoint output from SAM deploy

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. GitHub Actions Secrets

Set these in your repo → **Settings → Secrets and variables → Actions**:

| Secret               | Description                                 |
| -------------------- | ------------------------------------------- |
| `AWS_ROLE_ARN`       | IAM Role ARN for GitHub OIDC                |
| `ALERT_EMAIL`        | Email for SNS price-drop alerts             |
| `VERCEL_TOKEN`       | *(Optional)* Vercel deploy token            |
| `S3_BUCKET`          | *(Optional)* S3 bucket for static hosting   |
| `CLOUDFRONT_DIST_ID` | *(Optional)* CloudFront distribution ID     |

Set the repository variable `DEPLOY_TARGET` to `vercel` or `s3` to choose a frontend deployment target.

## How It Works

1. **Add a URL** via the dashboard → stored in DynamoDB as a META item.
2. **EventBridge** triggers the Scraper Lambda every 6 hours.
3. The Lambda fetches the page HTML, extracts the price using Cheerio selectors.
4. It writes a **history record** (timestamp + price) and updates the **META item**.
5. If the new price is **lower** than the previous price → **SNS publishes an email alert**.
6. The dashboard reads products and history via the API Lambda.

## Supported Sites

The scraper uses common CSS selectors that work on many e-commerce sites:
- Amazon (`.a-price .a-offscreen`)
- Newegg (`.price-current`)
- Sites using `itemprop="price"` or `.product-price`

To add custom selectors, edit `PRICE_SELECTORS` in `lambda/index.js`.

## License

MIT
