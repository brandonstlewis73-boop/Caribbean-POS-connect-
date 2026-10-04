import "server-only";
import { query, transaction } from "./db";
import { auditLog } from "./data";
import { hasPermission } from "./permissions";
import type { User } from "./types";

export class AiProductActionError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

export async function saveAiProductDescription(user: User, input: {
  productId: string; description: string; expectedDescription: string | null;
}) {
  if (!user.business_id || !hasPermission(user.role, "inventory:write")) {
    throw new AiProductActionError("You do not have permission to update products.", 403);
  }
  return transaction(async client => {
    const rows = await query<{ id: string; name: string; description: string | null }>(
      "SELECT id, name, description FROM products WHERE id = $1 AND business_id = $2 FOR UPDATE",
      [input.productId, user.business_id], client
    );
    const current = rows.rows[0];
    if (!current) throw new AiProductActionError("Product not found.", 404);
    if ((current.description || null) !== (input.expectedDescription || null)) {
      throw new AiProductActionError("This product description changed since you opened it. Refresh the workspace before saving.", 409);
    }
    await query(
      "UPDATE products SET description = $1, updated_at = NOW() WHERE id = $2 AND business_id = $3",
      [input.description, input.productId, user.business_id], client
    );
    await auditLog("ai:product-description:save", "product", current.id,
      { previousDescription: current.description, description: input.description }, user.id, client);
    return { ...current, description: input.description };
  });
}
