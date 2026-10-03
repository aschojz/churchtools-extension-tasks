<script setup lang="ts">
import { toRef } from 'vue';
import { provideProjectTaskContext } from '../composables/useProjectTaskContext';
import { useProject } from './useProject';

const props = defineProps<{ projectId: string }>();
const projectId = toRef(() => Number(props.projectId));
const { project, isLoading, isError, refetch } = useProject(projectId);
provideProjectTaskContext(projectId);
</script>

<template>
    <div class="project-page">
        <div v-if="isLoading" class="p-8"><UProgress animation="carousel" /></div>
        <UAlert v-else-if="isError" class="m-6" color="error" title="Projekt konnte nicht geladen werden.">
            <template #actions><UButton label="Erneut versuchen" @click="refetch()" /></template>
        </UAlert>
        <UAlert
            v-else-if="!project"
            class="m-6"
            color="warning"
            title="Projekt nicht gefunden oder keine Berechtigung."
        />
        <RouterView v-else />
    </div>
</template>
