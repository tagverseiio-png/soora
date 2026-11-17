/**
 * One-time migration: legacy MongoDB -> Firebase Realtime Database.
 *
 *   node scripts/migrate-mongo-to-rtdb.js [--dry-run] [--force]
 *   (or: npm run migrate)
 *
 * Reads every document from the old Atlas database and writes it to the RTDB
 * path declared in `src/data/schema.ts`, transforming:
 *
 *   - `_id` becomes the RTDB key. Mongo used string UUIDs here (not
 *     ObjectIds), so they key straight across — which matters for `users`,
 *     because `routes/auth.ts` adopts an orphaned profile by looking it up
 *     under its old key and re-keying it to the Firebase uid on first sign-up.
 *   - BSON `Date` -> ISO-8601 string, via the schema's own `serialize`, so
 *     stored values are byte-identical to what the live write path produces.
 *   - `password` / `resetToken` / `resetTokenExpiry` are dropped from users:
 *     bcrypt hashes are meaningless now that Firebase Auth owns credentials,
 *     and RTDB is readable with a database secret, so keeping them would only
 *     leak dead hashes.
 *
 * Idempotent: a record already present in RTDB is skipped unless `--force`.
 * `--dry-run` reports what would be written without touching RTDB.
 *
 * Requires MONGODB_URI and FIREBASE_DATABASE_SECRET (backend/.env).
 */

require('dotenv').config();

const { MongoClient } = require('mongodb');
const { pathFor, serialize } = require('../dist/data/schema');
const { rtdbGet, rtdbPut } = require('../dist/data/rtdb');

/** Mongo collection -> RTDB model, in dependency-safe order. */
const MAPPING = [
  { mongo: 'Category', model: 'category' },
  { mongo: 'Product', model: 'product' },
  { mongo: 'Settings', model: 'settings' },
  { mongo: 'DeliveryZone', model: 'deliveryZone' },
  { mongo: 'Promotion', model: 'promotion' },
  { mongo: 'User', model: 'user', strip: ['password', 'resetToken', 'resetTokenExpiry'] },
  { mongo: 'Address', model: 'address' },
  { mongo: 'Order', model: 'order' },
  { mongo: 'OrderItem', model: 'orderItem' },
  { mongo: 'Review', model: 'review' },
  { mongo: 'Cart', model: 'cart' },
  { mongo: 'CartItem', model: 'cartItem' },
];

const DRY_RUN = process.argv.includes('--dry-run');
const FORCE = process.argv.includes('--force');

function fail(message) {
  console.error(`\nERROR: ${message}`);
  process.exit(1);
}

if (!process.env.MONGODB_URI) fail('MONGODB_URI is not set in backend/.env');
if (!process.env.FIREBASE_DATABASE_SECRET) {
  fail('FIREBASE_DATABASE_SECRET is not set in backend/.env');
}

/**
 * Converts one Mongo document into the RTDB storage form.
 * Returns null when the document has no `_id` to key it under.
 */
function toStored(model, doc, strip) {
  const { _id, ...rest } = doc;
  if (_id === undefined || _id === null) return null;
  for (const key of strip || []) delete rest[key];
  // `serialize` drops `id` (the key is the id) and coerces every declared
  // field to its storage type; unknown keys pass through unchanged.
  return { id: String(_id), data: serialize(model, { id: String(_id), ...rest }) };
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  await client.connect();
  const db = client.db();

  console.log(DRY_RUN ? 'DRY RUN — nothing will be written\n' : 'Migrating MongoDB -> Firebase RTDB\n');

  let written = 0;
  let skippedExisting = 0;
  let skippedEmpty = 0;
  const errors = [];

  try {
    for (const { mongo, model, strip } of MAPPING) {
      const path = pathFor(model);
      const docs = await db.collection(mongo).find({}).toArray();

      if (docs.length === 0) {
        console.log(`${mongo.padEnd(14)} -> ${path.padEnd(14)}    0 docs (empty in Mongo)`);
        skippedEmpty++;
        continue;
      }

      // One read per collection decides which records already exist, so a
      // re-run never clobbers data that has since changed in RTDB.
      const existing = (await rtdbGet(path)) || {};
      const existingIds = new Set(Object.keys(existing));

      let ok = 0;
      let skip = 0;
      for (const doc of docs) {
        const row = toStored(model, doc, strip);
        if (!row) {
          errors.push(`${mongo}: document without _id: ${JSON.stringify(doc).slice(0, 80)}`);
          continue;
        }
        const id = row.id;
        if (existingIds.has(id) && !FORCE) {
          skip++;
          continue;
        }
        if (DRY_RUN) {
          ok++;
          continue;
        }
        try {
          await rtdbPut(`${path}/${id}`, row.data);
          ok++;
        } catch (err) {
          const size = Buffer.byteLength(JSON.stringify(row.data));
          errors.push(`${mongo}/${id}: ${err.message} (${size} bytes)`);
        }
      }

      written += ok;
      skippedExisting += skip;
      const note = DRY_RUN ? 'would write' : 'written';
      const suffix = skip ? `, ${skip} already in RTDB (skipped)` : '';
      console.log(`${mongo.padEnd(14)} -> ${path.padEnd(14)} ${String(ok).padStart(3)} ${note}${suffix}`);
    }
  } finally {
    await client.close().catch(() => {});
  }

  // Verify by counting what actually landed.
  let verified = 0;
  if (DRY_RUN) {
    console.log('\nVerification skipped (dry run — RTDB untouched).');
  } else {
    console.log('\nVerification (RTDB):');
    for (const { model } of MAPPING) {
      const path = pathFor(model);
      const node = await rtdbGet(path);
      const count = node && typeof node === 'object' ? Object.keys(node).length : 0;
      verified += count;
      console.log(`  ${path.padEnd(14)} ${count} records`);
    }
  }

  console.log(`\n${DRY_RUN ? 'Dry run complete' : 'Migration complete'}: ${written} ${
    DRY_RUN ? 'would be ' : ''
  }written, ${skippedExisting} skipped (already present), ${skippedEmpty} collections empty in Mongo.`);

  if (errors.length) {
    console.error(`\n${errors.length} error(s):`);
    errors.forEach((e) => console.error(`  - ${e}`));
    process.exit(1);
  }
  if (!DRY_RUN && verified === 0) fail('Nothing landed in RTDB — check FIREBASE_DATABASE_SECRET.');
}

main().catch((err) => fail(err.stack || err.message));
