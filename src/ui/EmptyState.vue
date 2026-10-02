<script setup lang="ts">
import Button from './Button.vue';
defineProps<{
    icon?: string;
    title: string;
    action?: { label?: string; icon?: string; color?: string; onClick?: () => void };
}>();
</script>
<template>
    <div class="ui-empty">
        <span><i :class="icon"></i></span>
        <h2>{{ title }}</h2>
        <Button v-if="action" v-bind="action" @click="action.onClick" />
    </div>
</template>
