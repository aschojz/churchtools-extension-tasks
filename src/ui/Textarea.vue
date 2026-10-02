<script setup lang="ts">
defineProps<{ modelValue?: string; label?: string; horizontal?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string]; input: [value: string] }>();
</script>
<template>
    <label class="ui-field" :class="{ horizontal }"
        ><span v-if="label">{{ label }}</span
        ><textarea
            v-bind="$attrs"
            :value="modelValue"
            @input="
                emit('update:modelValue', ($event.target as HTMLTextAreaElement).value);
                emit('input', ($event.target as HTMLTextAreaElement).value);
            "
        />
    </label>
</template>
