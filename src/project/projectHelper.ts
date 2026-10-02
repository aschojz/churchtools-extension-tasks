import { reactive } from 'vue';

export const activeProjectDialog = reactive<{ open: boolean; project?: Project }>({ open: false });
export function createOrEditProject(project: Project | undefined = undefined) {
    activeProjectDialog.project = project;
    activeProjectDialog.open = true;
}
export function closeProjectDialog() {
    activeProjectDialog.open = false;
    activeProjectDialog.project = undefined;
}
