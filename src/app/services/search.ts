import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface PostHit {
  id: number;
  title: string;
  status: string;
  scheduled_at: string | null;
}

export interface PlanHit {
  id: number;
  topic: string;
  days: number;
}

export interface AccountHit {
  platform: string;
  handle: string;
  connected: boolean;
}

export interface SearchResponse {
  posts: PostHit[];
  plans: PlanHit[];
  accounts: AccountHit[];
}

@Injectable({ providedIn: 'root' })
export class SearchApi {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/search`;

  search(q: string): Observable<SearchResponse> {
    return this.http.get<SearchResponse>(this.apiUrl, { params: { q } });
  }
}
