import { LitElement, css, html } from 'lit';

// spec-table: legacy component styles written before the token system
export class SpecTable extends LitElement {
  static styles = css`
    .spec-table__body {
      margin-bottom: 8px;
      font-size: 14px;
    }

    .spec-table__hint-box {
      color: #1d4ed8;
      background: #eff6ff;
    }

    .spec-table a {
      color: #1d4ed8;
    }

    .spec-table__problem {
      color: #b91c1c;
      background: #fef2f2;
    }

    .spec-table__avatar {
      width: 40px;
    }

    .spec-table__bubble {
      background: #0f172a;
      color: #ffffff;
    }

    .spec-table-page {
      background: #ffffff;
    }

    .spec-table__confirm:hover {
      background: #2249d8;
    }

    .spec-table input {
      border-color: rgb(100, 116, 139);
    }

    .spec-table__qr {
      background: #ffffff; /* QR codes need pure white in every theme */
    }

    .spec-table__divider {
      border-color: #e2e8f0;
    }
  `;

  render() {
    return html`<div class="spec-table"><slot></slot></div>`;
  }
}
