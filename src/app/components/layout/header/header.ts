import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header {
  authService = inject(AuthService);
  cartService = inject(CartService);
  private router = inject(Router);

  searchQuery = '';

  onSearch(): void {
    const keyword = this.searchQuery.trim();
    this.router.navigate(['/products'], {
      queryParams: keyword ? { search: keyword } : {},
    });
  }

  onLogout(): void {
    this.authService.logout();
    this.cartService.showToast('Đã đăng xuất tài khoản');
    this.router.navigateByUrl('/');
  }
}
