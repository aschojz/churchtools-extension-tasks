<script setup lang="ts">
import { sortBy } from 'lodash-es';
import { computed, ref } from 'vue';
import { usePersonsQueryAllPages } from '../../composables/usePersons';
import { formatDateTime, notNullish, personDisplay, useCurrentUser } from '../../platform';
import { Button, DomainObject, Textarea } from '../../ui';
import { txx } from '../../utils/utils';

const props = withDefaults(
    defineProps<{
        activities: ActivityEntry[];
    }>(),
    { activities: () => [] },
);
const emit = defineEmits<{
    (event: 'comment', payload: ActivityEntry[]): void;
}>();

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

const currentUser = useCurrentUser();
const newComment = ref('');
const onComment = () => {
    const activity = [...props.activities];
    activity.push({
        personId: currentUser.id,
        date: new Date().toISOString(),
        type: 'comment',
        value: newComment.value,
    });
    emit('comment', activity);
    newComment.value = '';
};
const onCancelComment = () => (newComment.value = '');
const formatActivity = (value: unknown) => {
    if (!value || typeof value !== 'object') return String(value ?? '');
    return Object.entries(value)
        .map(([key, change]) => {
            if (change && typeof change === 'object' && 'from' in change && 'to' in change) {
                return `${key}: ${String(change.from ?? '')} → ${String(change.to ?? '')}`;
            }
            return `${key}: ${String(change)}`;
        })
        .join(', ');
};
</script>
<template>
    <div class="flex flex-col gap-4">
        <div>
            <div class="text-lg font-bold">Aktivitäten</div>
        </div>
        <div class="group flex flex-col gap-2">
            <Textarea
                v-model="newComment"
                placeholder="Kommentar hinzufügen"
                :rows="1"
                @keydown.enter.meta.stop="onComment"
                @keydown.escape.stop="onCancelComment"
            />
            <div class="flex gap-2">
                <Button :disabled="!newComment" :outlined="true" size="S" @click="onComment"> Kommentieren </Button>
            </div>
        </div>
        <div class="flex flex-col gap-3">
            <div v-for="(entry, index) in transformedActivities" :key="index">
                <div v-if="entry.type === 'comment'" class="flex flex-col items-end">
                    <div
                        class="border-basic-divider bg-foreground-secondary flex w-full flex-grow flex-col gap-2 rounded-lg border px-3 py-2"
                    >
                        <div v-if="entry.person" class="text-basic-tertiary flex items-center gap-2">
                            <DomainObject :domain-object="entry.person" size="XS" />
                            <span class="text-basic-secondary font-bold">
                                {{ entry.person?.title }}
                            </span>
                            <span>·</span>
                            <div>{{ entry.dateDisplay }}</div>
                        </div>
                        <div v-else class="text-basic-tertiary flex items-center gap-2">
                            <DomainObject :domain-object="{ icon: 'fas fa-user' }" size="XS" />
                            <span class="text-basic-secondary font-bold">
                                {{ txx('Unbekannter Benutzer') }}
                            </span>
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
                        {{ entry.person?.title ?? txx('Unbekannter Benutzer') }}
                    </span>
                    <span>
                        {{ entry.value ? 'checked' : 'unchecked' }}
                        die Aufgabe
                    </span>
                    <span class="text-basic-tertiary"> am {{ entry.dateDisplay }} </span>
                </div>
                <div v-else-if="entry.type === 'create'" class="text-basic-secondary flex items-baseline gap-1 text-xs">
                    <span class="font-bold">
                        {{ entry.person?.title ?? txx('Unbekannter Benutzer') }}
                    </span>
                    <span> erstellte die Aufgabe </span>
                    <span class="text-basic-tertiary"> am {{ entry.dateDisplay }} </span>
                </div>
                <div v-else class="text-basic-tertiary flex flex-wrap items-baseline gap-x-2 text-xs">
                    <span class="font-bold">
                        {{ entry.person?.title ?? txx('Unbekannter Benutzer') }}
                    </span>
                    <span>{{ entry.type }}: {{ formatActivity(entry.value) }}</span>
                    <span class="text-basic-tertiary">
                        {{ entry.dateDisplay }}
                    </span>
                </div>
            </div>
        </div>
    </div>
</template>
