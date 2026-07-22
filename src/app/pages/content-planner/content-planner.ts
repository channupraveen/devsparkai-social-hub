import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  ContentPlanApi,
  ContentPlanResponse,
  PlanItem,
} from '../../services/content-plan';
import { Post, PostResponse } from '../../services/post';
import { Toast } from '../../services/toast';

interface ThemeGroup {
  theme: string;
  items: { item: PlanItem; index: number }[];
}

@Component({
  selector: 'app-content-planner',
  imports: [FormsModule, DatePipe],
  templateUrl: './content-planner.html',
  styleUrl: './content-planner.scss',
})
export class ContentPlanner implements OnInit, OnDestroy {
  private api = inject(ContentPlanApi);
  private postApi = inject(Post);
  private toast = inject(Toast);
  private router = inject(Router);

  readonly durations = [7, 14, 30];

  topic = '';
  days = 7;
  readonly customMode = signal(false);

  readonly plans = signal<ContentPlanResponse[]>([]);
  readonly activePlanId = signal<number | null>(null);
  readonly isLoading = signal(true);
  readonly generating = signal(false);
  readonly busyIndex = signal<number | null>(null);

  // ── Plan scheduling ──
  readonly schedulingId = signal<number | null>(null);
  readonly scheduleBusy = signal(false);
  /** Plans queued this session — blocks accidental double-scheduling. */
  readonly scheduledIds = signal<Set<number>>(new Set());
  scheduleStart = '';
  scheduleTime = '09:00';

  /** Scheduled posts — used to show each plan's next due date + countdown. */
  readonly scheduledPosts = signal<PostResponse[]>([]);
  readonly now = signal(Date.now());
  private tick: ReturnType<typeof setInterval> | null = null;
  private duesNotified = new Set<number>();

  readonly activePlan = computed(() =>
    this.plans().find((p) => p.id === this.activePlanId()) ?? null,
  );

  /** Items of the active plan grouped by theme, preserving day order. */
  readonly groups = computed<ThemeGroup[]>(() => {
    const plan = this.activePlan();
    if (!plan) return [];

    const groups: ThemeGroup[] = [];
    plan.items.forEach((item, index) => {
      let group = groups.find((g) => g.theme === item.theme);
      if (!group) {
        group = { theme: item.theme, items: [] };
        groups.push(group);
      }
      group.items.push({ item, index });
    });
    return groups;
  });

  /** Grouped view only pays off when themes actually contain multiple days. */
  readonly useGroups = computed(() => {
    const plan = this.activePlan();
    if (!plan || plan.items.length === 0) return false;
    const themeCount = new Set(plan.items.map((i) => i.theme)).size;
    return themeCount <= Math.max(2, Math.ceil(plan.items.length / 2));
  });

  readonly flatItems = computed(() => {
    const plan = this.activePlan();
    if (!plan) return [];
    return plan.items.map((item, index) => ({ item, index }));
  });

  readonly doneCount = computed(
    () => this.activePlan()?.items.filter((i) => i.done).length ?? 0,
  );

  readonly progressPct = computed(() => {
    const plan = this.activePlan();
    if (!plan || plan.items.length === 0) return 0;
    return Math.round((this.doneCount() / plan.items.length) * 100);
  });

  ngOnInit(): void {
    this.loadScheduled();
    this.tick = setInterval(() => {
      this.now.set(Date.now());
      this.checkDue();
    }, 30000);

    this.api.list().subscribe({
      next: (plans) => {
        this.plans.set(plans);
        if (plans.length > 0) this.activePlanId.set(plans[0].id);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load your plans.', 'Content Planner');
      },
    });
  }

  ngOnDestroy(): void {
    if (this.tick) clearInterval(this.tick);
  }

  private loadScheduled(): void {
    this.postApi.list('scheduled').subscribe({
      next: (posts) => this.scheduledPosts.set(posts),
      error: () => {},
    });
  }

  /** Earliest scheduled post whose title matches an idea in this plan. */
  nextDueFor(plan: ContentPlanResponse): PostResponse | null {
    const titles = new Set(plan.items.map((i) => i.title));
    const matches = this.scheduledPosts()
      .filter((p) => p.status === 'scheduled' && p.scheduled_at && titles.has(p.title))
      .sort((a, b) => a.scheduled_at!.localeCompare(b.scheduled_at!));
    return matches[0] ?? null;
  }

