export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'shipping'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'cod' | 'bank_transfer' | 'momo';

export interface OrderStatusMeta {
  code: OrderStatus;
  label: string;
  shortLabel: string;
  icon: string;
  description: string;
  stepIndex: number; // -1 for cancelled
  nextStatus?: OrderStatus;
  nextActionLabel?: string;
}

export const ORDER_STATUS_LIST: OrderStatusMeta[] = [
  {
    code: 'pending',
    label: 'Chờ xác nhận',
    shortLabel: 'Chờ duyệt',
    icon: '🕒',
    description: 'Đơn hàng đang chờ cửa hàng xác nhận',
    stepIndex: 0,
    nextStatus: 'confirmed',
    nextActionLabel: 'Xác nhận đơn',
  },
  {
    code: 'confirmed',
    label: 'Đã xác nhận',
    shortLabel: 'Đã duyệt',
    icon: '✅',
    description: 'Cửa hàng đã tiếp nhận đơn hàng của bạn',
    stepIndex: 1,
    nextStatus: 'preparing',
    nextActionLabel: 'Bắt đầu bó hoa',
  },
  {
    code: 'preparing',
    label: 'Đang chuẩn bị hoa',
    shortLabel: 'Đang bó hoa',
    icon: '💐',
    description: 'Nghệ nhân đang chọn hoa tươi và bó hoa',
    stepIndex: 2,
    nextStatus: 'shipping',
    nextActionLabel: 'Bàn giao shipper',
  },
  {
    code: 'shipping',
    label: 'Đang giao hàng',
    shortLabel: 'Đang giao',
    icon: '🚚',
    description: 'Đơn hàng đang trên đường giao đến tay người nhận',
    stepIndex: 3,
    nextStatus: 'delivered',
    nextActionLabel: 'Xác nhận đã giao',
  },
  {
    code: 'delivered',
    label: 'Đã giao thành công',
    shortLabel: 'Hoàn tất',
    icon: '🎉',
    description: 'Hoa đã được trao tận tay thành công',
    stepIndex: 4,
  },
  {
    code: 'cancelled',
    label: 'Đã hủy',
    shortLabel: 'Đã hủy',
    icon: '❌',
    description: 'Đơn hàng đã bị hủy',
    stepIndex: -1,
  },
];

export const ORDER_STATUS_MAP: Record<OrderStatus, OrderStatusMeta> =
  ORDER_STATUS_LIST.reduce((acc, item) => {
    acc[item.code] = item;
    return acc;
  }, {} as Record<OrderStatus, OrderStatusMeta>);

export const PROGRESS_STEPS: OrderStatusMeta[] = ORDER_STATUS_LIST.filter(
  (s) => s.stepIndex >= 0
);

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cod: 'Thanh toán khi nhận hàng (COD)',
  bank_transfer: 'Chuyển khoản ngân hàng',
  momo: 'Ví điện tử MoMo',
};

export interface OrderItem {
  productId: number;
  slug: string;
  name: string;
  image: string;
  price: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingInfo {
  fullName: string;
  phone: string;
  address: string;
  note?: string;
}

export interface OrderStatusHistory {
  status: OrderStatus;
  label: string;
  note: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  orderCode: string;
  userId: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  paymentMethod: PaymentMethod;
  subtotal: number;
  shippingFee: number;
  totalAmount: number;
  status: OrderStatus;
  statusHistory: OrderStatusHistory[];
  createdAt: string;
  updatedAt: string;
}

export interface OrderStatusCounts {
  all: number;
  pending: number;
  confirmed: number;
  preparing: number;
  shipping: number;
  delivered: number;
  cancelled: number;
}

export interface MyOrdersResponse {
  orders: Order[];
  counts: OrderStatusCounts;
}

export interface CreateOrderPayload {
  items: Array<{
    productId: number;
    slug: string;
    name: string;
    image: string;
    price: string;
    quantity: number;
  }>;
  shippingInfo: ShippingInfo;
  paymentMethod: PaymentMethod;
}
