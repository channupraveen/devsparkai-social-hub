import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type BrandTone = 'professional' | 'friendly' | 'bold' | 'casual' | 'witty';

export interface BrandProfile {
  brand_name: string;
  description: string;
  tone: BrandTone;
  audience: string;
}

@Injectable({
  providedIn: 'root',
})
export class BrandApi {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/settings/brand`;

  get(): Observable<BrandProfile> {
    return this.http.get<BrandProfile>(this.apiUrl);
  }

  save(profile: BrandProfile): Observable<BrandProfile> {
    return this.http.put<BrandProfile>(this.apiUrl, profile);
  }
}
