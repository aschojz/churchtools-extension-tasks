import type { RouteRecordRaw, RouterHistory } from 'vue-router';
import { createRouter, createWebHistory } from 'vue-router';
import type { Project } from './domain/types';

const Project = () => import('./project/Project.vue');
const Board = () => import('./project/views/Board.vue');
const ListView = () => import('./project/views/ListView.vue');
const MyTasksList = () => import('./project/views/MyTasksList.vue');
const TagBoard = () => import('./project/views/TagBoard.vue');
const TaskBoard = () => import('./project/views/TaskBoard.vue');
const TrashView = () => import('./project/views/TrashView.vue');
const ArchiveView = () => import('./project/views/ArchiveView.vue');
const CalendarView = () => import('./project/views/CalendarView.vue');
const TimelineView = () => import('./project/views/TimelineView.vue');
const InsightsView = () => import('./project/views/InsightsView.vue');
const Overview = () => import('./views/Overview.vue');

export const routes: RouteRecordRaw[] = [
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
                path: 'calendar/:taskId?',
                name: 'project-calendar',
                component: CalendarView,
                props: true,
            },
            {
                path: 'timeline/:taskId?',
                name: 'project-timeline',
                component: TimelineView,
                props: true,
            },
            {
                path: 'insights/:taskId?',
                name: 'project-insights',
                component: InsightsView,
                props: true,
            },
            {
                path: 'archive',
                name: 'project-archive',
                component: ArchiveView,
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

export const createAppRouter = (history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)) =>
    createRouter({
        routes,
        history,
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

export const router = createAppRouter();
