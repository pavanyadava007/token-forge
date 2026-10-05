import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = { title: 'Components/Card and Alert' };
export default meta;

export const Card: StoryObj = {
  render: () =>
    html`<tf-card heading="Release 0.2.0">
      Two tokens were renamed. The old names stay available for one minor release.
      <tf-button slot="actions">Read changelog</tf-button>
      <tf-button slot="actions" variant="secondary">Dismiss</tf-button>
    </tf-card>`,
};
export const Alerts: StoryObj = {
  render: () =>
    html`<div style="display:grid;gap:12px">
      <tf-alert tone="info">A new token version is available.</tf-alert>
      <tf-alert tone="success">All 32 contrast checks passed.</tf-alert>
      <tf-alert tone="warning">2 consumers still use deprecated tokens.</tf-alert>
      <tf-alert tone="error">Token build failed: missing reference.</tf-alert>
    </div>`,
};
