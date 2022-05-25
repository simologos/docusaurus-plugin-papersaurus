/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  PapersaurusPluginOptions,
  TocInfo,
  VersionInfo
} from './types';

import {
  SidebarItemCategory,
  SidebarItemDoc,
  UnprocessedSidebarItem,
  UnprocessedSidebarItemCategory,
  UnprocessedSidebars,
} from './pluginContentDocsTypes';

import puppeteer = require('puppeteer');
import toc = require('html-toc');
const pdfMerge = require('easy-pdf-merge');
const pdfParse = require('pdf-parse');
const join = require('path').join;
import express = require('express');
import { AddressInfo } from 'net';
import * as fs from 'fs-extra';
import { loadSidebars } from './sidebars';
const GithubSlugger = require('github-slugger');
const he = require('he');

let slugger = new GithubSlugger();

let versions: string[] = [];

const pluginLogPrefix = '[papersaurus] ';

export async function generatePdfFiles(
  pluginOptions: PapersaurusPluginOptions,
  siteConfig: any) {

  console.log(`${pluginLogPrefix}Execute generatePdfFiles...`);

  const baseUrl = siteConfig.baseUrl; // e.g. '/mywebsitebase/'

  const CWD = process.cwd();

  // Check if docusaurus build directory exists
  const docusaurusBuildDir = join(CWD, 'build');
  if (!fs.existsSync(docusaurusBuildDir) ||
    !fs.existsSync(join(docusaurusBuildDir, 'index.html')) ||
    !fs.existsSync(join(docusaurusBuildDir, '404.html'))) {
    throw new Error(
      `${pluginLogPrefix}Could not find a valid docusaurus build directory at "${docusaurusBuildDir}". ` +
      'Did you run "docusaurus build" before?'
    );
  }

  // Check pdf build directory and clean if requested
  const pdfBuildDir = join(docusaurusBuildDir, 'pdfs');
  fs.ensureDirSync(pdfBuildDir);
  console.log(`${pluginLogPrefix}Clean pdf build folder '${pdfBuildDir}'`);
  fs.emptyDirSync(pdfBuildDir);

  // Read versions.json and prepare version infos
  try {
    versions = require(`${CWD}/versions.json`);
  } catch (e) {
    console.log(`${pluginLogPrefix}No versions.js file found. Continue without versions.`)
  }
  let versionInfos: VersionInfo[] = [];
  if (versions.length == 0) {
    versionInfos.push({ version: 'next', urlAddIn: '', sidebarFile: `${CWD}/sidebars.js` });
  }
  else {
    if (fs.existsSync(join(docusaurusBuildDir, 'docs', 'next'))) {
      versionInfos.push({ version: 'next', urlAddIn: 'next', sidebarFile: `${CWD}/sidebars.js` });
    }
    for (let index = 0; index < versions.length; index++) {
      const version = versions[index];
      versionInfos.push({
        version: version,
        urlAddIn: index === 0 ? '' : version,
        sidebarFile: `${CWD}/versioned_sidebars/version-${version}-sidebars.json`
      }
      );
    }
  }

  // Start local webserver and host files in docusaurus build folder
  const app = express();
  const httpServer = await app.listen();
  const address = httpServer.address();
  if (!address || !isAddressInfo(address)) {
    httpServer.close();
    throw new Error(`${pluginLogPrefix}Something went wrong spinning up the express webserver.`);
  }
  app.use(baseUrl, express.static(docusaurusBuildDir));
  const siteAddress = `http://127.0.0.1:${address.port}${siteConfig.baseUrl}`;
  console.log(`${pluginLogPrefix}Server started at ${siteAddress}`);

  // Start a puppeteer browser
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'] });

  // Loop through all found versions
  for (const versionInfo of versionInfos) {
    console.log(`${pluginLogPrefix}Processing version '${versionInfo.version}'`);
    const sidebarOptions = { sidebarCollapsed: true, sidebarCollapsible: true }
    const sideBars: UnprocessedSidebars = loadSidebars(versionInfo.sidebarFile, sidebarOptions);
    console.log(`${pluginLogPrefix}Sidebar file '${versionInfo.sidebarFile}' loaded.`);

    slugger = new GithubSlugger(); // forget slugs from other versions   

    // Create build folder for that version
    const versionBuildDir = join(pdfBuildDir, versionInfo.urlAddIn);
    fs.ensureDirSync(versionBuildDir);

    // Build URL to root document of that version
    let rootDocUrl = `${siteAddress}docs/`
    if (versionInfo.urlAddIn) {
      rootDocUrl = `${rootDocUrl}${versionInfo.urlAddIn}/`;
    }

    // Get root document id of that version (the markdown with slug set to '/')
    let rootDocId = '';
    for (const entry of pluginOptions.rootDocIds) {
      if (entry.version === versionInfo.version) {
        rootDocId = entry.rootDocId;
        break;
      }
      if (entry.version === 'default') {
        rootDocId = entry.rootDocId;
      }
    }

    // Loop through all configured sidebar names
    for (const sidebarName of pluginOptions.sidebarNames) {

      console.log(`${pluginLogPrefix}Start processing sidebar named '${sidebarName}' in version '${versionInfo.version}'`);

      let versionedSidebarName = sidebarName;
      if (versionInfo.version !== 'next') {
        versionedSidebarName = `version-${versionInfo.version}/${sidebarName}`;
      }
      let sidebar = sideBars[versionedSidebarName];
      if (!sidebar) {
        // sidebar name in version-x.x-sidebars.json file not always has a version prefix, try again without version 
        sidebar = sideBars[sidebarName];
      }

      if (sidebar) {

        // Create a fake category with root of sidebar
        const rootCategory: UnprocessedSidebarItemCategory = {
          type: 'category',
          label: siteConfig.projectName,
          items: sidebar,
          collapsed: true,
          collapsible: true
        };

        // Browse through all documents of this sidebar
        let htmlDir = join(docusaurusBuildDir, 'docs', versionInfo.urlAddIn);
        pickHtmlArticlesRecursive(rootCategory, [], versionInfo.version, rootDocUrl, rootDocId, htmlDir, siteConfig);

        // Create all PDF files for this sidebar
        await createPdfFilesRecursive(rootCategory, [], versionInfo.version, pluginOptions, siteConfig, versionBuildDir, browser, siteAddress);
      }
      else {
        console.log(`${pluginLogPrefix}Sidebar '${sidebarName}' doesn't exist in version '${versionInfo.version}', continue without it...`);
      }

    }

  }

  browser.close();
  httpServer.close();

  console.log(`${pluginLogPrefix}generatePdfFiles finished!`);
}

