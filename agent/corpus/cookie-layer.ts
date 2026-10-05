import { LitElement, css, html } from 'lit';

// cookie-layer: legacy component styles written before the token system
export class CookieLayer extends LitElement {
  static styles = css`
    .cookie-layer__saved {
      background: #f0fdf4;
      color: #15803d;
    }

    .cookie-layer__logo path {
      fill: #e30613; /* partner logo, fixed brand colour */
    }

    .cookie-layer__body {
      padding: 16px;
      font-size: 16px;
    }

    .cookie-layer__item--disabled {
      color: #94a3b8;
    }

    .cookie-layer__warning {
      color: #b74e0a;
      border-color: #f29907;
    }

    .cookie-layer__timestamp {
      color: #475569;
    }

    .cookie-layer__frame {
      border-radius: 12px;
    }

    .cookie-layer__section {
      background: #f6fdff;
    }

    .cookie-layer .primary {
      background: #245fea;
      color: #ffffff;
    }

    .cookie-layer__card {
      background: #ffffff;
    }
  `;

  render() {
    return html`<div class="cookie-layer"><slot></slot></div>`;
  }
}
