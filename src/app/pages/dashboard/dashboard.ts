import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Auth } from '../../services/auth';
import { Post, PostResponse } from '../../services/post';
import { ContentPlanApi, ContentPlanResponse } from '../../services/content-plan';
import { Toast } from '../../services/toast';

const PLATFORM_META: Record<string, { color: string; abbr: string; label: string }> = {
  linkedin: { color: '#0a66c2', abbr: 'in', label: 'LinkedIn' },
  x: { color: '#111827', abbr: 'X', label: 'X' },
  instagram: { color: '#e1306c', abbr: 'IG', label: 'Instagram' },
  facebook: { color: '#1877f2', abbr: 'f', label: 'Facebook' },
  youtube: { color: '#ff0000', abbr: 'YT', label: 'YouTube' },
  threads: { color: '#000000', abbr: 'Th', label: 'Threads' },
};

/** Web compose targets. x / linkedin / threads support pre-filled text. */
const COMPOSE_URLS: Record<string, { base: string; prefill: boolean }> = {
  x: { base: 'https://x.com/intent/post?text=', prefill: true },
  linkedin: { base: 'https://www.linkedin.com/feed/?shareActive=true&text=', prefill: true },
  threads: { base: 'https://www.threads.net/intent/post?text=', prefill: true },
  instagram: { base: 'https://www.instagram.com/', prefill: false },
  facebook: { base: 'https://www.facebook.com/', prefill: false },
  youtube: { base: 'https://studio.youtube.com/', prefill: false },
};

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  private auth = inject(Auth);
  private postApi = inject(Post);
  private planApi = inject(ContentPlanApi);
  private toast = inject(Toast);

  readonly firstName = signal('there');
  readonly isLoading = signal(true);
  readonly busyId = signal<number | null>(null);

  readonly posts = signal<PostResponse[]>([]);
  readonly plans = signal<ContentPlanResponse[]>([]);

  /** Scheduled posts, soonest first — the manual publishing queue. */
  readonly queue = computed(() =>
    this.posts()
      .filter((p) => p.status === 'scheduled')
      .sort((a, b) => (a.scheduled_at ?? '').localeCompare(b.scheduled_at ?? ''))
      .slice(0, 8),
  );

  readonly recent = computed(() =>
    [...this.posts()]
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      .slice(0, 6),
  );

  readonly statCards = computed(() => {
    const posts = this.posts();
    return [
      { label: 'Drafts', value: posts.filter((p) => p.status === 'draft').length, link: '/scheduled-posts' },
      { label: 'In queue', value: posts.filter((p) => p.status === 'scheduled').length, link: '/scheduled-posts' },
      { label: 'Published', value: posts.filter((p) => p.status === 'published').length, link: '/scheduled-posts' },
      { label: 'Content plans', value: this.plans().length, link: '/content-planner' },
    ];
  });

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (user) => this.firstName.set(user.name.split(' ')[0]),
      error: () => this.firstName.set('there'),
    });

    forkJoin({
      posts: this.postApi.list().pipe(catchError(() => of([] as PostResponse[]))),
      plans: this.planApi.list().pipe(catchError(() => of([] as ContentPlanResponse[]))),
    }).subscribe(({ posts, plans }) => {
      this.posts.set(posts);
      this.plans.set(plans);
      this.isLoading.set(false);
    });
  }

  /** Copy the platform-specific text and open the platform's composer. */
  share(post: PostResponse, platform: string): void {
    const text = post.content_variants?.[platform] || post.content;
    navigator.clipboard?.writeText(text).catch(() => {});

    const target = COMPOSE_URLS[platform];
    const label = PLATFORM_META[platform]?.label ?? platform;
    if (target) {
      const url = target.prefill ? target.base + encodeURIComponent(text) : target.base;
      window.open(url, '_blank', 'noopener');
    }
    this.toast.success(
      target?.prefill
        ? `Composer opened with your ${label} text. Copied to clipboard too.`
        : `Copied your ${label} text — paste it in the app.`,
      'Ready to post',
    );
  }

  /** After posting manually, mark the post as published. */
  markPosted(post: PostResponse): void {
    this.busyId.set(post.id);
    this.postApi.publishNow(post.id).subscribe({
      next: (updated) => {
        this.posts.update((list) => list.map((p) => (p.id === updated.id ? updated : p)));
        this.busyId.set(null);
        this.toast.success(`"${post.title}" marked as published.`, 'Nice work');
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Could not update the post. Try again.');
      },
    });
  }

  color(platform: string): string {
    return PLATFORM_META[platform]?.color ?? '#64748b';
  }

  abbr(platform: string): string {
    return PLATFORM_META[platform]?.abbr ?? platform.slice(0, 2).toUpperCase();
  }

  platformLabel(keys: string[]): string {
    return keys
      .map((k) => PLATFORM_META[k]?.label ?? k)
      .join(' · ');
  }
}
