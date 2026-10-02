<script setup lang="ts">
export type MenuItem = {
    id: string;
    nameTranslated: string;
    icon?: string | { icon: string; class?: string };
    disabled?: boolean;
    callback?: () => unknown;
};
export type DropdownSection = { title?: string; items: MenuItem[] };
defineProps<{ menuItems: DropdownSection[]; buttonBind?: object }>();
const run = (item: MenuItem, event: Event) => {
    event.stopPropagation();
    if (!item.disabled) item.callback?.();
    (event.currentTarget as HTMLElement).closest('details')?.removeAttribute('open');
};
</script>
<template>
    <details class="ui-menu" @click.stop>
        <summary v-bind="buttonBind"><slot /></summary>
        <div class="ui-menu-popover">
            <template v-for="(section, index) in menuItems" :key="index"
                ><p v-if="section.title">{{ section.title }}</p>
                <button
                    v-for="item in section.items"
                    :key="item.id"
                    :disabled="item.disabled"
                    type="button"
                    @click="run(item, $event)"
                >
                    <i
                        v-if="item.icon"
                        :class="typeof item.icon === 'string' ? item.icon : [item.icon.icon, item.icon.class]"
                    ></i
                    >{{ item.nameTranslated }}
                </button></template
            >
        </div>
    </details>
</template>
