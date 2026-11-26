import { Product } from './product';

export interface CartItem {
  product: Product;
  unitPrice: number;
  quantity: number;
}
