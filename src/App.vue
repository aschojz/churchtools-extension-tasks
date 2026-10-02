<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { usePlugin } from './composables/usePlugin';
import DialogProject from './project/DialogProject.vue';
import { activeProjectDialog, closeProjectDialog, createOrEditProject } from './project/projectHelper';

const { isLoading, isError, refetch } = usePlugin();

const isSmallScreen = computed(() => window.innerWidth < 768);
const route = useRoute();

const showCreate = computed(() => route.name === 'overview');
</script>
<template>
    <UApp
        ><div id="tasks" class="tasks-app">
            <header class="app-header">
                <RouterLink class="brand" :to="{ name: 'overview' }"
                    ><span><i class="fas fa-check"></i></span><strong>Aufgaben</strong></RouterLink
                >
                <div class="app-header-actions">
                    <UButton
                        color="neutral"
                        href="https://github.com/aschojz/churchtools-extension-tasks/issues"
                        icon="i-lucide-bug"
                        :label="isSmallScreen ? '' : 'Feedback'"
                        size="sm"
                        target="_blank"
                        variant="outline"
                    />
                    <UButton
                        v-if="showCreate"
                        icon="i-lucide-plus"
                        label="Neues Projekt"
                        size="sm"
                        @click="createOrEditProject()"
                    />
                </div>
            </header>
            <div v-if="isLoading" class="p-8"><UProgress animation="carousel" /></div>
            <UAlert v-else-if="isError" class="m-6" color="error" title="Das Aufgabenmodul konnte nicht geladen werden."
                ><template #actions
                    ><UButton color="error" label="Erneut versuchen" variant="soft" @click="refetch()" /></template
            ></UAlert>
            <main v-else class="app-content"><RouterView /></main>
        </div>
        <DialogProject
            v-if="activeProjectDialog.open"
            :project="activeProjectDialog.project"
            @close="closeProjectDialog"
        />
    </UApp>
</template>
