<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui';
import { computed, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { colorKey } from '../platform';
import { ICONS } from '../utils/utils';
import { createOrEditProject } from './projectHelper';
import { useProject } from './useProject';

const props = defineProps<{ projectId: string }>();
defineEmits<{ (event: 'edit-project', project: Project): void }>();

const route = useRoute();
const router = useRouter();

const { project, deleteProject, isLoading, isError, refetch } = useProject(toRef(() => parseInt(props.projectId)));
const projectContextMenu = computed<DropdownMenuItem[][]>(() => {
    return [
        [
            {
                icon: 'i-lucide-pencil',
                label: 'Bearbeiten',
                onSelect: () => createOrEditProject(project.value ?? undefined),
            },
            {
                icon: 'i-lucide-trash-2',
                color: 'error',
                label: 'Löschen',
                onSelect: async () => {
                    if (await deleteProject()) router.push({ name: 'overview' });
                },
            },
        ],
    ];
});
</script>
<template>
    <div class="project-page">
        <div v-if="isLoading" class="p-8"><UProgress animation="carousel" /></div>
        <UAlert v-else-if="isError" class="m-6" color="error" title="Projekt konnte nicht geladen werden."
            ><template #actions><UButton label="Erneut versuchen" @click="refetch()" /></template
        ></UAlert>
        <UAlert
            v-else-if="!project"
            class="m-6"
            color="warning"
            title="Projekt nicht gefunden oder keine Berechtigung."
        />
        <div v-else class="flex grow flex-col">
            <header class="project-header">
                <RouterLink class="breadcrumb" :to="{ name: 'overview' }"
                    ><i class="fas fa-arrow-left"></i> Projekte</RouterLink
                >
                <div class="project-title-row">
                    <span class="project-icon" :data-color="colorKey(project.color)"
                        ><i :class="project.icon ?? ICONS.DEFAULT_PROJECT"></i
                    ></span>
                    <div>
                        <h1>{{ project.name }}</h1>
                        <p v-if="project.description">{{ project.description }}</p>
                    </div>
                    <UDropdownMenu :items="projectContextMenu"
                        ><UButton color="neutral" icon="i-lucide-ellipsis" size="sm" square variant="ghost"
                    /></UDropdownMenu>
                    <UButton
                        icon="i-lucide-plus"
                        label="Aufgabe"
                        :to="{ name: route.name!, params: { ...route.params, taskId: 'new' } }"
                    />
                </div>
            </header>

            <RouterView />
        </div>
    </div>
</template>
