/**
 * Compatibility shim.
 *
 * The routes import `prisma` from here, and that contract is unchanged —
 * only the engine underneath moved from `@prisma/client` (MongoDB) to the
 * Firebase RTDB client in `../data/client`.
 *
 * `Prisma` is re-exported as a type-only namespace for the few places that
 * annotate with Prisma's input types (e.g. `Prisma.OrderItemCreateWithoutOrderInput`).
 */
export { prisma } from '../data/client';

/** Type-only stand-in for the `Prisma` namespace previously exported by `@prisma/client`. */
export namespace Prisma {
  export type OrderItemCreateWithoutOrderInput = {
    id?: string;
    orderId?: string;
    productId?: string;
    productName: string;
    brand?: string | null;
    volume?: string | null;
    price: number;
    quantity: number;
    subtotal: number;
    product?: { connect: { id: string } };
    createdAt?: Date | string;
  };
}
