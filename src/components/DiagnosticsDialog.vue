<script setup lang="ts">
import { computed, ref } from 'vue';
import { operationalErrors } from '../application/operationalErrors';
import { usePlugin } from '../composables/usePlugin';
import { migrateStoredCandidates } from '../data/ccm';
import { createDiagnosticSnapshot } from '../domain/diagnostics';
import { dataIssues, migrationCandidates } from '../domain/storedData';
import { authState, requireCurrentUser } from '../platform';

const emit = defineEmits<{ (event: 'close'): void }>();
const { moduleId } = usePlugin();
const copyState = ref<'idle' | 'success' | 'error'>('idle');
const migrating = ref(false);
const migrationMessage = ref('');
const snapshot = computed(() =>
    createDiagnosticSnapshot({
        version: __APP_VERSION__,
        commit: __BUILD_COMMIT__,
        moduleId: moduleId.value,
        authentication: authState.status,
        dataIssues: dataIssues.value,
        operationalErrors: operationalErrors.value,
        migrationCandidates: migrationCandidates.value,
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
const migrateCandidates = async () => {
    if (!moduleId.value || migrating.value || !migrationCandidates.value.length) return;
    requireCurrentUser();
    if (!window.confirm(`${migrationCandidates.value.length} erkannte Altwerte jetzt aktualisieren?`)) return;
    migrating.value = true;
    migrationMessage.value = '';
    try {
        const count = await migrateStoredCandidates(moduleId.value, [...migrationCandidates.value]);
        migrationMessage.value = `${count} Altwerte wurden auf das aktuelle Schema migriert.`;
    } catch (error) {
        migrationMessage.value = error instanceof Error ? error.message : 'Die Migration ist fehlgeschlagen.';
    } finally {
        migrating.value = false;
    }
};
</script>

<template>
    <UModal
        :open="true"
        title="Systemstatus"
        :ui="{
            body: 'diagnostics-modal-body',
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
                        <dt class="text-muted">Letzte Fehler</dt>
                        <dd>{{ snapshot.operationalErrors.length }}</dd>
                        <dt class="text-muted">Alte Datenstände</dt>
                        <dd>{{ snapshot.migrationCandidates.length }}</dd>
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

            <div v-if="snapshot.operationalErrors.length" class="mt-4 space-y-2">
                <h3 class="font-semibold">Letzte technische Fehler</h3>
                <UAlert
                    v-for="error in snapshot.operationalErrors"
                    :key="error.id"
                    color="error"
                    :description="`${new Date(error.occurredAt).toLocaleString('de-DE')} · ${error.context} · ${error.kind}`"
                    :title="error.id"
                    variant="subtle"
                />
            </div>

            <UAlert
                v-if="snapshot.migrationCandidates.length"
                class="mt-4"
                color="info"
                :description="`${snapshot.migrationCandidates.length} Datensätze werden beim nächsten regulären Speichern auf Schema ${snapshot.application.schemaVersion} aktualisiert. Die Diagnose enthält nur technische IDs und Versionsstände.`"
                icon="i-lucide-database-backup"
                title="Migrationsvorschau"
                variant="subtle"
            />
            <UAlert v-if="migrationMessage" class="mt-4" :title="migrationMessage" variant="subtle" />

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
                        v-if="snapshot.migrationCandidates.length"
                        color="neutral"
                        icon="i-lucide-database-backup"
                        label="Altwerte migrieren"
                        :loading="migrating"
                        variant="outline"
                        @click="migrateCandidates"
                    />
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
