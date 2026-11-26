import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';
import { OrderService } from '../../services/order.service';
import {
  Order,
  OrderStatus,
  OrderStatusCounts,
  ORDER_STATUS_LIST,
  ORDER_STATUS_MAP,
  PAYMENT_METHOD_LABELS,
  PROGRESS_STEPS,
} from '../../models/order';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './orders.html',
  styleUrl: './orders.css',
})
export class Orders implements OnInit {
  authService = inject(AuthService);
  cartService = inject(CartService);
  private orderService = inject(OrderService);
  private router = inject(Router);

  readonly statusList = ORDER_STATUS_LIST;
  readonly statusMap = ORDER_STATUS_MAP;
  readonly progressSteps = PROGRESS_STEPS;
  readonly paymentLabels = PAYMENT_METHOD_LABELS;

  orders = signal<Order[]>([]);
  counts = signal<OrderStatusCounts>({
    all: 0,
    pending: 0,
    confirmed: 0,
    preparing: 0,
    shipping: 0,
    delivered: 0,
    cancelled: 0,
  });

  activeTab = signal<OrderStatus | 'all'>('all');
  isLoading = signal(true);
  errorMessage = signal('');
  expandedOrderId = signal<string | null>(null);
  cancellingOrderId = signal<string | null>(null);
  cancelReason = '';
  updatingOrderId = signal<string | null>(null);

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.errorMessage.set('');
    const status = this.activeTab();

    this.orderService.getMyOrders(status).subscribe({
      next: (res) => {
        this.orders.set(res.orders);
        this.counts.set(res.counts);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err?.error?.message || 'Không thể tải danh sách đơn hàng. Vui lòng thử lại.'
        );
      },
    });
  }

  selectTab(status: OrderStatus | 'all'): void {
    if (this.activeTab() === status) return;
    this.activeTab.set(status);
    this.loadOrders();
  }

  getCountForTab(code: OrderStatus | 'all'): number {
    return this.counts()[code] || 0;
  }

  getActiveTabLabel(): string {
    const tab = this.activeTab();
    if (tab === 'all') return 'Tất cả';
    return this.statusMap[tab]?.label || tab;
  }

  toggleDetail(orderId: string): void {
    this.expandedOrderId.update((current) => (current === orderId ? null : orderId));
  }

  canCancel(order: Order): boolean {
    return order.status === 'pending' || order.status === 'confirmed';
  }

  openCancelBox(orderId: string): void {
    this.cancellingOrderId.set(orderId);
    this.cancelReason = '';
  }

  closeCancelBox(): void {
    this.cancellingOrderId.set(null);
    this.cancelReason = '';
  }

  confirmCancel(order: Order): void {
    this.updatingOrderId.set(order._id);
    this.orderService.cancelOrder(order._id, this.cancelReason).subscribe({
      next: (res) => {
        this.updatingOrderId.set(null);
        this.closeCancelBox();
        this.cartService.showToast(res.message);
        this.loadOrders();
      },
      error: (err) => {
        this.updatingOrderId.set(null);
        this.cartService.showToast(err?.error?.message || 'Không thể hủy đơn hàng');
      },
    });
  }

  advanceStatus(order: Order): void {
    const meta = this.statusMap[order.status];
    if (!meta?.nextStatus) return;

    this.updatingOrderId.set(order._id);
    this.orderService.updateOrderStatus(order._id, meta.nextStatus).subscribe({
      next: (res) => {
        this.updatingOrderId.set(null);
        this.cartService.showToast(res.message);
        this.loadOrders();
      },
      error: (err) => {
        this.updatingOrderId.set(null);
        this.cartService.showToast(err?.error?.message || 'Không thể cập nhật trạng thái');
      },
    });
  }

  reorder(order: Order): void {
    for (const item of order.items) {
      this.cartService.addToCart(
        {
          id: item.productId,
          slug: item.slug,
          name: item.name,
          price: item.price,
          oldPrice: '-',
          image: item.image,
          discount: 0,
          sold: 0,
          createdAt: '',
          categoryId: 0,
        },
        item.quantity,
        false
      );
    }
    this.cartService.showToast(`Đã thêm lại sản phẩm từ đơn #${order.orderCode} vào giỏ`);
    this.router.navigateByUrl('/cart');
  }

  formatDate(iso: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  logout(): void {
    this.authService.logout();
    this.cartService.showToast('Đã đăng xuất tài khoản');
    this.router.navigateByUrl('/');
  }
}
