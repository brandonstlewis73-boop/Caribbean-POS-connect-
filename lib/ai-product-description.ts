import type { LocalGeneration } from './local-ai-config';

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
If there is little information, keep the description simple. Do not add ingredients, textures, flavors, materials, benefits, or comparisons that are not provided.
Do not add SKU, price, stock, category labels, placeholders, assumptions, review notes, or headings.
Do not invent other products or say the product is untested. Output only the finished description.`,
    input: `User request:\n${prompt.slice(0, 1800)}\n\nSaved product facts:\nProduct name: ${facts.productName}\nCategory: ${facts.category}\nExisting description: ${description || 'No description provided'}`
  };
}
