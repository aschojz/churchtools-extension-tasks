<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePlugin } from './composables/usePlugin';
import DialogProject from './project/DialogProject.vue';
import { activeProjectDialog, closeProjectDialog, createOrEditProject } from './project/projectHelper';
import Button from './ui/Button.vue';
import LoadingMessage from './ui/Loading.vue';
import { removeToast, toasts } from './ui/state';

const { isLoading, isError, refetch } = usePlugin();

const isSmallScreen = computed(() => window.innerWidth < 768);
const route = useRoute();

const showCreate = computed(() => route.name === 'overview');
</script>
<template>
    <div id="tasks" class="tasks-app">
        <header class="app-header">
            <RouterLink class="brand" :to="{ name: 'overview' }"
                ><span><i class="fas fa-check"></i></span><strong>Aufgaben</strong></RouterLink
            >
            <div class="app-header-actions">
                <Button
                    href="https://github.com/aschojz/churchtools-extension-tasks/issues"
                    icon="fas fa-bug"
                    :label="isSmallScreen ? '' : 'Feedback'"
                    outlined
                    size="S"
                    target="_blank"
                />
                <Button
                    v-if="showCreate"
                    icon="fas fa-plus"
                    label="Neues Projekt"
                    size="S"
                    @click="createOrEditProject()"
                />
            </div>
        </header>
        <LoadingMessage v-if="isLoading" />
        <div v-else-if="isError" class="ui-error" role="alert">
            Das Aufgabenmodul konnte nicht geladen werden. <button @click="refetch()">Erneut versuchen</button>
        </div>
        <main v-else class="app-content"><RouterView /></main>
    </div>
    <DialogProject v-if="activeProjectDialog.open" :project="activeProjectDialog.project" @close="closeProjectDialog" />
    <div class="toast-stack">
        <button v-for="toast in toasts" :key="toast.id" :class="toast.tone" @click="removeToast(toast.id)">
            <i :class="toast.tone === 'success' ? 'fas fa-check-circle' : 'fas fa-circle-exclamation'"></i
            >{{ toast.message }}
        </button>
    </div>
</template>
