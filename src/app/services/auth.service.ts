import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginPayload, RegisterPayload, User } from '../models/user';

const TOKEN_KEY = 'bhshop_token';
const USER_KEY = 'bhshop_user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:5000/api/auth';

  private tokenSignal = signal<string | null>(this.readStoredToken());
  private userSignal = signal<User | null>(this.readStoredUser());

  readonly token = this.tokenSignal.asReadonly();
  readonly currentUser = this.userSignal.asReadonly();
  readonly isLoggedIn = computed(() => !!this.tokenSignal() && !!this.userSignal());

  constructor() {
    if (this.tokenSignal()) {
      this.refreshCurrentUser();
    }
  }

  private readStoredToken(): string | null {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  }

  private readStoredUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? (JSON.parse(raw) as User) : null;
    } catch {
      return null;
    }
  }

  private persistSession(token: string, user: User): void {
    this.tokenSignal.set(token);
    this.userSignal.set(user);
    try {
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      // ignore storage errors
    }
  }

  register(payload: RegisterPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap((res) => this.persistSession(res.token, res.user))
    );
  }

  login(payload: LoginPayload): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => this.persistSession(res.token, res.user))
    );
  }

  refreshCurrentUser(): void {
    this.http.get<{ user: User }>(`${this.apiUrl}/me`).subscribe({
      next: (res) => {
        this.userSignal.set(res.user);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        } catch {
          // ignore
        }
      },
      error: (err) => {
        if (err.status === 401) {
          this.logout();
        }
      },
    });
  }

  updateProfile(data: { fullName?: string; phone?: string; address?: string }): Observable<{ message: string; user: User }> {
    return this.http.put<{ message: string; user: User }>(`${this.apiUrl}/profile`, data).pipe(
      tap((res) => {
        this.userSignal.set(res.user);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(res.user));
        } catch {
          // ignore
        }
      })
    );
  }

  logout(): void {
    this.tokenSignal.set(null);
    this.userSignal.set(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch {
      // ignore
    }
  }
}
