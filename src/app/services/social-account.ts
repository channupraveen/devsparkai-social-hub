import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface SocialAccountItem {
  platform: string;
  name: string;
  handle: string;
  connected: boolean;
  connected_at: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class SocialAccount {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/social-accounts`;

  list(): Observable<SocialAccountItem[]> {
    return this.http.get<SocialAccountItem[]>(this.apiUrl);
  }

  /** Get the X OAuth URL to redirect the browser to. */
  authorizeX(): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`${this.apiUrl}/x/authorize`);
  }

  connect(platform: string, handle: string): Observable<SocialAccountItem> {
    return this.http.post<SocialAccountItem>(`${this.apiUrl}/connect`, {
      platform,
      handle,
    });
  }

  disconnect(platform: string): Observable<SocialAccountItem> {
    return this.http.post<SocialAccountItem>(
      `${this.apiUrl}/${platform}/disconnect`,
      {},
    );
  }
}
