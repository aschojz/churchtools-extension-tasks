<script setup lang="ts">
import TagBadge from '../components/TagBadge.vue';
import type { Project } from '../domain/types';
import { sortBy } from 'lodash-es';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import TaskParentPath from '../components/TaskParentPath.vue';
import { useAllProjectTasks, type ProjectTask } from '../composables/useAllProjectTasks';
import { usePlugin } from '../composables/usePlugin';
import { useCustomModuleDataCategoriesQuery } from '../data/ccm';
import { dueDateBucket, recurrenceLabel, taskPriority, type DueDateBucket } from '../domain/tasks';
import { colorKey, colorStyle, CtColor, uiColor, useCurrentUser } from '../platform';
import { createOrEditProject } from '../project/projectHelper';
import { projectIcon } from '../utils/utils';

defineEmits<{ (event: 'edit-project', project: Project): void }>();
const { moduleId } = usePlugin();
const { data, isLoading, isError, refetch } = useCustomModuleDataCategoriesQuery<Project>(moduleId);
const projects = computed(() => (data.value ?? []).filter(cat => cat.shorty.startsWith('project')) as Project[]);
const currentUser = useCurrentUser();
const router = useRouter();
const taskRoute = (item: ProjectTask) => ({
    name: 'project-board',
    params: { projectId: item.project.id, taskId: item.task.id },
});
const openTask = (event: MouseEvent, item: ProjectTask) => {
    if (event.target instanceof Element && event.target.closest('a, button')) return;
    void router.push(taskRoute(item));
};
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
const dateLabel = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
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
        class="overview-empty m-auto"
        icon="i-lucide-list-checks"
        title="Noch keine Projekte"
    />
    <div v-else aria-label="Aufgabenübersicht" class="dashboard-overview" tabindex="0">
        <section>
            <div class="dashboard-section-heading overview-heading">
                <div>
                    <span class="overview-eyebrow">{{ dateLabel }}</span>
                    <h2>Meine Aufgaben</h2>
                    <p>Alles, was als Nächstes deine Aufmerksamkeit braucht.</p>
                </div>
                <div aria-label="Aufgabenübersicht in Zahlen" class="overview-summary">
                    <div>
                        <strong>{{ myTasks.length }}</strong
                        ><span>Offene Aufgaben</span>
                    </div>
                    <div>
                        <strong>{{ tasksBySection.overdue.length }}</strong
                        ><span>Überfällig</span>
                    </div>
                    <div>
                        <strong>{{ tasksBySection.today.length }}</strong
                        ><span>Heute fällig</span>
                    </div>
                </div>
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
                    :class="{ 'is-empty': !tasksBySection[section.id].length }"
                    :data-section="section.id"
                >
                    <div class="task-bucket-heading mb-3 flex items-center justify-between gap-2">
                        <h3 :id="section.id" class="font-semibold">{{ section.title }}</h3>
                        <UBadge
                            :color="uiColor(section.color)"
                            :label="String(tasksBySection[section.id].length)"
                            size="sm"
                            variant="soft"
                        />
                    </div>
                    <div class="flex flex-col gap-2">
                        <div
                            v-for="item in tasksBySection[section.id]"
                            :key="`${item.project.id}-${item.task.id}`"
                            class="overview-task-group"
                        >
                            <div
                                class="task-item overview-task-item flex min-w-0 cursor-pointer flex-col gap-2 p-3"
                                @click="openTask($event, item)"
                            >
                                <TaskParentPath
                                    v-if="item.parentByChild[item.task.id]"
                                    compact
                                    :parent-by-child="item.parentByChild"
                                    :project-id="item.project.id"
                                    :task-id="item.task.id"
                                />
                                <RouterLink class="overview-task-title line-clamp-2 min-w-0" :to="taskRoute(item)">{{
                                    item.task.name
                                }}</RouterLink>
                                <div v-if="item.tags.length" class="task-item-tags flex flex-wrap gap-1.5">
                                    <TagBadge
                                        v-for="tag in item.tags"
                                        :key="tag.id"
                                        class="task-item-tag"
                                        :color="tag.color"
                                        :label="tag.name"
                                        size="sm"
                                        variant="outline"
                                    />
                                </div>
                                <div
                                    class="task-item-metadata overview-task-metadata flex flex-wrap items-center gap-x-2.5 gap-y-1"
                                >
                                    <RouterLink
                                        class="overview-project-label"
                                        :title="item.project.name"
                                        :to="{ name: 'my-tasks', params: { projectId: item.project.id } }"
                                    >
                                        <UIcon :name="projectIcon(item.project.icon)" />
                                        <span>{{ item.project.name }}</span>
                                    </RouterLink>
                                    <UBadge
                                        v-if="taskPriority(item.task.priority).id !== 'none'"
                                        color="neutral"
                                        :icon="taskPriority(item.task.priority).icon"
                                        :label="taskPriority(item.task.priority).label"
                                        size="sm"
                                        variant="soft"
                                    />
                                    <UBadge
                                        v-if="item.task.recurrence"
                                        color="neutral"
                                        icon="i-lucide-repeat-2"
                                        :label="recurrenceLabel(item.task.recurrence)"
                                        size="sm"
                                        variant="soft"
                                    />
                                    <UBadge
                                        v-if="item.dueDate"
                                        :class="{ 'task-item-overdue': section.id === 'overdue' }"
                                        color="neutral"
                                        icon="i-lucide-clock"
                                        :label="
                                            item.dueDate.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
                                        "
                                        size="sm"
                                        variant="soft"
                                    />
                                </div>
                            </div>
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
                                :style="colorStyle(project.color)"
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
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
    grid-template-rows: auto;
}
</style>
