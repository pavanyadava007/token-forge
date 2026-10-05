import { LitElement, css, html } from 'lit';

// footer-links: legacy component styles written before the token system
export class FooterLinks extends LitElement {
  static styles = css`
    .footer-links__row:nth-child(even) {
      background: #f8fafc;
    }

    .footer-links__cta:hover {
      background: #1d4ed8;
    }

    .footer-links__save {
      background: #2563eb;
      color: #ffffff;
    }

    .footer-links__avatar {
      width: 40px;
    }

    .footer-links button:focus-visible {
      outline-color: #2563eb;
    }

    .footer-links__saved {
      border-color: #16a34a;
      color: #15803d;
    }

    .footer-links__body {
      padding: 8px;
      font-size: 14px;
      gap: 16px;
    }

    .footer-links__cancel {
      background: #ffffff;
      border-color: #cbd5e1;
    }
  `;

  render() {
    return html`<div class="footer-links"><slot></slot></div>`;
  }
}
