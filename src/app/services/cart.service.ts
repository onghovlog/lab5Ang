import { Injectable, signal, computed } from '@angular/core';
import { Product } from '../models/product';
import { CartItem } from '../models/cart';

const CART_STORAGE_KEY = 'bhshop_cart_items';
const FREE_SHIPPING_THRESHOLD = 300000;
const STANDARD_SHIPPING_FEE = 25000;

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private itemsSignal = signal<CartItem[]>(this.loadCart());
  private toastSignal = signal<string>('');
  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  readonly items = this.itemsSignal.asReadonly();
  readonly toastMessage = this.toastSignal.asReadonly();

  readonly totalQuantity = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.quantity, 0)
  );

  readonly subtotal = computed(() =>
    this.itemsSignal().reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
  );

  readonly shippingFee = computed(() => {
    const sub = this.subtotal();
    if (sub === 0 || sub >= FREE_SHIPPING_THRESHOLD) return 0;
    return STANDARD_SHIPPING_FEE;
  });

  readonly amountToFreeShipping = computed(() => {
    const sub = this.subtotal();
    if (sub === 0 || sub >= FREE_SHIPPING_THRESHOLD) return 0;
    return FREE_SHIPPING_THRESHOLD - sub;
  });

  readonly totalAmount = computed(() => this.subtotal() + this.shippingFee());

  parsePrice(priceStr: string | number): number {
    if (typeof priceStr === 'number' && !Number.isNaN(priceStr)) {
      return priceStr;
    }
    const digits = String(priceStr || '0').replace(/[^\d]/g, '');
    return digits ? parseInt(digits, 10) : 0;
  }

  formatPrice(amount: number): string {
    return `${Math.max(0, Math.round(amount)).toLocaleString('vi-VN')}đ`;
  }

  private loadCart(): CartItem[] {
    try {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private saveCart(items: CartItem[]): void {
    this.itemsSignal.set(items);
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // ignore storage errors
    }
  }

  showToast(message: string): void {
    this.toastSignal.set(message);
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
    }
    this.toastTimer = setTimeout(() => {
      this.toastSignal.set('');
      this.toastTimer = null;
    }, 2400);
  }

  addToCart(product: Product, quantity: number = 1, notify: boolean = true): void {
    const qty = Math.max(1, Math.floor(quantity));
    const unitPrice = this.parsePrice(product.price);
    const current = [...this.itemsSignal()];
    const existingIndex = current.findIndex((i) => i.product.id === product.id);

    if (existingIndex > -1) {
      const existing = current[existingIndex];
      current[existingIndex] = {
        ...existing,
        unitPrice,
        quantity: existing.quantity + qty,
      };
    } else {
      current.push({
        product,
        unitPrice,
        quantity: qty,
      });
    }

    this.saveCart(current);
    if (notify) {
      this.showToast(`Đã thêm "${product.name}" vào giỏ hàng`);
    }
  }

  increaseQty(productId: number): void {
    const updated = this.itemsSignal().map((item) =>
      item.product.id === productId ? { ...item, quantity: item.quantity + 1 } : item
    );
    this.saveCart(updated);
  }

  decreaseQty(productId: number): void {
    const current = this.itemsSignal();
    const target = current.find((item) => item.product.id === productId);
    if (!target) return;

    if (target.quantity <= 1) {
      this.removeItem(productId);
      return;
    }

    const updated = current.map((item) =>
      item.product.id === productId ? { ...item, quantity: item.quantity - 1 } : item
    );
    this.saveCart(updated);
  }

  removeItem(productId: number): void {
    const updated = this.itemsSignal().filter((item) => item.product.id !== productId);
    this.saveCart(updated);
  }

  clearCart(): void {
    this.saveCart([]);
  }
}
