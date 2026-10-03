<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import DialogList from '../../components/DialogList.vue';
import DialogTask from '../../components/taskDialog/DialogTask.vue';
import { taskStore } from '../../composables/storeTasks';
import { firstOrSelf } from '../../platform';

const props = withDefaults(
    defineProps<{
        subTaskToggle?: boolean;
        projectId: number;
    }>(),
    { subTaskToggle: true },
);

const fullscreen = ref(false);
const onFullscreen = () => {
    fullscreen.value = !fullscreen.value;
};

const store = taskStore();
const projectSearch = computed({
    get: () => store.searchForProject(props.projectId),
    set: value => store.setSearchForProject(props.projectId, value),
});
const listIsOpen = ref(false);

const route = useRoute();
const taskIsOpen = computed(() => !!firstOrSelf(route.params.taskId));
const viewNavigation: NavigationMenuItem[] = [
    { label: 'Meine Aufgaben', icon: 'i-lucide-user-check', to: { name: 'my-tasks' } },
    { label: 'Board', icon: 'i-lucide-columns-3', to: { name: 'project-board' } },
    { label: 'Liste', icon: 'i-lucide-list', to: { name: 'project-list' } },
    { label: 'Tags', icon: 'i-lucide-tags', to: { name: 'project-tags' } },
    { label: 'Unteraufgaben', icon: 'i-lucide-git-branch', to: { name: 'project-tasks' } },
    { label: 'Papierkorb', icon: 'i-lucide-trash-2', to: { name: 'project-trash' } },
];
</script>
<template>
    <div
        class="project-view flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden"
        :class="{ 'fixed top-0 left-0 z-[2000] h-screen w-screen bg-gray-100': fullscreen }"
    >
        <div class="project-view-header shrink-0 border-b">
            <UDashboardToolbar>
                <template #left>
                    <UInput
                        v-model="projectSearch"
                        class="w-72 max-w-full"
                        icon="i-lucide-search"
                        placeholder="Aufgaben in diesem Projekt filtern …"
                    />
                </template>
                <template #right>
                    <slot name="extra-actions"></slot>
                    <slot name="actions">
                        <UButton
                            :aria-label="fullscreen ? 'Vollbild verlassen' : 'Vollbild öffnen'"
                            color="neutral"
                            icon="i-lucide-plus"
                            label="Liste"
                            variant="outline"
                            @click="listIsOpen = true"
                        />
                        <UButton
                            color="neutral"
                            :icon="fullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'"
                            variant="outline"
                            @click="onFullscreen"
                        />
                    </slot>
                </template>
            </UDashboardToolbar>
            <div class="overflow-x-auto px-4 sm:px-6">
                <UNavigationMenu highlight :items="viewNavigation" orientation="horizontal" variant="link" />
            </div>
        </div>
        <div class="task-board-scroll min-h-0 max-w-full flex-1 overflow-auto p-4 lg:p-6">
            <div class="flex min-h-full gap-4">
                <slot></slot>
            </div>
        </div>
        <DialogTask v-if="taskIsOpen" :project-id="projectId" :task-id="firstOrSelf(route.params.taskId)!" />
        <DialogList v-if="listIsOpen" :project-id="projectId" @close="listIsOpen = false" />
    </div>
</template>
