/**
 * Declarative mirror of `backend/prisma/schema.prisma`.
 *
 * This replaces the Prisma-generated client. It describes, for every model:
 *  - which RTDB path it lives under
 *  - every field, its storage type, nullability and default
 *  - how relations are resolved for `include`
 *  - which keys are logically unique (RTDB cannot enforce these, so the
 *    model layer must check them before writing)
 *
 * `t` (type) controls serialization:
 *  - 'date'         stored as an ISO-8601 string, hydrated back to a Date
 *  - 'stringArray'  stored as a JSON array
 *  - 'number' | 'float' | 'boolean' | 'string' stored as-is
 *
 * `n` marks a nullable field. RTDB strips null/undefined on write, so a
 * missing key is hydrated to `null` for these fields to keep response shapes
 * identical to what Prisma produced.
 *
 * `d` is the default applied when a non-nullable field is absent.
 */

export type FieldType =
  | 'string'
  | 'number'
  | 'float'
  | 'boolean'
  | 'date'
  | 'stringArray';

export interface FieldDef {
  t: FieldType;
  /** Nullable — an absent key hydrates to `null` rather than the default. */
  n?: boolean;
  /** Default applied to a non-nullable field when the key is absent. */
  d?: unknown;
}

export interface HasManyRelation {
  kind: 'hasMany';
  target: string;
  targetForeignKey: string;
}

export interface BelongsToRelation {
  kind: 'belongsTo';
  target: string;
  foreignKey: string;
}

export type Relation = HasManyRelation | BelongsToRelation;

export interface ModelDef {
  path: string;
  fields: Record<string, FieldDef>;
  relations: Record<string, Relation>;
  /** Groups of fields that must be jointly unique across the collection. */
  unique: string[][];
}

/** A hydrated row as the query engine sees it. */
export type Row = Record<string, any>;

// ---------------------------------------------------------------------------
// Field shortcuts
// ---------------------------------------------------------------------------

const str = (d?: string, n = false): FieldDef => ({
  t: 'string',
  ...(n ? { n: true } : {}),
  ...(d !== undefined ? { d } : {}),
});
const num = (d = 0, n = false): FieldDef => ({
  t: 'number',
  ...(n ? { n: true } : {}),
  d,
});
const float = (d = 0, n = false): FieldDef => ({
  t: 'float',
  ...(n ? { n: true } : {}),
  d,
});
const bool = (d = false): FieldDef => ({ t: 'boolean', d });
const date = (n = false): FieldDef => ({ t: 'date', ...(n ? { n: true } : {}) });
const strArray = (): FieldDef => ({ t: 'stringArray', d: [] });

// ---------------------------------------------------------------------------
// Models
// ---------------------------------------------------------------------------

const userFields: Record<string, FieldDef> = {
  id: str(),
  email: str(),
  password: str(),
  name: str(undefined, true),
  phone: str(undefined, true),
  role: str('CUSTOMER'),
  tier: str('Bronze'),
  dateOfBirth: date(true),
  ageVerified: bool(false),
  emailVerified: bool(false),
  isActive: bool(true),
  resetToken: str(undefined, true),
  resetTokenExpiry: date(true),
  createdAt: date(),
  updatedAt: date(),
};

const addressFields: Record<string, FieldDef> = {
  id: str(),
  userId: str(),
  type: str(),
  name: str(undefined, true),
  street: str(),
  unit: str(undefined, true),
  building: str(undefined, true),
  postalCode: str(),
  district: str(),
  city: str('Singapore'),
  country: str('SG'),
  latitude: float(0, true),
  longitude: float(0, true),
  isDefault: bool(false),
  deliveryNotes: str(undefined, true),
  createdAt: date(),
  updatedAt: date(),
};

const categoryFields: Record<string, FieldDef> = {
  id: str(),
  name: str(),
  slug: str(),
  description: str(undefined, true),
  image: str(undefined, true),
  sortOrder: num(0),
  isActive: bool(true),
  createdAt: date(),
  updatedAt: date(),
};

const productFields: Record<string, FieldDef> = {
  id: str(),
  name: str(),
  brand: str(),
  slug: str(),
  description: str(undefined, true),
  price: float(),
  comparePrice: float(0, true),
  costPrice: float(0, true),
  sku: str(undefined, true),
  barcode: str(undefined, true),
  category: str(),
  volume: str(),
  abv: str(),
  origin: str(undefined, true),
  stock: num(0),
  lowStockAlert: num(10),
  isActive: bool(true),
  isFeatured: bool(false),
  images: strArray(),
  thumbnail: str(undefined, true),
  tags: strArray(),
  searchTerms: str(undefined, true),
  viewCount: num(0),
  salesCount: num(0),
  createdAt: date(),
  updatedAt: date(),
  categoryId: str(undefined, true),
};

const cartFields: Record<string, FieldDef> = {
  id: str(),
  userId: str(),
  createdAt: date(),
  updatedAt: date(),
};

