<script setup lang="ts">
import { DialogLarge, Input } from '@churchtools/styleguide';
import { computed, ref, toRef } from 'vue';
import { useLists } from '../composables/useLists';

const props = withDefaults(
    defineProps<{
        list?: TaskList | TransformedList;
        projectId: number;
    }>(),
    { list: () => ({}) as TaskList },
);
const emit = defineEmits<{ (event: 'close'): void }>();

const internalList = ref({ ...props.list });
const sortKey = ref(String(props.list.sortKey ?? 0));
const error = ref('');
const saving = ref(false);

const { updateList, createList } = useLists(toRef(() => props.projectId));

const isTransformedList = (list: TaskList | TransformedList): list is TransformedList => {
    return 'id' in list && Number.isSafeInteger(list.id) && list.id > 0;
};

const onSave = async (close: () => void) => {
    if (saving.value) return;
    error.value = '';
    if (!internalList.value.name?.trim() || !Number.isFinite(Number(sortKey.value))) {
        error.value = 'Bitte einen Namen und eine gültige Sortierung eingeben.';
        return;
    }
    saving.value = true;
    try {
        const payload = { ...internalList.value, name: internalList.value.name.trim(), sortKey: Number(sortKey.value) };
        if (isTransformedList(payload)) await updateList(payload);
        else await createList(payload);
        close();
    } catch {
        error.value = 'Liste konnte nicht gespeichert werden.';
    } finally {
        saving.value = false;
    }
};
const context = computed(() => {
    return isTransformedList(internalList.value) ? 'Liste bearbeiten' : 'Neue Liste anlegen';
});
</script>
<template>
    <DialogLarge :context="context" @close="emit('close')" @save="onSave">
        <p v-if="error" role="alert">{{ error }}</p>
        <div class="flex flex-col gap-4">
            <Input v-model="internalList.name" label="Name" @input="internalList.name = $event" />
            <Input v-model="sortKey" label="Sortierung" @input="sortKey = $event" />
        </div>
    </DialogLarge>
</template>
