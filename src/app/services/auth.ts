import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  is_verified?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private readonly apiUrl = `${environment.apiUrl}/auth`;
  private readonly tokenKey = 'devsparkai_access_token';

  constructor(private http: HttpClient) {}

  register(payload: RegisterRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.apiUrl}/register`, payload)
      .pipe(tap((response) => this.setToken(response.access_token)));
  }

  login(payload: LoginRequest): Observable<TokenResponse> {
    return this.http
      .post<TokenResponse>(`${this.apiUrl}/login`, payload)
      .pipe(tap((response) => this.setToken(response.access_token)));
  }

  me(): Observable<AuthUser> {
    return this.http.get<AuthUser>(`${this.apiUrl}/me`, {
      headers: this.authHeaders(),
    });
  }

  verifyOtp(code: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/verify-otp`,
      { code },
      { headers: this.authHeaders() },
    );
  }

  resendVerification(): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.apiUrl}/resend-verification`,
      {},
      { headers: this.authHeaders() },
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isLoggedIn(): boolean {
    return Boolean(this.getToken());
  }

  private setToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }

  private authHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.getToken() ?? ''}`,
    });
  }
}
