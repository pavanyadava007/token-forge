import { LitElement, css, html } from 'lit';

// range-calculator: legacy component styles written before the token system
export class RangeCalculator extends LitElement {
  static styles = css`
    .range-calculator__warning {
      color: #b45309;
      border-color: #f59e0b;
    }

    .range-calculator select {
      border-color: #64748b;
    }

    .range-calculator-tile {
      background: #ffffff;
    }

    .range-calculator__saved {
      color: #15803d;
      background: #f4fbf0;
    }

    .range-calculator__frame {
      border-radius: 12px;
    }

    .range-calculator__logo path {
      fill: #e30613; /* partner logo, fixed brand colour */
    }

    .range-calculator__row {
      border-color: #e2e8f4;
    }

    .range-calculator__problem {
      color: #be1a1b;
      background: rgb(254, 242, 242);
    }

    .range-calculator__body {
      gap: 8px;
      padding: 24px;
    }

    .range-calculator__secondary {
      background: #ffffff;
      border-color: #ccd0e2;
    }
  `;

  render() {
    return html`<div class="range-calculator"><slot></slot></div>`;
  }
}
