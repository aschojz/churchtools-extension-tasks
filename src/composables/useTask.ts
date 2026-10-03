import { sortBy } from 'lodash-es';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useCustomModuleDataValuesMutations } from '../data/ccm';
import { CtColor, notNullish, personDisplay, requireCurrentUser, useCurrentUser } from '../platform';
import { usePersonsQueryAllPages } from './usePersons';
import { usePlugin } from './usePlugin';
import { useTags } from './useTags';
import { useTasks } from './useTasks';

export function useTask(projectId: MaybeRefOrGetter<number>, taskId: MaybeRefOrGetter<number | undefined>) {
    const pId = computed(() => toValue(projectId));
    const tId = computed(() => toValue(taskId));
    const { moduleId } = usePlugin();
    const { updateCustomDataValue, deleteCustomDataValue } = useCustomModuleDataValuesMutations<Task>(moduleId, pId);
    const { tasksMap, findParent, calculateDueDate, getSuperParent, getPercentFullfilled } = useTasks(pId);

    const task = computed(() => (tId.value ? tasksMap.value[tId.value] : undefined));

    const percentFullfilled = computed(() => {
        return getPercentFullfilled(task.value);
    });

    const parent = computed(() => findParent(task.value));

    const superParent = computed(() => findParent(task.value) && getSuperParent(task.value));

    const subTaskIds = computed(() => (Array.isArray(task.value?.subTasks) ? task.value.subTasks : []));
    const assignedPersonIds = computed(() => (Array.isArray(task.value?.assignedTo) ? task.value.assignedTo : []));
    const tagIds = computed(() => (Array.isArray(task.value?.tags) ? task.value.tags : []));

    const hasSubTasks = computed(() => !!subTaskIds.value.map(st => tasksMap.value[st]).filter(st => st).length);

    const filter = computed(() => ({ ids: assignedPersonIds.value }));
    const { data } = usePersonsQueryAllPages(filter, { enabled: () => !!filter.value.ids.length });
    const personMap = computed(() => Object.fromEntries((data.value ?? []).map(p => [p.id, personDisplay(p)])));

    const assignees = computed(() => assignedPersonIds.value.map(id => personMap.value[id]).filter(notNullish));

    const { tags } = useTags(pId);
    const sortedTags = computed(() => {
        const tt = tagIds.value.map(t => tags.value[t]).filter(t => !!t);
        return sortBy(tt, 'name');
    });

    const currentUser = useCurrentUser();
    const toggleTask = async () => {
        requireCurrentUser();
        if (!task.value) return;
        const activity = [...(Array.isArray(task.value.activity) ? task.value.activity : [])];
        activity.push({
            personId: currentUser.id,
            date: new Date().toISOString(),
            type: 'fullfilled',
            value: !task.value.fullfilled,
        });
        const payload = { ...task.value, fullfilled: !task.value.fullfilled, activity };
        await updateCustomDataValue(payload);
    };
    const deleteTask = () => {
        requireCurrentUser();
        return tId.value
            ? deleteCustomDataValue({ id: tId.value, dataCategoryId: pId.value, revision: task.value?.revision })
            : undefined;
    };

    const comments = computed(() =>
        (Array.isArray(task.value?.activity) ? task.value.activity : []).filter(a => a.type === 'comment'),
    );

    const dueDate = computed(() => calculateDueDate(task.value));
    const dueColor = computed(() => {
        if (!dueDate.value) {
            return;
        }
        const dd = new Date(dueDate.value);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        if (dd < now) {
            return CtColor.RED;
        }
        const millisecondsPerDay = 1000 * 60 * 60 * 24;
        const diff = dd.getTime() - now.getTime();

        const nextDay = 1;
        if (diff < millisecondsPerDay * nextDay) {
            return CtColor.GREEN;
        }
        return CtColor.BASIC;
    });

    const toDayMonth = (date: string | Date) => {
        return new Date(date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' });
    };

    return {
        projectId,
        task,
        assignees,
        sortedTags,
        dueColor,
        dueDate,
        comments,
        parent,
        hasSubTasks,
        toggleTask,
        deleteTask,
        toDayMonth,
        superParent,
        calculateDueDate,
        percentFullfilled,
    };
}
