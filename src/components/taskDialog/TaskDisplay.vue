<script setup lang="ts">
import { computed, ref } from 'vue';
import { failWithCompensation } from '../../application/compensation';
import { reportOperationalError } from '../../application/operationalErrors';
import { useTask } from '../../composables/useTask';
import { useTasks } from '../../composables/useTasks';
import { appendComment, incompleteTaskBlockers, recurrenceLabel, taskStartDate } from '../../domain/tasks';
import { requireCurrentUser, uiColor } from '../../platform';
import TaskItem from '../TaskItem.vue';
import Activities from './Activities.vue';

const props = defineProps<{ taskId: number; projectId: number }>();
const tId = computed(() => props.taskId);
const pId = computed(() => props.projectId);

const { task, sortedTags, assignees, dueDate, toDayMonth } = useTask(pId, tId);
const startDate = computed(() => taskStartDate(task.value));
const subTasks = computed(() =>
    (Array.isArray(task.value?.subTasks) ? task.value.subTasks : []).map(st => tasksMap.value[st]).filter(st => st),
);

const { updateTask, createTask, deleteTask, tasksMap } = useTasks(pId);
const blockers = computed(() =>
    task.value
        ? (Array.isArray(task.value.blockedBy) ? task.value.blockedBy : [])
              .map(id => tasksMap.value[id])
              .filter(Boolean)
        : [],
);
const openBlockers = computed(() => (task.value ? incompleteTaskBlockers(task.value, tasksMap.value) : []));

