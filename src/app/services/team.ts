import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';

export type TeamRole = 'admin' | 'editor' | 'viewer';

export interface TeamMemberItem {
  id: number;
  email: string;
  name: string;
  role: string;
  status: 'invited' | 'active';
  invited_at: string;
  is_owner: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class Team {
  private http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/team`;

  list(): Observable<TeamMemberItem[]> {
    return this.http.get<TeamMemberItem[]>(this.apiUrl);
  }

  invite(email: string, role: TeamRole): Observable<TeamMemberItem> {
    return this.http.post<TeamMemberItem>(this.apiUrl, { email, role });
  }

  updateRole(id: number, role: TeamRole): Observable<TeamMemberItem> {
    return this.http.put<TeamMemberItem>(`${this.apiUrl}/${id}/role`, { role });
  }

  remove(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
