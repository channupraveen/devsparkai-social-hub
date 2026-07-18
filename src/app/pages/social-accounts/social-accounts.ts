import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { SocialAccount, SocialAccountItem } from '../../services/social-account';
import { Toast } from '../../services/toast';

const PLATFORM_META: Record<string, { color: string; abbr: string; blurb: string }> = {
  linkedin: { color: '#0a66c2', abbr: 'in', blurb: 'Professional posts, articles and company updates.' },
  x: { color: '#111827', abbr: 'X', blurb: 'Short-form threads and quick updates.' },
  instagram: { color: '#e1306c', abbr: 'IG', blurb: 'Visual posts and reels. Needs a Business account.' },
  facebook: { color: '#1877f2', abbr: 'f', blurb: 'Page posts for communities and longer updates.' },
  youtube: { color: '#ff0000', abbr: 'YT', blurb: 'Video titles, descriptions and community posts.' },
};

@Component({
  selector: 'app-social-accounts',
  imports: [FormsModule],
  templateUrl: './social-accounts.html',
  styleUrl: './social-accounts.scss',
})
export class SocialAccounts implements OnInit {
  private api = inject(SocialAccount);
  private toast = inject(Toast);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  readonly accounts = signal<SocialAccountItem[]>([]);
  readonly isLoading = signal(true);
  readonly busyPlatform = signal<string | null>(null);

  /** Platform whose inline connect form is open */
  readonly connecting = signal<string | null>(null);
  handle = '';

  readonly liveCount = computed(
    () => this.accounts().filter((a) => a.connected).length,
  );

  ngOnInit(): void {
    this.load();

    // Back from the X OAuth redirect?
    const params = this.route.snapshot.queryParamMap;
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected === 'x') {
      this.toast.success('X is connected — posts to X now publish for real.', 'Channel live');
    } else if (error) {
      this.toast.error(error, 'Connection failed');
    }
    if (connected || error) {
      this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  load(): void {
    this.api.list().subscribe({
      next: (accounts) => {
        this.accounts.set(accounts);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load your accounts.', 'Social accounts');
      },
    });
  }

  color(platform: string): string {
    return PLATFORM_META[platform]?.color ?? '#64748b';
  }

  abbr(platform: string): string {
    return PLATFORM_META[platform]?.abbr ?? platform.slice(0, 2).toUpperCase();
  }

  blurb(platform: string): string {
    return PLATFORM_META[platform]?.blurb ?? '';
  }

  openConnect(platform: string): void {
    // X connects through real OAuth — no handle form
    if (platform === 'x') {
      this.connectX();
      return;
    }
    this.connecting.set(platform);
    this.handle = '';
  }

  private connectX(): void {
    this.busyPlatform.set('x');
    this.api.authorizeX().subscribe({
      next: (res) => {
        window.location.href = res.url;
      },
      error: (error) => {
        this.busyPlatform.set(null);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not start the X login.';
        this.toast.error(detail, 'X connect');
      },
    });
  }

  cancelConnect(): void {
    this.connecting.set(null);
    this.handle = '';
  }

  confirmConnect(platform: string): void {
    const handle = this.handle.trim();
    if (!handle) {
      this.toast.warning('Enter the account handle first.');
      return;
    }

    this.busyPlatform.set(platform);
    this.api.connect(platform, handle).subscribe({
      next: (updated) => {
        this.busyPlatform.set(null);
        this.connecting.set(null);
        this.handle = '';
        this.replace(updated);
        this.toast.success(`${updated.name} is now live.`, 'Channel connected');
      },
      error: (error) => {
        this.busyPlatform.set(null);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not connect the account.';
        this.toast.error(detail, 'Connection failed');
      },
    });
  }

  disconnect(account: SocialAccountItem): void {
    this.busyPlatform.set(account.platform);
    this.api.disconnect(account.platform).subscribe({
      next: (updated) => {
        this.busyPlatform.set(null);
        this.replace(updated);
        this.toast.info(`${updated.name} disconnected.`, 'Channel offline');
      },
      error: () => {
        this.busyPlatform.set(null);
        this.toast.error('Could not disconnect the account.');
      },
    });
  }

  private replace(updated: SocialAccountItem): void {
    this.accounts.update((list) =>
      list.map((a) => (a.platform === updated.platform ? updated : a)),
    );
  }
}
