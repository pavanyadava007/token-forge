import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import light from '../dist/json/light.json';

const meta: Meta = { title: 'Foundations/Colour tokens' };
export default meta;

type Entry = { path: string; tier: string; description?: string };
const semantic = Object.entries(light as Record<string, Entry>).filter(
  ([, t]) => t.tier === 'semantic' && t.path.startsWith('color.'),
);

export const Semantic: StoryObj = {
  render: () =>
    html`<table style="border-collapse:collapse;color:var(--tf-color-text-primary)">
      <thead>
        <tr>
          <th align="left">Swatch</th>
          <th align="left">Variable</th>
          <th align="left">Use</th>
        </tr>
      </thead>
      <tbody>
        ${semantic.map(
          ([name, t]) =>
            html`<tr>
              <td style="padding:4px 12px 4px 0">
                <span
                  style="display:inline-block;width:32px;height:20px;border:1px solid var(--tf-color-border-default);background:var(--${name})"
                ></span>
              </td>
              <td><code>--${name}</code></td>
              <td style="color:var(--tf-color-text-secondary)">${t.description ?? ''}</td>
            </tr>`,
        )}
      </tbody>
    </table>`,
};
