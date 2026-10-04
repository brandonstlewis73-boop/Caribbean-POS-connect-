export type AiWorkspaceProduct = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  sellingPrice: number;
  stock: number;
};
export type AiWorkspaceResources = {
  products: AiWorkspaceProduct[];
  currency: string;
  canSaveProducts: boolean;
};