const cartItemFields: Record<string, FieldDef> = {
  id: str(),
  cartId: str(),
  productId: str(),
  quantity: num(1),
  createdAt: date(),
  updatedAt: date(),
};

const orderFields: Record<string, FieldDef> = {
  id: str(),
  orderNumber: str(),
  userId: str(),
  status: str('PENDING'),
  subtotal: float(),
  deliveryFee: float(),
  discount: float(0),
  tax: float(0),
  total: float(),
  paymentMethod: str(),
  paymentStatus: str('PENDING'),
  stripePaymentId: str(undefined, true),
  addressId: str(),
  deliveryNotes: str(undefined, true),
  estimatedDelivery: date(true),
  deliveredAt: date(true),
  lalamoveOrderId: str(undefined, true),
  lalamoveStatus: str(undefined, true),
  lalamoveDriverId: str(undefined, true),
  lalamoveDriverName: str(undefined, true),
  lalamoveDriverPhone: str(undefined, true),
  lalamoveDriverPlate: str(undefined, true),
  lalamoveTrackingUrl: str(undefined, true),
  customerName: str(),
  customerPhone: str(),
  customerEmail: str(),
  notes: str(undefined, true),
  cancelReason: str(undefined, true),
  createdAt: date(),
  updatedAt: date(),
};

const orderItemFields: Record<string, FieldDef> = {
  id: str(),
  orderId: str(),
  productId: str(),
  productName: str(),
  brand: str(),
  volume: str(),
  price: float(),
  quantity: num(1),
  subtotal: float(),
  createdAt: date(),
};

const reviewFields: Record<string, FieldDef> = {
  id: str(),
  userId: str(),
  productId: str(),
  rating: num(0),
  title: str(undefined, true),
  comment: str(undefined, true),
  isVerified: bool(false),
  isPublished: bool(true),
  createdAt: date(),
  updatedAt: date(),
};

const deliveryZoneFields: Record<string, FieldDef> = {
  id: str(),
  name: str(),
  postalCodeStart: str(),
  postalCodeEnd: str(),
  deliveryFee: float(),
  minOrderAmount: float(),
  estimatedTime: num(0),
  isActive: bool(true),
  createdAt: date(),
  updatedAt: date(),
};

const promotionFields: Record<string, FieldDef> = {
  id: str(),
  code: str(),
  name: str(),
  description: str(undefined, true),
  type: str(),
  value: float(),
  minPurchase: float(0, true),
  maxDiscount: float(0, true),
  startDate: date(),
  endDate: date(),
  usageLimit: num(0, true),
  usageCount: num(0),
  isActive: bool(true),
  createdAt: date(),
  updatedAt: date(),
};

const settingsFields: Record<string, FieldDef> = {
  id: str(),
  key: str(),
  value: str(),
  type: str(),
  createdAt: date(),
  updatedAt: date(),
};

export const MODELS: Record<string, ModelDef> = {
  user: {
    path: 'users',
    fields: userFields,
    relations: {
      addresses: { kind: 'hasMany', target: 'address', targetForeignKey: 'userId' },
      orders: { kind: 'hasMany', target: 'order', targetForeignKey: 'userId' },
      reviews: { kind: 'hasMany', target: 'review', targetForeignKey: 'userId' },
    },
    unique: [['email']],
  },
  address: {
    path: 'addresses',
    fields: addressFields,
    relations: {
      user: { kind: 'belongsTo', target: 'user', foreignKey: 'userId' },
      orders: { kind: 'hasMany', target: 'order', targetForeignKey: 'addressId' },
    },
    unique: [],
  },
  category: {
    path: 'categories',
    fields: categoryFields,
    relations: {
      products: { kind: 'hasMany', target: 'product', targetForeignKey: 'categoryId' },
    },
    unique: [['name'], ['slug']],
  },
  product: {
    path: 'products',
    fields: productFields,
    relations: {
      categoryRel: { kind: 'belongsTo', target: 'category', foreignKey: 'categoryId' },
      orderItems: { kind: 'hasMany', target: 'orderItem', targetForeignKey: 'productId' },
      reviews: { kind: 'hasMany', target: 'review', targetForeignKey: 'productId' },
      cartItems: { kind: 'hasMany', target: 'cartItem', targetForeignKey: 'productId' },
    },
    unique: [['slug']],
  },
  cart: {
    path: 'carts',
    fields: cartFields,
    relations: {
      user: { kind: 'belongsTo', target: 'user', foreignKey: 'userId' },
      items: { kind: 'hasMany', target: 'cartItem', targetForeignKey: 'cartId' },
    },
    unique: [['userId']],
  },
  cartItem: {
    path: 'cartItems',
    fields: cartItemFields,
    relations: {
      cart: { kind: 'belongsTo', target: 'cart', foreignKey: 'cartId' },
      product: { kind: 'belongsTo', target: 'product', foreignKey: 'productId' },
    },
    unique: [['cartId', 'productId']],
  },
  order: {
    path: 'orders',
    fields: orderFields,
    relations: {
      user: { kind: 'belongsTo', target: 'user', foreignKey: 'userId' },
      address: { kind: 'belongsTo', target: 'address', foreignKey: 'addressId' },
      items: { kind: 'hasMany', target: 'orderItem', targetForeignKey: 'orderId' },
    },
    unique: [['orderNumber']],
  },
  orderItem: {
    path: 'orderItems',
    fields: orderItemFields,
    relations: {
      order: { kind: 'belongsTo', target: 'order', foreignKey: 'orderId' },
      product: { kind: 'belongsTo', target: 'product', foreignKey: 'productId' },
    },
    unique: [],
  },
  review: {
    path: 'reviews',
    fields: reviewFields,
    relations: {
      user: { kind: 'belongsTo', target: 'user', foreignKey: 'userId' },
      product: { kind: 'belongsTo', target: 'product', foreignKey: 'productId' },
    },
    unique: [['userId', 'productId']],
  },
  deliveryZone: {
    path: 'deliveryZones',
    fields: deliveryZoneFields,
    relations: {},
    unique: [['name']],
  },
  promotion: {
    path: 'promotions',
    fields: promotionFields,
    relations: {},
    unique: [['code']],
  },
  settings: {
    path: 'settings',
    fields: settingsFields,
    relations: {},
    unique: [['key']],
  },
};

