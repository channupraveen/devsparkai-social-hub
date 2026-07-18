import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import {
  AppNotification,
  NotificationsApi,
} from '../../services/notifications';
import { Toast } from '../../services/toast';

@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class Header implements OnInit, OnDestroy {
  private api = inject(NotificationsApi);
  private toast = inject(Toast);
  private router = inject(Router);
  private host = inject(ElementRef);

  readonly today = new Date();

  readonly unread = signal(0);
  readonly open = signal(false);
  readonly items = signal<AppNotification[]>([]);
  readonly loading = signal(false);

  private pollTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.refreshCount();
    this.pollTimer = setInterval(() => {
      this.refreshCount();
      // Keep the list fresh while the panel is open
      if (this.open()) this.load();
    }, 30000);
  }

  ngOnDestroy(): void {
    if (this.pollTimer) clearInterval(this.pollTimer);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.open() && !this.host.nativeElement.contains(event.target)) {
      this.open.set(false);
    }
  }

  private refreshCount(): void {
    this.api.unreadCount().subscribe({
      next: (res) => this.unread.set(res.count),
      error: () => {},
    });
  }

  toggle(): void {
    const next = !this.open();
    this.open.set(next);
    if (next) this.load();
  }

  load(): void {
    this.loading.set(true);
    this.api.list().subscribe({
      next: (items) => {
        this.items.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast.error('Could not load notifications.');
      },
    });
  }

  openItem(n: AppNotification): void {
    if (!n.is_read) {
      this.api.markRead(n.id).subscribe({
        next: () => this.refreshCount(),
        error: () => {},
      });
      this.items.update((list) =>
        list.map((i) => (i.id === n.id ? { ...i, is_read: true } : i)),
      );
      this.unread.update((c) => Math.max(0, c - 1));
    }
    this.open.set(false);
    if (n.link) {
      const [path, query] = n.link.split('?');
      const queryParams: Record<string, string> = {};
      if (query) {
        for (const pair of query.split('&')) {
          const [k, v] = pair.split('=');
          if (k) queryParams[k] = decodeURIComponent(v ?? '');
        }
      }
      this.router.navigate([path], { queryParams });
    }
  }

  markAll(): void {
    this.api.markAllRead().subscribe({
      next: () => {
        this.items.update((list) => list.map((i) => ({ ...i, is_read: true })));
        this.unread.set(0);
      },
      error: () => this.toast.error('Could not mark all as read.'),
    });
  }

  removeItem(event: Event, n: AppNotification): void {
    event.stopPropagation();
    this.api.remove(n.id).subscribe({
      next: () => {
        this.items.update((list) => list.filter((i) => i.id !== n.id));
        if (!n.is_read) this.unread.update((c) => Math.max(0, c - 1));
      },
      error: () => {},
    });
  }

  typeColor(type: string): string {
    switch (type) {
      case 'post_published':
        return 'var(--signal, #16a34a)';
      case 'publish_failed':
        return 'var(--danger, #dc2626)';
      case 'post_due':
        return 'var(--spark, #ffd338)';
      default:
        return 'var(--text-muted, #94a3b8)';
    }
  }

  relative(dateStr: string): string {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.max(0, Math.round(diffMs / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.round(hours / 24)}d ago`;
  }
}
