import { LitElement, css, html } from 'lit';

// feature-grid: legacy component styles written before the token system
export class FeatureGrid extends LitElement {
  static styles = css`
    .feature-grid__print-only {
      color: #000000; /* print stylesheet, always black */
    }

    .feature-grid__logo path {
      fill: #e30613; /* partner logo, fixed brand colour */
    }

    .feature-grid h2 {
      color: #0f172a;
    }

    .feature-grid__caution {
      border-color: #f59e0b;
      background: rgb(255, 251, 235);
    }

    .feature-grid__bubble {
      background: #0f172a;
      color: #ffffff;
    }

    .feature-grid__frame {
      border-radius: 12px;
    }

    .feature-grid__body {
      margin-bottom: 32px;
    }

    .feature-grid-wrapper {
      background: var(--tf-color-bg-page);
    }

    .feature-grid__divider {
      border-color: #e2e8f0;
    }

    .feature-grid__confirm {
      background: #2563eb;
      color: #ffffff;
    }
  `;

  render() {
    return html`<div class="feature-grid"><slot></slot></div>`;
  }
}
