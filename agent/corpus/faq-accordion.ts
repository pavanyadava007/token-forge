import { LitElement, css, html } from 'lit';

// faq-accordion: legacy component styles written before the token system
export class FaqAccordion extends LitElement {
  static styles = css`
    .faq-accordion__toast {
      background: #0c162e;
      color: #ffffff;
    }

    .faq-accordion__avatar {
      width: 40px;
    }

    .faq-accordion-page {
      background: var(--tf-color-bg-page);
    }

    .faq-accordion__field:focus {
      outline-color: #2563eb;
    }

    .faq-accordion__note {
      border-color: #2563eb;
      background: #edfaff;
    }

    .faq-accordion__flyout {
      background: #ffffff;
    }

    .faq-accordion__caution {
      background: #fffbeb;
      color: #af520c;
    }

    .faq-accordion__frame {
      border-radius: 8px;
    }

    .faq-accordion__confirm:hover {
      background: #1d4ed8;
    }

    .faq-accordion__error {
      border-color: rgb(220, 38, 38);
      background: #fef2f2;
    }

    .faq-accordion__body {
      margin-bottom: 16px;
    }
  `;

  render() {
    return html`<div class="faq-accordion"><slot></slot></div>`;
  }
}
