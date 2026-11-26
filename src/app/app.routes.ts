import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./components/home/home').then((m) => m.Home),
  },
  {
    path: 'products',
    loadComponent: () => import('./components/products/products').then((m) => m.Products),
  },
  {
    path: 'category/:slug',
    loadComponent: () => import('./components/products/products').then((m) => m.Products),
  },
  {
    path: 'product/:id',
    loadComponent: () => import('./components/product/product').then((m) => m.ProductComponent),
  },
  {
    path: 'cart',
    loadComponent: () => import('./components/cart/cart').then((m) => m.Cart),
  },
  {
    path: 'login',
    loadComponent: () => import('./components/auth/login/login').then((m) => m.Login),
  },
  {
    path: 'register',
    loadComponent: () => import('./components/auth/register/register').then((m) => m.Register),
  },
  {
    path: 'orders',
    canActivate: [authGuard],
    loadComponent: () => import('./components/orders/orders').then((m) => m.Orders),
  },
  {
    path: '**',
    redirectTo: '',
  },
];