function pickHtmlArticlesRecursive(sideBarItem: UnprocessedSidebarItem,
  parentTitles: string[],
  version: string,
  rootDocUrl: string,
  rootDocId: string,
  htmlDir: string,
  siteConfig: any) {
  switch (sideBarItem.type) {
    case 'category': {
      const sideBarItemCategory = sideBarItem as UnprocessedSidebarItemCategory;
      const newParentTitles = [...parentTitles];
      newParentTitles.push(sideBarItemCategory.label);
      for (const categorySubItem of sideBarItemCategory.items) {
        pickHtmlArticlesRecursive(categorySubItem, newParentTitles, version, rootDocUrl, rootDocId, htmlDir, siteConfig);
      }
      break;
    }
    case 'doc': {
      const sideBarItemDoc = sideBarItem as SidebarItemDoc;
      readHtmlForItem(sideBarItemDoc, parentTitles, rootDocUrl, rootDocId, htmlDir, version, siteConfig);
      break;
    }
    default:
      break;
  }
  return;
}

async function createPdfFilesRecursive(sideBarItem: UnprocessedSidebarItem,
  parentTitles: string[],
  documentVersion: string,
  pluginOptions: PapersaurusPluginOptions,
  siteConfig: any,
  buildDir: string,
  browser: puppeteer.Browser,
  siteAddress: string): Promise<SidebarItemDoc[]> {

  let articles: SidebarItemDoc[] = [];
  let documentTitle = '';
  let pdfFilename = '';
  switch (sideBarItem.type) {
    case 'category': {
      const sideBarItemCategory = sideBarItem as SidebarItemCategory;
      const newParentTitles = [...parentTitles];
      newParentTitles.push(sideBarItemCategory.label);
      for (const categorySubItem of sideBarItemCategory.items) {
        const subDocs = await createPdfFilesRecursive(categorySubItem,
          newParentTitles,
          documentVersion,
          pluginOptions,
          siteConfig,
          buildDir,
          browser,
          siteAddress);
        articles.push(...subDocs);
      }
      documentTitle = sideBarItemCategory.label;
      break;
    }
    case 'doc': {
      const sideBarItemDoc = sideBarItem as SidebarItemDoc;
      articles.push(sideBarItemDoc);
      documentTitle = sideBarItemDoc.pageTitle || '';
      break;
    }
    default:
      break;
  }

  pdfFilename = he.decode(documentTitle);
  if (parentTitles.length > 1) {
    pdfFilename = parentTitles.slice(1).join('-') + '-' + pdfFilename;
  }
  pdfFilename = slugger.slug(pdfFilename);

  if (parentTitles.length > 1) {
    documentTitle = parentTitles.slice(1).join(' / ') + ' / ' + documentTitle;
  }

  if (articles.length > 0) {
    await createPdfFromArticles(documentTitle,
      documentVersion,
      pdfFilename,
      articles,
      pluginOptions,
      siteConfig,
      buildDir,
      browser,
      siteAddress);
  }

  return articles;
}

