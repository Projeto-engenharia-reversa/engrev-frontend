import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import type { TokenResponse, User } from '../models';
import { ApiService, getToken, setToken } from './api.service';

const USER_KEY = 'engrev.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private api = inject(ApiService);
  private router = inject(Router);
  user = signal<User | null>(this.loadUser());

  private loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  }

  private persist(token: string, user: User): void {
    setToken(token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    this.user.set(user);
  }

  isAuthenticated(): boolean {
    return !!getToken();
  }

  login(email: string, password: string): Observable<TokenResponse> {
    return this.api.post<TokenResponse>('/auth/login', { email, password }).pipe(
      tap((t) => this.persist(t.access_token, t.user)),
    );
  }

  register(email: string, password: string, name?: string): Observable<TokenResponse> {
    return this.api
      .post<TokenResponse>('/auth/register', { email, password, ...(name ? { name } : {}) })
      .pipe(tap((t) => this.persist(t.access_token, t.user)));
  }

  me(): Observable<User> {
    return this.api.get<User>('/auth/me').pipe(
      tap((u) => {
        localStorage.setItem(USER_KEY, JSON.stringify(u));
        this.user.set(u);
      }),
    );
  }

  updateMe(name?: string, password?: string): Observable<User> {
    return this.api
      .patch<User>('/auth/me', {
        ...(name !== undefined ? { name } : {}),
        ...(password ? { password } : {}),
      })
      .pipe(
        tap((u) => {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
          this.user.set(u);
        }),
      );
  }

  logout(): void {
    setToken(null);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
