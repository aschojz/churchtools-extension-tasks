<script setup lang="ts">
import { DialogSmall, Input, SelectDropdown } from '@churchtools/styleguide';
import { useColors } from '@churchtools/utils';
import { computed, ref, toRef } from 'vue';
import { useTags } from '../composables/useTags';

const props = defineProps<{
    projectId: number;
}>();
const { ctColors } = useColors();

const emit = defineEmits<{ (event: 'close'): void }>();

const colors = computed(() =>
    ctColors.map(c => ({ id: c.key, nameTranslated: c.key, color: c.key, icon: 'fas fa-circle' as const })),
);
const { createTag } = useTags(toRef(() => props.projectId));
const tag = ref({} as Tag);
const error = ref('');
const saving = ref(false);
const onSave = async (close: () => void) => {
    if (saving.value || !tag.value.name?.trim()) return;
    saving.value = true;
    try {
        await createTag({ ...tag.value, name: tag.value.name.trim(), sortKey: Date.now() });
        close();
    } catch {
        error.value = 'Tag konnte nicht gespeichert werden.';
    } finally {
        saving.value = false;
    }
};
</script>
<template>
    <DialogSmall title="Neuen Tag anlegen" @close="emit('close')" @save="onSave">
        <p v-if="error" role="alert">{{ error }}</p>
        <div class="flex flex-col gap-4">
            <Input v-model="tag.name" label="Name" @input="tag.name = $event" />
            <SelectDropdown
                v-model="tag.color"
                class="max-w-[320px]"
                :clear="false"
                emit-id
                label="Farbe"
                :options="colors"
            />
        </div>
    </DialogSmall>
</template>
