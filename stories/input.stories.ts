import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';

const meta: Meta = { title: 'Components/Input', component: 'tf-input' };
export default meta;

export const WithHelp: StoryObj = {
  render: () => html`<tf-input label="Vehicle name" help="Shown on the dashboard" value="Test fleet 3"></tf-input>`,
};
export const WithError: StoryObj = {
  render: () => html`<tf-input label="E-mail" value="name@" error="Enter a complete e-mail address"></tf-input>`,
};
