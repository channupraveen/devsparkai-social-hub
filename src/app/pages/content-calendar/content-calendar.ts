import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { CalendarPost, Post } from '../../services/post';
import { Toast } from '../../services/toast';

interface DayCell {
  date: Date;
  key: string;
  dayNumber: number;
  inMonth: boolean;
  isToday: boolean;
  posts: CalendarPost[];
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

@Component({
  selector: 'app-content-calendar',
  imports: [RouterLink],
  templateUrl: './content-calendar.html',
  styleUrl: './content-calendar.scss',
})
export class ContentCalendar implements OnInit {
  private postApi = inject(Post);
  private toast = inject(Toast);

  readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  readonly year = signal(new Date().getFullYear());
  readonly month = signal(new Date().getMonth()); // 0-based
  readonly posts = signal<CalendarPost[]>([]);
  readonly isLoading = signal(true);

  readonly monthLabel = computed(() => `${MONTHS[this.month()]} ${this.year()}`);

  readonly scheduledCount = computed(
    () => this.posts().filter((p) => p.status === 'scheduled').length,
  );
  readonly publishedCount = computed(
    () => this.posts().filter((p) => p.status === 'published').length,
  );

  readonly cells = computed<DayCell[]>(() => {
    const year = this.year();
    const month = this.month();

    const byDay = new Map<string, CalendarPost[]>();
    for (const post of this.posts()) {
      const key = dateKey(new Date(post.date));
      const list = byDay.get(key) ?? [];
      list.push(post);
      byDay.set(key, list);
    }

    const first = new Date(year, month, 1);
    // Monday-first offset: JS getDay() is 0=Sun..6=Sat
    const offset = (first.getDay() + 6) % 7;
    const start = new Date(year, month, 1 - offset);
    const todayKey = dateKey(new Date());

    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
      const key = dateKey(date);
      cells.push({
        date,
        key,
        dayNumber: date.getDate(),
        inMonth: date.getMonth() === month,
        isToday: key === todayKey,
        posts: byDay.get(key) ?? [],
      });
    }
    return cells;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading.set(true);
    // Backend months are 1-based
    this.postApi.calendar(this.year(), this.month() + 1).subscribe({
      next: (posts) => {
        this.posts.set(posts);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load the calendar.', 'Content calendar');
      },
    });
  }

  previous(): void {
    if (this.month() === 0) {
      this.month.set(11);
      this.year.update((y) => y - 1);
    } else {
      this.month.update((m) => m - 1);
    }
    this.load();
  }

  next(): void {
    if (this.month() === 11) {
      this.month.set(0);
      this.year.update((y) => y + 1);
    } else {
      this.month.update((m) => m + 1);
    }
    this.load();
  }

  today(): void {
    const now = new Date();
    this.year.set(now.getFullYear());
    this.month.set(now.getMonth());
    this.load();
  }

  time(post: CalendarPost): string {
    const d = new Date(post.date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
  }
}
