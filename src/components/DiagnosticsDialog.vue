<script setup lang="ts">
import { computed, ref } from 'vue';
import { usePlugin } from '../composables/usePlugin';
import { createDiagnosticSnapshot } from '../domain/diagnostics';
import { dataIssues } from '../domain/storedData';
import { authState } from '../platform';

const emit = defineEmits<{ (event: 'close'): void }>();
const { moduleId } = usePlugin();
const copyState = ref<'idle' | 'success' | 'error'>('idle');
const snapshot = computed(() =>
    createDiagnosticSnapshot({
        version: __APP_VERSION__,
        commit: __BUILD_COMMIT__,
        moduleId: moduleId.value,
        authentication: authState.status,
        dataIssues: dataIssues.value,
    }),
);
const diagnosticText = computed(() => JSON.stringify(snapshot.value, null, 2));
const authenticationLabel = computed(
    () =>
        ({ loading: 'Wird geladen', authenticated: 'Angemeldet', error: 'Fehler' })[
            snapshot.value.runtime.authentication
        ],
);
const copyDiagnostics = async () => {
    copyState.value = 'idle';
    try {
        await navigator.clipboard.writeText(diagnosticText.value);
        copyState.value = 'success';
    } catch {
        copyState.value = 'error';
    }
};
</script>

<template>
    <UModal
        :open="true"
        title="Systemstatus"
        :ui="{
            body: 'tasks-modal-body p-5 sm:p-5',
            content: 'tasks-modal-content max-w-2xl',
            footer: 'tasks-modal-footer',
            header: 'tasks-modal-header',
            overlay: 'tasks-modal-overlay',
        }"
        @update:open="(value: boolean) => !value && emit('close')"
    >
        <template #body>
            <div class="grid gap-4 sm:grid-cols-2">
                <UCard variant="subtle">
                    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt class="text-muted">Version</dt>
                        <dd>{{ snapshot.application.version }}</dd>
                        <dt class="text-muted">Commit</dt>
                        <dd>{{ snapshot.application.commit }}</dd>
                        <dt class="text-muted">Datenschema</dt>
                        <dd>{{ snapshot.application.schemaVersion }}</dd>
                    </dl>
                </UCard>
                <UCard variant="subtle">
                    <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                        <dt class="text-muted">Modul-ID</dt>
                        <dd>{{ snapshot.runtime.moduleId ?? 'Nicht geladen' }}</dd>
                        <dt class="text-muted">Anmeldung</dt>
                        <dd>{{ authenticationLabel }}</dd>
                        <dt class="text-muted">Datenfehler</dt>
                        <dd>{{ snapshot.dataIssues.length }}</dd>
                    </dl>
                </UCard>
            </div>

            <UAlert
                v-if="snapshot.dataIssues.length === 0"
                class="mt-4"
                color="success"
                description="Alle gelesenen Werte entsprechen dem unterstützten Schema."
                icon="i-lucide-circle-check"
                title="Keine Datenprobleme erkannt"
                variant="subtle"
            />
            <div v-else class="mt-4 space-y-2">
                <h3 class="font-semibold">Isolierte Datenprobleme</h3>
                <UAlert
                    v-for="issue in snapshot.dataIssues"
                    :key="`${issue.entity}:${issue.categoryId ?? 0}:${issue.id}`"
                    color="warning"
                    :description="issue.message"
                    :title="`${issue.entity === 'project' ? 'Projekt' : 'Eintrag'} ${issue.id}`"
                    variant="subtle"
                />
            </div>

            <UAlert
                v-if="copyState === 'error'"
                class="mt-4"
                color="error"
                title="Die Diagnose konnte nicht in die Zwischenablage kopiert werden."
            />
        </template>
        <template #footer>
            <div class="flex w-full items-center justify-between gap-3">
                <span v-if="copyState === 'success'" class="text-sm text-green-700" role="status">
                    Diagnose kopiert
                </span>
                <span v-else></span>
                <div class="flex gap-2">
                    <UButton
                        color="neutral"
                        icon="i-lucide-copy"
                        label="Diagnose kopieren"
                        variant="outline"
                        @click="copyDiagnostics"
                    />
                    <UButton label="Schließen" @click="emit('close')" />
                </div>
            </div>
        </template>
    </UModal>
</template>
