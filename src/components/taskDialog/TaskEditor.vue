<script setup lang="ts">
import { churchtoolsClient } from '@churchtools/churchtools-client';
import { Button, Input, InputDate, SelectDropdown, Textarea } from '@churchtools/styleguide';
import { type DomainObjectPerson, transformPersonToDomainObject } from '@churchtools/utils';
import { computed, ref, watch } from 'vue';
import { usePersonsQueryAllPages } from '../../composables/usePersons';
import { useTags } from '../../composables/useTags';
import { useTasks } from '../../composables/useTasks';
import { taskDraft } from '../../domain/tasks';
import DialogTag from '../DialogTag.vue';

const props = defineProps<{ taskId?: number; projectId: number }>();
const emit = defineEmits<{ (event: 'change', payload: Task): void }>();
const projectId = computed(() => props.projectId);
const { tasksMap, isLoading, findParent } = useTasks(projectId);
const { tagsArray } = useTags(projectId);
const tagOptions = computed(() =>
    tagsArray.value.map(tag => ({
        id: tag.id,
        nameTranslated: tag.name,
        color: tag.color.key,
        icon: 'fas fa-circle' as const,
    })),
);
const internTask = ref<Task>(taskDraft());
const createTagIsOpen = ref(false);
const missing = ref(false);
watch(
    [() => props.taskId, () => props.projectId, isLoading],
    () => {
        if (isLoading.value) return;
        const task = props.taskId ? tasksMap.value[props.taskId] : undefined;
        missing.value = !!props.taskId && !task;
        internTask.value = taskDraft(task);
    },
    { immediate: true },
);
watch(internTask, () => emit('change', internTask.value), {
    deep: true,
    immediate: true,
    // The footer button lives in the parent dialog. Keep its draft synchronous
    // so a quick input followed by Save cannot submit the previous value.
    flush: 'sync',
});
const parent = computed(() => (props.taskId ? findParent(tasksMap.value[props.taskId]) : undefined));
const filter = computed(() => ({ ids: internTask.value.assignedTo ?? [] }));
const { data } = usePersonsQueryAllPages(filter);
const assignees = computed(() =>
    (data.value ?? []).map(p => ({
        domainObject: transformPersonToDomainObject(p),
        id: p.id,
        nameTranslated: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
    })),
);
const onSearchForPerson = async (query: string) => {
    const result = await churchtoolsClient.get<DomainObjectPerson[]>(
        `/search?query=${encodeURIComponent(query)}&domainTypes[]=person`,
    );
    return result.map(r => ({ ...r, id: Number(r.domainIdentifier), nameTranslated: r.title }));
};
</script>
<template>
    <p v-if="isLoading">Aufgabe wird geladen …</p>
    <p v-else-if="missing" role="alert">Diese Aufgabe wurde nicht gefunden.</p>
    <div v-else class="flex flex-col gap-2">
        <Input v-model="internTask.name" :horizontal="true" label="Titel" required @input="internTask.name = $event" />
        <Textarea
            v-model="internTask.description"
            :horizontal="true"
            label="Beschreibung"
            :rows="10"
            @input="internTask.description = $event"
        />
        <InputDate v-model="internTask.dueDate" class="max-w-[520px]" :horizontal="true" label="Fällig am" />
        <label v-if="parent" class="flex items-center gap-2">
            Tage vor der übergeordneten Aufgabe
            <input v-model.number="internTask.dueDateRelative" class="rounded border p-2" min="0" type="number" />
        </label>
        <Input v-model="internTask.url" :horizontal="true" label="Link" />
        <div class="flex items-end gap-2">
            <SelectDropdown
                v-model="internTask.tags"
                class="flex-grow"
                emit-id
                :horizontal="true"
                label="Tags"
                multiple
                :options="tagOptions"
            />
            <Button icon="fas fa-plus" label="Tag erstellen" outlined @click="createTagIsOpen = true" />
        </div>
        <SelectDropdown
            v-model="internTask.assignedTo"
            emit-id
            :horizontal="true"
            label="Verantwortliche"
            multiple
            :options="assignees"
            :search-function="onSearchForPerson"
        />
        <DialogTag v-if="createTagIsOpen" :project-id="projectId" @close="createTagIsOpen = false" />
    </div>
</template>
