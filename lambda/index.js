// ---------------------------------------------------------------------------
// Price Scraper Lambda — triggered every 6 hours by EventBridge
// ---------------------------------------------------------------------------
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
const cheerio = require("cheerio");
const { request } = require("undici");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sns = new SNSClient({});

const TABLE = process.env.TABLE_NAME;
const TOPIC = process.env.SNS_TOPIC_ARN;

// ---- Price-extraction selectors (order matters — first match wins) --------
const PRICE_SELECTORS = [
  ".a-price .a-offscreen",          // Amazon
  "[data-testid='product-price']",  // generic
  ".price-current",                 // Newegg
  ".product-price",
  ".sale-price",
  "[itemprop='price']",
  ".price",
];

/**
 * Fetch HTML from a URL using undici (built into Node 20 runtime).
 */
async function fetchHtml(url) {
  const { body } = await request(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
        "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html",
    },
    maxRedirections: 5,
  });
  return body.text();
}

/**
 * Extract a numeric price from raw HTML.
 */
function extractPrice(html) {
  const $ = cheerio.load(html);

  for (const selector of PRICE_SELECTORS) {
    const el = $(selector).first();
    if (el.length) {
      const raw = el.attr("content") || el.text();
      const cleaned = raw.replace(/[^0-9.]/g, "");
      const price = parseFloat(cleaned);
      if (!isNaN(price) && price > 0) return price;
    }
  }
  return null;
}

/**
 * Process a single product: scrape, compare, store history, alert.
 */
async function processProduct(item) {
  const { productUrl, currentPrice: previousPrice } = item;

  let html;
  try {
    html = await fetchHtml(productUrl);
  } catch (err) {
    console.error(`Failed to fetch ${productUrl}:`, err.message);
    return;
  }

  const newPrice = extractPrice(html);
  if (newPrice === null) {
    console.warn(`Could not extract price from ${productUrl}`);
    return;
  }

  const now = new Date().toISOString();

  // Write price-history record
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: { productUrl, sk: now, price: newPrice },
    })
  );

  // Update the META item with the latest price
  await ddb.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { productUrl, sk: "META" },
      UpdateExpression: "SET currentPrice = :p, updatedAt = :u",
      ExpressionAttributeValues: { ":p": newPrice, ":u": now },
    })
  );

  console.log(
    `${productUrl} — previous: ${previousPrice}, new: ${newPrice}`
  );

  // Alert on price drop
  if (previousPrice !== undefined && newPrice < previousPrice) {
    const drop = (previousPrice - newPrice).toFixed(2);
    await sns.send(
      new PublishCommand({
        TopicArn: TOPIC,
        Subject: `Price Drop Alert! (-$${drop})`,
        Message: [
          `Good news! A product you're tracking dropped in price.`,
          ``,
          `URL:            ${productUrl}`,
          `Previous price: $${previousPrice.toFixed(2)}`,
          `New price:      $${newPrice.toFixed(2)}`,
          `Savings:        $${drop}`,
          ``,
          `Checked at: ${now}`,
        ].join("\n"),
      })
    );
    console.log(`  → SNS alert sent (drop of $${drop})`);
  }
}

/**
 * Lambda handler — scans all META items and scrapes each.
 */
exports.handler = async () => {
  // Get all tracked products (META items only)
  const { Items = [] } = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: "sk = :meta",
      ExpressionAttributeValues: { ":meta": "META" },
    })
  );

  console.log(`Found ${Items.length} products to scrape`);

  // Process sequentially to avoid rate-limiting from target sites
  for (const item of Items) {
    await processProduct(item);
  }

  return { statusCode: 200, body: `Processed ${Items.length} products` };
};
