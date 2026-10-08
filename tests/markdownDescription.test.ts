import { Editor } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';
import StarterKit from '@tiptap/starter-kit';
import { describe, expect, it } from 'vitest';

const editorFor = (content: string) =>
    new Editor({
        element: document.createElement('div'),
        extensions: [StarterKit, Markdown],
        content,
        contentType: 'markdown',
    });

describe('Markdown descriptions with the Nuxt UI editor engine', () => {
    it('keeps formatting when loading, saving and reloading Markdown', () => {
        const editor = editorFor('## Redaktion\n\n**Wichtig** und *optional*\n\n- Texte prüfen\n- Bilder auswählen');
        try {
            expect(editor.getHTML()).toContain('<h2>Redaktion</h2>');
            expect(editor.getHTML()).toContain('<strong>Wichtig</strong>');
            expect(editor.getHTML()).toContain('<ul>');
            const saved = editor.getMarkdown();
            editor.commands.setContent(saved, { contentType: 'markdown' });
            expect(editor.getHTML()).toContain('<em>optional</em>');
            expect(editor.getMarkdown().trim()).toBe(saved.trim());
        } finally {
            editor.destroy();
        }
    });

    it('continues to display legacy plain text', () => {
        const editor = editorFor('Offene Texte bündeln und die nächste Feedbackrunde vorbereiten.');
        try {
            expect(editor.getText()).toBe('Offene Texte bündeln und die nächste Feedbackrunde vorbereiten.');
        } finally {
            editor.destroy();
        }
    });

    it('does not render executable elements or unsafe links', () => {
        const editor = editorFor(
            '<script>alert(1)</script>\n\n[Klick](javascript:alert(1))\n\n<img src=x onerror=alert(1)>',
        );
        try {
            const html = editor.getHTML();
            expect(html).not.toContain('<script');
            expect(html).not.toContain('href="javascript:');
            expect(html).not.toContain('<img');
        } finally {
            editor.destroy();
        }
    });
});
