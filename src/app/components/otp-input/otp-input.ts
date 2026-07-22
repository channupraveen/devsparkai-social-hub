import {
  Component,
  ElementRef,
  EventEmitter,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';

/** 4-digit code input: auto-advance, backspace navigation, paste support. */
@Component({
  selector: 'app-otp-input',
  template: `
    <div class="otp-boxes" (paste)="onPaste($event)">
      @for (d of digits; track $index) {
        <input
          #box
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          [value]="digits[$index]"
          (input)="onInput($index, $event)"
          (keydown)="onKeydown($index, $event)"
          (focus)="onFocus($event)"
        />
      }
    </div>
  `,
  styles: `
    .otp-boxes {
      display: flex;
      gap: 10px;
    }

    input {
      width: 48px;
      height: 54px;
      padding: 0;
      text-align: center;
      border: 1px solid var(--border, #dde2e8);
      border-radius: var(--radius-sm, 7px);
      background: var(--card, #fff);
      color: var(--text-primary, #14181d);
      font-family: var(--font-mono, monospace);
      font-size: 22px;
      font-weight: 600;
      outline: none;
      transition: border-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
      box-sizing: border-box;

      &:focus {
        border-color: var(--ink, #101418);
        box-shadow: 0 0 0 3px rgba(255, 211, 56, 0.35);
        transform: translateY(-1px);
      }
    }
  `,
})
export class OtpInput {
  @Output() codeChange = new EventEmitter<string>();

  readonly digits: string[] = ['', '', '', ''];

  @ViewChildren('box') boxes!: QueryList<ElementRef<HTMLInputElement>>;

  private focusBox(index: number): void {
    const el = this.boxes.get(index)?.nativeElement;
    el?.focus();
    el?.select();
  }

  private emit(): void {
    this.codeChange.emit(this.digits.join(''));
  }

  onFocus(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  onInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    this.digits[index] = digit;
    input.value = digit;

    if (digit && index < this.digits.length - 1) {
      this.focusBox(index + 1);
    }
    this.emit();
  }

  onKeydown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits[index] && index > 0) {
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowLeft' && index > 0) {
      this.focusBox(index - 1);
    } else if (event.key === 'ArrowRight' && index < this.digits.length - 1) {
      this.focusBox(index + 1);
    }
  }

  onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const text = (event.clipboardData?.getData('text') ?? '').replace(/\D/g, '');
    if (!text) return;

    for (let i = 0; i < this.digits.length; i++) {
      this.digits[i] = text[i] ?? '';
      const el = this.boxes.get(i)?.nativeElement;
      if (el) el.value = this.digits[i];
    }
    this.focusBox(Math.min(text.length, this.digits.length - 1));
    this.emit();
  }

  /** Reset all boxes (e.g. after a resend). */
  clear(): void {
    for (let i = 0; i < this.digits.length; i++) {
      this.digits[i] = '';
      const el = this.boxes.get(i)?.nativeElement;
      if (el) el.value = '';
    }
    this.focusBox(0);
    this.emit();
  }
}
