import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Toast } from '../../services/toast';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';

  constructor(
    private auth: Auth,
    private router: Router,
    private toast: Toast,
  ) {}

  login(): void {
    if (!this.email || !this.password) {
      this.toast.warning('Please enter email and password.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.login({
      email: this.email,
      password: this.password,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success('Welcome back!', 'Logged in');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        const detail =
          error.status === 0
            ? 'Cannot reach the server. Is the backend running?'
            : error.error?.detail ?? 'Login failed. Please try again.';
        this.errorMessage = detail;
        this.toast.error(detail, 'Login failed');
      },
    });
  }
}