function readHtmlForItem(
  item: SidebarItemDoc,
  parentTitles: string[],
  rootDocUrl: string,
  rootDocId: string,
  htmlDir: string,
  version: string,
  siteConfig: any) {

  item.unVersionedId = item.id;
  if (item.unVersionedId.indexOf('/') >= 0) {
    item.unVersionedId = item.unVersionedId.substr(item.unVersionedId.indexOf('/') + 1);
  }

  let htmlFilePath = htmlDir;
  if (item.unVersionedId !== rootDocId) {
    htmlFilePath = join(htmlFilePath, item.unVersionedId);
  }
  htmlFilePath = join(htmlFilePath, 'index.html');

  let stylePath = '';
  let scriptPath = '';
  let html = '';

  console.log(`${pluginLogPrefix}Reading file ${htmlFilePath}`);

  let htmlFileContent: string = fs.readFileSync(htmlFilePath, { encoding: 'utf8' });

  const origin = (new URL(rootDocUrl)).origin;
  stylePath = getStylesheetPathFromHTML(htmlFileContent, origin);

  try {
    scriptPath = getScriptPathFromHTML(htmlFileContent, origin);
  }
  catch {
  }

  const articleMatch = htmlFileContent.match(/<article>.*<\/article>/s);
  if (articleMatch) {
    html = articleMatch[0];
    const markDownDivPos = html.indexOf('<div class=\"theme-doc-markdown markdown\">');
    const footerPos = html.indexOf('<footer ');
    if (markDownDivPos > 0 && footerPos > markDownDivPos) {
      html = html.substring(markDownDivPos, footerPos);
    }
  }
  html = html.replace(/loading="lazy"/g, 'loading="eager"');

  // Search for title in h1 tag
  let titleMatch = html.match(/<h1 class=".*">.*<\/h1>/s);
  if (!titleMatch) {
    titleMatch = html.match(/<h1>.*<\/h1>/s);
  }
  if (titleMatch) {
    const h1Tag = titleMatch[0];
    // Save found title in item
    item.pageTitle = h1Tag.substring(h1Tag.indexOf('>') + 1, h1Tag.indexOf('</h1>'));

    // Add parent titles in front of existing title in h1 tag
    let newTitle = item.pageTitle;
    if (parentTitles.length > 1) {
      newTitle = parentTitles.slice(1).join(' / ') + ' / ' + item.pageTitle;
    }
    const newH1Tag = h1Tag.substring(0, h1Tag.indexOf('>') + 1) + newTitle + h1Tag.substring(h1Tag.indexOf('</h1>'));
    html = html.replace(h1Tag, newH1Tag);
  }

  html = getHtmlWithAbsoluteLinks(html, version, siteConfig);

  item.articleHtml = html;
  item.scriptPath = scriptPath;
  item.stylePath = stylePath;
  item.parentTitles = parentTitles;

  return;
}

