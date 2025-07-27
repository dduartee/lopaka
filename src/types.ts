export interface Project {
    id: number;
    title: string;
    screens?: ProjectScreen[];
    platform: string;
    user_id?: string;
    screen_x: number;
    screen_y: number;
    private?: boolean;
    stars_count?: number;
    is_starred?: boolean;
    // Adding page support to the project
    pages?: Page[];
}

export interface ProjectScreen {
    id: number;
    private?: boolean;
    project_id?: number;
    title?: string;
    user_id?: string;
    img_preview?: string;
    layers?: any[];
}

export interface Page {
    id: string;
    name: string;
    layers: any[];
    createdAt: Date;
    updatedAt: Date;
    thumbnail?: string; // Base64 preview image
}

export interface PageState {
    pages: Page[];
    currentPageId: string | null;
}
