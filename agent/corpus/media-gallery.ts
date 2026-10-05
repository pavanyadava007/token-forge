import { LitElement, css, html } from 'lit';

// media-gallery: legacy component styles written before the token system
export class MediaGallery extends LitElement {
  static styles = css`
    .media-gallery__done {
      background: rgb(240, 253, 244);
      color: #15803d;
    }

    .media-gallery a {
      color: #1d4ed8;
    }

    .media-gallery__body {
      gap: 4px;
      font-size: 14px;
    }

    .media-gallery__chart-line--3 {
      stroke: #a855f7;
    }

    .media-gallery__item--disabled {
      color: #94a3b8;
    }

    .media-gallery__avatar {
      width: 40px;
    }

    .media-gallery input:focus-visible {
      outline-color: rgb(37, 99, 235);
    }

    .media-gallery__problem {
      color: #b91c1c;
      border-color: rgb(220, 38, 38);
    }

    .media-gallery__label {
      color: var(--tf-color-text-default);
    }

    .media-gallery__field {
      border-color: #64748b;
    }
  `;

  render() {
    return html`<div class="media-gallery"><slot></slot></div>`;
  }
}
