import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  ContentPlanApi,
  ContentPlanResponse,
  PlanItem,
} from '../../services/content-plan';
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
export class ContentPlanner implements OnInit {
  private api = inject(ContentPlanApi);
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
