import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type KeyProvider = 'groq' | 'openai' | 'gemini';

export interface ApiKeyItem {
  provider: string;
  masked: string;
  is_active: boolean;
  updated_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class ApiKeys {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/settings/keys`;

  list(): Observable<ApiKeyItem[]> {
    return this.http.get<ApiKeyItem[]>(this.apiUrl);
  }

  save(provider: KeyProvider, key: string): Observable<ApiKeyItem> {
    return this.http.put<ApiKeyItem>(this.apiUrl, { provider, key });
  }

  test(provider: KeyProvider): Observable<{ ok: boolean; provider: string }> {
    return this.http.post<{ ok: boolean; provider: string }>(
      `${this.apiUrl}/${provider}/test`,
      {},
    );
  }

  activate(provider: KeyProvider): Observable<ApiKeyItem> {
    return this.http.post<ApiKeyItem>(`${this.apiUrl}/${provider}/activate`, {});
  }

  remove(provider: KeyProvider): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${provider}`);
  }
}
