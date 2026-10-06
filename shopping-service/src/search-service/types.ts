export interface Product {
  id: number;
  sellerId: number;
  name: string;
  category: string;
}
 
export interface IndexEntry {
  productId: number;
  sellerId: number;
  weight: number;
}
 
export interface SearchResult {
  productId: number;
  sellerId: number;
  score: number;
}