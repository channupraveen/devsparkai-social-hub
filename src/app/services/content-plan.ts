import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { PostResponse } from './post';

export interface PlanItem {
  day: number;
  theme: string;
  title: string;
  done: boolean;
}

export interface SchedulePlanResult {
  created: PostResponse[];
  skipped: number;
}

export interface ContentPlanResponse {
  id: number;
  topic: string;
  days: number;
  items: PlanItem[];
  created_at: string;
  source?: 'ai' | 'template' | null;
  note?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class ContentPlanApi {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/plans`;

  generate(topic: string, days: number): Observable<ContentPlanResponse> {
    return this.http.post<ContentPlanResponse>(`${this.apiUrl}/generate`, {
      topic,
      days,
    });
  }

  list(): Observable<ContentPlanResponse[]> {
    return this.http.get<ContentPlanResponse[]>(this.apiUrl);
  }

  /** Queue every unposted idea as a scheduled post, starting at startAt (ISO). */
  schedule(planId: number, startAt: string, platforms: string[]): Observable<SchedulePlanResult> {
    return this.http.post<SchedulePlanResult>(`${this.apiUrl}/${planId}/schedule`, {
      start_at: startAt,
      platforms,
    });
  }

  toggleItem(planId: number, index: number, done: boolean): Observable<ContentPlanResponse> {
    return this.http.patch<ContentPlanResponse>(
      `${this.apiUrl}/${planId}/items/${index}`,
      { done },
    );
  }

  delete(planId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${planId}`);
  }
}
