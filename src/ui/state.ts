import { ref } from 'vue';

export type Toast = { id: number; message: string; tone: 'success' | 'error' };
export const toasts = ref<Toast[]>([]);
let toastId = 0;
export function showToast(message: string, tone: Toast['tone'] = 'success') {
    const id = ++toastId;
    toasts.value.push({ id, message, tone });
    window.setTimeout(() => removeToast(id), 4000);
}
export const removeToast = (id: number) => (toasts.value = toasts.value.filter(toast => toast.id !== id));
export const confirmDelete = async (message: string) => window.confirm(message);
