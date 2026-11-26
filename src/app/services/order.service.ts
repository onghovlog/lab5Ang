import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  CreateOrderPayload,
  MyOrdersResponse,
  Order,
  OrderStatus,
} from '../models/order';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/orders';

  createOrder(payload: CreateOrderPayload): Observable<{ message: string; order: Order }> {
    return this.http.post<{ message: string; order: Order }>(this.apiUrl, payload);
  }

  getMyOrders(status?: OrderStatus | 'all'): Observable<MyOrdersResponse> {
    let params = new HttpParams();
    if (status && status !== 'all') {
      params = params.set('status', status);
    }
    return this.http.get<MyOrdersResponse>(`${this.apiUrl}/my`, { params });
  }

  getOrderById(id: string): Observable<Order> {
    return this.http.get<Order>(`${this.apiUrl}/${id}`);
  }

  cancelOrder(id: string, reason?: string): Observable<{ message: string; order: Order }> {
    return this.http.patch<{ message: string; order: Order }>(`${this.apiUrl}/${id}/cancel`, {
      reason: reason || '',
    });
  }

  updateOrderStatus(
    id: string,
    status: OrderStatus,
    note?: string
  ): Observable<{ message: string; order: Order }> {
    return this.http.patch<{ message: string; order: Order }>(`${this.apiUrl}/${id}/status`, {
      status,
      note: note || '',
    });
  }
}
