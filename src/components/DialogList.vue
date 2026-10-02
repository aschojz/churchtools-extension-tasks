<script setup lang="ts">
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

const onSave = async () => {
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
        emit('close');
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
    <UModal :open="true" :title="context" @update:open="(value: boolean) => !value && emit('close')">
        <template #body
            ><UAlert v-if="error" color="error" :title="error" />
            <div class="flex flex-col gap-4">
                <UFormField label="Name"><UInput v-model="internalList.name" class="w-full" /></UFormField
                ><UFormField label="Sortierung"
                    ><UInput v-model="sortKey" class="w-full" type="number"
                /></UFormField></div
        ></template>
        <template #footer
            ><div class="flex w-full justify-end gap-2">
                <UButton color="neutral" label="Abbrechen" variant="outline" @click="emit('close')" /><UButton
                    label="Speichern"
                    :loading="saving"
                    @click="onSave"
                /></div
        ></template>
    </UModal>
</template>
