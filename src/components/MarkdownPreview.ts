import { marked, type Token } from 'marked';
import { computed, defineComponent, h, type VNodeChild } from 'vue';

// Cards need inline content only. Build Vue nodes rather than injecting generated HTML.
const previewNodes = (tokens: Token[]): VNodeChild[] =>
    tokens.flatMap((token): VNodeChild[] => {
        switch (token.type) {
            case 'html':
            case 'def':
                return [];
            case 'space':
            case 'br':
            case 'hr':
                return [' '];
            case 'strong':
            case 'em':
            case 'del':
                return [h(token.type, previewNodes(token.tokens ?? []))];
            case 'codespan':
            case 'code':
                return [h('code', String(token.text))];
            case 'link':
                return [h('span', { class: 'markdown-preview-link' }, previewNodes(token.tokens ?? []))];
            case 'list':
                return previewNodes(token.items);
            case 'table':
                return [...token.header, ...token.rows.flat()].flatMap(cell => [...previewNodes(cell.tokens), ' ']);
            default:
                return 'tokens' in token && token.tokens
                    ? [...previewNodes(token.tokens), ...(token.type === 'text' ? [] : [' '])]
                    : [String('text' in token ? token.text : '').replace(/\s+/g, ' ')];
        }
    });

export default defineComponent({
    name: 'MarkdownPreview',
    props: { source: { type: String, required: true } },
    setup(props) {
        const nodes = computed(() => previewNodes(marked.lexer(props.source)));
        return () => h('div', { class: 'task-item-description markdown-preview' }, nodes.value);
    },
});
