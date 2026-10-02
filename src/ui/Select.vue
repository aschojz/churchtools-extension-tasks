<script setup lang="ts">
import { computed, ref } from 'vue';
type Option = { id: string | number; nameTranslated?: string; title?: string; icon?: string };
const props = defineProps<{
    modelValue?: string | number | Array<string | number>;
    label?: string;
    options?: Option[];
    multiple?: boolean;
    horizontal?: boolean;
    note?: string;
    searchFunction?: (query: string) => Promise<Option[]>;
}>();
const emit = defineEmits<{ 'update:modelValue': [value: string | number | Array<string | number>] }>();
const update = (event: Event) => {
    const el = event.target as HTMLSelectElement;
    const raw = props.multiple ? Array.from(el.selectedOptions).map(o => o.value) : el.value;
    const convert = (v: string) => props.options?.find(o => String(o.id) === v)?.id ?? v;
    emit('update:modelValue', Array.isArray(raw) ? raw.map(convert) : convert(raw));
};
const query = ref('');
const results = ref<Option[]>([]);
const known = ref<Option[]>([]);
const selected = computed(() => (Array.isArray(props.modelValue) ? props.modelValue : []));
const nameFor = (id: string | number) =>
    [...(props.options ?? []), ...known.value].find(option => String(option.id) === String(id))?.nameTranslated ?? id;
const search = async () => {
    results.value =
        query.value.trim().length > 1 && props.searchFunction ? await props.searchFunction(query.value.trim()) : [];
};
const add = (option: Option) => {
    if (!selected.value.some(id => String(id) === String(option.id)))
        emit('update:modelValue', [...selected.value, option.id]);
    known.value.push(option);
    query.value = '';
    results.value = [];
};
const remove = (id: string | number) =>
    emit(
        'update:modelValue',
        selected.value.filter(value => String(value) !== String(id)),
    );
</script>
<template>
    <label class="ui-field" :class="{ horizontal }"
        ><span v-if="label">{{ label }}</span
        ><span v-if="searchFunction" class="ui-combobox">
            <span v-for="id in selected" :key="id" class="ui-tag"
                >{{ nameFor(id) }}<button type="button" @click="remove(id)"><i class="fas fa-xmark"></i></button
            ></span>
            <input v-model="query" placeholder="Person suchen …" type="search" @input="search" />
            <span v-if="results.length" class="ui-combobox-results">
                <button v-for="option in results" :key="option.id" type="button" @click="add(option)">
                    {{ option.nameTranslated ?? option.title }}
                </button>
            </span> </span
        ><span v-else
            ><select :multiple="multiple" :value="modelValue" @change="update">
                <option v-if="!multiple" value="">Bitte wählen</option>
                <option v-for="option in options" :key="option.id" :value="option.id">
                    {{ option.nameTranslated ?? option.title ?? option.id }}
                </option></select
            ><small v-if="note">{{ note }}</small></span
        ></label
    >
</template>
