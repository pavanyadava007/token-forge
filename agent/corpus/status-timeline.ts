import { LitElement, css, html } from 'lit';

// status-timeline: legacy component styles written before the token system
export class StatusTimeline extends LitElement {
  static styles = css`
    .status-timeline__warning {
      color: #b45309;
      background: #fffbeb;
    }

    .status-timeline__cta:hover {
      background: #1d4ed8;
    }

    .status-timeline__print-only {
      color: #000000; /* print stylesheet, always black */
    }

    .status-timeline__bubble {
      background: rgb(15, 23, 42);
      color: #ffffff;
    }

    .status-timeline__frame {
      border-radius: 12px;
    }

    .status-timeline__more {
      color: #1d4ed8;
    }

    .status-timeline__body {
      padding: 4px;
      gap: 8px;
    }

    .status-timeline h2 {
      color: #0f172a;
    }

    .status-timeline__qr {
      background: #ffffff; /* QR codes need pure white in every theme */
    }

    .status-timeline__cta {
      background: #2563eb;
      color: #ffffff;
    }
  `;

  render() {
    return html`<div class="status-timeline"><slot></slot></div>`;
  }
}
