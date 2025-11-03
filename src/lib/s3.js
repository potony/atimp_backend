// src/lib/s3.js
import 'dotenv/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const hasS3Env =
  process.env.AWS_ACCESS_KEY_ID &&
  process.env.AWS_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET;

console.log("[s3] module loaded. hasS3Env =", hasS3Env);

let s3 = null;

if (hasS3Env) {
  s3 = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  console.log(
    "[s3] client ready for bucket",
    process.env.S3_BUCKET,
    "region",
    process.env.AWS_REGION || "ap-south-1"
  );
} else {
  console.warn(
    "⚠️ [s3] not fully configured (missing key/secret/bucket) → will return null"
  );
}

/**
 * Upload hero image to S3.
 * IMPORTANT: we now return the KEY, not a public URL,
 * because the bucket is private.
 */
export async function uploadHeroToS3(buffer, mime, keyFromRoute) {
  console.log("[s3] uploadHeroToS3 called");
  if (!s3) {
    console.log("[s3] no client → returning null (will fallback to local)");
    return null;
  }

  const bucket = process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || "ap-south-1";
  const key = keyFromRoute || `public/hero/hero-${Date.now()}.jpg`;

  try {
    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: buffer,
        ContentType: mime || "image/jpeg",
        // no ACL → bucket is private
      })
    );

    console.log("[s3] ✅ uploaded to S3 with key:", key);

    // RETURN ONLY KEY
    return key;
  } catch (err) {
    console.error("[s3] ❌ upload failed:", err.name, err.message);
    return null;
  }
}

/**
 * Read hero image from S3 as a stream
 */
export async function getHeroStreamFromS3(key) {
  console.log("[s3] getHeroStreamFromS3 called with key:", key);
  if (!s3) {
    console.log("[s3] no client → null");
    return null;
  }
  const bucket = process.env.S3_BUCKET;

  try {
    const resp = await s3.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      })
    );
    console.log("[s3] ✅ got object from S3:", key);
    return resp.Body; // readable stream
  } catch (err) {
    console.error("[s3] ❌ get failed:", err.name, err.message);
    return null;
  }


}


// src/lib/s3.js
export async function uploadFileToS3(buffer, mime, keyFromRoute) {
  // just call the existing helper
  return uploadHeroToS3(buffer, mime, keyFromRoute);
}