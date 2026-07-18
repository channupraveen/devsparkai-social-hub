import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Post, PostResponse } from '../../services/post';
import { Toast } from '../../services/toast';

type Tab = 'scheduled' | 'draft' | 'published';

const PLATFORM_META: Record<string, { color: string; abbr: string }> = {
  linkedin: { color: '#0a66c2', abbr: 'in' },
  x: { color: '#111827', abbr: 'X' },
  instagram: { color: '#e1306c', abbr: 'IG' },
  facebook: { color: '#1877f2', abbr: 'f' },
  youtube: { color: '#ff0000', abbr: 'YT' },
};

@Component({
  selector: 'app-scheduled-posts',
  imports: [DatePipe, FormsModule, RouterLink],
  templateUrl: './scheduled-posts.html',
  styleUrl: './scheduled-posts.scss',
})
export class ScheduledPosts implements OnInit {
  private postApi = inject(Post);
  private toast = inject(Toast);
  private router = inject(Router);

  readonly tabs: { key: Tab; label: string }[] = [
    { key: 'scheduled', label: 'Scheduled' },
    { key: 'draft', label: 'Drafts' },
    { key: 'published', label: 'Published' },
  ];

  readonly activeTab = signal<Tab>('scheduled');
  readonly posts = signal<PostResponse[]>([]);
  readonly isLoading = signal(true);
  readonly busyId = signal<number | null>(null);

  /** Post id whose reschedule editor is open */
  readonly rescheduling = signal<number | null>(null);
  newDate = '';

  ngOnInit(): void {
    this.load();
  }

  setTab(tab: Tab): void {
    if (tab === this.activeTab()) return;
    this.activeTab.set(tab);
    this.rescheduling.set(null);
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    this.postApi.list(this.activeTab()).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load posts.', 'Posts');
      },
    });
  }

  edit(post: PostResponse): void {
    this.router.navigate(['/create-post'], { queryParams: { id: post.id } });
  }

  abbr(platform: string): string {
    return PLATFORM_META[platform]?.abbr ?? platform.slice(0, 2).toUpperCase();
  }

  color(platform: string): string {
    return PLATFORM_META[platform]?.color ?? '#64748b';
  }

  relative(dateStr: string | null): string {
    if (!dateStr) return '';
    const diffMs = new Date(dateStr).getTime() - Date.now();
    const abs = Math.abs(diffMs);
    const mins = Math.round(abs / 60000);
    const hours = Math.round(mins / 60);
    const days = Math.round(hours / 24);

    let span: string;
    if (mins < 60) span = `${mins}m`;
    else if (hours < 24) span = `${hours}h`;
    else span = `${days}d`;

    return diffMs >= 0 ? `in ${span}` : `${span} ago`;
  }

  isOverdue(post: PostResponse): boolean {
    return (
      post.status === 'scheduled' &&
      !!post.scheduled_at &&
      new Date(post.scheduled_at).getTime() < Date.now()
    );
  }

  publishNow(post: PostResponse): void {
    this.busyId.set(post.id);
    this.postApi.publishNow(post.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.removeFromList(post.id);
        this.toast.success(`"${post.title}" is live.`, 'Published');
      },
      error: (error) => this.actionError(error, 'Could not publish the post.'),
    });
  }

  cancel(post: PostResponse): void {
    this.busyId.set(post.id);
    this.postApi.cancelSchedule(post.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.removeFromList(post.id);
        this.toast.info('Moved back to drafts.', 'Schedule cancelled');
      },
      error: (error) => this.actionError(error, 'Could not cancel the schedule.'),
    });
  }

  openReschedule(post: PostResponse): void {
    this.rescheduling.set(post.id);
    this.newDate = post.scheduled_at
      ? this.toLocalInput(new Date(post.scheduled_at))
      : '';
  }

  confirmReschedule(post: PostResponse): void {
    if (!this.newDate) {
      this.toast.warning('Pick a date and time first.');
      return;
    }
    if (new Date(this.newDate).getTime() <= Date.now()) {
      this.toast.warning('That time is in the past — pick a future date and time.');
      return;
    }

    this.busyId.set(post.id);
    this.postApi.reschedule(post.id, new Date(this.newDate).toISOString()).subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.rescheduling.set(null);
        if (this.activeTab() === 'scheduled') {
          this.posts.update((list) =>
            list
              .map((p) => (p.id === updated.id ? updated : p))
              .sort(
                (a, b) =>
                  new Date(a.scheduled_at ?? 0).getTime() -
                  new Date(b.scheduled_at ?? 0).getTime(),
              ),
          );
        } else {
          // Draft got scheduled — it leaves this tab
          this.removeFromList(post.id);
        }
        this.toast.success('Schedule updated.', 'Rescheduled');
      },
      error: (error) => this.actionError(error, 'Could not reschedule the post.'),
    });
  }

  remove(post: PostResponse): void {
    if (!confirm(`Delete "${post.title}"? This cannot be undone.`)) return;

    this.busyId.set(post.id);
    this.postApi.delete(post.id).subscribe({
      next: () => {
        this.busyId.set(null);
        this.removeFromList(post.id);
        this.toast.info('Post deleted.');
      },
      error: (error) => this.actionError(error, 'Could not delete the post.'),
    });
  }

  private removeFromList(id: number): void {
    this.posts.update((list) => list.filter((p) => p.id !== id));
  }

  private actionError(error: any, fallback: string): void {
    this.busyId.set(null);
    const detail =
      typeof error?.error?.detail === 'string' ? error.error.detail : fallback;
    this.toast.error(detail, 'Action failed');
  }

  /** Earliest pickable schedule time — blocks past dates in the picker. */
  minScheduleAt(): string {
    return this.toLocalInput(new Date());
  }

  private toLocalInput(d: Date): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}
