<script setup lang="ts">
import { Grid, GridHeader, InfoMessageContainer, LoadingMessage } from '@churchtools/styleguide';
import { CtColor, useBodyScrollbarWidth, useToasts } from '@churchtools/utils';
import { computed } from 'vue';
import type { ComponentProps } from 'vue-component-type-helpers';
import { useRoute } from 'vue-router';
import { usePlugin } from './composables/usePlugin';
import { createOrEditProject } from './project/projectHelper';
import { ICONS, txx } from './utils/utils';

useBodyScrollbarWidth();

const { isLoading, isError, refetch } = usePlugin();

const isSmallScreen = computed(() => window.innerWidth < 768);
const route = useRoute();

const actions = computed(() => {
    const actions: NonNullable<ComponentProps<typeof GridHeader>['actions']> = [
        [
            {
                color: CtColor.VIOLET,
                icon: 'fas fa-bug',
                href: 'https://github.com/aschojz/churchtools-extension-tasks/issues',
                label: isSmallScreen.value ? '' : txx('Fehler melden'),
                outlined: true,
                size: 'S',
                target: '_blank',
            },
        ],
    ];

    if (route.name === 'overview') {
        actions.push([
            {
                color: CtColor.GREEN,
                icon: 'fas fa-plus',
                label: isSmallScreen.value ? '' : txx('Neues Projekt'),
                size: 'S',
                onClick: () => createOrEditProject(),
            },
        ]);
    }
    return actions;
});

const { toasts, removeToast } = useToasts();
const removeInfoMessage = (infoMessage: (typeof toasts.value)[0]) => removeToast(infoMessage.id);
</script>
<template>
    <div id="tasks" class="flex grow flex-col" style="--menu-height: 0px">
        <LoadingMessage v-if="isLoading" />
        <div v-else-if="isError" class="p-6" role="alert">
            Das Aufgabenmodul konnte nicht geladen werden. <button @click="refetch()">Erneut versuchen</button>
        </div>
        <Grid v-else min-height="56px" storage-key="ext-tasks" style="--sidebar-left: 0px">
            <template #header>
                <GridHeader :actions="actions" :icon="ICONS.MAIN" :title="txx('Aufgabenverwaltung')" />
            </template>
            <div class="col-span-2 flex grow">
                <RouterView />
            </div>
        </Grid>
    </div>
    <div id="modal-container"></div>
    <InfoMessageContainer :messages="toasts" @close-info-message="removeInfoMessage" />
</template>
<style>
@layer oldcss {
    #tasks {
        --color-link: var(--color-accent-bright);
        a {
            color: inherit;
            text-decoration: none;
        }
        a:hover {
            text-decoration: none;
        }
    }
}
</style>
