<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useTags } from '../composables/useTags';
import { colorOptions, CtColor } from '../platform';

const props = defineProps<{
    projectId: number;
    tag?: TransformedTag;
}>();
const emit = defineEmits<{ (event: 'close'): void }>();

const colors = computed(() => colorOptions);
const { createTag, updateTag } = useTags(toRef(() => props.projectId));
const draft = ref<Tag>({
    type: 'tag',
    name: props.tag?.name ?? '',
    color: props.tag?.color ?? CtColor.BASIC,
    sortKey: props.tag?.sortKey ?? Date.now(),
});
const error = ref('');
const saving = ref(false);
const onSave = async () => {
    if (saving.value || !draft.value.name?.trim()) return;
    saving.value = true;
    try {
        const value = { ...draft.value, name: draft.value.name.trim() };
        if (props.tag) await updateTag({ ...value, id: props.tag.id, dataCategoryId: props.projectId });
        else await createTag(value);
        emit('close');
    } catch {
        error.value = 'Tag konnte nicht gespeichert werden.';
    } finally {
        saving.value = false;
    }
};
</script>
<template>
    <UModal
        :open="true"
        :title="tag ? 'Tag bearbeiten' : 'Neuen Tag anlegen'"
        @update:open="(value: boolean) => !value && emit('close')"
    >
        <template #body
            ><UAlert v-if="error" color="error" :title="error" />
            <div class="flex flex-col gap-4">
                <UFormField label="Name"><UInput v-model="draft.name" class="w-full" /></UFormField
                ><UFormField label="Farbe"
                    ><USelect
                        v-model="draft.color"
                        class="w-full"
                        :items="colors"
                        label-key="nameTranslated"
                        value-key="id"
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
