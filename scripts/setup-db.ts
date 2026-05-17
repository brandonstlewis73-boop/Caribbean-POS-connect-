import { ensureDatabase, query } from "../lib/db";

async function main() {
  await ensureDatabase();
  const [users, products, customers] = await Promise.all([
    query<{ count: string }>("SELECT COUNT(*) AS count FROM users"),
    query<{ count: string }>("SELECT COUNT(*) AS count FROM products"),
    query<{ count: string }>("SELECT COUNT(*) AS count FROM customers")
  ]);

  console.log("Caribbean POS Connect Supabase/Postgres database ready.");
  console.log(`Users: ${users.rows[0]?.count || 0}`);
  console.log(`Products: ${products.rows[0]?.count || 0}`);
  console.log(`Customers: ${customers.rows[0]?.count || 0}`);
  console.log("Create or use a real owner/admin account from the production database.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
