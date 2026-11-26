import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { CartService } from '../../../services/cart.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css',
})
export class Register {
  private authService = inject(AuthService);
  private cartService = inject(CartService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  fullName = '';
  email = '';
  phone = '';
  address = '';
  password = '';
  confirmPassword = '';

  showPassword = signal(false);
  isSubmitting = signal(false);
  errorMessage = signal('');

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  onSubmit(): void {
    this.errorMessage.set('');

    if (!this.fullName.trim()) {
      this.errorMessage.set('Vui lòng nhập họ và tên.');
      return;
    }
    if (!this.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email.trim())) {
      this.errorMessage.set('Vui lòng nhập địa chỉ email hợp lệ.');
      return;
    }
    if (!this.password || this.password.length < 6) {
      this.errorMessage.set('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Mật khẩu xác nhận không khớp.');
      return;
    }

    this.isSubmitting.set(true);
    this.authService
      .register({
        fullName: this.fullName.trim(),
        email: this.email.trim(),
        phone: this.phone.trim(),
        address: this.address.trim(),
        password: this.password,
      })
      .subscribe({
        next: (res) => {
          this.isSubmitting.set(false);
          this.cartService.showToast(`Đăng ký thành công! Chào mừng ${res.user.fullName}`);
          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/';
          this.router.navigateByUrl(returnUrl);
        },
        error: (err) => {
          this.isSubmitting.set(false);
          this.errorMessage.set(
            err?.error?.message || 'Đăng ký thất bại. Vui lòng thử lại.'
          );
        },
      });
  }
}
