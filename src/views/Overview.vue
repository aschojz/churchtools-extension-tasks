<script setup lang="ts">
import type { Project } from '../domain/types';
import { sortBy } from 'lodash-es';
import { computed } from 'vue';
import { useAllProjectTasks, type ProjectTask } from '../composables/useAllProjectTasks';
import { usePlugin } from '../composables/usePlugin';
import { useCustomModuleDataCategoriesQuery } from '../data/ccm';
import { dueDateBucket, type DueDateBucket } from '../domain/tasks';
import { colorKey, CtColor, uiColor, useCurrentUser } from '../platform';
import { createOrEditProject } from '../project/projectHelper';
import { projectIcon } from '../utils/utils';

defineEmits<{ (event: 'edit-project', project: Project): void }>();
const { moduleId } = usePlugin();
const { data, isLoading, isError, refetch } = useCustomModuleDataCategoriesQuery<Project>(moduleId);
const projects = computed(() => (data.value ?? []).filter(cat => cat.shorty.startsWith('project')) as Project[]);
const currentUser = useCurrentUser();
const { tasks: allTasks, isLoading: tasksLoading, isError: tasksError, refetch: refetchTasks } = useAllProjectTasks();
const myTasks = computed(() =>
    sortBy(
        allTasks.value.filter(
            ({ task }) =>
                !task.fullfilled && Array.isArray(task.assignedTo) && task.assignedTo.includes(currentUser.id),
        ),
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
    <div v-if="isLoading" class="p-8"><UProgress animation="carousel" /></div>
    <UAlert v-else-if="isError" class="m-6" color="error" title="Projekte konnten nicht geladen werden."
        ><template #actions><UButton label="Erneut versuchen" @click="refetch()" /></template
    ></UAlert>
    <UEmpty
        v-else-if="projects.length === 0"
        :actions="[
            {
                label: 'Neues Projekt',
                icon: 'i-lucide-plus',
                onClick: () => createOrEditProject(),
            },
        ]"
        icon="i-lucide-list-checks"
        title="Noch keine Projekte"
    />
    <div v-else class="dashboard-overview">
        <section>
            <div class="dashboard-section-heading">
                <div>
                    <h2>Meine Aufgaben</h2>
                    <p>Alles, was als Nächstes deine Aufmerksamkeit braucht.</p>
                </div>
                <UBadge color="neutral" :label="String(myTasks.length)" variant="subtle" />
            </div>
            <div v-if="tasksLoading" class="p-8"><UProgress animation="carousel" /></div>
            <UAlert
                v-else-if="tasksError"
                color="error"
                title="Aufgaben konnten nicht geladen werden."
                variant="subtle"
            >
                <template #actions><UButton label="Erneut versuchen" @click="refetchTasks()" /></template>
            </UAlert>
            <div v-else-if="myTasks.length" class="task-sections">
                <section
                    v-for="section in sections"
                    :key="section.id"
                    :aria-labelledby="section.id"
                    class="task-bucket"
                >
                    <div class="mb-3 flex items-center justify-between gap-2">
                        <h3 :id="section.id" class="font-semibold">{{ section.title }}</h3>
                        <UBadge
                            :color="uiColor(section.color)"
                            :label="String(tasksBySection[section.id].length)"
                            size="sm"
                            variant="soft"
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <div v-for="item in tasksBySection[section.id]" :key="`${item.project.id}-${item.task.id}`">
                            <RouterLink
                                class="text-muted mb-1 block truncate text-xs"
                                :to="{ name: 'my-tasks', params: { projectId: item.project.id } }"
                            >
                                <UIcon class="mr-1 inline-block size-3" :name="projectIcon(item.project.icon)" />{{
                                    item.project.name
                                }}
                            </RouterLink>
                            <RouterLink
                                class="task-item overview-task-item flex min-w-0 items-start gap-3 p-3"
                                :to="{
                                    name: 'project-board',
                                    params: { projectId: item.project.id, taskId: item.task.id },
                                }"
                            >
                                <UIcon
                                    class="mt-0.5 size-5 shrink-0 text-gray-400"
                                    :name="item.task.fullfilled ? 'i-lucide-circle-check' : 'i-lucide-circle'"
                                />
                                <span class="min-w-0 flex-1">
                                    <strong class="block truncate">{{ item.task.name }}</strong>
                                    <span v-if="item.task.description" class="text-muted mt-1 block truncate text-sm">
                                        {{ item.task.description }}
                                    </span>
                                </span>
                                <UIcon class="mt-1 size-4 shrink-0 text-gray-400" name="i-lucide-chevron-right" />
                            </RouterLink>
                        </div>
                        <p v-if="!tasksBySection[section.id].length" class="text-muted py-6 text-center text-sm">
                            Keine Aufgaben
                        </p>
                    </div>
                </section>
            </div>
            <UEmpty
                v-else
                class="overview-empty"
                icon="i-lucide-circle-check"
                title="Keine offenen Aufgaben für dich"
            />
        </section>

        <USeparator />

        <section>
            <div class="dashboard-section-heading">
                <div>
                    <h2>Projekte</h2>
                    <p>Organisiere Aufgaben in klaren Arbeitsbereichen.</p>
                </div>
                <UButton
                    color="neutral"
                    icon="i-lucide-plus"
                    label="Projekt erstellen"
                    variant="outline"
                    @click="createOrEditProject()"
                />
            </div>
            <div class="project-grid">
                <RouterLink
                    v-for="project in projects"
                    :key="project.id"
                    class="h-full w-full"
                    :to="{ name: 'project', params: { projectId: project.id } }"
                >
                    <UCard class="project-card h-full">
                        <div class="flex items-center gap-4">
                            <div
                                class="project-card-icon flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                                :data-color="colorKey(project.color)"
                            >
                                <UIcon class="size-5" :name="projectIcon(project.icon)" />
                            </div>
                            <div class="flex-grow text-base font-semibold">
                                {{ project.name }}
                            </div>
                            <UIcon class="text-ter size-4" name="i-lucide-chevron-right" />
                        </div>
                        <div v-if="project.description" class="text-muted mt-3 line-clamp-2 text-sm">
                            {{ project.description }}
                        </div>
                    </UCard>
                </RouterLink>
            </div>
        </section>
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
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}
</style>
