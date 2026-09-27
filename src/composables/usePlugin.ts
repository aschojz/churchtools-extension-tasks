import { computed } from 'vue';
import { useCustomModuleQuery } from '../data/ccm';

export function usePlugin() {
    const { data, isLoading, isError, error, refetch } = useCustomModuleQuery(import.meta.env.VITE_KEY || 'tasks');
    const moduleId = computed(() => data.value?.id);

    return {
        moduleId,
        isLoading,
        isError,
        error,
        refetch,
    };
}
