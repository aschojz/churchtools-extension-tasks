import type { DropdownMenuItem } from '@nuxt/ui';
import {
    computed,
    inject,
    provide,
    ref,
    toValue,
    watch,
    type ComputedRef,
    type InjectionKey,
    type MaybeRefOrGetter,
} from 'vue';
import { failWithCompensation } from '../application/compensation';
import { reportOperationalError } from '../application/operationalErrors';
import { TASK_PRIORITIES, taskDiff } from '../domain/tasks';
import { useProjectTaskContext } from './useProjectTaskContext';

type TaskSelectionContext = {
    enabled: ComputedRef<boolean>;
    selectedIds: ComputedRef<Set<number>>;
    selectedTasks: ComputedRef<TransformedTask[]>;
    allSelected: ComputedRef<boolean>;
    saving: ComputedRef<boolean>;
    error: ComputedRef<string>;
    toggleMode: () => void;
    toggleTask: (taskId: number, selected: boolean | 'indeterminate') => void;
    selectAll: () => void;
    bulkMenu: ComputedRef<DropdownMenuItem[][]>;
};

const taskSelectionKey: InjectionKey<TaskSelectionContext> = Symbol('task-selection');

export function provideTaskSelection(visibleTasks: MaybeRefOrGetter<TransformedTask[]>) {
    const { updateTask } = useProjectTaskContext();
    const selectionEnabled = ref(false);
    const ids = ref<number[]>([]);
    const saving = ref(false);
    const error = ref('');
    const tasks = computed(() => toValue(visibleTasks));
    const selectedIds = computed(() => new Set(ids.value));
    const selectedTasks = computed(() => tasks.value.filter(task => selectedIds.value.has(task.id)));
    const allSelected = computed(() => tasks.value.length > 0 && selectedTasks.value.length === tasks.value.length);

    const toggleMode = () => {
        selectionEnabled.value = !selectionEnabled.value;
        ids.value = [];
        error.value = '';
    };
    const toggleTask = (taskId: number, selected: boolean | 'indeterminate') => {
        ids.value = selected ? [...new Set([...ids.value, taskId])] : ids.value.filter(id => id !== taskId);
    };
    const selectAll = () => {
        ids.value = allSelected.value ? [] : tasks.value.map(task => task.id);
    };
    watch(tasks, current => {
        const visibleIds = new Set(current.map(task => task.id));
        ids.value = ids.value.filter(id => visibleIds.has(id));
    });

    const batchUpdate = async (transform: (task: TransformedTask) => TransformedTask) => {
        if (!selectedTasks.value.length || saving.value) return;
        saving.value = true;
        error.value = '';
        const changed: TransformedTask[] = [];
        try {
            for (const original of selectedTasks.value) {
                const next = transform(original);
                const diff = taskDiff(next, original);
                if (!Object.keys(diff).length) continue;
                await updateTask(next, diff);
                changed.push(original);
            }
            ids.value = [];
        } catch (caught) {
            await failWithCompensation(
                'Sammelaktion',
                caught,
                changed.map(original => () => updateTask({ ...original, revision: (original.revision ?? 0) + 1 })),
            ).catch(compensationError => {
                error.value = reportOperationalError(
                    'Sammelaktion',
                    compensationError,
                    'Die Sammelaktion konnte nicht abgeschlossen werden.',
                );
            });
        } finally {
            saving.value = false;
        }
    };
    const bulkMenu = computed<DropdownMenuItem[][]>(() => [
        [
            {
                label: 'Als erledigt markieren',
                icon: 'i-lucide-circle-check',
                onSelect: () => batchUpdate(task => ({ ...task, fullfilled: true })),
            },
            {
                label: 'Als offen markieren',
                icon: 'i-lucide-circle',
                onSelect: () => batchUpdate(task => ({ ...task, fullfilled: false })),
            },
        ],
        TASK_PRIORITIES.map(priority => ({
            label: `Priorität: ${priority.label}`,
            icon: priority.icon,
            onSelect: () => batchUpdate(task => ({ ...task, priority: priority.id })),
        })),
    ]);

    const context: TaskSelectionContext = {
        enabled: computed(() => selectionEnabled.value),
        selectedIds,
        selectedTasks,
        allSelected,
        saving: computed(() => saving.value),
        error: computed(() => error.value),
        toggleMode,
        toggleTask,
        selectAll,
        bulkMenu,
    };
    provide(taskSelectionKey, context);
    return context;
}

export const useTaskSelection = () => inject(taskSelectionKey);
