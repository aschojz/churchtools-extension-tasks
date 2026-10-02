interface Project {
    name: string;
    description?: string;
    color?: import('../src/platform').CtColor;
    icon?: FAIcon;
    id: number;
    shorty: string;
    securityLevelId: number;
    customModuleId: number;
}
interface TaskList {
    type: 'list';
    name: string;
    sortKey: number;
    isCollapsed?: boolean;
    showSubTasks?: boolean;
    showCompleted?: boolean;
    isDefault?: boolean;
}
interface Task {
    type: 'task';
    fullfilled: boolean;
    name: string;
    description?: string;
    url?: string;
    dueDate?: string;
    dueDateRelative?: number;
    allDay?: boolean;
    activity?: ActivityEntry[];
    sortKey: number;
    list?: number;
    tags?: number[];
    assignedTo?: number[];
    subTasks?: number[];
    comments?: ActivityEntry[];
}
interface Tag {
    type: 'tag';
    name: string;
    color: import('../src/platform').CtColor;
    sortKey: number;
}
interface ActivityEntry {
    personId: number;
    date: string;
    type: 'create' | 'fullfilled' | 'comment' | 'update';
    value?: any;
}

type TransformedTag = Tag & { id: number; dataCategoryId: number };
type TransformedTask = Task & { id: number; dataCategoryId: number };
type TransformedList = TaskList & {
    id: number;
    dataCategoryId: number;
    items?: TransformedTask[];
};

type BoardColumn = TransformedList | { type: 'tag' | 'parent'; id: number; name: string; isCollapsed?: false };
