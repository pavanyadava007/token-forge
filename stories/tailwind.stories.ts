import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = { title: 'Theming/Tailwind consumer' };
export default meta;

// Plain Tailwind utilities generated from the same tokens (dist/tailwind/theme.css).
// Switch the theme in the toolbar: nothing here is rebuilt, the CSS variables change.
export const Page: StoryObj = {
  render: () =>
    html`<main class="bg-surface-subtle text-text-primary p-6 rounded-lg">
      <h2 class="text-lg font-semibold mb-2">Fleet overview</h2>
      <p class="text-text-secondary text-sm mb-4">Utilities such as bg-surface-raised come from the token build.</p>
      <div class="bg-surface-raised border border-border-default rounded-md p-4 mb-4">
        <a class="text-text-link underline" href="#">Open campaign</a>
      </div>
      <button class="bg-action-primary-bg hover:bg-action-primary-bg-hover text-text-on-action px-4 py-2 rounded-md">
        Start
      </button>
    </main>`,
};
