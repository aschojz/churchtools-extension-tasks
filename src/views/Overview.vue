<script setup lang="ts">
import { Card, EmptyState, LoadingMessage, PageHeader } from '@churchtools/styleguide';
import { CtColor } from '@churchtools/utils';
import { computed } from 'vue';
import { usePlugin } from '../composables/usePlugin';
import { useCustomModuleDataCategoriesQuery } from '../data/ccm';
import { createOrEditProject } from '../project/projectHelper';
import { ICONS, txx } from '../utils/utils';

defineEmits<{ (event: 'edit-project', project: Project): void }>();
const { moduleId } = usePlugin();
const { data, isLoading, isError, refetch } = useCustomModuleDataCategoriesQuery<Project>(moduleId);
const projects = computed(() => (data.value ?? []).filter(cat => cat.shorty.startsWith('project')) as Project[]);
</script>
<template>
    <LoadingMessage v-if="isLoading" />
    <p v-else-if="isError" role="alert">
        Projekte konnten nicht geladen werden. <button @click="refetch()">Erneut versuchen</button>
    </p>
    <EmptyState
        v-else-if="projects.length === 0"
        :action="{
            label: txx('Neues Projekt'),
            color: CtColor.GREEN,
            icon: 'fas fa-plus',
            onClick: () => createOrEditProject(),
        }"
        :icon="ICONS.MAIN"
        :title="txx('Noch keine Projekte')"
    />
    <div>
        <PageHeader
            class="pt-page-header-full-width mb-page-header-full-width mx-4 lg:mx-6"
            :icon="ICONS.MAIN"
            :title="txx('Projekte')"
        />
        <div class="project-grid w-full gap-4 px-4 lg:px-6">
            <RouterLink
                v-for="project in projects"
                :key="project.id"
                class="h-full w-full"
                :to="{ name: 'project', params: { projectId: project.id } }"
            >
                <Card class="hover:border-basic-300 h-full">
                    <div class="flex items-center gap-4">
                        <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                            :style="`color: var(--color-${project.color}-bright); background: var(--color-${project.color}-b-pale)`"
                        >
                            <i :class="project.icon"></i>
                        </div>
                        <div class="flex-grow text-xl font-bold">
                            {{ project.name }}
                        </div>
                        <i class="fas fa-chevron-right text-ter fa-fw"></i>
                    </div>
                    <div v-if="project.description" class="text-sec mt-3 line-clamp-3">
                        {{ project.description }}
                    </div>
                </Card>
            </RouterLink>
        </div>
    </div>
</template>
<style>
.project-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    grid-template-rows: auto;
}
</style>
