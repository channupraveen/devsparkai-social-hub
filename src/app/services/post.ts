import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface PostCreate {
  title: string;
  content: string;
  content_variants: Record<string, string>;
  platforms: string[];
  status: 'draft' | 'scheduled' | 'published';
  scheduled_at: string | null;
}

export interface PostResponse {
  id: number;
  title: string;
  content: string;
  content_variants: Record<string, string>;
  platforms: string[];
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CalendarPost {
  id: number;
  title: string;
  platforms: string[];
  status: 'scheduled' | 'published';
  date: string;
}

@Injectable({
  providedIn: 'root',
})
export class Post {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/posts`;

  create(payload: PostCreate): Observable<PostResponse> {
    return this.http.post<PostResponse>(this.apiUrl, payload);
  }

  get(id: number): Observable<PostResponse> {
    return this.http.get<PostResponse>(`${this.apiUrl}/${id}`);
  }

  update(id: number, payload: PostCreate): Observable<PostResponse> {
    return this.http.put<PostResponse>(`${this.apiUrl}/${id}`, payload);
  }

  list(status?: 'draft' | 'scheduled' | 'published'): Observable<PostResponse[]> {
    return this.http.get<PostResponse[]>(this.apiUrl, {
      params: status ? { status } : {},
    });
  }

  publishNow(id: number): Observable<PostResponse> {
    return this.http.post<PostResponse>(`${this.apiUrl}/${id}/publish`, {});
  }

  cancelSchedule(id: number): Observable<PostResponse> {
    return this.http.post<PostResponse>(`${this.apiUrl}/${id}/cancel`, {});
  }

  reschedule(id: number, scheduledAt: string): Observable<PostResponse> {
    return this.http.post<PostResponse>(`${this.apiUrl}/${id}/reschedule`, {
      scheduled_at: scheduledAt,
    });
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  calendar(year: number, month: number): Observable<CalendarPost[]> {
    return this.http.get<CalendarPost[]>(`${this.apiUrl}/calendar`, {
      params: { year, month },
    });
  }
}
