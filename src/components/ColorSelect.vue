<script setup lang="ts">
import { colorOptions, colorValue, CtColor } from '../platform';

const model = defineModel<CtColor>({ default: CtColor.BASIC });
</script>

<template>
    <USelect v-model="model" :items="colorOptions" label-key="nameTranslated" value-key="id">
        <template #leading>
            <span aria-hidden="true" class="color-swatch" :style="{ backgroundColor: colorValue(model) }" />
        </template>
        <template #item-leading="{ item }">
            <span aria-hidden="true" class="color-swatch" :style="{ backgroundColor: colorValue(item.id) }" />
        </template>
    </USelect>
</template>