/** Logical model name -> RTDB path. */
export function pathFor(model: string): string {
  const def = MODELS[model];
  if (!def) throw new Error(`Unknown model: ${model}`);
  return def.path;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** RFC4122 v4 UUID, matching Prisma's `@default(uuid())`. */
export function uuid(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  }
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** Serializes a value for storage. Dates become ISO strings; null/undefined drop out. */
export function serializeValue(def: FieldDef, value: unknown): unknown {
  if (value === undefined || value === null) return null;

  switch (def.t) {
    case 'date':
      if (value instanceof Date) return isNaN(value.getTime()) ? null : value.toISOString();
      if (typeof value === 'string') return value;
      return null;
    case 'number':
    case 'float': {
      const n = typeof value === 'string' ? Number(value) : value;
      return typeof n === 'number' && isFinite(n) ? n : null;
    }
    case 'boolean':
      return Boolean(value);
    case 'stringArray':
      return Array.isArray(value)
        ? value.filter((v) => v !== undefined && v !== null)
        : [];
    case 'string':
      return String(value);
    default:
      return value;
  }
}

/** Converts a stored value back into the shape the API returned with Prisma. */
export function hydrateValue(def: FieldDef, value: unknown): any {
  // RTDB strips nulls, so an absent key means "was null".
  if (value === undefined || value === null) {
    if (def.n) return null;
    return def.d !== undefined ? cloneDefault(def.d) : null;
  }

  switch (def.t) {
    case 'date':
      if (value instanceof Date) return value;
      if (typeof value === 'string') {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      return null;
    case 'number':
    case 'float': {
      const n = typeof value === 'string' ? Number(value) : value;
      return typeof n === 'number' && isFinite(n) ? n : (def.d as number) ?? 0;
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : Boolean(value);
    case 'stringArray':
      return Array.isArray(value) ? [...value] : [];
    case 'string':
      return typeof value === 'string' ? value : String(value);
    default:
      return value;
  }
}

function cloneDefault(d: unknown): unknown {
  if (Array.isArray(d)) return [...d];
  if (d && typeof d === 'object') return { ...(d as object) };
  return d;
}

/**
 * Builds a full record from a raw RTDB snapshot.
 * Missing/`null` keys are filled in so JSON responses match Prisma's shape
 * exactly (RTDB would otherwise omit those keys entirely).
 */
export function hydrate(model: string, id: string, raw: Row): Row {
  const def = MODELS[model];
  if (!def) throw new Error(`Unknown model: ${model}`);

  const out: Row = {};
  for (const [key, field] of Object.entries(def.fields)) {
    if (key === 'id') {
      out.id = id;
      continue;
    }
    out[key] = hydrateValue(field, raw[key]);
  }
  return out;
}

/**
 * Converts an incoming write payload into RTDB storage form.
 * Unknown keys are preserved (routes spread arbitrary bodies in some places),
 * declared fields are serialized by type, and nulls are dropped so RTDB
 * treats them as deletions.
 */
export function serialize(model: string, data: Row): Record<string, unknown> {
  const def = MODELS[model];
  if (!def) throw new Error(`Unknown model: ${model}`);

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (key === 'id') continue; // the key is the id; never store a duplicate
    const field = def.fields[key];
    if (!field) {
      // Unknown key (route spread an unvalidated body). Store as-is, minus nulls.
      if (value !== undefined && value !== null) out[key] = value;
      continue;
    }
    const serialized = serializeValue(field, value);
    if (serialized !== null) out[key] = serialized;
  }
  return out;
}
