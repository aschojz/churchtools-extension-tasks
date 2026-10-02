<script setup lang="ts">
import { computed, ref, useAttrs } from 'vue';
defineOptions({ inheritAttrs: false });
const props = withDefaults(
    defineProps<{
        modelValue?: string | number;
        label?: string;
        showLabel?: boolean;
        clear?: boolean;
        horizontal?: boolean;
        type?: string;
    }>(),
    { showLabel: true, type: 'text' },
);
const emit = defineEmits<{ 'update:modelValue': [value: string]; input: [value: string]; enter: [] }>();
const attrs = useAttrs();
const input = ref<HTMLInputElement>();
const value = computed({
    get: () => props.modelValue ?? '',
    set: v => {
        emit('update:modelValue', String(v));
        emit('input', String(v));
    },
});
defineExpose({ focus: () => input.value?.focus() });
</script>
<template>
    <label class="ui-field" :class="{ horizontal }"
        ><span v-if="label && showLabel">{{ label }}</span
        ><span class="ui-input-wrap"
            ><i v-if="!showLabel" class="fas fa-search"></i
            ><input ref="input" v-model="value" v-bind="attrs" :type="type" @keydown.enter="emit('enter')" /><button
                v-if="clear && value"
                type="button"
                @click="value = ''"
            >
                <i class="fas fa-xmark"></i></button></span
    ></label>
</template>
