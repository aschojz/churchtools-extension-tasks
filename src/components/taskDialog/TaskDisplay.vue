<script setup lang="ts">
import { computed, ref } from 'vue';
import { failWithCompensation } from '../../application/compensation';
import { useTask } from '../../composables/useTask';
import { useTasks } from '../../composables/useTasks';
import { uiColor } from '../../platform';
import TaskItem from '../TaskItem.vue';
import Activities from './Activities.vue';

const props = defineProps<{ taskId: number; projectId: number }>();
const tId = computed(() => props.taskId);
const pId = computed(() => props.projectId);

const { task, sortedTags, assignees, dueDate, toDayMonth } = useTask(pId, tId);
const subTasks = computed(() =>
    (Array.isArray(task.value?.subTasks) ? task.value.subTasks : []).map(st => tasksMap.value[st]).filter(st => st),
);

const { updateTask, createTask, deleteTask, tasksMap } = useTasks(pId);

const onComment = (activities: ActivityEntry[]) => {
    if (!task.value) {
        return;
    }
    updateTask({ ...task.value, activity: activities });
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
                childError.value =
                    compensationError instanceof Error
                        ? compensationError.message
                        : 'Unteraufgabe konnte nicht angelegt werden.';
            });
        else childError.value = error instanceof Error ? error.message : 'Unteraufgabe konnte nicht angelegt werden.';
    } finally {
        childSaving.value = false;
    }
};
</script>
<template>
    <div class="task-view-layout">
        <main class="task-view-main">
            <section v-if="task?.description" class="task-view-description">
                {{ task.description }}
            </section>

            <section class="task-view-section">
                <div class="task-view-section-header">
                    <h3 class="task-view-heading">Unteraufgaben</h3>
                    <UBadge color="neutral" :label="String(subTasks.length)" variant="subtle" />
                </div>
                <div v-if="subTasks.length" class="flex flex-col gap-2">
                    <TaskItem v-for="subtask in subTasks" :key="subtask.id" :item="subtask" :project-id="projectId" />
                </div>
                <p v-else class="task-view-empty">Noch keine Unteraufgaben</p>
                <div class="flex items-end gap-2">
                    <UFormField class="flex-1" label="Neue Unteraufgabe">
                        <UInput
                            v-model="childName"
                            class="w-full"
                            placeholder="Titel der Unteraufgabe …"
                            @keydown.enter="createChild"
                        />
                    </UFormField>
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
                <Activities :activities="task?.activity ?? []" @comment="onComment" />
            </section>
        </main>

        <aside class="task-view-meta">
            <div class="task-editor-meta-heading">
                <UIcon name="i-lucide-info" />
                <span>Details</span>
            </div>
            <div v-if="dueDate" class="task-view-meta-row">
                <span>Fällig am</span>
                <UBadge color="neutral" icon="i-lucide-calendar" :label="toDayMonth(dueDate)" variant="subtle" />
            </div>
            <div v-if="sortedTags.length" class="task-view-meta-group">
                <span>Tags</span>
                <div class="flex flex-wrap gap-2">
                    <UBadge
                        v-for="tag in sortedTags"
                        :key="tag.id"
                        :color="uiColor(tag.color)"
                        :label="tag.name"
                        size="sm"
                        variant="soft"
                    />
                </div>
            </div>
            <div v-if="assignees.length" class="task-view-meta-group">
                <span>Verantwortliche</span>
                <div class="flex flex-col gap-2">
                    <div v-for="assignee in assignees" :key="assignee.domainIdentifier" class="flex items-center gap-2">
                        <UAvatar :alt="assignee.title" size="sm" :src="assignee.imageUrl" />
                        <strong>{{ assignee.title }}</strong>
                    </div>
                </div>
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
            <p v-if="!dueDate && !sortedTags.length && !assignees.length && !task?.url" class="task-view-empty">
                Keine weiteren Details
            </p>
        </aside>
    </div>
</template>
