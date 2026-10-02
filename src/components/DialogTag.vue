<script setup lang="ts">
import { computed, ref, toRef } from 'vue';
import { useTags } from '../composables/useTags';
import { colorOptions, CtColor } from '../platform';
import { DialogSmall, Input, SelectDropdown } from '../ui';

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
const onSave = async (close: () => void) => {
    if (saving.value || !draft.value.name?.trim()) return;
    saving.value = true;
    try {
        const value = { ...draft.value, name: draft.value.name.trim() };
        if (props.tag) await updateTag({ ...value, id: props.tag.id, dataCategoryId: props.projectId });
        else await createTag(value);
        close();
    } catch {
        error.value = 'Tag konnte nicht gespeichert werden.';
    } finally {
        saving.value = false;
    }
};
</script>
<template>
    <DialogSmall :title="tag ? 'Tag bearbeiten' : 'Neuen Tag anlegen'" @close="emit('close')" @save="onSave">
        <p v-if="error" role="alert">{{ error }}</p>
        <div class="flex flex-col gap-4">
            <Input v-model="draft.name" label="Name" @input="draft.name = $event" />
            <SelectDropdown
                v-model="draft.color"
                class="max-w-[320px]"
                :clear="false"
                emit-id
                label="Farbe"
                :options="colors"
            />
        </div>
    </DialogSmall>
</template>
