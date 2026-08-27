const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// 取得対象のASINリスト（加湿器・キーボードなど紹介商品）
const ASIN_LIST = [
  'B09C1NP6GB', // 山善 KS-J242
  'B08K8YQD5F', // モダンデコ ハイブリッド加湿器
  'B07W223456', // シロカ SD-C113 等
  'B0B8Z7GZX7'  // アイリスオーヤマ 等
];

const ACCESS_KEY = process.env.PAAPI_ACCESS_KEY;
const SECRET_KEY = process.env.PAAPI_SECRET_KEY;
const PARTNER_TAG = process.env.PAAPI_PARTNER_TAG;
const HOST = 'webservices.amazon.co.jp';
const REGION = 'us-west-2';
const SERVICE = 'ProductAdvertisingAPI';

const CACHE_FILE = path.join(__dirname, 'amazon_products_cache.json');

function hmac(key, string, encoding) {
  return crypto.createHmac('sha256', key).update(string, 'utf8').digest(encoding);
}

function getSignatureKey(key, dateStamp, regionName, serviceName) {
  const kDate = hmac('AWS4' + key, dateStamp);
  const kRegion = hmac(kDate, regionName);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, 'aws4_request');
  return kSigning;
}

async function requestPAAPI(payload) {
  return new Promise((resolve, reject) => {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const requestPayload = JSON.stringify(payload);
    const hashedPayload = crypto.createHash('sha256').update(requestPayload, 'utf8').digest('hex');

    const canonicalUri = '/paapi5/getitems';
    const canonicalHeaders = `content-encoding:amz-1.0\ncontent-type:application/json; charset=utf-8\nhost:${HOST}\nx-amz-date:${amzDate}\nx-amz-target:com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems\n`;
    const signedHeaders = 'content-encoding;content-type;host;x-amz-date;x-amz-target';
    const canonicalRequest = `POST\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${hashedPayload}`;

    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${crypto.createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')}`;

    const signingKey = getSignatureKey(SECRET_KEY, dateStamp, REGION, SERVICE);
    const signature = hmac(signingKey, stringToSign, 'hex');

    const authorizationHeader = `${algorithm} Credential=${ACCESS_KEY}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const options = {
      hostname: HOST,
      path: canonicalUri,
      method: 'POST',
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'content-encoding': 'amz-1.0',
        'x-amz-date': amzDate,
        'x-amz-target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.GetItems',
        'Authorization': authorizationHeader,
        'Content-Length': Buffer.byteLength(requestPayload)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => reject(e));
    req.write(requestPayload);
    req.end();
  });
}

async function main() {
  if (!ACCESS_KEY || !SECRET_KEY || !PARTNER_TAG) {
    console.log('認証情報が未設定のため、既存キャッシュを維持します。');
    return;
  }

  const payload = {
    ItemIds: ASIN_LIST,
    Resources: [
      'Images.Primary.Large',
      'ItemInfo.Title',
      'Offers.Listings.Price'
    ],
    PartnerTag: PARTNER_TAG,
    PartnerType: 'Associates',
    Marketplace: 'www.amazon.co.jp'
  };

  try {
    const data = await requestPAAPI(payload);
    const cacheData = {};

    if (data.ItemsResult && data.ItemsResult.Items) {
      for (const item of data.ItemsResult.Items) {
        cacheData[item.ASIN] = {
          title: item.ItemInfo?.Title?.DisplayValue || '',
          imageUrl: item.Images?.Primary?.Large?.URL || '',
          price: item.Offers?.Listings?.[0]?.Price?.DisplayAmount || '',
          updatedAt: new Date().toISOString()
        };
      }
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2), 'utf8');
    console.log('Amazon商品キャッシュを正常に更新しました。');
  } catch (error) {
    console.error('PA-API取得エラー（キャッシュは更新されません）:', error.message);
  }
}

main();
