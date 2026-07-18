import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth';
import { Toast } from '../../services/toast';

@Component({
  selector: 'app-register',
  imports: [FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  name = '';
  email = '';
  password = '';
  isLoading = false;
  errorMessage = '';
  showPassword = false;

  constructor(
    private auth: Auth,
    private router: Router,
    private toast: Toast,
  ) {}

  register(): void {
    if (!this.name || !this.email || !this.password) {
      this.toast.warning('Please fill in all fields.');
      return;
    }

    if (this.password.length < 8) {
      this.toast.warning('Password must be at least 8 characters.');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.auth.register({
      name: this.name,
      email: this.email,
      password: this.password,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.toast.success('Account created. Welcome!', 'Registered');
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        const detail =
          error.status === 0
            ? 'Cannot reach the server. Is the backend running?'
            : error.error?.detail ?? 'Registration failed. Please try again.';
        this.errorMessage = detail;
        this.toast.error(detail, 'Registration failed');
      },
    });
  }
}
