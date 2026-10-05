import { LitElement, css, html } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Button with primary and secondary variants. Renders a native <button> so keyboard,
 * focus and form submission behave like the platform.
 */
@customElement('tf-button')
export class TfButton extends LitElement {
  static override styles = css`
    :host {
      display: inline-block;
    }
    button {
      font: inherit;
      font-size: var(--tf-font-size-md);
      font-weight: var(--tf-font-weight-bold);
      padding: var(--tf-space-2) var(--tf-space-4);
      border-radius: var(--tf-radius-md);
      border: 1px solid transparent;
      cursor: pointer;
    }
    button.primary {
      background: var(--tf-color-action-primary-bg);
      color: var(--tf-color-text-on-action);
    }
    button.primary:hover:not(:disabled) {
      background: var(--tf-color-action-primary-bg-hover);
    }
    button.secondary {
      background: var(--tf-color-action-secondary-bg);
      color: var(--tf-color-text-primary);
      border-color: var(--tf-color-action-secondary-border);
    }
    button:focus-visible {
      outline: 2px solid var(--tf-color-border-focus);
      outline-offset: 2px;
    }
    button:disabled {
      color: var(--tf-color-text-disabled);
      cursor: not-allowed;
    }
  `;

  @property({ reflect: true }) variant: 'primary' | 'secondary' = 'primary';
  @property({ type: Boolean, reflect: true }) disabled = false;
  @property() type: 'button' | 'submit' = 'button';

  override render() {
    return html`<button class=${this.variant} type=${this.type} ?disabled=${this.disabled} part="button">
      <slot></slot>
    </button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tf-button': TfButton;
  }
}
