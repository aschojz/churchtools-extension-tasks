import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import MarkdownPreview from '../src/components/MarkdownPreview';

describe('card Markdown preview', () => {
    it('renders inline formatting and keeps the entire text for CSS truncation', () => {
        const wrapper = mount(MarkdownPreview, { props: { source: '*Finalen* Stand **sichern**, dann `testen`.' } });
        expect(wrapper.get('em').text()).toBe('Finalen');
        expect(wrapper.get('strong').text()).toBe('sichern');
        expect(wrapper.get('code').text()).toBe('testen');
        expect(wrapper.text()).toBe('Finalen Stand sichern, dann testen.');
    });

    it('turns paragraphs and lists into a single inline preview', () => {
        const wrapper = mount(MarkdownPreview, { props: { source: 'Text\n\n- **Erster** Punkt\n- Zweiter Punkt' } });
        expect(wrapper.text().replace(/\s+/g, ' ')).toBe('Text Erster Punkt Zweiter Punkt');
        expect(wrapper.find('p').exists()).toBe(false);
    });

    it('does not inject HTML, load images or create executable links', () => {
        const wrapper = mount(MarkdownPreview, {
            props: {
                source: '<img src=x onerror=alert(1)>\n\n[Klick](javascript:alert(1))\n\n![Bild](https://example.org/image.png)',
            },
        });
        expect(wrapper.find('img').exists()).toBe(false);
        expect(wrapper.find('a').exists()).toBe(false);
        expect(wrapper.text()).toContain('Klick');
        expect(wrapper.text()).toContain('Bild');
    });
});
