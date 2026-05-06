import { ensureDatabase, isDemoMode, query } from "../lib/db";
import { listCustomers, listProducts, listUsers } from "../lib/data";

async function main() {
  if (isDemoMode) {
    const [users, products, customers] = await Promise.all([
      listUsers(),
      listProducts(undefined, true),
      listCustomers()
    ]);
    console.log("Caribbean POS Connect demo mode ready. No Supabase/Postgres URL is required.");
    console.log(`Users: ${users.length}`);
    console.log(`Products: ${products.length}`);
    console.log(`Customers: ${customers.length}`);
    console.log("Demo login: admin@demo.com / demo123");
    return;
  }

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
  console.log("Demo login: admin@caribbeanpos.test / Admin123!");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
