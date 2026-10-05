import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = { title: 'Components/Button', component: 'tf-button' };
export default meta;

export const Primary: StoryObj = { render: () => html`<tf-button>Save changes</tf-button>` };
export const Secondary: StoryObj = { render: () => html`<tf-button variant="secondary">Cancel</tf-button>` };
export const Disabled: StoryObj = { render: () => html`<tf-button disabled>Not available</tf-button>` };
