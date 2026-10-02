<script setup lang="ts">
import { sortBy } from 'lodash-es';
import { computed } from 'vue';
import TaskItem from '../components/TaskItem.vue';
import { useAllProjectTasks, type ProjectTask } from '../composables/useAllProjectTasks';
import { usePlugin } from '../composables/usePlugin';
import { useCustomModuleDataCategoriesQuery } from '../data/ccm';
import { dueDateBucket, type DueDateBucket } from '../domain/tasks';
import { colorKey, CtColor, useCurrentUser } from '../platform';
import { createOrEditProject } from '../project/projectHelper';
import { Card, EmptyState, LoadingMessage, Tag } from '../ui';
import { ICONS, txx } from '../utils/utils';

defineEmits<{ (event: 'edit-project', project: Project): void }>();
const { moduleId } = usePlugin();
const { data, isLoading, isError, refetch } = useCustomModuleDataCategoriesQuery<Project>(moduleId);
const projects = computed(() => (data.value ?? []).filter(cat => cat.shorty.startsWith('project')) as Project[]);
const currentUser = useCurrentUser();
const { tasks: allTasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useAllProjectTasks();
const myTasks = computed(() =>
    sortBy(
        allTasks.value.filter(({ task }) => !task.fullfilled && task.assignedTo?.includes(currentUser.id)),
        item => item.dueDate?.getTime() ?? Number.MAX_SAFE_INTEGER,
    ),
);
const sections: Array<{ id: DueDateBucket; title: string; color: CtColor }> = [
    { id: 'overdue', title: 'Überfällig', color: CtColor.RED },
    { id: 'today', title: 'Heute', color: CtColor.YELLOW },
    { id: 'upcoming', title: 'Demnächst', color: CtColor.BLUE },
    { id: 'none', title: 'Ohne Termin', color: CtColor.BASIC },
];
const tasksBySection = computed(
    () =>
        Object.fromEntries(
            sections.map(section => [
                section.id,
                myTasks.value.filter(item => dueDateBucket(item.dueDate) === section.id),
            ]),
        ) as Record<DueDateBucket, ProjectTask[]>,
);
</script>
<template>
    <LoadingMessage v-if="isLoading" />
    <p v-else-if="isError" role="alert">
        Projekte konnten nicht geladen werden. <button @click="refetch()">Erneut versuchen</button>
    </p>
    <EmptyState
        v-else-if="projects.length === 0"
        :action="{
            label: txx('Neues Projekt'),
            color: CtColor.GREEN,
            icon: 'fas fa-plus',
            onClick: () => createOrEditProject(),
        }"
        :icon="ICONS.MAIN"
        :title="txx('Noch keine Projekte')"
    />
    <div v-else class="w-full">
        <section class="overview-section">
            <div class="section-heading">
                <span><i class="fas fa-user-check"></i></span>
                <div>
                    <h1>{{ txx('Meine Aufgaben') }}</h1>
                    <p>Alles, was als Nächstes deine Aufmerksamkeit braucht.</p>
                </div>
            </div>
        </section>
        <LoadingMessage v-if="tasksLoading" />
        <p v-else-if="tasksError" class="mx-4 mb-6 lg:mx-6" role="alert">
            Aufgaben konnten nicht geladen werden. <button @click="refetchTasks()">Erneut versuchen</button>
        </p>
        <div v-else-if="myTasks.length" class="task-sections gap-4 px-4 lg:px-6">
            <section v-for="section in sections" :key="section.id" :aria-labelledby="section.id" class="min-w-0">
                <div class="mb-2 flex items-center gap-2">
                    <h2 :id="section.id" class="text-lg font-bold">{{ section.title }}</h2>
                    <Tag :color="section.color" :label="String(tasksBySection[section.id].length)" size="0" />
                </div>
                <div class="flex flex-col gap-2">
                    <div v-for="item in tasksBySection[section.id]" :key="`${item.project.id}-${item.task.id}`">
                        <RouterLink
                            class="text-sec mb-1 block text-xs"
                            :to="{ name: 'my-tasks', params: { projectId: item.project.id } }"
                        >
                            <i class="mr-1" :class="item.project.icon"></i>{{ item.project.name }}
                        </RouterLink>
                        <TaskItem :item="item.task" :project-id="item.project.id" />
                    </div>
                </div>
            </section>
        </div>
        <EmptyState v-else icon="fas fa-check-circle" :title="txx('Keine offenen Aufgaben für dich')" />

        <section class="overview-section projects-heading">
            <div class="section-heading">
                <span><i :class="ICONS.MAIN"></i></span>
                <div>
                    <h1>{{ txx('Projekte') }}</h1>
                    <p>Organisiere Aufgaben in klaren Arbeitsbereichen.</p>
                </div>
            </div>
            <button class="text-action" @click="createOrEditProject()">
                <i class="fas fa-plus"></i> Projekt erstellen
            </button>
        </section>
        <div class="project-grid w-full gap-4 px-4 lg:px-6">
            <RouterLink
                v-for="project in projects"
                :key="project.id"
                class="h-full w-full"
                :to="{ name: 'project', params: { projectId: project.id } }"
            >
                <Card class="hover:border-basic-300 h-full">
                    <div class="flex items-center gap-4">
                        <div
                            class="project-card-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                            :data-color="colorKey(project.color)"
                        >
                            <i :class="project.icon"></i>
                        </div>
                        <div class="flex-grow text-xl font-bold">
                            {{ project.name }}
                        </div>
                        <i class="fas fa-chevron-right text-ter fa-fw"></i>
                    </div>
                    <div v-if="project.description" class="text-sec mt-3 line-clamp-3">
                        {{ project.description }}
                    </div>
                </Card>
            </RouterLink>
        </div>
    </div>
</template>
<style>
.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    grid-template-rows: auto;
}
.task-sections {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}
</style>