const saveComment = async (value: string) => {
    if (!task.value) {
        throw new Error('Die Aufgabe ist nicht mehr verfügbar.');
    }
    const user = requireCurrentUser();
    await updateTask({
        ...task.value,
        activity: appendComment(Array.isArray(task.value.activity) ? task.value.activity : [], value, user.id),
    });
};
const childName = ref('');
const childSaving = ref(false);
const childError = ref('');
const createChild = async () => {
    if (!childName.value.trim() || !task.value || childSaving.value) return;
    childSaving.value = true;
    childError.value = '';
    const parent = task.value;
    let child: Awaited<ReturnType<typeof createTask>> | undefined;
    try {
        child = await createTask({
            type: 'task',
            name: childName.value.trim(),
            fullfilled: false,
            priority: 'none',
            sortKey: Date.now(),
            list: parent.list,
        });
        await updateTask({
            ...parent,
            subTasks: [...(Array.isArray(parent.subTasks) ? parent.subTasks : []), child.id],
        });
        childName.value = '';
    } catch (error) {
        if (child)
            await failWithCompensation('Unteraufgabe anlegen', error, [
                () => deleteTask(child!.id, props.projectId, 1),
            ]).catch(compensationError => {
                childError.value = reportOperationalError(
                    'Unteraufgabe anlegen',
                    compensationError,
                    'Unteraufgabe konnte nicht angelegt werden.',
                );
            });
        else
            childError.value = reportOperationalError(
                'Unteraufgabe anlegen',
                error,
                'Unteraufgabe konnte nicht angelegt werden.',
            );
    } finally {
        childSaving.value = false;
    }
};
</script>
<template>
    <div class="task-view-layout">
        <main class="task-view-main">
            <section v-if="task?.description" class="task-view-description">
                <UEditor
                    class="task-markdown-display"
                    content-type="markdown"
                    :editable="false"
                    :image="false"
                    :mention="false"
                    :model-value="task.description"
                    :starter-kit="{
                        link: { openOnClick: true, HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' } },
                    }"
                />
            </section>

            <section class="task-view-section">
                <div class="task-view-section-header">
                    <h3 class="task-view-heading">Unteraufgaben</h3>
                    <UBadge color="neutral" :label="String(subTasks.length)" variant="subtle" />
                </div>
                <div v-if="subTasks.length" class="flex flex-col gap-2">
                    <TaskItem v-for="subtask in subTasks" :key="subtask.id" :item="subtask" :project-id="projectId" />
                </div>
                <div class="flex items-end gap-2">
                    <UInput
                        v-model="childName"
                        aria-label="Neue Unteraufgabe"
                        class="min-w-0 flex-1"
                        placeholder="Titel der Unteraufgabe …"
                        @keydown.enter="createChild"
                    />
                    <UButton
                        :disabled="childSaving || !childName.trim()"
                        icon="i-lucide-plus"
                        label="Anlegen"
                        :loading="childSaving"
                        @click="createChild"
                    />
                </div>
                <UAlert v-if="childError" color="error" :title="childError" variant="subtle" />
            </section>

            <section class="task-view-section">
                <Activities :activities="task?.activity ?? []" :save-comment="saveComment" />
            </section>
        </main>

        <aside class="task-view-meta">
            <div class="task-editor-meta-heading">
                <span>Details</span>
            </div>
            <div v-if="dueDate" class="task-view-meta-row">
                <span>Fällig am</span>
                <UBadge color="neutral" icon="i-lucide-calendar" :label="toDayMonth(dueDate)" variant="subtle" />
            </div>
            <div v-if="startDate" class="task-view-meta-row">
                <span>Startet am</span>
                <UBadge
                    color="neutral"
                    icon="i-lucide-calendar-range"
                    :label="toDayMonth(startDate)"
                    variant="subtle"
                />
            </div>
            <div v-if="task?.recurrence" class="task-view-meta-row">
                <span>Wiederholung</span>
                <UBadge
                    color="neutral"
                    icon="i-lucide-repeat-2"
                    :label="recurrenceLabel(task.recurrence)"
                    variant="subtle"
                />
            </div>
            <div v-if="sortedTags.length" class="task-view-meta-group">
                <span>Tags</span>
                <div class="task-item-tags flex flex-wrap gap-1.5">
                    <UBadge
                        v-for="tag in sortedTags"
                        :key="tag.id"
                        class="task-item-tag"
                        :color="uiColor(tag.color)"
                        :label="tag.name"
                        size="sm"
                        variant="outline"
                    />
                </div>
            </div>
            <div v-if="assignees.length" class="task-view-meta-group">
                <span>Verantwortliche</span>
                <div class="task-view-assignees flex flex-col gap-1.5">
                    <div v-for="assignee in assignees" :key="assignee.domainIdentifier" class="flex items-center gap-2">
                        <UAvatar :alt="assignee.title" size="xs" :src="assignee.imageUrl" />
                        <span>{{ assignee.title }}</span>
                    </div>
                </div>
            </div>
            <div v-if="blockers.length" class="task-view-meta-group">
                <span>Blockiert durch</span>
                <div class="flex flex-col gap-2">
                    <UBadge
                        v-for="blocker in blockers"
                        :key="blocker.id"
                        :color="blocker.fullfilled ? 'success' : 'warning'"
                        :icon="blocker.fullfilled ? 'i-lucide-circle-check' : 'i-lucide-ban'"
                        :label="blocker.name"
                        variant="subtle"
                    />
                </div>
                <p v-if="openBlockers.length" class="text-xs text-amber-700">
                    Abschluss erst möglich, wenn alle Blocker erledigt sind.
                </p>
            </div>
            <UButton
                v-if="task?.url"
                block
                color="neutral"
                :href="task.url"
                icon="i-lucide-external-link"
                label="Verknüpfung öffnen"
                rel="noopener noreferrer"
                target="_blank"
                variant="outline"
            />
            <p
                v-if="
                    !dueDate &&
                    !startDate &&
                    !task?.recurrence &&
                    !sortedTags.length &&
                    !assignees.length &&
                    !blockers.length &&
                    !task?.url
                "
                class="task-view-empty"
            >
                Keine weiteren Details
            </p>
        </aside>
    </div>
</template>
