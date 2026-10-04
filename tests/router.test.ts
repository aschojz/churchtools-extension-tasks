import { describe, expect, it } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { createAppRouter } from '../src/router';

describe('task routes', () => {
    it.each([
        ['/3/board/42', 'project-board', '42'],
        ['/3/board/new', 'project-board', 'new'],
        ['/3/list/42', 'project-list', '42'],
        ['/3/tags/42', 'project-tags', '42'],
        ['/3/tasks/42', 'project-tasks', '42'],
        ['/3/my-tasks/42', 'my-tasks', '42'],
    ])('resolves the deep link %s', (path, name, taskId) => {
        const resolved = createAppRouter(createMemoryHistory('/ccm/tasks/')).resolve(path);
        expect(resolved.name).toBe(name);
        expect(resolved.params).toMatchObject({ projectId: '3', taskId });
    });

    it('redirects a project root to its personal task view', () => {
        const router = createAppRouter(createMemoryHistory('/ccm/tasks/'));
        const projectRoot = router.resolve('/3').matched.at(-1);
        expect(projectRoot?.redirect).toEqual({ name: 'my-tasks' });
    });

    it('keeps the trash route separate from task dialogs', () => {
        const resolved = createAppRouter(createMemoryHistory('/ccm/tasks/')).resolve('/3/trash');
        expect(resolved.name).toBe('project-trash');
        expect(resolved.params).toEqual({ projectId: '3' });
    });

    it('resolves the archive without a task dialog parameter', () => {
        const resolved = createAppRouter(createMemoryHistory('/ccm/tasks/')).resolve('/3/archive');
        expect(resolved.name).toBe('project-archive');
        expect(resolved.params).toEqual({ projectId: '3' });
    });
});
