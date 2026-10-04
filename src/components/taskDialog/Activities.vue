<script setup lang="ts">
import type { ActivityEntry } from '../../domain/types';
import { sortBy } from 'lodash-es';
import { computed, ref } from 'vue';
import { reportOperationalError } from '../../application/operationalErrors';
import { usePersonsQueryAllPages } from '../../composables/usePersons';
import { formatActivityChanges } from '../../domain/activity';
import { formatDateTime, notNullish, personDisplay } from '../../platform';

const props = withDefaults(
    defineProps<{
        activities: ActivityEntry[];
        saveComment: (value: string) => Promise<void>;
    }>(),
    { activities: () => [] },
);
const filter = computed(() => ({
    ids: Array.from(new Set(props.activities.map(a => (a.personId > 0 ? a.personId : null)))).filter(notNullish),
}));
const { data } = usePersonsQueryAllPages(filter, { enabled: () => !!filter.value.ids.length });
const personMap = computed(() => Object.fromEntries((data.value ?? []).map(p => [p.id, personDisplay(p)])));

const transformedActivities = computed(() => {
    const array = props.activities.map(e => {
        const person = personMap.value[e.personId];
        return { ...e, dateDisplay: formatDateTime(new Date(e.date)), person };
    });
    return sortBy(array, 'date').reverse();
});

const newComment = ref('');
const commentSaving = ref(false);
const commentError = ref('');
const onComment = async () => {
    const value = newComment.value.trim();
    if (!value || commentSaving.value) return;
    commentSaving.value = true;
    commentError.value = '';
    try {
        await props.saveComment(value);
        newComment.value = '';
    } catch (error) {
        commentError.value = reportOperationalError(
            'Kommentar speichern',
            error,
            'Kommentar konnte nicht gespeichert werden.',
        );
    } finally {
        commentSaving.value = false;
    }
};
const onCancelComment = () => (newComment.value = '');
</script>
<template>
    <div class="flex flex-col gap-4">
        <div>
            <div class="task-view-heading">Aktivitäten</div>
        </div>
        <div class="group flex flex-col gap-2">
            <UTextarea
                v-model="newComment"
                :disabled="commentSaving"
                placeholder="Kommentar hinzufügen"
                :rows="1"
                @keydown.enter.meta.stop="onComment"
                @keydown.escape.stop="onCancelComment"
            />
            <div class="flex gap-2">
                <UButton
                    color="neutral"
                    :disabled="!newComment.trim()"
                    label="Kommentieren"
                    :loading="commentSaving"
                    size="sm"
                    variant="outline"
                    @click="onComment"
                />
            </div>
            <p v-if="commentError" class="text-red-600" role="alert">{{ commentError }}</p>
        </div>
        <div class="flex flex-col gap-3">
            <div v-for="(entry, index) in transformedActivities" :key="index">
                <div v-if="entry.type === 'comment'" class="flex flex-col items-end">
                    <div
                        class="border-basic-divider bg-foreground-secondary flex w-full flex-grow flex-col gap-2 rounded-lg border px-3 py-2"
                    >
                        <div v-if="entry.person" class="text-basic-tertiary flex items-center gap-2">
                            <UAvatar :alt="entry.person.title" size="xs" :src="entry.person.imageUrl" />
                            <span class="text-basic-secondary font-bold">
                                {{ entry.person?.title }}
                            </span>
                            <span>·</span>
                            <div>{{ entry.dateDisplay }}</div>
                        </div>
                        <div v-else class="text-basic-tertiary flex items-center gap-2">
                            <UAvatar icon="i-lucide-user" size="xs" />
                            <span class="text-basic-secondary font-bold"> Unbekannter Benutzer </span>
                            <span>·</span>
                            <div>{{ entry.dateDisplay }}</div>
                        </div>
                        <div class="whitespace-pre">
                            {{ entry.value }}
                        </div>
                    </div>
                </div>
                <div
                    v-else-if="entry.type === 'fullfilled'"
                    class="text-basic-secondary flex items-baseline gap-1 text-xs"
                >
                    <span class="font-bold">
                        {{ entry.person?.title ?? 'Unbekannter Benutzer' }}
                    </span>
                    <span>{{ entry.value ? 'erledigte die Aufgabe' : 'öffnete die Aufgabe wieder' }}</span>
                    <span class="text-basic-tertiary"> am {{ entry.dateDisplay }} </span>
                </div>
                <div v-else-if="entry.type === 'create'" class="text-basic-secondary flex items-baseline gap-1 text-xs">
                    <span class="font-bold">
                        {{ entry.person?.title ?? 'Unbekannter Benutzer' }}
                    </span>
                    <span> erstellte die Aufgabe </span>
                    <span class="text-basic-tertiary"> am {{ entry.dateDisplay }} </span>
                </div>
                <div v-else class="text-basic-tertiary flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span class="font-bold">
                        {{ entry.person?.title ?? 'Unbekannter Benutzer' }}
                    </span>
                    <span>änderte {{ formatActivityChanges(entry.value) }}</span>
                    <span class="text-basic-tertiary">
                        {{ entry.dateDisplay }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
