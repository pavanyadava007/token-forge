import type { Preview } from '@storybook/web-components-vite';
import '../src/styles.css';
import '../src/index';

// The toolbar switch sets data-theme on <html>, the same hook production pages use.
const preview: Preview = {
  globalTypes: {
    theme: {
      description: 'Token theme',
      toolbar: { icon: 'mirror', items: ['light', 'dark'], dynamicTitle: true },
    },
  },
  initialGlobals: { theme: 'light' },
  decorators: [
    (story, context) => {
      document.documentElement.dataset.theme = context.globals.theme ?? 'light';
      return story();
    },
  ],
  parameters: { layout: 'padded' },
};
export default preview;
