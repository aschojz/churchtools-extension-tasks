import type { CtColor } from '../platform';

export type TaskPriority = 'none' | 'low' | 'medium' | 'high' | 'urgent';

type PersistenceMetadata = {
    schemaVersion?: number;
    revision?: number;
    updatedAt?: string;
};

export interface Project extends PersistenceMetadata {
    name: string;
    description?: string;
    color?: CtColor;
    icon?: string;
    id: number;
    shorty: string;
    securityLevelId: number;
    customModuleId: number;
}

export interface TaskList extends PersistenceMetadata {
    type: 'list';
    name: string;
    sortKey: number;
    isCollapsed?: boolean;
    showSubTasks?: boolean;
    showCompleted?: boolean;
    isDefault?: boolean;
}

export type ActivityEntry =
    | { personId: number; date: string; type: 'create' }
    | { personId: number; date: string; type: 'fullfilled'; value: boolean }
    | { personId: number; date: string; type: 'comment'; value: string }
    | { personId: number; date: string; type: 'update'; value?: unknown };

export interface Task extends PersistenceMetadata {
    type: 'task';
    fullfilled: boolean;
    priority: TaskPriority;
    name: string;
    description?: string;
    url?: string;
    dueDate?: string;
    dueDateRelative?: number;
    activity?: ActivityEntry[];
    sortKey: number;
    list?: number;
    tags?: number[];
    assignedTo?: number[];
    subTasks?: number[];
    deletedAt?: string;
    deletedBy?: number;
}

export interface Tag extends PersistenceMetadata {
    type: 'tag';
    name: string;
    color: CtColor;
    sortKey: number;
}

export type TransformedTag = Tag & { id: number; dataCategoryId: number };
export type TransformedTask = Task & { id: number; dataCategoryId: number };
export type TransformedList = TaskList & {
    id: number;
    dataCategoryId: number;
    items?: TransformedTask[];
};
export type BoardColumn = TransformedList | { type: 'tag' | 'parent'; id: number; name: string; isCollapsed?: false };
