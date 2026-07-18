import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class UserApi {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/users`;

  getProfile(): Observable<UserProfile> {
    return this.http.get<UserProfile>(`${this.apiUrl}/me`);
  }

  updateProfile(name: string, email: string): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me`, { name, email });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me/password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }
}
