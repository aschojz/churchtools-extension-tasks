<script setup lang="ts">
import type { Project } from './domain/types';
import type { CommandPaletteGroup, DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAllProjectTasks } from './composables/useAllProjectTasks';
import { usePlugin } from './composables/usePlugin';
import { dataIssues } from './domain/storedData';
import { authState, loadCurrentUser } from './platform';
import { activeProjectDialog, closeProjectDialog, createOrEditProject } from './project/projectHelper';
import useProjects from './project/useProjects';

const DialogProject = defineAsyncComponent(() => import('./project/DialogProject.vue'));
const DiagnosticsDialog = defineAsyncComponent(() => import('./components/DiagnosticsDialog.vue'));

const route = useRoute();
const router = useRouter();
const { isLoading, isError, refetch } = usePlugin();
const { projects, deleteProject } = useProjects();
const sidebarCollapsed = ref(false);
const searchOpen = ref(false);
const diagnosticsOpen = ref(false);
const appVersion = __APP_VERSION__;
const appRoot = ref<HTMLElement>();
const availableHeight = ref('100dvh');

const updateAvailableHeight = () => {
    if (!appRoot.value) return;
    const top = Math.max(0, appRoot.value.getBoundingClientRect().top);
    availableHeight.value = `${Math.max(320, window.innerHeight - top)}px`;
};
const handleGlobalShortcut = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.key.toLowerCase() !== 'n')
        return;
    const target = event.target;
    if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
    )
        return;
    if (route.params.taskId) return;
    event.preventDefault();
    if (newTaskRoute.value && authState.status === 'authenticated') void router.push(newTaskRoute.value);
    else if (!currentProject.value && authState.status === 'authenticated') createOrEditProject();
};

let layoutObserver: ResizeObserver | undefined;
onMounted(() => {
    updateAvailableHeight();
    window.addEventListener('resize', updateAvailableHeight, { passive: true });
    window.addEventListener('keydown', handleGlobalShortcut);
    layoutObserver = new ResizeObserver(updateAvailableHeight);
    layoutObserver.observe(document.documentElement);
});
onBeforeUnmount(() => {
    window.removeEventListener('resize', updateAvailableHeight);
    window.removeEventListener('keydown', handleGlobalShortcut);
    layoutObserver?.disconnect();
});
const { tasks: allTasks } = useAllProjectTasks({ enabled: searchOpen });
const projectId = computed(() => {
    const value = Array.isArray(route.params.projectId) ? route.params.projectId[0] : route.params.projectId;
    return value ? Number(value) : undefined;
});
const currentProject = computed(() => projects.value.find(project => project.id === projectId.value));
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

const projectMenu = (project: Project): DropdownMenuItem[][] => {
    return [
        [
            {
                label: 'Projekt bearbeiten',
                icon: 'i-lucide-pencil',
                disabled: authState.status !== 'authenticated',
                onSelect: () => createOrEditProject(project),
            },
            {
                label: 'Projekt löschen',
                icon: 'i-lucide-trash-2',
                color: 'error',
                disabled: authState.status !== 'authenticated',
                onSelect: async () => {
                    if (await deleteProject(project.id)) {
                        await router.push({ name: 'overview' });
                    }
                },
            },
        ],
    ];
};

const newTaskRoute = computed(() =>
    currentProject.value
        ? {
              name:
                  typeof route.name === 'string' &&
                  !['project', 'project-trash', 'project-archive'].includes(route.name)
                      ? route.name
                      : 'project-board',
              params: { projectId: currentProject.value.id, taskId: 'new' },
          }
        : undefined,
);
</script>

