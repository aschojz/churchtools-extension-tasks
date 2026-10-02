<script setup lang="ts">
import { computed } from 'vue';
import { RouterLink } from 'vue-router';
const props = defineProps<{
    icon?: string;
    label?: string;
    outlined?: boolean;
    text?: boolean;
    size?: string;
    href?: string;
    target?: string;
    to?: object;
    disabled?: boolean;
    color?: string;
}>();
const component = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'));
</script>
<template>
    <component
        :is="component"
        class="ui-button"
        :class="[{ outlined, text, compact: size === 'S' }, `tone-${color ?? 'basic'}`]"
        :disabled="disabled"
        :href="href"
        :target="target"
        :to="to"
        :type="href || to ? undefined : 'button'"
    >
        <i v-if="icon" aria-hidden="true" :class="icon"></i><span v-if="label">{{ label }}</span
        ><slot />
    </component>
</template>
