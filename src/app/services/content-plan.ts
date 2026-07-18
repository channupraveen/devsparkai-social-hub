import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface PlanItem {
  day: number;
  theme: string;
  title: string;
  done: boolean;
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