async function createPdfFromArticles(
  documentTitle: string,
  documentVersion: string,
  pdfName: string,
  articleList: SidebarItemDoc[],
  pluginOptions: PapersaurusPluginOptions,
  siteConfig: any,
  buildDir: string,
  browser: puppeteer.Browser,
  siteAddress: string
): Promise<void> {

  console.log(`${pluginLogPrefix}Creating PDF ${buildDir}\\${pdfName}.pdf...`);

  const pdfFooterRegex = new RegExp(pluginOptions.footerParser);

  const titlePdfFile = join(buildDir, `${pdfName}.title.pdf`);
  const contentRawPdfFile = join(buildDir, `${pdfName}.content.raw.pdf`);
  const contentHtmlFile = join(buildDir, `${pdfName}.content.html`);
  const contentPdfFile = join(buildDir, `${pdfName}.content.pdf`);
  const finalPdfFile = join(buildDir, `${pdfName}.pdf`);

  const coverPage = await browser.newPage();
  await coverPage.setContent(pluginOptions.getPdfCoverPage(siteConfig, pluginOptions, documentTitle, documentVersion));
  await coverPage.pdf({
    format: 'a4',
    path: titlePdfFile,
    headerTemplate: pluginOptions.coverPageHeader,
    footerTemplate: pluginOptions.coverPageFooter,
    displayHeaderFooter: true,
    printBackground: true,
    margin: {
      top: '10cm',
      right: '0',
      bottom: '3cm',
      left: '0'
    }
  });
  await coverPage.close();

  const page = await browser.newPage();

  let stylePath = articleList[0].stylePath;
  let scriptPath = articleList[0].scriptPath;

  let fullHtml = '';
  for (const article of articleList) {
    if (articleList.length > 1 && pluginOptions.ignoreDocs.includes(article.unVersionedId || '-IdIsEmpty-')) {
      // Don't add ignored articles to PDF's with multiple articles (section pdf's, complete document pdf)
      continue;
    }
    fullHtml += article.articleHtml;
  }

  // Remove header tags (around h1)
  fullHtml = fullHtml.replace(/<header>/g, '');
  fullHtml = fullHtml.replace(/<header\/>/g, '');

  // Hide hashlinks (replace visible hash with space)
  fullHtml = fullHtml.replace(/">#<\/a>/g, `"> </a>`);

  // Add table of contents
  fullHtml = toc('<div id="toc"></div>' + fullHtml, {
    anchorTemplate: function (id: string) {
      return `<a class="toc-target" href="${id}" id="${id}"></a>`;
    },
    selectors: 'h1,h2,h3',
    parentLink: false,
    header: '<h1 class="ignoreCounter">Contents</h1>',
    minLength: 0,
    addId: false //=default
  });

  let htmlToc = fullHtml.substring(14, fullHtml.indexOf('</div>'));

  htmlToc = htmlToc.replace(/class="nav sidenav"/g, 'class="toc-headings"');
  htmlToc = htmlToc.replace(/class="nav"/g, 'class="toc-headings"');
  htmlToc = htmlToc.replace(/[\r\n]+/g, '');

  const htmlArticles = fullHtml.substring(fullHtml.indexOf('</div>') + 6);
  const tocLinks = htmlToc.match(/<a href="#[^<>]+">[^<>]+<\/a>/g);
  let tocLinksInfos = tocLinks?.map((link) => {
    const entry: TocInfo = {
      link: link,
      href: link.substring(link.indexOf('href="') + 6, link.indexOf('">')),
      text: link.substring(link.indexOf('">') + 2, link.indexOf('</a>')),
    }
    return entry;
  });
  tocLinksInfos = tocLinksInfos || [];

  for (const tocLinkInfo of tocLinksInfos) {
    htmlToc = htmlToc.replace(tocLinkInfo.link,
      `<a href="${tocLinkInfo.href}"><span>${tocLinkInfo.text}</span><span class="dotLeader"></span><span class="pageNumber">_</span></a>`);
  }

  let htmlStyles = '';
  if (pluginOptions.stylesheets && pluginOptions.stylesheets.length > 0) {
    for (const stylesheet of pluginOptions.stylesheets) {
      htmlStyles = `${htmlStyles}<link rel="stylesheet" href="${stylesheet}">`;
    }
  }
  else {
    if (stylePath) {
      htmlStyles = `${htmlStyles}<link rel="stylesheet" href="${stylePath}">`;
    }
  }

  let htmlScripts = '';
  if (pluginOptions.scripts && pluginOptions.scripts.length > 0) {
    for (const script of pluginOptions.scripts) {
      htmlScripts = `${htmlScripts}<script src="${script}"></script>`;
    }
  }
  else {
    if (scriptPath) {
      htmlScripts = `${htmlScripts}<script src="${scriptPath}"></script>`;
    }
  }

  let htmlContent = `
  <!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="generator" content="Papersaurus">
      ${htmlStyles}
      ${htmlScripts}
    </head>
    <body>
      ${htmlToc}${htmlArticles}
    </body>
  </html>`;

  await generateContentPdf(contentRawPdfFile);

  const dataBuffer = fs.readFileSync(contentRawPdfFile);
  const parsedData = await pdfParse(dataBuffer);

  htmlContent = getPageWithFixedToc(pdfFooterRegex, tocLinksInfos, parsedData.text, htmlContent);

  await generateContentPdf(contentPdfFile);

  htmlContent = await page.content();
  fs.writeFileSync(contentHtmlFile, htmlContent);

  await page.close();

  await mergeMultiplePDF([titlePdfFile, contentPdfFile], finalPdfFile);

  fs.unlinkSync(titlePdfFile);
  fs.unlinkSync(contentRawPdfFile);
  fs.unlinkSync(contentPdfFile);
  if (!pluginOptions.keepDebugHtmls) {
    fs.unlinkSync(contentHtmlFile);
  }

  async function generateContentPdf(targetFile: string) {
    await page.goto(siteAddress);
    await page.setContent(htmlContent);
    await page.pdf({
      path: targetFile,
      format: 'a4',
      headerTemplate: pluginOptions.getPdfPageHeader(siteConfig, pluginOptions, documentTitle),
      footerTemplate: pluginOptions.getPdfPageFooter(siteConfig, pluginOptions, documentVersion),
      displayHeaderFooter: true,
      printBackground: true,
      scale: 1,
      margin: {
        top: '5cm',
        right: '2cm',
        bottom: '2.3cm',
        left: '2cm'
      }
    });

  }
}

const mergeMultiplePDF = (pdfFiles: string[], name: string) => {
  return new Promise((resolve, reject) => {
    pdfMerge(pdfFiles, name, function (err: any) {

      if (err) {
        console.log(err);
        reject(err)
      }

      resolve('')
    });
  });
};

const escapeHeaderRegex = (header: string) => {
  return header
    // escape all regex reserved characters
    .replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
    // replace white-spaces to allow line breaks
    .replace(/\s/g, '(\\s|\\s\\n)');
}

const pdfHeaderRegex = [
  (h1: string) => new RegExp(`^\\d+\\s{2}${escapeHeaderRegex(h1)}(\\s|\\s\\n)?$`, 'gm'),
  (h2: string) => new RegExp(`^\\d+\\.\\d+\\s{2}${escapeHeaderRegex(h2)}(\\s|\\s\\n)?$`, 'gm'),
  (h3: string) => new RegExp(`^\\d+\\.\\d+.\\d+\\s{2}${escapeHeaderRegex(h3)}(\\s|\\s\\n)?$`, 'gm')
];

const getHtmlWithAbsoluteLinks = (html: string, version: string, siteConfig: any) => {

  if (versions && versions.length > 0 && version === versions[0]) {
    version = '';
  }

  if (version) {
    version = `${version}/`;
  }

  return html.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g, function (matched, _p1, p2) {
    if (p2.indexOf('http') === 0) {
      // ignore already external links
      return matched;
    }

    if (p2.indexOf('#') === 0) {
      // ignore anchor links. because we don't know in which file
      // they are. Plus they will allways work (but can have multiple targets when merging)
      return matched;
    }

    if (p2.indexOf('.') === 0) {
      // this is some kind of a manually created link.
      return matched;
    }

    if (p2.indexOf(siteConfig.baseUrl) === 0) {
      return matched.replace(p2, `${siteConfig.url}${p2}`);
    }

    return matched.replace(p2, `${siteConfig.url}${siteConfig.baseUrl}docs/${version}${p2}`);
  });
};

const decodeHtml = (str: string) => {
  const regex = /&amp;|&lt;|&gt;|&quot;|&apos;|&#x200B;/g;

  const htmlString = str.replace(regex, (match: string) => {
    if (match === '&amp;') {
      return '&';
    } else if (match === '&lt;') {
      return ''
    } else if (match === '&gt;') {
      return '>';
    } else if (match === '&quot;') {
      return '"';
    } else if (match === '&apos;') {
      return '\'';
    } else if (match === '&#x200B;') {
      return '';
    }

    return '';
  });

  return htmlString;
}

const getPageWithFixedToc = (footerRegEx: RegExp, tocList: TocInfo[], pdfContent: string, htmlContent: string) => {

  const pdfPages = pdfContent.split(footerRegEx);
  if (!pdfPages.length) {
    return htmlContent;
  }

  let pageIndex = 0;
  tocList.forEach(e => {

    const regex1 = pdfHeaderRegex[0](decodeHtml(e.text));
    const regex2 = pdfHeaderRegex[1](decodeHtml(e.text));
    const regex3 = pdfHeaderRegex[2](decodeHtml(e.text));

    for (; pageIndex < pdfPages.length; pageIndex++) {
      let page = pdfPages[pageIndex];
      if (regex1.test(page) || regex2.test(page) || regex3.test(page)) {
        htmlContent = htmlContent.replace(
          '<span class="pageNumber">_</span>',
          `<span class="pageNumber">${pageIndex}</span>`
        );
        break;
      }
    }
  });

  return htmlContent;
}

const getURL = (origin: string, filePath: string) => {
  return origin + '/' + filePath.substring(filePath.startsWith('/') ? 1 : 0);
};

const getStylesheetPathFromHTML = (html: string, origin: string) => {
  const regExp = /(?:|<link[^<>]*){1}href="([^<>]*styles[^<>]*?\.css){1}"/g;
  let filePath = '';
  try {
    filePath = getFirstCapturingGroup(regExp, html);
  } catch {
    throw new Error(
      "The href attribute of the 'styles*.css' file could not be found!"
    );
  }
  return getURL(origin, filePath);
};

const getScriptPathFromHTML = (html: string, origin: string) => {
  const regExp = /(?:|<script[^<>]*){1}src="([^<>]*styles[^<>]*?\.js){1}"/g;
  let filePath = '';
  try {
    filePath = getFirstCapturingGroup(regExp, html);
  } catch {
    throw new Error(
      "The src attribute of the 'styles*.js' file could not be found!"
    );
  }
  return getURL(origin, filePath);
};

const getFirstCapturingGroup = (regExp: RegExp, text: string) => {
  const match = regExp.exec(text);
  if (match && match[1]) {
    return match[1];
  } else {
    throw new ReferenceError('No capture group found in the provided text.');
  }
};

function isObject(x: unknown): x is Record<PropertyKey, unknown> {
  return x !== null && typeof x === 'object';
}

function hasOwnProperty<
  X extends Record<PropertyKey, unknown>,
  Y extends PropertyKey
>(obj: X, prop: Y): obj is X & Record<Y, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}

const isAddressInfo = (arg: unknown): arg is AddressInfo => {
  return (
    isObject(arg) &&
    hasOwnProperty(arg, 'address') &&
    typeof arg.address == 'string' &&
    hasOwnProperty(arg, 'family') &&
    typeof arg.family == 'string' &&
    hasOwnProperty(arg, 'port') &&
    typeof arg.port == 'number'
  );
};
