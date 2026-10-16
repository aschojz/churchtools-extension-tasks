import { mount } from '@vue/test-utils';
import { describe, expect, it } from 'vitest';
import ColorSelect from '../src/components/ColorSelect.vue';
import TagBadge from '../src/components/TagBadge.vue';
import { parseStoredProject, parseStoredValue } from '../src/domain/storedData';
import { colorOptions, colorValue } from '../src/platform';

describe('custom color palette', () => {
    it('keeps violet, purple, pink, orange, teal and green distinct, including legacy values', () => {
        expect(colorValue('violet')).toBe('#8b5cf6');
        expect(colorValue({ key: 'violet' })).toBe(colorValue('violet'));
        expect(new Set(colorOptions.map(option => colorValue(option.id))).size).toBe(18);
        expect(colorValue('unknown')).toBe(colorValue('basic'));
    });
    it.each(colorOptions)('preserves $nameTranslated through tag and project persistence', option => {
        const tag = parseStoredValue({ type: 'tag', id: 1, dataCategoryId: 17, name: 'Tag', color: option.id });
        expect(tag.color).toBe(option.id);
        const project = parseStoredProject({
            id: 17,
            customModuleId: 1,
            name: 'Projekt',
            shorty: 'project17',
            color: option.id,
        });
        expect(project.color).toBe(option.id);
    });
    it('renders custom tags with their actual palette value instead of the primary theme color', () => {
        const wrapper = mount(TagBadge, {
            props: { color: 'violet', label: 'Inhalt' },
            global: {
                stubs: {
                    UBadge: { props: ['color', 'label'], template: '<span>{{ label }}</span>' },
                },
            },
        });
        expect(wrapper.attributes('style')).toContain('--chip: #8b5cf6');
        expect(wrapper.attributes('data-color')).toBe('violet');
        expect(wrapper.text()).toBe('Inhalt');
    });
    it('shows matching swatches in the selected value and every color option', () => {
        const wrapper = mount(ColorSelect, {
            props: { modelValue: 'violet' },
            global: {
                stubs: {
                    USelect: {
                        props: ['items', 'modelValue'],
                        template:
                            '<div><slot name="leading" /><div v-for="item in items" :key="item.id"><slot name="item-leading" :item="item" /></div></div>',
                    },
                },
            },
        });
        const swatches = wrapper.findAll('.color-swatch');
        expect(swatches).toHaveLength(19);
        expect(swatches[0].attributes('style')).toContain('rgb(139, 92, 246)');
        const index = colorOptions.findIndex(option => option.id === 'violet');
        expect(swatches[index + 1].attributes('style')).toBe(swatches[0].attributes('style'));
    });
});
