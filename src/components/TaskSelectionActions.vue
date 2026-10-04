<script setup lang="ts">
import { useTaskSelection } from '../composables/useTaskSelection';

const selection = useTaskSelection();
</script>

<template>
    <template v-if="selection">
        <UButton
            color="neutral"
            :icon="selection.enabled.value ? 'i-lucide-x' : 'i-lucide-list-checks'"
            :label="selection.enabled.value ? 'Fertig' : 'Auswählen'"
            :variant="selection.enabled.value ? 'soft' : 'outline'"
            @click="selection.toggleMode"
        />
        <UButton
            v-if="selection.enabled.value"
            color="neutral"
            :icon="selection.allSelected.value ? 'i-lucide-square-minus' : 'i-lucide-square-check-big'"
            :label="selection.allSelected.value ? 'Leeren' : 'Alle'"
            variant="outline"
            @click="selection.selectAll"
        />
        <UDropdownMenu
            v-if="selection.enabled.value && selection.selectedTasks.value.length"
            :items="selection.bulkMenu.value"
        >
            <UButton
                icon="i-lucide-layers-3"
                :label="`Sammelaktion (${selection.selectedTasks.value.length})`"
                :loading="selection.saving.value"
            />
        </UDropdownMenu>
    </template>
</template>
