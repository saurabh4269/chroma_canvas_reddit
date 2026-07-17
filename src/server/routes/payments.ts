import { Hono } from 'hono';
import type { PaymentHandlerResponse } from '@devvit/web/server';
import { reddit } from '@devvit/web/server';
import { SKIN_SKUS } from '../../shared/skins';
import { unlockSku } from '../core/skins';

export const payments = new Hono();

type OrderProduct = { sku: string };

/**
 * Devvit calls this after a successful gold purchase.
 * Cosmetics only — unlocks the SKU's skin on the buyer's Redis player hash.
 */
payments.post('/fulfill', async (c) => {
  try {
    const username = (await reddit.getCurrentUsername()) ?? null;
    if (!username) {
      return c.json<PaymentHandlerResponse>(
        { success: false, reason: 'User not authenticated' },
        400
      );
    }
    const body = (await c.req.json()) as { products?: OrderProduct[] };
    const products = body.products ?? [];
    if (products.length === 0) {
      return c.json<PaymentHandlerResponse>(
        { success: false, reason: 'No products in order' },
        400
      );
    }
    for (const product of products) {
      if (!SKIN_SKUS[product.sku]) {
        return c.json<PaymentHandlerResponse>(
          { success: false, reason: `Unknown cosmetic SKU: ${product.sku}` },
          400
        );
      }
      await unlockSku(username, product.sku);
    }
    return c.json<PaymentHandlerResponse>({ success: true });
  } catch (e) {
    console.error('payments fulfill error:', e);
    return c.json<PaymentHandlerResponse>(
      { success: false, reason: 'Fulfill failed' },
      500
    );
  }
});

payments.post('/refund', async (c) => {
  // Cosmetics are durable unlocks; we acknowledge refunds without ripping skins
  // mid-run. Judges / playtest can re-claim via claim-demo if needed.
  try {
    await c.req.json().catch(() => ({}));
    return c.json<PaymentHandlerResponse>({ success: true });
  } catch (e) {
    console.error('payments refund error:', e);
    return c.json<PaymentHandlerResponse>(
      { success: false, reason: 'Refund ack failed' },
      500
    );
  }
});
