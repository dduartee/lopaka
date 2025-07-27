<template>
    <div class="page-manager border-b border-base-300 bg-base-100">
        <div class="page-tabs flex items-center p-2 gap-1 overflow-x-auto">
            <div
                v-for="page in pages"
                :key="page.id"
                :class="['page-tab', {active: page.id === currentPageId}]"
                @click="switchToPage(page.id)"
                @contextmenu.prevent="showContextMenu($event, page)"
            >
                <span class="page-name">{{ page.name }}</span>
                <button
                    class="close-btn"
                    @click.stop="handleDeletePage(page.id)"
                    v-if="hasMultiplePages"
                >
                    ×
                </button>
            </div>
            <button
                class="add-page-btn"
                @click="handleCreateNewPage"
                title="Add new page"
            >
                +
            </button>
        </div>

        <!-- Context Menu -->
        <div
            v-if="contextMenu.show"
            :style="{top: contextMenu.y + 'px', left: contextMenu.x + 'px'}"
            class="context-menu fixed bg-base-100 border border-base-300 rounded shadow-lg z-50"
        >
            <div
                @click="handleRenamePage(contextMenu.page)"
                class="context-item"
            >
                Rename
            </div>
            <div
                @click="handleDuplicatePage(contextMenu.page)"
                class="context-item"
            >
                Duplicate
            </div>
            <div
                @click="handleDeletePage(contextMenu.page.id)"
                v-if="hasMultiplePages"
                class="context-item text-error"
            >
                Delete
            </div>
        </div>

        <!-- Page Thumbnails (optional - can be toggled) -->
        <div
            class="page-thumbnails flex gap-2 p-2 overflow-x-auto"
            v-if="showThumbnails"
        >
            <div
                v-for="page in pages"
                :key="page.id"
                class="thumbnail cursor-pointer text-center"
                @click="switchToPage(page.id)"
            >
                <div class="thumbnail-image w-16 h-8 bg-base-200 border rounded overflow-hidden">
                    <img
                        v-if="page.thumbnail"
                        :src="page.thumbnail"
                        :alt="page.name"
                        class="w-full h-full object-contain"
                    />
                </div>
                <div class="thumbnail-name text-xs mt-1 truncate w-16">{{ page.name }}</div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import {ref, computed, onMounted, onUnmounted} from 'vue';
import {usePages, usePageKeyboardShortcuts} from '../../composables/usePages';
import type {Page} from '../../types';

const {pages, currentPageId, createPage, switchToPage, deletePage, renamePage, duplicatePage, hasMultiplePages} =
    usePages();

const {handleKeyboardShortcut} = usePageKeyboardShortcuts();

const showThumbnails = ref(false);
const contextMenu = ref({
    show: false,
    x: 0,
    y: 0,
    page: null as Page | null,
});

const handleCreateNewPage = () => {
    const name = prompt('New page name:', 'New Page');
    if (name && name.trim()) {
        createPage(name.trim());
    }
};

const handleDeletePage = (pageId: string) => {
    if (confirm('Are you sure you want to delete this page?')) {
        deletePage(pageId);
    }
    contextMenu.value.show = false;
};

const handleRenamePage = (page: Page) => {
    const newName = prompt('New name:', page.name);
    if (newName && newName.trim() && newName !== page.name) {
        renamePage(page.id, newName.trim());
    }
    contextMenu.value.show = false;
};

const handleDuplicatePage = (page: Page) => {
    duplicatePage(page.id);
    contextMenu.value.show = false;
};

const showContextMenu = (event: MouseEvent, page: Page) => {
    contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        page,
    };
};

const handleClickOutside = () => {
    contextMenu.value.show = false;
};

const handleKeyDown = (event: KeyboardEvent) => {
    handleKeyboardShortcut(event);
};

onMounted(() => {
    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
    document.removeEventListener('click', handleClickOutside);
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.page-tabs {
    min-height: 40px;
}

.page-tab {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.25rem 0.75rem;
    background-color: hsl(var(--b2));
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
    min-width: 0;
    max-width: 150px;
}

.page-tab.active {
    background-color: hsl(var(--p));
    color: hsl(var(--pc));
}

.page-tab:hover:not(.active) {
    background-color: hsl(var(--b3));
}

.page-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    font-size: 0.875rem;
}

.close-btn {
    width: 1rem;
    height: 1rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.25rem;
    font-size: 0.75rem;
    opacity: 0.7;
    border: none;
    background: none;
    color: inherit;
}

.close-btn:hover {
    opacity: 1;
    background-color: rgba(0, 0, 0, 0.2);
}

.add-page-btn {
    padding: 0.25rem 0.75rem;
    background-color: hsl(var(--a));
    color: hsl(var(--ac));
    border-radius: 0.5rem;
    cursor: pointer;
    transition: background-color 0.15s ease;
    font-size: 0.875rem;
    font-weight: bold;
    border: none;
}

.add-page-btn:hover {
    background-color: hsl(var(--af));
}

.context-menu {
    min-width: 120px;
}

.context-item {
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    font-size: 0.875rem;
}

.context-item:hover {
    background-color: hsl(var(--b2));
}

.thumbnail {
    min-width: 64px;
}

.thumbnail:hover .thumbnail-image {
    border-color: hsl(var(--p));
}

/* Custom scrollbar for tabs */
.page-tabs::-webkit-scrollbar {
    height: 4px;
}

.page-tabs::-webkit-scrollbar-track {
    background: transparent;
}

.page-tabs::-webkit-scrollbar-thumb {
    background-color: hsl(var(--b3));
    border-radius: 0.25rem;
}

.page-thumbnails::-webkit-scrollbar {
    height: 4px;
}

.page-thumbnails::-webkit-scrollbar-track {
    background: transparent;
}

.page-thumbnails::-webkit-scrollbar-thumb {
    background-color: hsl(var(--b3));
    border-radius: 0.25rem;
}
</style>
