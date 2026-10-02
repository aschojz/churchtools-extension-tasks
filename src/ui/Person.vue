<script setup lang="ts">
defineProps<{ domainObject: { title?: string; imageUrl?: string; icon?: string }; size?: string }>();
</script>
<template>
    <span class="ui-person" :title="domainObject.title"
        ><img v-if="domainObject.imageUrl" alt="" :src="domainObject.imageUrl" /><span v-else>{{
            domainObject.title?.slice(0, 1).toUpperCase() || '?'
        }}</span
        ><slot
    /></span>
</template>
