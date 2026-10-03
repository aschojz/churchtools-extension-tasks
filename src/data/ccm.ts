import { churchtoolsClient } from '@churchtools/churchtools-client';
import { useMutation, useQuery } from '@tanstack/vue-query';
import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import {
    clearDataIssue,
    clearDataIssuesForCategory,
    clearProjectDataIssues,
    parseStoredProject,
    parseStoredValue,
    recordDataIssue,
    revisionOf,
    withCreateMetadata,
    withUpdateMetadata,
} from '../domain/storedData';
import { queryClient } from './queryClient';

type Id = MaybeRefOrGetter<number | undefined>;
type Category = {
    id: number;
    customModuleId: number;
    name: string;
    shorty: string;
    description?: string;
    data?: string;
};
type Value = { id: number; dataCategoryId: number; value?: string };
const validId = (id: number | undefined): id is number => Number.isSafeInteger(id) && Number(id) > 0;
const requireId = (id: Id) => {
    const value = toValue(id);
    if (!validId(value)) throw new Error('Ungültiges Projekt oder Modul. Bitte erneut laden.');
    return value;
};
const categoryPath = (moduleId: Id) => `/custommodules/${requireId(moduleId)}/customdatacategories`;
const valuePath = (moduleId: Id, categoryId: Id) =>
    `${categoryPath(moduleId)}/${requireId(categoryId)}/customdatavalues`;
export const ccmKeys = {
    module: (key: string) => ['tasks-ccm', key] as const,
    categories: (id: number | undefined) => ['tasks-ccm', id, 'categories'] as const,
    values: (id: number | undefined, category: number | undefined) => ['tasks-ccm', id, 'values', category] as const,
};

export class DataConflictError extends Error {
    constructor(public readonly entityId: number) {
        super(
            'Dieser Eintrag wurde zwischenzeitlich geändert. Die aktuelle Version wurde neu geladen. Bitte prüfe deine Änderungen und versuche es erneut.',
        );
        this.name = 'DataConflictError';
    }
}

export function decodeData<T extends object>(json: string | undefined, metadata: object): T {
    const data: unknown = json ? JSON.parse(json) : {};
    if (!data || typeof data !== 'object' || Array.isArray(data))
        throw new Error('Ungültige gespeicherte Projektdaten.');
    return { ...data, ...metadata } as T;
}

export function useCustomModuleQuery(key: string) {
    return useQuery(
        {
            throwOnError: false,
            queryKey: ccmKeys.module(key),
            queryFn: () => churchtoolsClient.get<{ id: number }>(`/custommodules/${encodeURIComponent(key)}`),
            enabled: !!key,
        },
        queryClient,
    );
}

export function useCustomModuleDataCategoriesQuery<T extends object>(moduleId: Id) {
    return useQuery(
        {
            throwOnError: false,
            queryKey: computed(() => ccmKeys.categories(toValue(moduleId))),
            enabled: () => validId(toValue(moduleId)),
            queryFn: async () => {
                const rows = await churchtoolsClient.get<Category[]>(categoryPath(moduleId));
                clearProjectDataIssues();
                return rows.flatMap(({ data, ...metadata }) => {
                    clearDataIssue('project', metadata.id);
                    try {
                        const decoded = decodeData<T & Category>(data, metadata);
                        return [
                            (metadata.shorty.startsWith('project') ? parseStoredProject(decoded) : decoded) as T &
                                Category,
                        ];
                    } catch (error) {
                        recordDataIssue({
                            entity: 'project',
                            id: metadata.id,
                            message: error instanceof Error ? error.message : 'Projekt konnte nicht gelesen werden.',
                        });
                        return [];
                    }
                });
            },
        },
        queryClient,
    );
}

export function useCustomModuleDataValuesQuery<T extends object>(moduleId: Id, categoryId: Id) {
    return useQuery(
        {
            throwOnError: false,
            queryKey: computed(() => ccmKeys.values(toValue(moduleId), toValue(categoryId))),
            enabled: () => validId(toValue(moduleId)) && validId(toValue(categoryId)),
            queryFn: () => fetchCustomModuleDataValues<T>(requireId(moduleId), requireId(categoryId)),
        },
        queryClient,
    );
}

export async function fetchCustomModuleDataValues<T extends object>(moduleId: number, categoryId: number) {
    const rows = await churchtoolsClient.get<Value[]>(valuePath(moduleId, categoryId));
    clearDataIssuesForCategory(categoryId);
    return rows.flatMap(({ value, ...metadata }) => {
        clearDataIssue('value', metadata.id);
        try {
            const decoded = decodeData<T & Omit<Value, 'value'>>(value, metadata);
            return [parseStoredValue(decoded) as unknown as T & Omit<Value, 'value'>];
        } catch (error) {
            recordDataIssue({
                entity: 'value',
                id: metadata.id,
                categoryId,
                message: error instanceof Error ? error.message : 'Eintrag konnte nicht gelesen werden.',
            });
            return [];
        }
    });
}

