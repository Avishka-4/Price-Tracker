// ---------------------------------------------------------------------------
// API Lambda — CRUD endpoints for the Next.js dashboard
// ---------------------------------------------------------------------------
const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  ScanCommand,
  PutCommand,
  DeleteCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE = process.env.TABLE_NAME;

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
    body: JSON.stringify(body),
  };
}

// ---- Handlers ----

async function listProducts() {
  const { Items = [] } = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: "sk = :meta",
      ExpressionAttributeValues: { ":meta": "META" },
    })
  );
  return response(200, Items);
}

async function addProduct(body) {
  const { url } = JSON.parse(body);
  if (!url || typeof url !== "string") {
    return response(400, { error: "Missing or invalid 'url' field" });
  }

  try {
    new URL(url); // validate URL format
  } catch {
    return response(400, { error: "Invalid URL format" });
  }

  const now = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: TABLE,
      Item: {
        productUrl: url,
        sk: "META",
        currentPrice: null,
        createdAt: now,
        updatedAt: now,
      },
    })
  );
  return response(201, { productUrl: url, createdAt: now });
}

async function deleteProduct(encodedUrl) {
  const productUrl = decodeURIComponent(encodedUrl);

  // Delete META item
  await ddb.send(
    new DeleteCommand({ TableName: TABLE, Key: { productUrl, sk: "META" } })
  );

  // Delete all history items
  const { Items = [] } = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "productUrl = :url",
      ExpressionAttributeValues: { ":url": productUrl },
    })
  );

  for (const item of Items) {
    await ddb.send(
      new DeleteCommand({
        TableName: TABLE,
        Key: { productUrl: item.productUrl, sk: item.sk },
      })
    );
  }

  return response(200, { deleted: productUrl });
}

async function getHistory(encodedUrl) {
  const productUrl = decodeURIComponent(encodedUrl);

  const { Items = [] } = await ddb.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "productUrl = :url AND sk > :after",
      ExpressionAttributeValues: { ":url": productUrl, ":after": "0" },
      ScanIndexForward: true,
    })
  );

  return response(
    200,
    Items.map((i) => ({ timestamp: i.sk, price: i.price }))
  );
}

// ---- Router ----

exports.handler = async (event) => {
  const method = event.httpMethod;
  const path = event.path;

  if (method === "OPTIONS") {
    return response(200, {});
  }

  if (method === "GET" && path === "/products") {
    return listProducts();
  }

  if (method === "POST" && path === "/products") {
    return addProduct(event.body);
  }

  if (method === "DELETE" && path.startsWith("/products/")) {
    const encodedUrl = path.replace("/products/", "");
    return deleteProduct(encodedUrl);
  }

  if (method === "GET" && path.match(/^\/products\/.+\/history$/)) {
    const encodedUrl = path.replace("/products/", "").replace("/history", "");
    return getHistory(encodedUrl);
  }

  return response(404, { error: "Not found" });
};
