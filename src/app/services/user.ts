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

export interface NotificationPrefs {
  notify_inapp: boolean;
  notify_email: boolean;
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

  getNotificationPrefs(): Observable<NotificationPrefs> {
    return this.http.get<NotificationPrefs>(`${this.apiUrl}/me/notifications`);
  }

  updateNotificationPrefs(prefs: NotificationPrefs): Observable<NotificationPrefs> {
    return this.http.put<NotificationPrefs>(`${this.apiUrl}/me/notifications`, prefs);
  }

  changePassword(currentPassword: string, newPassword: string): Observable<UserProfile> {
    return this.http.put<UserProfile>(`${this.apiUrl}/me/password`, {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }
}