async function fetchCurrentValue(moduleId: number, categoryId: number, id: number) {
    const rows = await churchtoolsClient.get<Value[]>(valuePath(moduleId, categoryId));
    const row = rows.find(value => value.id === id);
    if (!row) throw new DataConflictError(id);
    return decodeData<object>(row.value, { id: row.id, dataCategoryId: row.dataCategoryId });
}

async function assertCurrentRevision(moduleId: number, categoryId: number, id: number, expectedRevision: number) {
    const current = await fetchCurrentValue(moduleId, categoryId, id);
    if (revisionOf(current) !== expectedRevision) {
        await queryClient.invalidateQueries({ queryKey: ccmKeys.values(moduleId, categoryId) });
        throw new DataConflictError(id);
    }
}

export function useCustomModuleDataValuesMutations<T extends object>(moduleId: Id, categoryId: Id) {
    // Capture IDs before the asynchronous request; route changes must not invalidate the new project instead.
    const mutation = useMutation(
        {
            mutationFn: async ({
                kind,
                payload,
            }: {
                kind: 'create' | 'update' | 'delete';
                payload: T & { id?: number; dataCategoryId?: number };
            }) => {
                const module = requireId(moduleId);
                const category = requireId(payload.dataCategoryId ?? categoryId);
                const path = valuePath(module, category);
                const { id, dataCategoryId, ...unversionedValue } = payload;
                const expectedRevision = revisionOf(unversionedValue);
                void dataCategoryId;
                if (kind !== 'create') requireId(id);
                if (kind !== 'create') await assertCurrentRevision(module, category, id!, expectedRevision);
                const value =
                    kind === 'create'
                        ? withCreateMetadata(unversionedValue)
                        : withUpdateMetadata(unversionedValue, expectedRevision);
                const result =
                    kind === 'delete'
                        ? await churchtoolsClient.deleteApi(`${path}/${id}`)
                        : kind === 'create'
                          ? await churchtoolsClient.post<Value>(path, {
                                dataCategoryId: category,
                                value: JSON.stringify(value),
                            })
                          : await churchtoolsClient.put<Value>(`${path}/${id}`, {
                                id,
                                dataCategoryId: category,
                                value: JSON.stringify(value),
                            });
                await queryClient.invalidateQueries({ queryKey: ccmKeys.values(module, category) });
                return result as Value;
            },
        },
        queryClient,
    );
    return {
        createCustomDataValue: (payload: T & { dataCategoryId: number }) =>
            mutation.mutateAsync({ kind: 'create', payload }),
        updateCustomDataValue: (payload: T & { id: number; dataCategoryId: number }) =>
            mutation.mutateAsync({ kind: 'update', payload }),
        deleteCustomDataValue: (payload: { id: number; dataCategoryId: number; revision?: number }) =>
            mutation.mutateAsync({ kind: 'delete', payload: payload as T & typeof payload }),
    };
}

export function useCustomModuleDataCategoryMutations<T extends object>(moduleId: Id) {
    const save = async (payload: T & { id?: number; name: string; shorty?: string; description?: string }) => {
        const module = requireId(moduleId);
        const { id, name, shorty, description, ...data } = payload;
        if (!name.trim()) throw new Error('Bitte einen Projektnamen eingeben.');
        const expectedRevision = revisionOf(data);
        if (id) {
            const categories = await churchtoolsClient.get<Category[]>(categoryPath(module));
            const current = categories.find(category => category.id === id);
            if (!current || revisionOf(decodeData<object>(current.data, { id: current.id })) !== expectedRevision) {
                await queryClient.invalidateQueries({ queryKey: ccmKeys.categories(module) });
                throw new DataConflictError(id);
            }
        }
        const persistedData = id ? withUpdateMetadata(data, expectedRevision) : withCreateMetadata(data);
        const body = {
            name: name.trim(),
            shorty,
            description: description ?? '',
            customModuleId: module,
            data: JSON.stringify(persistedData),
        };
        const path = categoryPath(module);
        const result = id
            ? await churchtoolsClient.put<Category>(`${path}/${id}`, body)
            : await churchtoolsClient.post<Category>(path, body);
        await queryClient.invalidateQueries({ queryKey: ccmKeys.categories(module) });
        return result;
    };
    const remove = async (id: number) => {
        const module = requireId(moduleId);
        requireId(id);
        await churchtoolsClient.deleteApi(`${categoryPath(module)}/${id}?dry_run=false`);
        await queryClient.invalidateQueries({ queryKey: ccmKeys.categories(module) });
        queryClient.removeQueries({ queryKey: ccmKeys.values(module, id) });
    };
    return { createDataCategory: save, updateDataCategory: save, deleteDataCategory: remove };
}
