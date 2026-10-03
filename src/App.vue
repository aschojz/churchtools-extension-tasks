<script setup lang="ts">
import type { CommandPaletteGroup, DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import { computed, defineAsyncComponent, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAllProjectTasks } from './composables/useAllProjectTasks';
import { usePlugin } from './composables/usePlugin';
import { dataIssues } from './domain/storedData';
import { authState, colorKey, loadCurrentUser } from './platform';
import { activeProjectDialog, closeProjectDialog, createOrEditProject } from './project/projectHelper';
import useProjects from './project/useProjects';
import { ICONS } from './utils/utils';

const DialogProject = defineAsyncComponent(() => import('./project/DialogProject.vue'));

const route = useRoute();
const router = useRouter();
const { isLoading, isError, refetch } = usePlugin();
const { projects, deleteProject } = useProjects();
const sidebarCollapsed = ref(false);
const searchOpen = ref(false);
const { tasks: allTasks } = useAllProjectTasks({ enabled: searchOpen });
const projectId = computed(() => {
    const value = Array.isArray(route.params.projectId) ? route.params.projectId[0] : route.params.projectId;
    return value ? Number(value) : undefined;
});
const currentProject = computed(() => projects.value.find(project => project.id === projectId.value));
const pageTitle = computed(() => currentProject.value?.name ?? 'Aufgaben');
const dataIssueDescription = computed(() => {
    const issues = dataIssues.value
        .slice(0, 3)
        .map(issue =>
            issue.entity === 'project'
                ? `Projekt ${issue.id}: ${issue.message}`
                : `Eintrag ${issue.id} in Projekt ${issue.categoryId}: ${issue.message}`,
        );
    const more = dataIssues.value.length > issues.length ? ` Weitere: ${dataIssues.value.length - issues.length}.` : '';
    return `${issues.join(' · ')}${more}`;
});

const mainNavigation = computed<NavigationMenuItem[]>(() => [
    { label: 'Übersicht', icon: 'i-lucide-layout-dashboard', to: { name: 'overview' } },
    { type: 'label', label: 'Projekte' },
    ...projects.value.map(project => ({
        active: project.id === projectId.value,
        label: project.name,
        icon: 'i-lucide-folder',
        to: { name: 'my-tasks', params: { projectId: project.id } },
    })),
]);

const openSearchResult = (to: Parameters<typeof router.push>[0]) => {
    searchOpen.value = false;
    void router.push(to);
};
const searchGroups = computed<CommandPaletteGroup[]>(() => [
    {
        id: 'projects',
        label: 'Projekte',
        items: projects.value.map(project => ({
            label: project.name,
            description: project.description,
            icon: 'i-lucide-folder',
            onSelect: () => openSearchResult({ name: 'my-tasks', params: { projectId: project.id } }),
        })),
    },
    {
        id: 'tasks',
        label: 'Aufgaben',
        items: allTasks.value.map(({ project, task }) => ({
            label: task.name,
            suffix: project.name,
            icon: task.fullfilled ? 'i-lucide-circle-check' : 'i-lucide-circle',
            onSelect: () =>
                openSearchResult({
                    name: 'project-board',
                    params: { projectId: project.id, taskId: task.id },
                }),
        })),
    },
]);

const projectMenu = computed<DropdownMenuItem[][]>(() => {
    if (!currentProject.value) return [];
    return [
        [
            {
                label: 'Projekt bearbeiten',
                icon: 'i-lucide-pencil',
                disabled: authState.status !== 'authenticated',
                onSelect: () => createOrEditProject(currentProject.value),
            },
            {
                label: 'Projekt löschen',
                icon: 'i-lucide-trash-2',
                color: 'error',
                disabled: authState.status !== 'authenticated',
                onSelect: async () => {
                    if (currentProject.value && (await deleteProject(currentProject.value.id))) {
                        await router.push({ name: 'overview' });
                    }
                },
            },
        ],
    ];
});

const newTaskRoute = computed(() =>
    currentProject.value
        ? {
              name:
                  typeof route.name === 'string' && !['project', 'project-trash'].includes(route.name)
                      ? route.name
                      : 'project-board',
              params: { projectId: currentProject.value.id, taskId: 'new' },
          }
        : undefined,
);
</script>

<template>
    <UApp>
        <div id="tasks" class="tasks-app">
            <UDashboardGroup class="tasks-dashboard-group" storage-key="tasks-dashboard" unit="rem">
                <UDashboardSidebar
                    v-model:collapsed="sidebarCollapsed"
                    class="tasks-dashboard-sidebar bg-elevated/30"
                    :collapsed-size="4.5"
                    collapsible
                    :default-size="18"
                    :max-size="24"
                    :min-size="15"
                    resizable
                >
                    <template #header="{ collapsed }">
                        <RouterLink class="dashboard-brand" :class="{ collapsed }" :to="{ name: 'overview' }">
                            <span><UIcon name="i-lucide-circle-check-big" /></span>
                            <strong v-if="!collapsed">Aufgaben</strong>
                        </RouterLink>
                    </template>

                    <template #default="{ collapsed }">
                        <UDashboardSearchButton
                            :collapsed="collapsed"
                            label="Projekte und Aufgaben suchen"
                            @click="searchOpen = true"
                        />
                        <UNavigationMenu
                            :collapsed="collapsed"
                            highlight
                            :items="mainNavigation"
                            orientation="vertical"
                            tooltip
                        />
                    </template>

                    <template #footer>
                        <div class="flex w-full flex-col gap-1">
                            <UButton
                                block
                                color="neutral"
                                href="https://github.com/aschojz/churchtools-extension-tasks/issues"
                                icon="i-lucide-message-circle-warning"
                                :label="sidebarCollapsed ? undefined : 'Feedback geben'"
                                target="_blank"
                                variant="ghost"
                            />
                            <UDashboardSidebarCollapse class="self-center" />
                        </div>
                    </template>
                </UDashboardSidebar>

                <UDashboardPanel
                    id="main"
                    class="tasks-dashboard-panel bg-muted/30"
                    :ui="{ body: 'p-0 sm:p-0 gap-0 sm:gap-0' }"
                >
                    <template #header>
                        <UDashboardNavbar :title="pageTitle">
                            <template #title>
                                <div class="flex min-w-0 items-center gap-2">
                                    <span
                                        v-if="currentProject"
                                        class="project-icon size-8 shrink-0"
                                        :data-color="colorKey(currentProject.color)"
                                    >
                                        <i :class="currentProject.icon ?? ICONS.DEFAULT_PROJECT"></i>
                                    </span>
                                    <div class="min-w-0">
                                        <div class="truncate font-semibold">{{ pageTitle }}</div>
                                        <div v-if="currentProject?.description" class="text-muted truncate text-xs">
                                            {{ currentProject.description }}
                                        </div>
                                    </div>
                                </div>
                            </template>
                            <template #right>
                                <UDropdownMenu v-if="currentProject" :items="projectMenu">
                                    <UButton
                                        aria-label="Projektaktionen"
                                        color="neutral"
                                        icon="i-lucide-ellipsis"
                                        square
                                        variant="ghost"
                                    />
                                </UDropdownMenu>
                                <UButton
                                    v-if="currentProject"
                                    :disabled="authState.status !== 'authenticated'"
                                    icon="i-lucide-plus"
                                    label="Neue Aufgabe"
                                    :to="newTaskRoute"
                                />
                                <UButton
                                    v-else
                                    :disabled="authState.status !== 'authenticated'"
                                    icon="i-lucide-plus"
                                    label="Neues Projekt"
                                    @click="createOrEditProject()"
                                />
                            </template>
                        </UDashboardNavbar>
                    </template>

                    <template #body>
                        <div v-if="isLoading" class="p-8"><UProgress animation="carousel" /></div>
                        <UAlert
                            v-else-if="isError"
                            class="m-6"
                            color="error"
                            title="Das Aufgabenmodul konnte nicht geladen werden."
                        >
                            <template #actions>
                                <UButton color="error" label="Erneut versuchen" variant="soft" @click="refetch()" />
                            </template>
                        </UAlert>
                        <div v-else class="flex h-full min-h-0 flex-col">
                            <UAlert
                                v-if="authState.status === 'error'"
                                class="m-4 mb-0 shrink-0"
                                color="error"
                                description="Die Daten bleiben lesbar, Schreibaktionen sind bis zur erfolgreichen Anmeldung gesperrt."
                                icon="i-lucide-user-x"
                                title="Der aktuelle Benutzer konnte nicht geladen werden."
                                variant="subtle"
                            >
                                <template #actions>
                                    <UButton
                                        color="error"
                                        label="Erneut versuchen"
                                        variant="soft"
                                        @click="loadCurrentUser"
                                    />
                                </template>
                            </UAlert>
                            <UAlert
                                v-if="dataIssues.length"
                                class="m-4 mb-0 shrink-0"
                                color="warning"
                                :description="dataIssueDescription"
                                icon="i-lucide-database-zap"
                                :title="`${dataIssues.length} gespeicherte Einträge konnten nicht geladen werden.`"
                                variant="subtle"
                            />
                            <main class="app-content"><RouterView /></main>
                        </div>
                    </template>
                </UDashboardPanel>
            </UDashboardGroup>
        </div>

        <UDashboardSearch
            v-model:open="searchOpen"
            :color-mode="false"
            :groups="searchGroups"
            placeholder="Projekte und Aufgaben durchsuchen …"
            title="Suchen"
        />
        <DialogProject
            v-if="activeProjectDialog.open"
            :project="activeProjectDialog.project"
            @close="closeProjectDialog"
        />
    </UApp>
</template>
