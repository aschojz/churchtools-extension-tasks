<script setup lang="ts">
import { colorKey } from '../platform';
const props = defineProps<{ label?: string; icon?: string; color?: unknown; size?: string }>();
</script>
<template>
    <span class="ui-tag" :data-color="colorKey(props.color)"><i v-if="icon" :class="icon"></i>{{ label }}<slot /></span>
</template>
