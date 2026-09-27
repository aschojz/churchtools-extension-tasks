<script setup lang="ts">
import { Button, DropdownMenu, LoadingMessage, PageHeader, Subgrid } from '@churchtools/styleguide';
import { CtColor, CtIcon } from '@churchtools/utils';
import { computed, toRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';
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
    <Subgrid class="grow">
        <LoadingMessage v-if="isLoading" />
        <p v-else-if="isError" role="alert">
            Projekt konnte nicht geladen werden. <button @click="refetch()">Erneut versuchen</button>
        </p>
        <p v-else-if="!project" role="alert">Projekt nicht gefunden oder keine Berechtigung.</p>
        <div v-else class="flex grow flex-col">
            <PageHeader
                :actions="[
                    {
                        icon: CtIcon.ADD,
                        label: 'Aufgabe erstellen',
                        color: CtColor.GREEN,
                        to: { name: route.name!, params: { ...route.params, taskId: 'new' } },
                    },
                ]"
                :breadcrumbs="[
                    { title: 'Projekte', to: { name: 'overview' } },
                    { title: project.name ?? '...', to: { name: 'project', params: { projectId: project.id } } },
                ]"
                class="pt-page-header-full-width mb-page-header-full-width mx-4 lg:mx-6"
                :color="project.color ?? CtColor.BASIC"
                :description="project.description"
                :icon="project.icon ?? ICONS.DEFAULT_PROJECT"
                :title="project.name"
            >
                <template #title-after>
                    <DropdownMenu :menu-items="projectContextMenu">
                        <Button :color="CtColor.BASIC" icon="fas fa-ellipsis" size="S" text />
                    </DropdownMenu>
                </template>
            </PageHeader>

            <RouterView />
        </div>
    </Subgrid>
</template>
