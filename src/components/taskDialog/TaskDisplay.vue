<script setup lang="ts">
import { computed, ref } from 'vue';
import { useTask } from '../../composables/useTask';
import { useTasks } from '../../composables/useTasks';
import { uiColor } from '../../platform';
import TaskItem from '../TaskItem.vue';
import Activities from './Activities.vue';

const props = defineProps<{ taskId: number; projectId: number }>();
const tId = computed(() => props.taskId);
const pId = computed(() => props.projectId);

const { task, sortedTags, assignees } = useTask(pId, tId);
const subTasks = computed(() => (task.value?.subTasks ?? []).map(st => tasksMap.value[st]).filter(st => st));

const { updateTask, createTask, tasksMap } = useTasks(pId);

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
    try {
        const child = await createTask({
            type: 'task',
            name: childName.value.trim(),
            fullfilled: false,
            sortKey: Date.now(),
            list: parent.list,
        });
        await updateTask({ ...parent, subTasks: [...(parent.subTasks ?? []), child.id] });
        childName.value = '';
    } catch {
        childError.value = 'Unteraufgabe konnte nicht vollständig gespeichert werden. Bitte die Aufgabenliste prüfen.';
    } finally {
        childSaving.value = false;
    }
};
</script>
<template>
    <div class="task-display-layout grid grid-cols-4 gap-3">
        <div class="col-span-3 flex flex-col gap-8">
            <div class="whitespace-pre-line">{{ task?.description }}</div>
            <div class="border-basic-divider border-b"></div>
            <div class="flex flex-col gap-4">
                <div>
                    <div class="text-lg font-bold">Unteraufgaben</div>
                </div>
                <div class="flex flex-col gap-2">
                    <TaskItem v-for="subtask in subTasks" :key="subtask.id" :item="subtask" :project-id="projectId" />
                </div>
            </div>
            <div class="flex gap-2">
                <UFormField class="flex-1" label="Neue Unteraufgabe"
                    ><UInput v-model="childName" class="w-full" @keydown.enter="createChild"
                /></UFormField>
                <UButton
                    :disabled="childSaving || !childName.trim()"
                    label="Anlegen"
                    :loading="childSaving"
                    @click="createChild"
                />
            </div>
            <p v-if="childError" role="alert">{{ childError }}</p>
            <Activities v-if="task?.activity" :activities="task?.activity" @comment="onComment" />
        </div>
        <div class="flex flex-col gap-4">
            <div v-if="sortedTags.length">
                <div class="text-basic-secondary">Tags:</div>
                <div class="flex gap-2">
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
            <div v-if="assignees.length">
                <div class="text-basic-secondary">Assignee:</div>
                <div class="flex flex-col gap-2">
                    <div v-for="assignee in assignees" :key="assignee.domainIdentifier" class="flex items-center gap-2">
                        <UAvatar :alt="assignee.title" size="sm" :src="assignee.imageUrl" />
                        <span class="font-bold">{{ assignee.title }}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