  /** Human countdown — re-evaluates as now() ticks. */
  countdown(dateStr: string): string {
    const diff = new Date(dateStr).getTime() - this.now();
    if (diff <= 0) return 'due now';
    const mins = Math.round(diff / 60000);
    if (mins < 60) return `in ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `in ${hours}h ${mins % 60}m`;
    const days = Math.floor(hours / 24);
    return `in ${days}d ${hours % 24}h`;
  }

  /** Toast once when a scheduled post's time arrives. */
  private checkDue(): void {
    for (const p of this.scheduledPosts()) {
      if (
        p.status === 'scheduled' &&
        p.scheduled_at &&
        new Date(p.scheduled_at).getTime() <= this.now() &&
        !this.duesNotified.has(p.id)
      ) {
        this.duesNotified.add(p.id);
        this.toast.info(
          `"${p.title}" is due — open it, generate the content, and post.`,
          'Time to post',
        );
      }
    }
  }

  setDays(d: number): void {
    this.customMode.set(false);
    this.days = d;
  }

  enableCustom(): void {
    this.customMode.set(true);
  }

  generate(): void {
    if (this.topic.trim().length < 3) {
      this.toast.warning('Give the planner a topic first.');
      return;
    }

    const days = Math.round(Number(this.days));
    if (!days || days < 3 || days > 60) {
      this.toast.warning('Days must be between 3 and 60.');
      return;
    }
    this.days = days;

    this.generating.set(true);
    this.api.generate(this.topic.trim(), days).subscribe({
      next: (plan) => {
        this.generating.set(false);
        this.plans.update((list) => [plan, ...list]);
        this.activePlanId.set(plan.id);
        this.topic = '';

        if (plan.note) {
          this.toast.warning(plan.note, 'Content Planner');
        } else {
          this.toast.success(
            `${plan.days} days of content ideas ready. Pick one and create the post.`,
            'Plan ready',
          );
        }
      },
      error: (error) => {
        this.generating.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not generate the plan.';
        this.toast.error(detail, 'Content Planner');
      },
    });
  }

  toggleExpand(plan: ContentPlanResponse): void {
    this.activePlanId.set(this.activePlanId() === plan.id ? null : plan.id);
  }

  pct(plan: ContentPlanResponse): number {
    if (plan.items.length === 0) return 0;
    const done = plan.items.filter((i) => i.done).length;
    return Math.round((done / plan.items.length) * 100);
  }

  planProgress(plan: ContentPlanResponse): string {
    const done = plan.items.filter((i) => i.done).length;
    return `${done}/${plan.items.length}`;
  }

  toggle(index: number, done: boolean): void {
    const plan = this.activePlan();
    if (!plan) return;

    this.busyIndex.set(index);
    this.api.toggleItem(plan.id, index, done).subscribe({
      next: (updated) => {
        this.busyIndex.set(null);
        this.plans.update((list) =>
          list.map((p) => (p.id === updated.id ? updated : p)),
        );
      },
      error: () => {
        this.busyIndex.set(null);
        this.toast.error('Could not update the item.');
      },
    });
  }

  createPost(index: number): void {
    const plan = this.activePlan();
    if (!plan) return;
    const item = plan.items[index];
    this.router.navigate(['/create-post'], {
      queryParams: { topic: item.title, plan: plan.id, item: index },
    });
  }

  // ── Schedule the whole plan into the post queue ──

  /** Earliest pickable start — tomorrow, so no past/same-day surprises. */
  minStartDate(): string {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  /** Queued = any of this plan's ideas already sit in the scheduled queue.
   *  Survives reloads because it's derived from real posts, not session state. */
  isQueued(plan: ContentPlanResponse): boolean {
    return this.scheduledIds().has(plan.id) || this.nextDueFor(plan) !== null;
  }

  openSchedule(plan: ContentPlanResponse): void {
    if (this.isQueued(plan)) {
      this.toast.info('This plan is already queued.');
      return;
    }
    // Default start: tomorrow — keeps Day 1 safely in the future
    const t = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    this.scheduleStart = `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    this.schedulingId.set(this.schedulingId() === plan.id ? null : plan.id);
  }

  closeSchedule(): void {
    this.schedulingId.set(null);
  }

  confirmSchedulePlan(plan: ContentPlanResponse): void {
    if (!this.scheduleStart || !this.scheduleTime) {
      this.toast.warning('Pick a start date and time first.');
      return;
    }

    // Hard block: typed/pasted past dates bypass the picker's min attribute
    if (this.scheduleStart < this.minStartDate()) {
      this.toast.warning('Start date must be tomorrow or later.');
      return;
    }

    const pending = plan.items
      .map((item, index) => ({ item, index }))
      .filter((e) => !e.item.done);

    if (pending.length === 0) {
      this.toast.info('Every idea in this plan is already posted.');
      return;
    }

    const [y, m, d] = this.scheduleStart.split('-').map(Number);
    const [hh, mm] = this.scheduleTime.split(':').map(Number);
    const firstDay = Math.min(...pending.map((e) => e.item.day));

    const dateFor = (day: number) => new Date(y, m - 1, d + (day - firstDay), hh, mm);

    if (dateFor(firstDay).getTime() <= Date.now()) {
      this.toast.warning('That start time is in the past — pick a future date or time.');
      return;
    }

    this.scheduleBusy.set(true);
    this.api
      .schedule(plan.id, dateFor(firstDay).toISOString(), ['linkedin', 'x'])
      .subscribe({
        next: (res) => {
          this.scheduleBusy.set(false);
          this.schedulingId.set(null);
          this.scheduledIds.update((set) => new Set(set).add(plan.id));
          this.scheduledPosts.update((list) => [...list, ...res.created]);
          const skippedNote =
            res.skipped > 0 ? ` (${res.skipped} already in the queue, skipped)` : '';
          this.toast.success(
            `${res.created.length} post${res.created.length === 1 ? '' : 's'} queued${skippedNote} — open each on its day, generate the content, and post.`,
            'Plan scheduled',
          );
        },
        error: (error) => {
          this.scheduleBusy.set(false);
          const detail =
            typeof error.error?.detail === 'string'
              ? error.error.detail
              : 'Could not queue the plan.';
          this.toast.error(detail, 'Schedule plan');
        },
      });
  }

  deletePlan(plan: ContentPlanResponse): void {
    if (!confirm(`Delete the "${plan.topic}" plan?`)) return;

    this.api.delete(plan.id).subscribe({
      next: () => {
        this.plans.update((list) => list.filter((p) => p.id !== plan.id));
        if (this.activePlanId() === plan.id) {
          this.activePlanId.set(this.plans()[0]?.id ?? null);
        }
        this.toast.info('Plan deleted.');
      },
      error: () => this.toast.error('Could not delete the plan.'),
    });
  }
}
