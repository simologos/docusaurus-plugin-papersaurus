/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
export declare type PapersaurusPluginOptions = {
    addDownloadButton: boolean;
    autoBuildPdfs: boolean;
    downloadButtonText: string;
    ignoreDocs: string[];
    stylesheets: string[];
    scripts: string[];
    coverPageHeader: string;
    coverPageFooter: string;
    getPdfCoverPage: (siteConfig: any, pluginConfig: PapersaurusPluginOptions, pageTitle: string, version: string) => string;
    getPdfPageHeader: (siteConfig: any, pluginConfig: PapersaurusPluginOptions, pageTitle: string) => string;
    getPdfPageFooter: (siteConfig: any, pluginConfig: PapersaurusPluginOptions, pageTitle: string) => string;
    author: string;
    footerParser: string;
    keepDebugHtmls: boolean;
    sidebarNames: string[];
    rootDocIds: RootDocIds;
};
export declare type RootDocIds = {
    version: string;
    rootDocId: string;
}[];
export declare type TocInfo = {
    link: string;
    href: string;
    text: string;
};
export declare type VersionInfo = {
    version: string;
    urlAddIn: string;
    sidebarFile: string;
};
export declare type SidebarItemBase = {
    customProps?: object;
};
export declare type SidebarItemDoc = SidebarItemBase & {
    type: 'doc' | 'ref';
    id: string;
    articleHtml?: string;
    stylePath?: string;
    scriptPath?: string;
    parentTitles?: string[];
    pageTitle?: string;
    unVersionedId?: string;
};
export declare type SidebarItemLink = SidebarItemBase & {
    type: 'link';
    href: string;
    label: string;
};
export declare type SidebarItemCategory = SidebarItemBase & {
    type: 'category';
    label: string;
    items: SidebarItem[];
    collapsed: boolean;
};
export declare type SidebarItem = SidebarItemDoc | SidebarItemLink | SidebarItemCategory;
export declare type Sidebar = SidebarItem[];
export declare type SidebarItemType = SidebarItem['type'];
export declare type Sidebars = Record<string, Sidebar>;
//# sourceMappingURL=types.d.ts.map