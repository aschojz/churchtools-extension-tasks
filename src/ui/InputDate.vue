<script setup lang="ts">
defineProps<{ modelValue?: string; label?: string; horizontal?: boolean }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
<template>
    <label class="ui-field" :class="{ horizontal }">
        <span v-if="label">{{ label }}</span>
        <input
            type="date"
            :value="modelValue?.slice(0, 10)"
            @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        />
    </label>
</template>
