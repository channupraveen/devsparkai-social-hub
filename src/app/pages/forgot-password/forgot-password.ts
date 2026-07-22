import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { Auth } from '../../services/auth';
import { Toast } from '../../services/toast';
import { OtpInput } from '../../components/otp-input/otp-input';

type Step = 'email' | 'reset' | 'done';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink, OtpInput],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.scss',
})
export class ForgotPassword {
  private auth = inject(Auth);
  private toast = inject(Toast);
  private router = inject(Router);

  readonly step = signal<Step>('email');
  readonly sending = signal(false);
  readonly resetting = signal(false);

  email = '';
  code = '';
  newPassword = '';
  confirmPassword = '';
  showPassword = false;

  sendCode(): void {
    const email = this.email.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.toast.warning('Enter the email you signed up with.');
      return;
    }

    this.sending.set(true);
    this.auth.forgotPassword(email).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.step.set('reset');
        this.toast.success(res.message, 'Reset code');
      },
      error: () => {
        this.sending.set(false);
        this.toast.error('Could not send the code. Try again.', 'Reset code');
      },
    });
  }

  reset(): void {
    if (this.code.trim().length !== 4) {
      this.toast.warning('Enter the 4-digit code from the email.');
      return;
    }
    if (this.newPassword.length < 8) {
      this.toast.warning('New password must be at least 8 characters.');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.toast.warning('Passwords do not match.');
      return;
    }

    this.resetting.set(true);
    this.auth
      .resetPassword(this.email.trim().toLowerCase(), this.code.trim(), this.newPassword)
      .subscribe({
        next: (res) => {
          this.resetting.set(false);
          this.step.set('done');
          this.toast.success(res.message, 'Password updated');
        },
        error: (error) => {
          this.resetting.set(false);
          const detail =
            typeof error.error?.detail === 'string'
              ? error.error.detail
              : 'Could not reset the password.';
          this.toast.error(detail, 'Reset failed');
        },
      });
  }

  goLogin(): void {
    this.router.navigate(['/login']);
  }
}
