import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Auth } from '../../services/auth';
import {
  DashboardApi,
  PlatformStatus,
  RecentPost,
  StatCard,
} from '../../services/dashboard';
import { Toast } from '../../services/toast';

const PLATFORM_META: Record<string, { color: string; abbr: string }> = {
  linkedin: { color: '#0a66c2', abbr: 'in' },
  x: { color: '#111827', abbr: 'X' },
  instagram: { color: '#e1306c', abbr: 'IG' },
  facebook: { color: '#1877f2', abbr: 'f' },
  youtube: { color: '#ff0000', abbr: 'YT' },
  threads: { color: '#000000', abbr: 'Th' },
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private auth = inject(Auth);
  private dashboardApi = inject(DashboardApi);
  private toast = inject(Toast);

  readonly firstName = signal('there');
  readonly isLoading = signal(true);

  readonly stats = signal<StatCard[]>([]);
  readonly platforms = signal<PlatformStatus[]>([]);
  readonly recentPosts = signal<RecentPost[]>([]);

  readonly liveCount = computed(
    () => this.platforms().filter((p) => p.connected).length,
  );

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (user) => this.firstName.set(user.name.split(' ')[0]),
      error: () => this.firstName.set('there'),
    });

    this.dashboardApi.getDashboard().subscribe({
      next: (data) => {
        this.stats.set(data.stats);
        this.platforms.set(data.platforms);
        this.recentPosts.set(data.recent_posts);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.isLoading.set(false);
        if (error.status !== 401) {
          this.toast.error('Could not load dashboard data.', 'Dashboard');
        }
      },
    });
  }

  color(platform: string): string {
    return PLATFORM_META[platform]?.color ?? '#64748b';
  }

  abbr(platform: string): string {
    return PLATFORM_META[platform]?.abbr ?? platform.slice(0, 2).toUpperCase();
  }

  formatValue(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
    return String(value);
  }

  platformLabel(keys: string[]): string {
    return keys.map((k) => PLATFORM_META[k] ? k.charAt(0).toUpperCase() + k.slice(1) : k).join(' · ');
  }
}
