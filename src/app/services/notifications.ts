import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type NotificationType =
  | 'post_due'
  | 'post_published'
  | 'publish_failed'
  | 'plan_reminder'
  | 'system';

export interface AppNotification {
  id: number;
  type: NotificationType;
  title: string;
  body: string;
  link: string;
  is_read: boolean;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class NotificationsApi {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  list(): Observable<AppNotification[]> {
    return this.http.get<AppNotification[]>(this.apiUrl);
  }

  unreadCount(): Observable<{ count: number }> {
    return this.http.get<{ count: number }>(`${this.apiUrl}/unread-count`);
  }

  markRead(id: number): Observable<AppNotification> {
    return this.http.patch<AppNotification>(`${this.apiUrl}/${id}/read`, {});
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(`${this.apiUrl}/read-all`, {});
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
