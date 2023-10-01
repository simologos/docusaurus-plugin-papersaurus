/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export interface PluginOptions {
  addDownloadButton?: boolean;
  autoBuildPdfs?: boolean;
  downloadButtonText?: string;
  ignoreDocs?: string[];
  stylesheets?: string[];
  alwaysIncludeSiteStyles?: boolean;
  scripts?: string[];
  coverPageHeader?: string;
  coverPageFooter?: string;
  getPdfCoverPage?: PageFunction;
  getPdfPageHeader?: PageFunction;
  getPdfPageFooter?: PageFunction;
  margins?: Margins;
  coverMargins?: Margins;
  author?: string;
  footerParser?: RegExp;
  keepDebugHtmls?: boolean;
  sidebarNames?: string[];
  versions?: string[];
  subfolders?: string[];
  productTitles?: string[];
  useExtraPaths?: UsePath[];
  ignoreCssSelectors?: string[];
  jQueryUrl?: string;
}

export type PapersaurusPluginOptions = {
  addDownloadButton: boolean,
  autoBuildPdfs: boolean,
  downloadButtonText: string,
  ignoreDocs: string[],
  stylesheets: string[],
  alwaysIncludeSiteStyles: boolean,
  scripts: string[],
  coverPageHeader: string,
  coverPageFooter: string,
  getPdfCoverPage: PageFunction,
  getPdfPageHeader: PageFunction,
  getPdfPageFooter: PageFunction,
  margins: Margins,
  coverMargins: Margins,
  author: string,
  footerParser: RegExp,
  keepDebugHtmls: boolean,
  sidebarNames: string[],
  versions: string[],
  subfolders: string[],
  productTitles: string[],
  useExtraPaths: UsePath[],
  ignoreCssSelectors: string[],
  jQueryUrl: string,
}

export type PageFunction = (
  siteConfig: any,
  pluginConfig: PapersaurusPluginOptions,
  pageTitle: string,
  version: string
) => string;

export type UsePath = {
  serverPath: string,
  localPath: string
};

export type TocInfo = {
  link: string,
  href: string,
  text: string
}

export type Margins = {
  top: string,
  right: string,
  bottom: string,
  left: string
}