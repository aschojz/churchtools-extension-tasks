<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
    percent: number;
}>();
const radius = 11;
const strokeWidth = 2;
const circumference = radius * 2 * Math.PI;
const size = 24;

const safePercent = computed(() => Math.min(100, Math.max(0, Math.round(props.percent || 0))));
const complete = computed(() => safePercent.value === 100);

const strokeDasharray = computed(() => `${circumference} ${circumference}`);
const strokeDashoffset = computed(() => {
    const offset = circumference - (safePercent.value / 100) * circumference;
    return offset;
});
</script>
<template>
    <div :aria-label="`${safePercent} Prozent der Unteraufgaben erledigt`" class="progress-indicator" role="img">
        <svg class="progress-ring" :height="size" :width="size">
            <circle
                class="progress-ring__track"
                :cx="size / 2"
                :cy="size / 2"
                fill="transparent"
                :r="radius"
                :stroke-width="strokeWidth"
            />
            <circle
                class="progress-ring__circle"
                :cx="size / 2"
                :cy="size / 2"
                fill="transparent"
                :r="radius"
                :stroke-width="strokeWidth"
                :style="`stroke-dasharray: ${strokeDasharray}; stroke-dashoffset: ${strokeDashoffset}`"
            />
        </svg>
        <UIcon v-if="complete" class="progress-indicator__check" name="i-lucide-check" />
        <span v-else class="progress-indicator__value">{{ safePercent }}</span>
    </div>
</template>
<style scoped>
.progress-indicator {
    position: relative;
    display: inline-grid;
    width: 24px;
    height: 24px;
    flex: 0 0 24px;
    place-items: center;
}
.progress-ring {
    position: absolute;
    inset: 0;
}
.progress-ring__track {
    stroke: #dedbd5;
}
.progress-ring__circle {
    stroke: #3f8d63;
    stroke-linecap: round;
    transition: 0.35s stroke-dashoffset;
    transform: rotate(-90deg);
    transform-origin: 50% 50%;
}
.progress-indicator__value {
    color: #55514d;
    font-size: 8px;
    font-weight: 700;
    line-height: 1;
}
.progress-indicator__check {
    width: 12px;
    height: 12px;
    color: #2f7b53;
}
</style>
