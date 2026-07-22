import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AnalyticsApi, AnalyticsResponse, AnalyticsTotal } from '../../services/analytics';
import { Toast } from '../../services/toast';

const PLATFORM_META: Record<string, { color: string; abbr: string }> = {
  linkedin: { color: '#0a66c2', abbr: 'in' },
  x: { color: '#111827', abbr: 'X' },
  instagram: { color: '#e1306c', abbr: 'IG' },
  facebook: { color: '#1877f2', abbr: 'f' },
  youtube: { color: '#ff0000', abbr: 'YT' },
  threads: { color: '#000000', abbr: 'Th' },
};

// Chart canvas (viewBox units)
const W = 720;
const H = 200;
const PAD = 6;

@Component({
  selector: 'app-analytics',
  imports: [RouterLink],
  templateUrl: './analytics.html',
  styleUrl: './analytics.scss',
})
export class Analytics implements OnInit {
  private api = inject(AnalyticsApi);
  private toast = inject(Toast);

  readonly ranges = [7, 30, 90];

  readonly days = signal(30);
  readonly data = signal<AnalyticsResponse | null>(null);
  readonly isLoading = signal(true);

  readonly chartW = W;
  readonly chartH = H;

  readonly hasData = computed(() => {
    const d = this.data();
    return !!d && d.totals.some((t) => t.value > 0);
  });

  readonly values = computed<number[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.series.map((p) => p.published);
  });

  readonly maxValue = computed(() => Math.max(...this.values(), 1));

  private points(): [number, number][] {
    const values = this.values();
    if (values.length < 2) return [];
    const max = this.maxValue();
    const stepX = (W - PAD * 2) / (values.length - 1);
    return values.map((v, i) => [
      PAD + i * stepX,
      H - PAD - (v / max) * (H - PAD * 2),
    ]);
  }

  readonly linePath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    return pts
      .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');
  });

  readonly areaPath = computed(() => {
    const pts = this.points();
    if (pts.length === 0) return '';
    const line = this.linePath();
    const last = pts[pts.length - 1];
    const first = pts[0];
    return `${line} L${last[0].toFixed(1)},${H - PAD} L${first[0].toFixed(1)},${H - PAD} Z`;
  });

  readonly xLabels = computed(() => {
    const d = this.data();
    if (!d || d.series.length === 0) return { first: '', mid: '', last: '' };
    const fmt = (iso: string) => {
      const date = new Date(iso + 'T00:00:00');
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    };
    return {
      first: fmt(d.series[0].date),
      mid: fmt(d.series[Math.floor(d.series.length / 2)].date),
      last: fmt(d.series[d.series.length - 1].date),
    };
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.api.get(this.days()).subscribe({
      next: (data) => {
        this.data.set(data);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load analytics.', 'Analytics');
      },
    });
  }

  setRange(days: number): void {
    if (days === this.days()) return;
    this.days.set(days);
    this.load();
  }

  totals(): AnalyticsTotal[] {
    return this.data()?.totals ?? [];
  }

  format(value: number): string {
    if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
    if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
    return String(value);
  }

  color(platform: string): string {
    return PLATFORM_META[platform]?.color ?? '#64748b';
  }

  abbr(platform: string): string {
    return PLATFORM_META[platform]?.abbr ?? platform.slice(0, 2).toUpperCase();
  }

  barWidth(value: number): number {
    const platforms = this.data()?.platforms ?? [];
    const max = Math.max(...platforms.map((p) => p.posts), 1);
    return Math.max((value / max) * 100, 2);
  }
}
