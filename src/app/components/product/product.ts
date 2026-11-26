import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Product } from '../../models/product';
import { ProductService } from '../../services/product.service';
import { CartService } from '../../services/cart.service';

@Component({
  imports: [RouterLink],
  selector: 'app-product',
  standalone: true,
  styleUrl: './product.css',
  templateUrl: './product.html',
})
export class ProductComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private cartService = inject(CartService);

  product = signal<Product | null>(null);
  isLoading = signal<boolean>(true);
  notFound = signal<boolean>(false);
  quantity = signal<number>(1);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.quantity.set(1);
        this.loadProduct(id);
      }
    });
  }

  loadProduct(id: string): void {
    this.isLoading.set(true);
    this.notFound.set(false);

    this.productService.getProductById(id).subscribe({
      next: (data) => {
        this.product.set(data);
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Lỗi khi tải chi tiết sản phẩm:', err);
        this.notFound.set(true);
        this.isLoading.set(false);
      },
    });
  }

  decreaseQty(): void {
    this.quantity.update((q) => (q > 1 ? q - 1 : 1));
  }

  increaseQty(): void {
    this.quantity.update((q) => q + 1);
  }

  addToCart(): void {
    const item = this.product();
    if (!item) return;
    this.cartService.addToCart(item, this.quantity());
  }

  buyNow(): void {
    const item = this.product();
    if (!item) return;
    this.cartService.addToCart(item, this.quantity(), false);
    this.router.navigateByUrl('/cart');
  }
}

export { ProductComponent as Product };
