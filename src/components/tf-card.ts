import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/** Raised surface with an optional heading slot and a footer slot for actions. */
@customElement('tf-card')
export class TfCard extends LitElement {
  static override styles = css`
    /* Box styles live on .base, not :host: page CSS (e.g. Tailwind preflight) beats :host rules. */
    :host {
      display: block;
    }
    .base {
      background: var(--tf-color-surface-raised);
      color: var(--tf-color-text-primary);
      border: 1px solid var(--tf-color-border-default);
      border-radius: var(--tf-radius-lg);
      padding: var(--tf-space-6);
    }
    h3 {
      margin: 0 0 var(--tf-space-2);
      font-size: var(--tf-font-size-lg);
    }
    .body {
      color: var(--tf-color-text-secondary);
    }
    footer {
      margin-top: var(--tf-space-4);
      display: flex;
      gap: var(--tf-space-2);
    }
  `;

  @property() heading = '';

  override render() {
    return html`<div class="base" part="base">
      ${this.heading ? html`<h3>${this.heading}</h3>` : ''}
      <div class="body"><slot></slot></div>
      <footer><slot name="actions"></slot></footer>
    </div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tf-card': TfCard;
  }
}
