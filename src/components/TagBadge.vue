<script setup lang="ts">
import { colorKey, colorStyle } from '../platform';

withDefaults(defineProps<{ color: unknown; label: string; variant?: 'outline' | 'soft' }>(), { variant: 'outline' });
</script>

<template>
    <UBadge
        class="task-item-tag custom-color-tag"
        color="neutral"
        :data-color="colorKey(color)"
        :label="label"
        size="sm"
        :style="colorStyle(color)"
        :variant="variant"
    />
</template>
