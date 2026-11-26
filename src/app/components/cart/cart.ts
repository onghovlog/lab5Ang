import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../services/cart.service';
import { AuthService } from '../../services/auth.service';
import { OrderService } from '../../services/order.service';
import { PaymentMethod } from '../../models/order';

@Component({
  imports: [RouterLink, FormsModule],
  selector: 'app-cart',
  standalone: true,
  styleUrl: './cart.css',
  templateUrl: './cart.html',
})
export class Cart implements OnInit {
  cartService = inject(CartService);
  authService = inject(AuthService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  showCheckoutForm = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  fullName = '';
  phone = '';
  address = '';
  note = '';
  paymentMethod: PaymentMethod = 'cod';

  ngOnInit(): void {
    const user = this.authService.currentUser();
    if (user) {
      this.fullName = user.fullName || '';
      this.phone = user.phone || '';
      this.address = user.address || '';
    }
  }

  openCheckout(): void {
    this.errorMessage.set('');
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login'], { queryParams: { returnUrl: '/cart' } });
      return;
    }

    const user = this.authService.currentUser();
    if (user) {
      if (!this.fullName) this.fullName = user.fullName || '';
      if (!this.phone) this.phone = user.phone || '';
      if (!this.address) this.address = user.address || '';
    }
    this.showCheckoutForm.set(true);
  }

  placeOrder(): void {
    this.errorMessage.set('');

    if (this.cartService.items().length === 0) {
      this.errorMessage.set('Giỏ hàng đang trống.');
      return;
    }
    if (!this.fullName.trim() || !this.phone.trim() || !this.address.trim()) {
      this.errorMessage.set('Vui lòng điền đầy đủ họ tên, số điện thoại và địa chỉ giao hoa.');
      return;
    }

    this.isSubmitting.set(true);
    const payload = {
      items: this.cartService.items().map((item) => ({
        productId: item.product.id,
        slug: item.product.slug,
        name: item.product.name,
        image: item.product.image,
        price: item.product.price,
        quantity: item.quantity,
      })),
      shippingInfo: {
        fullName: this.fullName.trim(),
        phone: this.phone.trim(),
        address: this.address.trim(),
        note: this.note.trim(),
      },
      paymentMethod: this.paymentMethod,
    };

    this.orderService.createOrder(payload).subscribe({
      next: (res) => {
        this.isSubmitting.set(false);
        this.cartService.clearCart();
        this.showCheckoutForm.set(false);
        this.cartService.showToast(`Đặt hàng thành công! Mã đơn #${res.order.orderCode}`);
        this.router.navigateByUrl('/orders');
      },
      error: (err) => {
        this.isSubmitting.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Không thể đặt hàng lúc này. Vui lòng thử lại.'
        );
      },
    });
  }
}
