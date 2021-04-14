/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export type PapersaurusPluginOptions = {
    addDownloadButton: boolean,
    autoBuildPdfs: boolean,
    downloadButtonText: string,
    ignoreDocs: string[],
    stylesheets: string[],
    scripts: string[],
    coverPageHeader: string,
    coverPageFooter: string,
    getPdfCoverPage: (siteConfig: any, pluginConfig: PapersaurusPluginOptions, pageTitle: string, version: string) => string;
    getPdfPageHeader: (siteConfig: any, pluginConfig: PapersaurusPluginOptions, pageTitle: string) => string;
    getPdfPageFooter: (siteConfig: any, pluginConfig: PapersaurusPluginOptions, pageTitle: string) => string;
    author: string,
    footerParser: string,
    keepDebugHtmls: boolean,
    sidebarNames: string[],
    rootDocIds: RootDocIds,
}

export type RootDocIds = {version: string, rootDocId: string}[];

export type TocInfo = {
  link: string,
  href: string,
  text: string
}

export type VersionInfo = {
  version: string,
  urlAddIn: string,
  sidebarFile: string
}

// The Sidebar definitions below are copied from docusaurus-plugin-content-docs,
// but added 3 optional fields to SidebarItemDoc
export type SidebarItemBase = {
    customProps?: object;
  };
  
export type SidebarItemDoc = SidebarItemBase & {
  type: 'doc' | 'ref';
  id: string;
  articleHtml?: string;
  stylePath?: string;
  scriptPath?: string;
  parentTitles?: string[];
  pageTitle?: string;
  unVersionedId?: string;
};

export type SidebarItemLink = SidebarItemBase & {
  type: 'link';
  href: string;
  label: string;
};

export type SidebarItemCategory = SidebarItemBase & {
  type: 'category';
  label: string;
  items: SidebarItem[];
  collapsed: boolean;
};

export type SidebarItem =
  | SidebarItemDoc
  | SidebarItemLink
  | SidebarItemCategory;

export type Sidebar = SidebarItem[];
export type SidebarItemType = SidebarItem['type'];

export type Sidebars = Record<string, Sidebar>;
