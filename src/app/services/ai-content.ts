import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export interface AiVariant {
  platform: string;
  content: string;
}

export interface AiGenerateResponse {
  variants: AiVariant[];
  hashtags: string[];
  source: 'ai' | 'template';
  note: string | null;
}

export interface AiShortenResponse {
  content: string;
  source: 'ai' | 'template';
  note: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class AiContent {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/ai`;

  generate(
    topic: string,
    platforms: string[],
    instructions?: string,
  ): Observable<AiGenerateResponse> {
    return this.http.post<AiGenerateResponse>(`${this.apiUrl}/generate`, {
      topic,
      platforms,
      instructions: instructions?.trim() || null,
    });
  }

  imagePrompt(
    content: string,
    style?: string,
  ): Observable<{ prompt: string; source: string; note: string | null }> {
    return this.http.post<{ prompt: string; source: string; note: string | null }>(
      `${this.apiUrl}/image-prompt`,
      { content, style: style || null },
    );
  }

  shorten(content: string, limit: number): Observable<AiShortenResponse> {
    return this.http.post<AiShortenResponse>(`${this.apiUrl}/shorten`, {
      content,
      limit,
    });
  }
}
