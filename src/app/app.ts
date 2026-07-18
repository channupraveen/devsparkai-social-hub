import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { ToastContainer } from './components/toast/toast';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastContainer],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('devsparkai-social-hub');
}
