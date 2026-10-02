<script setup lang="ts">
import Button from './Button.vue';
const props = withDefaults(
    defineProps<{
        title?: string;
        context?: string;
        header?: {
            title?: string;
            icon?: string;
            color?: string;
            actions?: Array<{ icon?: string; label?: string; outlined?: boolean; onClick?: () => void }>;
        };
        button?: false | string | { label?: string; icon?: string; color?: string; outlined?: boolean };
        cancelButton?: string;
    }>(),
    { cancelButton: 'Abbrechen', button: 'Speichern' },
);
const emit = defineEmits<{ close: []; save: [close: () => void] }>();
const close = () => emit('close');
const primary = () =>
    typeof props.button === 'string'
        ? props.button
        : props.button && typeof props.button === 'object'
          ? (props.button.label ?? 'Speichern')
          : 'Speichern';
</script>
<template>
    <Teleport to="body"
        ><div class="ui-modal-backdrop" @mousedown.self="close">
            <section aria-modal="true" class="ui-modal" role="dialog">
                <header>
                    <div>
                        <small v-if="context">{{ context }}</small>
                        <h2><i v-if="header?.icon" :class="header.icon"></i>{{ header?.title ?? title }}</h2>
                    </div>
                    <div class="ui-modal-actions">
                        <Button
                            v-for="action in header?.actions"
                            :key="action.label"
                            v-bind="action"
                            @click="action.onClick"
                        /><button aria-label="Schließen" class="ui-icon-button" @click="close">
                            <i class="fas fa-xmark"></i>
                        </button>
                    </div>
                </header>
                <main><slot /></main>
                <footer>
                    <Button outlined @click="close">{{ cancelButton }}</Button
                    ><Button
                        v-if="button !== false"
                        v-bind="typeof button === 'object' ? button : {}"
                        @click="emit('save', close)"
                        >{{ primary() }}</Button
                    >
                </footer>
            </section>
        </div></Teleport
    >
</template>
