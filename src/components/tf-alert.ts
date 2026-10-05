import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

type Tone = 'info' | 'success' | 'warning' | 'error';
const ICON: Record<Tone, string> = { info: 'i', success: '✓', warning: '!', error: '×' };

/**
 * Inline message. Errors use role="alert" (announced at once), the rest role="status".
 * Tone is carried by icon and text as well as colour.
 */
@customElement('tf-alert')
export class TfAlert extends LitElement {
  static override styles = css`
    /* Box styles live on .base, not :host: page CSS (e.g. Tailwind preflight) beats :host rules. */
    :host {
      display: block;
    }
    .base {
      display: flex;
      gap: var(--tf-space-3);
      padding: var(--tf-space-3) var(--tf-space-4);
      border-radius: var(--tf-radius-md);
      border: 1px solid;
      font-size: var(--tf-font-size-md);
    }
    :host([tone='info']) .base {
      background: var(--tf-color-feedback-info-bg);
      color: var(--tf-color-feedback-info-text);
      border-color: var(--tf-color-feedback-info-border);
    }
    :host([tone='success']) .base {
      background: var(--tf-color-feedback-success-bg);
      color: var(--tf-color-feedback-success-text);
      border-color: var(--tf-color-feedback-success-border);
    }
    :host([tone='warning']) .base {
      background: var(--tf-color-feedback-warning-bg);
      color: var(--tf-color-feedback-warning-text);
      border-color: var(--tf-color-feedback-warning-border);
    }
    :host([tone='error']) .base {
      background: var(--tf-color-feedback-error-bg);
      color: var(--tf-color-feedback-error-text);
      border-color: var(--tf-color-feedback-error-border);
    }
    .icon {
      font-weight: var(--tf-font-weight-bold);
    }
  `;

  @property({ reflect: true }) tone: Tone = 'info';

  override connectedCallback() {
    super.connectedCallback();
    this.setAttribute('role', this.tone === 'error' ? 'alert' : 'status');
  }

  override updated() {
    this.setAttribute('role', this.tone === 'error' ? 'alert' : 'status');
  }

  override render() {
    return html`<div class="base" part="base">
      <span class="icon" aria-hidden="true">${ICON[this.tone]}</span><span><slot></slot></span>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tf-alert': TfAlert;
  }
}