<template>
    <UApp>
        <div id="tasks" ref="appRoot" class="tasks-app" :style="{ height: availableHeight }">
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
                    :ui="{ header: 'h-[49px] min-h-[49px]', body: 'pt-0 gap-2' }"
                >
                    <template #header="{ collapsed }">
                        <RouterLink class="dashboard-brand" :class="{ collapsed }" :to="{ name: 'overview' }">
                            <span><UIcon name="i-lucide-circle-check-big" /></span>
                            <strong v-if="!collapsed">Aufgaben</strong>
                        </RouterLink>
                    </template>

                    <template #default="{ collapsed }">
                        <div class="dashboard-sidebar-search flex h-12 shrink-0 items-center">
                            <UDashboardSearchButton
                                :collapsed="collapsed"
                                label="Projekte und Aufgaben suchen"
                                @click="searchOpen = true"
                            />
                        </div>
                        <UNavigationMenu
                            :collapsed="collapsed"
                            highlight
                            :items="mainNavigation"
                            orientation="vertical"
                            tooltip
                        />
                        <div class="min-h-0 flex-1 overflow-y-auto">
                            <p v-if="!collapsed" class="dashboard-sidebar-label">Projekte</p>
                            <div class="flex flex-col gap-1">
                                <div
                                    v-for="project in projects"
                                    :key="project.id"
                                    class="dashboard-project-nav group"
                                    :class="{ active: project.id === projectId }"
                                >
                                    <RouterLink
                                        :aria-label="project.name"
                                        class="dashboard-project-link"
                                        :to="{ name: 'my-tasks', params: { projectId: project.id } }"
                                    >
                                        <UIcon name="i-lucide-folder" />
                                        <span v-if="!collapsed" class="truncate">{{ project.name }}</span>
                                    </RouterLink>
                                    <UDropdownMenu v-if="!collapsed" :items="projectMenu(project)">
                                        <UButton
                                            :aria-label="`Aktionen für ${project.name}`"
                                            class="dashboard-project-menu"
                                            color="neutral"
                                            icon="i-lucide-ellipsis"
                                            size="sm"
                                            square
                                            variant="ghost"
                                        />
                                    </UDropdownMenu>
                                </div>
                            </div>
                        </div>
                    </template>

                    <template #footer>
                        <div
                            class="tasks-sidebar-footer flex w-full flex-col gap-1"
                            :class="{ 'is-collapsed': sidebarCollapsed }"
                        >
                            <UButton
                                block
                                :class="sidebarCollapsed ? 'justify-center' : 'justify-start'"
                                color="neutral"
                                icon="i-lucide-activity"
                                :label="sidebarCollapsed ? undefined : `Systemstatus · v${appVersion}`"
                                variant="ghost"
                                @click="diagnosticsOpen = true"
                            />
                            <UButton
                                block
                                :class="sidebarCollapsed ? 'justify-center' : 'justify-start'"
                                color="neutral"
                                href="https://github.com/aschojz/churchtools-extension-tasks/issues"
                                icon="i-lucide-message-circle-warning"
                                :label="sidebarCollapsed ? undefined : 'Feedback geben'"
                                target="_blank"
                                variant="ghost"
                            />
                            <UButton
                                block
                                :class="sidebarCollapsed ? 'justify-center' : 'justify-start'"
                                color="neutral"
                                :icon="sidebarCollapsed ? 'i-lucide-panel-left-open' : 'i-lucide-panel-left-close'"
                                :label="sidebarCollapsed ? undefined : 'Sidebar einklappen'"
                                variant="ghost"
                                @click="sidebarCollapsed = !sidebarCollapsed"
                            />
                        </div>
                    </template>
                </UDashboardSidebar>

                <UDashboardPanel
                    id="main"
                    class="tasks-dashboard-panel bg-muted/30"
                    :ui="{ body: 'p-0 sm:p-0 gap-0 sm:gap-0' }"
                >
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
                                :description="`${authState.message ?? 'Anmeldung fehlgeschlagen.'} Die Daten bleiben lesbar, Schreibaktionen sind bis zur erfolgreichen Anmeldung gesperrt.`"
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
        <DiagnosticsDialog v-if="diagnosticsOpen" @close="diagnosticsOpen = false" />
    </UApp>
</template>
