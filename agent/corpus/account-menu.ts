import { LitElement, css, html } from 'lit';

// account-menu: legacy component styles written before the token system
export class AccountMenu extends LitElement {
  static styles = css`
    .account-menu__title {
      color: #0f172a;
    }

    .account-menu__alert--danger {
      background: #fef2f2;
      color: #b91c1c;
    }

    .account-menu__body {
      font-size: 16px;
      gap: 16px;
    }

    .account-menu button:focus-visible {
      outline-color: rgb(37, 99, 235);
    }

    .account-menu__save:hover {
      background: #1d4ed8;
    }

    .account-menu__panel {
      background: #fafafb;
    }

    .account-menu__field {
      border-color: #64748b;
    }

    .account-menu__logo path {
      fill: #e30613; /* partner logo, fixed brand colour */
    }

    .account-menu__option[aria-disabled='true'] {
      color: #94a3b8;
    }

    .account-menu__tooltip {
      background: #0f172a;
      color: #ffffff;
    }
  `;

  render() {
    return html`<div class="account-menu"><slot></slot></div>`;
  }
}
