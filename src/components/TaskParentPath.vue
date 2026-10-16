<script setup lang="ts">
import type { TransformedTask } from '../domain/types';
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useTaskSelection } from '../composables/useTaskSelection';
import { taskAncestors } from '../domain/tasks';

const props = defineProps<{
    taskId: number;
    projectId: number;
    parentByChild: Record<number, TransformedTask>;
    compact?: boolean;
}>();
const ancestors = computed(() => taskAncestors(props.taskId, props.parentByChild));
const selection = useTaskSelection();
const router = useRouter();
const openParent = (taskId: number) => {
    const route = router.currentRoute.value;
    router.push({
        name: route.params.projectId ? route.name! : 'my-tasks',
        params: { projectId: props.projectId, taskId },
    });
};
</script>

<template>
    <div v-if="ancestors.length" class="task-parent-path" :class="{ 'task-parent-compact': compact }">
        <span class="task-parent-label">
            <UIcon name="i-lucide-corner-left-up" /><span v-if="!compact">Oberaufgabe</span>
        </span>
        <div class="task-parent-links">
            <template v-for="(ancestor, index) in ancestors" :key="ancestor.id">
                <UIcon v-if="index" class="task-parent-separator" name="i-lucide-chevron-right" />
                <span v-if="selection?.enabled.value" class="task-parent-name">{{ ancestor.name }}</span>
                <button
                    v-else
                    :aria-label="`Oberaufgabe öffnen: ${ancestor.name}`"
                    class="task-parent-name"
                    type="button"
                    @click.stop="openParent(ancestor.id)"
                >
                    {{ ancestor.name }}
                </button>
            </template>
        </div>
    </div>
</template>
