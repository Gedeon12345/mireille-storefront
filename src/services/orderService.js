import mongoose from "mongoose";
import { env } from "../config/env.js";
import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ApiError } from "../utils/ApiError.js";
import { canTransition, computeTotals, generateOrderNumber, mergeOrderItems } from "./orderRules.js";

const OBJECT_ID_PATTERN = /^[a-f0-9]{24}$/i;
const ORDER_NUMBER_ATTEMPTS = 3;

/** Retrouve une commande par identifiant Mongo ou par numéro (TQ-20260921-K7M2X). */
export function orderLookup(idOrNumber) {
  return OBJECT_ID_PATTERN.test(idOrNumber) ? { _id: idOrNumber } : { orderNumber: idOrNumber.toUpperCase() };
}

const isOrderNumberCollision = (error) => error.code === 11000 && Boolean(error.keyPattern?.orderNumber);

/**
 * Crée une commande. Tout se passe dans UNE transaction :
 * - les prix viennent de la base (jamais du client) ;
 * - le stock est décrémenté de façon atomique, ligne par ligne, et seulement s'il suffit ;
 * - au moindre échec, tout est annulé (aucun stock perdu).
 * Nécessite MongoDB en "replica set" (c'est le cas d'Atlas).
 */
async function placeOrder({ userId, lines, shippingAddress, note }) {
  return mongoose.connection.transaction(async (session) => {
    const products = await Product.find({ _id: { $in: lines.map((line) => line.productId) }, isActive: true }).session(session);
    const productsById = new Map(products.map((product) => [product.id, product]));

    const unavailable = lines.filter((line) => !productsById.has(line.productId));
    if (unavailable.length > 0) {
      throw ApiError.conflict(
        "Certains produits ne sont plus disponibles",
        unavailable.map((line) => ({ productId: line.productId })),
      );
    }

    const shortages = [];
    for (const line of lines) {
      const result = await Product.updateOne(
        { _id: line.productId, isActive: true, stockQuantity: { $gte: line.quantity } },
        { $inc: { stockQuantity: -line.quantity } },
        { session },
      );
      if (result.modifiedCount === 0) {
        const product = productsById.get(line.productId);
        shortages.push({
          productId: line.productId,
          name: product.name,
          requested: line.quantity,
          available: product.stockQuantity,
        });
      }
    }
    if (shortages.length > 0) throw ApiError.conflict("Stock insuffisant pour certains produits", shortages);

    const items = lines.map(({ productId, quantity }) => {
      const product = productsById.get(productId);
      return {
        product: product._id,
        reference: product.reference,
        name: product.name,
        brand: product.brand,
        imageUrl: product.imageUrl,
        unitPriceCents: product.priceCents,
        quantity,
        lineTotalCents: product.priceCents * quantity,
      };
    });

    const [order] = await Order.create(
      [
        {
          orderNumber: generateOrderNumber(),
          user: userId,
          items,
          shippingAddress,
          note,
          ...computeTotals(items, env.SHIPPING_FEE_CENTS),
          status: "pending",
          statusHistory: [{ status: "pending", at: new Date() }],
        },
      ],
      { session },
    );
    return order;
  });
}

export async function createOrder({ userId, items, shippingAddress, note }) {
  const lines = mergeOrderItems(items);

  for (let attempt = 1; ; attempt += 1) {
    try {
      return await placeOrder({ userId, lines, shippingAddress, note });
    } catch (error) {
      // Deux commandes ont tiré le même numéro (très improbable) : on recommence avec un nouveau.
      if (isOrderNumberCollision(error) && attempt < ORDER_NUMBER_ATTEMPTS) continue;
      throw error;
    }
  }
}

/**
 * Applique un changement de statut. Le filtre `status: order.status` protège contre deux changements simultanés :
 * si quelqu'un est passé avant nous, la mise à jour ne trouve rien et on répond 409.
 * Une annulation restitue le stock.
 */
async function applyTransition(order, nextStatus, note, session) {
  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: order.status },
    {
      $set: { status: nextStatus },
      $push: { statusHistory: { status: nextStatus, at: new Date(), ...(note && { note }) } },
    },
    { new: true, session },
  );
  if (!updated) throw ApiError.conflict("La commande vient d'être modifiée, rechargez-la");

  if (nextStatus === "cancelled") {
    await Product.bulkWrite(
      updated.items.map((item) => ({
        updateOne: { filter: { _id: item.product }, update: { $inc: { stockQuantity: item.quantity } } },
      })),
      { session },
    );
  }
  return updated;
}

/** Annulation par le client : uniquement tant que la commande est « en attente ». */
export async function cancelOwnOrder(userId, idOrNumber) {
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findOne({ ...orderLookup(idOrNumber), user: userId }).session(session);
    if (!order) throw ApiError.notFound("Commande introuvable");
    if (order.status !== "pending") throw ApiError.conflict("Cette commande ne peut plus être annulée");

    return applyTransition(order, "cancelled", "Annulée par le client", session);
  });
}

/** Changement de statut par l'administration, dans le respect des transitions autorisées. */
export async function changeOrderStatus(idOrNumber, nextStatus, note) {
  return mongoose.connection.transaction(async (session) => {
    const order = await Order.findOne(orderLookup(idOrNumber)).session(session);
    if (!order) throw ApiError.notFound("Commande introuvable");
    if (!canTransition(order.status, nextStatus)) {
      throw ApiError.conflict(`Passage de « ${order.status} » à « ${nextStatus} » impossible`);
    }

    return applyTransition(order, nextStatus, note, session);
  });
}
