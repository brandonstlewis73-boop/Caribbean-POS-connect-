import { fail } from "@/lib/api";
export async function POST() {
  return fail("Stripe checkout has been discontinued. Use PayPal subscription checkout.", 410);
}
