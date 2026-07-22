import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiKeyItem, ApiKeys, KeyProvider } from '../../services/api-keys';
import { Auth } from '../../services/auth';
import { BrandApi, BrandTone } from '../../services/brand';
import { Toast } from '../../services/toast';
import { NotificationPrefs, UserApi, UserProfile } from '../../services/user';
import { OtpInput } from '../../components/otp-input/otp-input';

interface ProviderInfo {
  key: KeyProvider;
  label: string;
  model: string;
  abbr: string;
  hint: string;
}

const PROVIDERS: ProviderInfo[] = [
  { key: 'groq', label: 'Groq', model: 'Llama 3.3 70B', abbr: 'G', hint: 'console.groq.com' },
  { key: 'openai', label: 'OpenAI', model: 'GPT-4o mini', abbr: 'OA', hint: 'platform.openai.com' },
  { key: 'gemini', label: 'Google Gemini', model: 'Gemini 2.0 Flash', abbr: 'GM', hint: 'aistudio.google.com' },
];

type SettingsTab = 'account' | 'brand' | 'ai';

@Component({
  selector: 'app-settings',
  imports: [FormsModule, DatePipe, OtpInput],
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class Settings implements OnInit {
  private userApi = inject(UserApi);
  private keysApi = inject(ApiKeys);
  private brandApi = inject(BrandApi);
  private auth = inject(Auth);
  private toast = inject(Toast);

  readonly providers = PROVIDERS;

  readonly tabs: { key: SettingsTab; label: string }[] = [
    { key: 'account', label: 'Account' },
    { key: 'brand', label: 'Brand & content' },
    { key: 'ai', label: 'AI providers' },
  ];
  readonly tab = signal<SettingsTab>('account');

  readonly isLoading = signal(true);
  readonly savingProfile = signal(false);
  readonly savingPassword = signal(false);
  readonly savingBrand = signal(false);
  readonly profile = signal<UserProfile | null>(null);
  readonly verified = signal<boolean | null>(null);
  readonly resendingVerify = signal(false);
  readonly otpMode = signal(false);
  readonly verifyingOtp = signal(false);
  otpCode = '';

  // Notification preferences
  readonly notifyInapp = signal(true);
  readonly notifyEmail = signal(true);
  readonly savingNotify = signal(false);

  // Brand profile (feeds AI content generation)
  readonly tones: { key: BrandTone; label: string }[] = [
    { key: 'professional', label: 'Professional' },
    { key: 'friendly', label: 'Friendly' },
    { key: 'bold', label: 'Bold' },
    { key: 'casual', label: 'Casual' },
    { key: 'witty', label: 'Witty' },
  ];
  brandName = '';
  brandDescription = '';
  brandTone: BrandTone = 'professional';
  brandAudience = '';

  // API keys
  readonly keys = signal<ApiKeyItem[]>([]);
  readonly busyProvider = signal<KeyProvider | null>(null);
  readonly testingProvider = signal<KeyProvider | null>(null);
  readonly editingProvider = signal<KeyProvider | null>(null);
  keyInput = '';

  // Profile form
  name = '';
  email = '';

  // Password form
  currentPassword = '';
  newPassword = '';
  confirmPassword = '';

  ngOnInit(): void {
    this.auth.me().subscribe({
      next: (user) => this.verified.set(!!user.is_verified),
      error: () => {},
    });

    this.userApi.getProfile().subscribe({
      next: (profile) => {
        this.profile.set(profile);
        this.name = profile.name;
        this.email = profile.email;
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Could not load your profile.', 'Settings');
      },
    });

    this.keysApi.list().subscribe({
      next: (keys) => this.keys.set(keys),
      error: () => {},
    });

    this.userApi.getNotificationPrefs().subscribe({
      next: (prefs) => {
        this.notifyInapp.set(prefs.notify_inapp);
        this.notifyEmail.set(prefs.notify_email);
      },
      error: () => {},
    });

    this.brandApi.get().subscribe({
      next: (brand) => {
        this.brandName = brand.brand_name;
        this.brandDescription = brand.description;
        this.brandTone = brand.tone || 'professional';
        this.brandAudience = brand.audience;
      },
      error: () => {},
    });
  }

  /** Flip a notification toggle — saves immediately. */
  toggleNotify(kind: 'inapp' | 'email'): void {
    const next: NotificationPrefs = {
      notify_inapp: kind === 'inapp' ? !this.notifyInapp() : this.notifyInapp(),
      notify_email: kind === 'email' ? !this.notifyEmail() : this.notifyEmail(),
    };

    this.savingNotify.set(true);
    this.userApi.updateNotificationPrefs(next).subscribe({
      next: (prefs) => {
        this.savingNotify.set(false);
        this.notifyInapp.set(prefs.notify_inapp);
        this.notifyEmail.set(prefs.notify_email);
        this.toast.success(
          kind === 'inapp'
            ? `In-app notifications ${prefs.notify_inapp ? 'on' : 'off'}.`
            : `Email reminders ${prefs.notify_email ? 'on' : 'off'}.`,
          'Notifications',
        );
      },
      error: () => {
        this.savingNotify.set(false);
        this.toast.error('Could not save the preference. Try again.', 'Notifications');
      },
    });
  }

  /** Chip click: send the 4-digit code and reveal the input. */
  startVerify(): void {
    this.otpMode.set(true);
    this.otpCode = '';
    this.resendVerify();
  }

  resendVerify(): void {
    this.resendingVerify.set(true);
    this.auth.resendVerification().subscribe({
      next: (res) => {
        this.resendingVerify.set(false);
        this.toast.success(res.message, 'Verify email');
      },
      error: () => {
        this.resendingVerify.set(false);
        this.toast.error('Could not send the code. Try again.', 'Verify email');
      },
    });
  }

  confirmOtp(): void {
    const code = this.otpCode.trim();
    if (code.length !== 4) {
      this.toast.warning('Enter the 4-digit code from the email.');
      return;
    }

    this.verifyingOtp.set(true);
    this.auth.verifyOtp(code).subscribe({
      next: (res) => {
        this.verifyingOtp.set(false);
        this.otpMode.set(false);
        this.otpCode = '';
        this.verified.set(true);
        this.toast.success(res.message, 'Verified');
      },
      error: (error) => {
        this.verifyingOtp.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not verify the code.';
        this.toast.error(detail, 'Verify email');
      },
    });
  }

  // ── Brand profile ──

  saveBrand(): void {
    if (!this.brandName.trim()) {
      this.toast.warning('Give your brand a name first.');
      return;
    }

    this.savingBrand.set(true);
    this.brandApi
      .save({
        brand_name: this.brandName.trim(),
        description: this.brandDescription.trim(),
        tone: this.brandTone,
        audience: this.brandAudience.trim(),
      })
      .subscribe({
        next: (brand) => {
          this.savingBrand.set(false);
          this.brandName = brand.brand_name;
          this.toast.success(
            `AI content will now be written for ${brand.brand_name}.`,
            'Brand saved',
          );
        },
        error: (error) => {
          this.savingBrand.set(false);
          const detail =
            typeof error.error?.detail === 'string'
              ? error.error.detail
              : 'Could not save your brand profile.';
          this.toast.error(detail, 'Save failed');
        },
      });
  }

  // ── API keys ──

  keyFor(provider: KeyProvider): ApiKeyItem | undefined {
    return this.keys().find((k) => k.provider === provider);
  }

  openEdit(provider: KeyProvider): void {
    this.editingProvider.set(provider);
    this.keyInput = '';
  }

  cancelEdit(): void {
    this.editingProvider.set(null);
    this.keyInput = '';
  }

  saveKey(provider: KeyProvider): void {
    const key = this.keyInput.trim();
    if (key.length < 8) {
      this.toast.warning('That does not look like a valid key.');
      return;
    }

    this.busyProvider.set(provider);
    this.keysApi.save(provider, key).subscribe({
      next: (saved) => {
        this.busyProvider.set(null);
        this.editingProvider.set(null);
        this.keyInput = '';
        this.keys.update((list) => [
          ...list.filter((k) => k.provider !== provider),
          saved,
        ]);
        const note = saved.is_active
          ? `AI generation now runs on ${this.label(provider)}.`
          : `${this.label(provider)} key saved. Click "Use" to make it the active provider.`;
        this.toast.success(note, 'Key saved');
      },
      error: (error) => {
        this.busyProvider.set(null);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not save the key.';
        this.toast.error(detail, 'Save failed');
      },
    });
  }

  testKey(provider: KeyProvider): void {
    this.testingProvider.set(provider);
    this.keysApi.test(provider).subscribe({
      next: () => {
        this.testingProvider.set(null);
        this.toast.success(`${this.label(provider)} key works.`, 'Key test');
      },
      error: (error) => {
        this.testingProvider.set(null);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Key test failed.';
        this.toast.error(detail, 'Key test');
      },
    });
  }

  activate(provider: KeyProvider): void {
    this.busyProvider.set(provider);
    this.keysApi.activate(provider).subscribe({
      next: () => {
        this.busyProvider.set(null);
        this.keys.update((list) =>
          list.map((k) => ({ ...k, is_active: k.provider === provider })),
        );
        this.toast.success(`AI generation now runs on ${this.label(provider)}.`, 'Provider switched');
      },
      error: (error) => {
        this.busyProvider.set(null);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not switch provider.';
        this.toast.error(detail, 'Switch failed');
      },
    });
  }

  removeKey(provider: KeyProvider): void {
    if (!confirm(`Remove your ${this.label(provider)} key?`)) return;

    this.busyProvider.set(provider);
    this.keysApi.remove(provider).subscribe({
      next: () => {
        this.busyProvider.set(null);
        // Reload from server — the backend may have promoted another key
        this.keysApi.list().subscribe({
          next: (keys) => this.keys.set(keys),
        });
        this.toast.info(`${this.label(provider)} key removed.`, 'API keys');
      },
      error: () => {
        this.busyProvider.set(null);
        this.toast.error('Could not remove the key.');
      },
    });
  }

  private label(provider: KeyProvider): string {
    return PROVIDERS.find((p) => p.key === provider)?.label ?? provider;
  }

  // ── Profile ──

  initials(): string {
    return this.name
      .split(' ')
      .map((part) => part.charAt(0))
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'DS';
  }

  saveProfile(): void {
    if (!this.name.trim() || !this.email.trim()) {
      this.toast.warning('Name and email are required.');
      return;
    }

    this.savingProfile.set(true);
    this.userApi.updateProfile(this.name.trim(), this.email.trim()).subscribe({
      next: (profile) => {
        this.savingProfile.set(false);
        this.profile.set(profile);
        this.name = profile.name;
        this.email = profile.email;
        this.toast.success('Profile updated.', 'Saved');
      },
      error: (error) => {
        this.savingProfile.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not update your profile.';
        this.toast.error(detail, 'Save failed');
      },
    });
  }

  // ── Password ──

  savePassword(): void {
    if (!this.currentPassword || !this.newPassword) {
      this.toast.warning('Fill in your current and new password.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.toast.warning('New password must be at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toast.warning('New passwords do not match.');
      return;
    }

    this.savingPassword.set(true);
    this.userApi.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.toast.success('Password changed.', 'Saved');
      },
      error: (error) => {
        this.savingPassword.set(false);
        const detail =
          typeof error.error?.detail === 'string'
            ? error.error.detail
            : 'Could not change your password.';
        this.toast.error(detail, 'Save failed');
      },
    });
  }
}
