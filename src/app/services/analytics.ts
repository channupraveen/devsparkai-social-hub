import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AnalyticsTotal {
  key: string;
  label: string;
  value: number;
  change_percent: number;
}

export interface SeriesPoint {
  date: string;
  published: number;
}

export interface PlatformBreakdown {
  platform: string;
  name: string;
  posts: number;
}

export interface AnalyticsResponse {
  days: number;
  totals: AnalyticsTotal[];
  series: SeriesPoint[];
  platforms: PlatformBreakdown[];
}

@Injectable({
  providedIn: 'root',
})
export class AnalyticsApi {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/analytics`;

  get(days: number): Observable<AnalyticsResponse> {
    return this.http.get<AnalyticsResponse>(this.apiUrl, { params: { days } });
  }
}
