import type { RouteRecordRaw } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import Project from './project/Project.vue';
import Board from './project/views/Board.vue';
import ListView from './project/views/ListView.vue';
import MyTasksList from './project/views/MyTasksList.vue';
import TagBoard from './project/views/TagBoard.vue';
import TaskBoard from './project/views/TaskBoard.vue';
import TrashView from './project/views/TrashView.vue';
import Overview from './views/Overview.vue';

const routes: RouteRecordRaw[] = [
    {
        path: '/:projectId',
        component: Project,
        props: true,
        children: [
            {
                path: 'list/:taskId?',
                name: 'project-list',
                component: ListView,
                props: true,
            },
            {
                path: 'tags/:taskId?',
                name: 'project-tags',
                component: TagBoard,
                props: true,
            },
            {
                path: 'tasks/:taskId?',
                name: 'project-tasks',
                component: TaskBoard,
                props: true,
            },
            {
                path: 'board/:taskId?',
                name: 'project-board',
                component: Board,
                props: true,
            },
            {
                path: 'my-tasks/:taskId?',
                name: 'my-tasks',
                component: MyTasksList,
                props: true,
            },
            {
                path: 'trash',
                name: 'project-trash',
                component: TrashView,
                props: true,
            },
            { path: '', redirect: { name: 'my-tasks' }, name: 'project' },
        ],
    },
    { path: '', name: 'overview', component: Overview },
];

export const router = createRouter({
    routes,
    history: createWebHistory(import.meta.env.BASE_URL),
    scrollBehavior(to, from, savedPosition) {
        if (to.hash) {
            return { el: to.hash, left: 0, top: 70 };
        } else if (savedPosition) {
            return savedPosition;
        } else if (to.name !== from.name) {
            return { left: 0, top: 0 };
        }
        return {};
    },
});
