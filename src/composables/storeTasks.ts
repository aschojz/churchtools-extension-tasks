import { defineStore } from 'pinia';
import { ref } from 'vue';

export const taskStore = defineStore('tasks', () => {
    const showSubTasks = ref(false),
        showFullfilled = ref(true),
        sortBy = ref('dueDate'),
        search = ref('');

    return {
        showSubTasks,
        showFullfilled,
        sortBy,
        search,
    };
});
