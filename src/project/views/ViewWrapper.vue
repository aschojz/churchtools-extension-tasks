<script setup lang="ts">
import { Button, Input } from '@churchtools/styleguide';
import { CtColor, getFirstOrSelf } from '@churchtools/utils';
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import DialogList from '../../components/DialogList.vue';
import DialogTask from '../../components/taskDialog/DialogTask.vue';
import { taskStore } from '../../composables/storeTasks';

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
const taskIsOpen = computed(() => !!getFirstOrSelf(route.params.taskId));
</script>
<template>
    <div
        class="flex w-full flex-grow flex-col"
        :class="{ 'fixed top-0 left-0 z-[2000] h-screen w-screen bg-gray-100': fullscreen }"
    >
        <div class="w-full items-center border-b border-solid border-gray-300 px-4 lg:px-6">
            <div class="flex gap-2 py-4">
                <Input
                    v-model="store.search"
                    class="flex-grow"
                    clear
                    label="Suche"
                    placeholder="Suchen"
                    :show-label="false"
                />
                <slot name="extra-actions"></slot>
                <slot name="actions">
                    <Button
                        :color="CtColor.BASIC"
                        icon="fas fa-plus"
                        label="Liste"
                        outlined
                        @click="listIsOpen = true"
                    />
                    <Button
                        :color="CtColor.BASIC"
                        :icon="fullscreen ? 'fas fa-compress' : 'fas fa-expand'"
                        outlined
                        @click="onFullscreen"
                    />
                </slot>
            </div>
            <div class="flex justify-between">
                <div class="tabs flex gap-1">
                    <RouterLink :to="{ name: 'my-tasks' }">Meine Aufgaben</RouterLink>
                    <RouterLink :to="{ name: 'project-board' }">Board</RouterLink>
                    <RouterLink :to="{ name: 'project-list' }">Liste</RouterLink>
                    <RouterLink :to="{ name: 'project-tags' }">Tags</RouterLink>
                    <RouterLink :to="{ name: 'project-tasks' }">Aufgaben</RouterLink>
                </div>
                <div class="flex gap-4"></div>
            </div>
        </div>
        <div class="max-w-full grow overflow-x-auto p-4 lg:p-6">
            <div class="flex h-full gap-4">
                <slot></slot>
            </div>
        </div>
        <DialogTask v-if="taskIsOpen" :project-id="projectId" :task-id="getFirstOrSelf(route.params.taskId)" />
        <DialogList v-if="listIsOpen" :project-id="projectId" @close="listIsOpen = false" />
    </div>
</template>
<style scoped>
@reference '../../tailwind.css';
.tabs a {
    padding: 8px 12px;
    @apply rounded-t bg-gray-200;
}
a.router-link-active {
    background: var(--color-accent-bright);
    color: white;
}
</style>
