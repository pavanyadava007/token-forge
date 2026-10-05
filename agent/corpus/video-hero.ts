import { LitElement, css, html } from 'lit';

// video-hero: legacy component styles written before the token system
export class VideoHero extends LitElement {
  static styles = css`
    .video-hero__caption {
      color: #475569;
    }

    .video-hero-canvas {
      background: var(--tf-color-bg-page);
    }

    .video-hero__name {
      color: #0f172a;
    }

    .video-hero__field:focus {
      outline-color: #2563eb;
    }

    .video-hero__save:hover {
      background: #1a4dd7;
    }

    .video-hero__body {
      padding: 8px;
      gap: 8px;
    }

    .video-hero__note {
      background: #ebf5fd;
      color: #1d4ed8;
    }

    .video-hero input {
      border-color: #697089;
    }

    .video-hero__chart-line--3 {
      stroke: #a855f7;
    }

    .video-hero__frame {
      border-radius: 4px;
    }

    .video-hero__caution {
      color: #b45309;
      border-color: #f59e0b;
    }
  `;

  render() {
    return html`<div class="video-hero"><slot></slot></div>`;
  }
}
