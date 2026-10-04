<script setup lang="ts">
import type { TransformedTask } from '../../domain/types';
import { computed, ref } from 'vue';
import { useTasks } from '../../composables/useTasks';
import { taskStartDate } from '../../domain/tasks';
import ViewWrapper from './ViewWrapper.vue';

const props = defineProps<{ projectId: string }>();
const projectId = computed(() => Number(props.projectId));
const { tasks, showTask, calculateDueDate } = useTasks(projectId);
const planningDate = (task: TransformedTask) => calculateDueDate(task) ?? taskStartDate(task);
const month = ref(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
const monthLabel = computed(() => month.value.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }));
const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const todayKey = computed(() => dayKey(new Date()));
const days = computed(() => {
    const first = new Date(month.value);
    const mondayOffset = (first.getDay() + 6) % 7;
    const start = new Date(first);
    start.setDate(first.getDate() - mondayOffset);
    return Array.from({ length: 42 }, (_, index) => {
        const date = new Date(start);
        date.setDate(start.getDate() + index);
        return { date, key: dayKey(date), currentMonth: date.getMonth() === month.value.getMonth() };
    });
});
const tasksByDay = computed(() => {
    const result: Record<string, TransformedTask[]> = {};
    for (const task of tasks.value.filter(showTask)) {
        const date = planningDate(task);
        if (!date) continue;
        (result[dayKey(date)] ??= []).push(task);
    }
    for (const entries of Object.values(result)) entries.sort((a, b) => a.name.localeCompare(b.name, 'de'));
    return result;
});
const changeMonth = (offset: number) => {
    month.value = new Date(month.value.getFullYear(), month.value.getMonth() + offset, 1);
};
const goToday = () => {
    const today = new Date();
    month.value = new Date(today.getFullYear(), today.getMonth(), 1);
};
const weekdays = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
</script>

<template>
    <ViewWrapper :project-id="projectId">
        <template #extra-actions>
            <UButton
                aria-label="Vorheriger Monat"
                color="neutral"
                icon="i-lucide-chevron-left"
                square
                variant="outline"
                @click="changeMonth(-1)"
            />
            <UButton color="neutral" label="Heute" variant="outline" @click="goToday" />
            <UButton
                aria-label="Nächster Monat"
                color="neutral"
                icon="i-lucide-chevron-right"
                square
                variant="outline"
                @click="changeMonth(1)"
            />
        </template>
        <section :aria-label="`Kalender ${monthLabel}`" class="flex min-w-[760px] flex-1 flex-col gap-3">
            <h2 class="text-xl font-semibold capitalize">{{ monthLabel }}</h2>
            <div class="calendar-grid grid grid-cols-7 gap-px overflow-hidden rounded-xl border">
                <div
                    v-for="weekday in weekdays"
                    :key="weekday"
                    class="calendar-weekday px-2 py-2 text-center text-xs font-semibold"
                >
                    {{ weekday }}
                </div>
                <div
                    v-for="day in days"
                    :key="day.key"
                    class="calendar-day min-h-28 p-2"
                    :class="{ 'is-outside': !day.currentMonth }"
                >
                    <time
                        class="mb-2 grid size-6 place-items-center rounded-full text-xs font-semibold"
                        :class="{ 'is-today': day.key === todayKey }"
                        :datetime="day.key"
                    >
                        {{ day.date.getDate() }}
                    </time>
                    <div class="flex flex-col gap-1">
                        <RouterLink
                            v-for="task in tasksByDay[day.key] ?? []"
                            :key="task.id"
                            class="truncate rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-900 hover:bg-orange-100 focus-visible:outline-2"
                            :title="task.name"
                            :to="{ name: 'project-calendar', params: { projectId, taskId: task.id } }"
                        >
                            {{ task.name }}
                        </RouterLink>
                    </div>
                </div>
            </div>
        </section>
    </ViewWrapper>
</template>
<style scoped>
.calendar-grid {
    border-color: var(--line);
    background: var(--line);
}
.calendar-weekday {
    color: var(--muted);
    background: var(--ui-bg-muted);
}
.calendar-day {
    color: var(--ink);
    background: var(--surface);
}
.calendar-day.is-outside {
    color: #9a9690;
    background: #faf9f7;
}
.calendar-day time.is-today {
    color: #fff;
    background: var(--ink);
}
</style>
