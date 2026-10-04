// Transitional global aliases keep existing Vue templates concise while the
// canonical domain model lives in an importable module.
type Project = import('../src/domain/types').Project;
type TaskList = import('../src/domain/types').TaskList;
type Task = import('../src/domain/types').Task;
type Tag = import('../src/domain/types').Tag;
type TaskPriority = import('../src/domain/types').TaskPriority;
type TaskRecurrence = import('../src/domain/types').TaskRecurrence;
type ActivityEntry = import('../src/domain/types').ActivityEntry;
type TransformedTag = import('../src/domain/types').TransformedTag;
type TransformedTask = import('../src/domain/types').TransformedTask;
type TransformedList = import('../src/domain/types').TransformedList;
type BoardColumn = import('../src/domain/types').BoardColumn;
