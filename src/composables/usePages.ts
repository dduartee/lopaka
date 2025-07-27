import {computed} from 'vue';
import {useSession} from '../core/session';
import type {Page} from '../types';

/**
 * Hook for page management.
 * Provides functionalities to create, edit, navigate, and manage pages.
 */
export function usePages() {
    const session = useSession();

    // Computed states
    const pages = computed(() => session.state.pages);
    const currentPageId = computed(() => session.state.currentPageId);
    const currentPage = computed(() => session.state.pages.find((p) => p.id === session.state.currentPageId));
    const hasMultiplePages = computed(() => session.state.pages.length > 1);

    // Actions
    const createPage = (name?: string): string => {
        return session.createPage(name);
    };

    const switchToPage = (pageId: string): void => {
        session.switchToPage(pageId);
    };

    const deletePage = (pageId: string): void => {
        session.deletePage(pageId);
    };

    const renamePage = (pageId: string, newName: string): void => {
        session.renamePage(pageId, newName);
    };

    const duplicatePage = (pageId: string): string => {
        return session.duplicatePage(pageId);
    };

    const saveCurrentPage = (): void => {
        session.saveCurrentPageLayers();
    };

    // Helper functions
    const getPageIndex = (pageId: string): number => {
        return session.state.pages.findIndex((p) => p.id === pageId);
    };

    const getNextPage = (): Page | null => {
        const currentIndex = getPageIndex(session.state.currentPageId || '');
        if (currentIndex === -1 || currentIndex === session.state.pages.length - 1) {
            return session.state.pages[0] || null;
        }
        return session.state.pages[currentIndex + 1] || null;
    };

    const getPreviousPage = (): Page | null => {
        const currentIndex = getPageIndex(session.state.currentPageId || '');
        if (currentIndex <= 0) {
            return session.state.pages[session.state.pages.length - 1] || null;
        }
        return session.state.pages[currentIndex - 1] || null;
    };

    const switchToNextPage = (): void => {
        const nextPage = getNextPage();
        if (nextPage) {
            switchToPage(nextPage.id);
        }
    };

    const switchToPreviousPage = (): void => {
        const previousPage = getPreviousPage();
        if (previousPage) {
            switchToPage(previousPage.id);
        }
    };

    return {
        // States
        pages,
        currentPageId,
        currentPage,
        hasMultiplePages,

        // Main actions
        createPage,
        switchToPage,
        deletePage,
        renamePage,
        duplicatePage,
        saveCurrentPage,

        // Navigation
        getPageIndex,
        getNextPage,
        getPreviousPage,
        switchToNextPage,
        switchToPreviousPage,
    };
}

/**
 * Hook for page-related keyboard shortcuts.
 */
export function usePageKeyboardShortcuts() {
    const {switchToNextPage, switchToPreviousPage, createPage} = usePages();

    const handleKeyboardShortcut = (event: KeyboardEvent): boolean => {
        // Check if we are in an input/textarea field to avoid interference
        const target = event.target as HTMLElement;
        if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
            return false;
        }

        // Ctrl/Cmd + Tab: Next page
        if ((event.ctrlKey || event.metaKey) && event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            switchToNextPage();
            return true;
        }

        // Ctrl/Cmd + Shift + Tab: Previous page
        if ((event.ctrlKey || event.metaKey) && event.key === 'Tab' && event.shiftKey) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            switchToPreviousPage();
            return true;
        }

        // Ctrl/Cmd + T: New page
        if ((event.ctrlKey || event.metaKey) && event.key === 't') {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            createPage();
            return true;
        }

        return false;
    };

    return {
        handleKeyboardShortcut,
    };
}
