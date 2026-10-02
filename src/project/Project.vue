<script setup lang="ts">
import { computed, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { CtColor, CtIcon, colorKey } from '../platform';
import { Button, DropdownMenu, LoadingMessage } from '../ui';
import { ICONS } from '../utils/utils';
import { createOrEditProject } from './projectHelper';
import { useProject } from './useProject';

const props = defineProps<{ projectId: string }>();
defineEmits<{ (event: 'edit-project', project: Project): void }>();

const route = useRoute();
const router = useRouter();

const { project, deleteProject, isLoading, isError, refetch } = useProject(toRef(() => parseInt(props.projectId)));
const projectContextMenu = computed(() => {
    return [
        {
            items: [
                {
                    id: 'edit',
                    icon: CtIcon.EDIT,
                    nameTranslated: 'Bearbeiten',
                    callback: () => createOrEditProject(project.value ?? undefined),
                },
                {
                    id: 'delete',
                    icon: { icon: CtIcon.DELETE, class: 'text-error-bright' },
                    nameTranslated: 'Löschen',
                    callback: async () => {
                        if (await deleteProject()) router.push({ name: 'overview' });
                    },
                },
            ],
        },
    ];
});
</script>
<template>
    <div class="project-page">
        <LoadingMessage v-if="isLoading" />
        <p v-else-if="isError" role="alert">
            Projekt konnte nicht geladen werden. <button @click="refetch()">Erneut versuchen</button>
        </p>
        <p v-else-if="!project" role="alert">Projekt nicht gefunden oder keine Berechtigung.</p>
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
                    <DropdownMenu :menu-items="projectContextMenu">
                        <Button :color="CtColor.BASIC" icon="fas fa-ellipsis" size="S" text />
                    </DropdownMenu>
                    <Button
                        :icon="CtIcon.ADD"
                        label="Aufgabe"
                        :to="{ name: route.name!, params: { ...route.params, taskId: 'new' } }"
                    />
                </div>
            </header>

            <RouterView />
        </div>
    </div>
</template>
