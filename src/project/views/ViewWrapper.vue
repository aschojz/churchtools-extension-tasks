<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import DialogList from '../../components/DialogList.vue';
import DialogTask from '../../components/taskDialog/DialogTask.vue';
import { taskStore } from '../../composables/storeTasks';
import { firstOrSelf } from '../../platform';

withDefaults(
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
const listIsOpen = ref(false);

const route = useRoute();
const taskIsOpen = computed(() => !!firstOrSelf(route.params.taskId));
const viewNavigation: NavigationMenuItem[] = [
    { label: 'Meine Aufgaben', icon: 'i-lucide-user-check', to: { name: 'my-tasks' } },
    { label: 'Board', icon: 'i-lucide-columns-3', to: { name: 'project-board' } },
    { label: 'Liste', icon: 'i-lucide-list', to: { name: 'project-list' } },
    { label: 'Tags', icon: 'i-lucide-tags', to: { name: 'project-tags' } },
    { label: 'Unteraufgaben', icon: 'i-lucide-git-branch', to: { name: 'project-tasks' } },
];
</script>
<template>
    <div
        class="flex w-full flex-grow flex-col"
        :class="{ 'fixed top-0 left-0 z-[2000] h-screen w-screen bg-gray-100': fullscreen }"
    >
        <div class="border-default shrink-0 border-b">
            <UDashboardToolbar>
                <template #left>
                    <UInput
                        v-model="store.search"
                        class="w-72 max-w-full"
                        icon="i-lucide-search"
                        placeholder="Aufgaben in diesem Projekt filtern …"
                    />
                </template>
                <template #right>
                    <slot name="extra-actions"></slot>
                    <slot name="actions">
                        <UButton
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
        <div class="max-w-full grow overflow-x-auto p-4 lg:p-6">
            <div class="flex h-full gap-4">
                <slot></slot>
            </div>
        </div>
        <DialogTask v-if="taskIsOpen" :project-id="projectId" :task-id="firstOrSelf(route.params.taskId)!" />
        <DialogList v-if="listIsOpen" :project-id="projectId" @close="listIsOpen = false" />
    </div>
</template>
