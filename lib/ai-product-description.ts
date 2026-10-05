import type { LocalGeneration } from './local-ai-config';

export function descriptionFromSavedDetails(facts: { productName: string; category: string }) {
  const name = facts.productName.trim();
  const category = facts.category.trim();
  return category ? `${name} — ${category}.` : `${name}, from our selection.`;
}

export function prepareProductDescription(prompt: string, facts: {
  productName: string; category: string; description: string | null;
}): LocalGeneration {
  const description = (facts.description || '').split('\n')
    .filter(line => !/^\s*(?:sku|stock|price|category|assumptions?|notes?|review)\s*:/i.test(line))
    .join('\n').slice(0, 1200);
  return {
    purpose: 'product-description',
    descriptionFacts: { productName: facts.productName, category: facts.category, description },
    instructions: `Write one or two concise storefront description sentences for the selected product.
Use the exact product name and only facts in its name, category, and existing description.
If there is no existing description, use just the product name and category in one short sentence. A name such as "Triple chocolate" does not prove there are three layers or three ingredients. Do not add ingredients, textures, flavors, materials, benefits, or comparisons that are not provided.
Do not add SKU, price, stock, category labels, placeholders, assumptions, review notes, or headings.
Do not invent other products or say the product is untested. Output only the finished description.
A minimal response using these saved facts is: ${descriptionFromSavedDetails(facts)}
You may keep this minimal wording when no more detail is saved.`,
    input: `User request:\n${prompt.slice(0, 1800)}\n\nSaved product facts:\nProduct name: ${facts.productName}\nCategory: ${facts.category}\nExisting description: ${description || 'No description provided'}`
  };
}
