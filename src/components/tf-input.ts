import { LitElement, css, html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';

/**
 * Text field with label, help text and error message. Form-associated through ElementInternals,
 * so it submits with a surrounding <form> like a native input.
 */
@customElement('tf-input')
export class TfInput extends LitElement {
  static formAssociated = true;
  static override styles = css`
    :host {
      display: block;
      font-size: var(--tf-font-size-md);
    }
    label {
      display: block;
      font-weight: var(--tf-font-weight-bold);
      color: var(--tf-color-text-primary);
      margin-bottom: var(--tf-space-1);
    }
    input {
      font: inherit;
      width: 100%;
      box-sizing: border-box;
      padding: var(--tf-space-2) var(--tf-space-3);
      border: 1px solid var(--tf-color-border-strong);
      border-radius: var(--tf-radius-sm);
      background: var(--tf-color-surface-raised);
      color: var(--tf-color-text-primary);
    }
    input:focus-visible {
      outline: 2px solid var(--tf-color-border-focus);
      outline-offset: 1px;
    }
    :host([invalid]) input {
      border-color: var(--tf-color-feedback-error-border);
    }
    .help {
      font-size: var(--tf-font-size-sm);
      color: var(--tf-color-text-secondary);
      margin-top: var(--tf-space-1);
    }
    .error {
      font-size: var(--tf-font-size-sm);
      color: var(--tf-color-feedback-error-text);
      margin-top: var(--tf-space-1);
    }
  `;

  @property() label = '';
  @property() name = '';
  @property() value = '';
  @property() help = '';
  @property() error = '';
  @property({ type: Boolean, reflect: true }) invalid = false;

  private internals = this.attachInternals();

  override updated() {
    this.invalid = Boolean(this.error);
    this.internals.setFormValue(this.value);
  }

  private onInput(e: Event) {
    this.value = (e.target as HTMLInputElement).value;
    this.dispatchEvent(new CustomEvent('tf-change', { detail: { value: this.value }, bubbles: true, composed: true }));
  }

  override render() {
    const describedBy = this.error ? 'error' : this.help ? 'help' : undefined;
    return html`
      <label for="field">${this.label}</label>
      <input
        id="field"
        .value=${this.value}
        aria-invalid=${this.error ? 'true' : 'false'}
        aria-describedby=${describedBy ?? nothing}
        @input=${this.onInput}
      />
      ${
        this.error
          ? html`<div id="error" class="error">${this.error}</div>`
          : this.help
            ? html`<div id="help" class="help">${this.help}</div>`
            : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tf-input': TfInput;
  }
}
