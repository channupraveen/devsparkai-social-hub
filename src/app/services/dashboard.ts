import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface StatCard {
  key: string;
  label: string;
  value: number;
  change_percent: number;
}

export interface PlatformStatus {
  platform: string;
  name: string;
  handle: string;
  connected: boolean;
}

export interface RecentPost {
  id: number;
  title: string;
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string | null;
  published_at: string | null;
  updated_at: string;
}

export interface DashboardResponse {
  stats: StatCard[];
  platforms: PlatformStatus[];
  recent_posts: RecentPost[];
}

@Injectable({
  providedIn: 'root',
})
export class DashboardApi {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/dashboard`;

  getDashboard(): Observable<DashboardResponse> {
    return this.http.get<DashboardResponse>(this.apiUrl);
  }
}
