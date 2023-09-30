/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {LoadContext, Plugin, DocusaurusConfig} from '@docusaurus/types';
import {generatePdfFiles} from './generate';
import {PapersaurusPluginOptions} from './types';
import importFresh from 'import-fresh';
import * as fs from "fs";

function loadConfig(configPath: string): DocusaurusConfig {
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file "${configPath}" not found`);
  }
  const loadedConfig = importFresh(configPath) as DocusaurusConfig;
  return loadedConfig
}

export default function (
  _context: LoadContext,
  pluginOptions: PapersaurusPluginOptions,
): Plugin<void> {

  return {

    name: 'docusaurus-plugin-papersaurus',

    injectHtmlTags() {

      if (!pluginOptions.addDownloadButton) {
        return {};
      }

      const CWD = process.cwd();
      const siteConfig = loadConfig(`${CWD}/docusaurus.config.js`);

      return {
        headTags: [`
        <script>

          const slugFunction = function(unformattedString) {
            var whitespace = /\\s/g;
            var specials = /[\\u2000-\\u206F\\u2E00-\\u2E7F\\\'!"#$%&()*+,./:;<=>?@[\\]^\`{|}~’]/g;
            if (typeof unformattedString !== 'string') {
              return ''
            }
            unformattedString = unformattedString.toLowerCase();
          
            return unformattedString.trim()
              .replace(specials, '')
              .replace(whitespace, '-');
          }

          const getActiveDocumentId = function() {
            const findDocId = /docs-doc-id-(.*)?$/;
            var match = $("html").attr("class").match(findDocId);
            return match[1];
          };

          const getPdfPath = function() {
            var pdfPath = document.location.pathname;
            if (pdfPath.endsWith('/')) {
              pdfPath = pdfPath.substr(0, pdfPath.length-1);
            }
            var id = getActiveDocumentId();

            while (!pdfPath.endsWith(id) && id != "" && id.includes("/")) {
              // If this is a category link we try removing the ids one by one.
              var lastSlashPos = id.lastIndexOf('/');
              id = id.substr(lastSlashPos+1, id.length);
            }
            if (pdfPath.endsWith(id)) {
              pdfPath = pdfPath.substr(0, pdfPath.length-id.length-1);
            }
            pdfPath = pdfPath + '/';
            if (pdfPath.includes('/docs/')) {
              pdfPath = pdfPath.replace('/docs/', '/pdfs/');
            }
            else {
              var baseUrl = '${siteConfig.baseUrl}';
              pdfPath = baseUrl + 'pdfs/' + pdfPath.substr(baseUrl.length, pdfPath.length);
            }
            return pdfPath;
          }

          const getHrefId = function(href) {
            if (href.endsWith('/')) {
              href = href.substr(0, href.length-1);
            }
            var lastSlashPos = href.lastIndexOf('/');
            if (lastSlashPos > -1) {
              return href.substr(lastSlashPos, href.length);
            }
            return href;
          }

          const getDownloadItems = function() {
            var activePageSidebarLink;
            $("a").filter(".menu__link").filter(function() {
              if ($(this).attr('href') === document.location.pathname ||
                  ($(this).attr('href') + '/') === document.location.pathname) {
                activePageSidebarLink = $(this);
              }
            });
            if (!activePageSidebarLink) {
              return [];
            }

            var downloadItems = [];
            downloadItems.push({
              title: 'Download this chapter (' + activePageSidebarLink.text() +')',
              slug: slugFunction(getHrefId(getActiveDocumentId())),
              type: 'page'
            });

            var parentMenuItem = activePageSidebarLink.parent().parent().parent();
            while (parentMenuItem && parentMenuItem.length > 0) {
              if (parentMenuItem.hasClass("menu__list-item")) {
                var activePageSidebarLinkQuery = parentMenuItem.find(".menu__link");
                if (activePageSidebarLinkQuery.length > 0) {
                  activePageSidebarLink = activePageSidebarLinkQuery.first();
                  slug = slugFunction(getHrefId(activePageSidebarLink.attr('href'))),
                  downloadItems.forEach(function(downloadItem) {
                    downloadItem.slug = slug + '-' + downloadItem.slug;
                  });
                  downloadItems.push({
                    title: 'Download section (' + activePageSidebarLink.text() +')',
                    slug: slug,
                    type: 'section'
                  });
                }
                parentMenuItem = activePageSidebarLink.parent().parent().parent();
              }
              else {
                parentMenuItem = null;
              }
            }

            downloadItems.push({
              title: 'Download complete documentation',
              slug: slugFunction('${siteConfig.projectName}'),
              type: 'page'
            });

            return downloadItems;
          }

          const fillDownloadDropdownMenu = function() {
            $('#pdfDownloadMenuList').empty();

            const downloadItems = getDownloadItems();
            const pdfPath = getPdfPath();

            var printPopupContent = '';
            downloadItems.forEach(function(downloadItem) {
              printPopupContent += '<li>';
              printPopupContent += '<a class="dropdown__link" href="' + pdfPath + downloadItem.slug + '.pdf" download>' + downloadItem.title + '</a>';
              printPopupContent += '</li>';
            });
            if (printPopupContent.length === 0) {
              printPopupContent = '<li>No PDF downloads on this page</li>';
            }

            $("#pdfDownloadMenuList").append(printPopupContent);
          }

          const fillDownloadSidebarMenu = function() {
            $('#pdfLinkSidebarMenu').empty();

            const downloadItems = getDownloadItems();
            const pdfPath = getPdfPath();

            var printMenuContent = '';
            downloadItems.forEach(function(downloadItem) {
              printMenuContent += '<li class="menu__list-item">';
              printMenuContent += '<a class="menu__link" href="' + pdfPath + downloadItem.slug + '.pdf" download>' + downloadItem.title + '</a>';
              printMenuContent += '</li>';
            });
            if (printMenuContent.length === 0) {
              printMenuContent = '<li>No PDF downloads on this page</li>';
            }
            $('#pdfLinkSidebarMenu').append(printMenuContent);
          }

          const checkAndInsertPdfButtons = function() {

            if ( !$("#pdfLink").length ) {
              var pdfDownloadButton = $('' +
              '<div class="navbar__item dropdown dropdown--hoverable dropdown--right" id="pdfDownloadMenu">' +
              '  <a class="navbar__item navbar__link pdfLink" id="pdfLink" href="#">${pluginOptions.downloadButtonText}</a>' +
              '  <ul class="dropdown__menu" id="pdfDownloadMenuList"></ul>' +
              '</div>');
              $(".navbar__items--right").prepend(pdfDownloadButton);

              $("#pdfDownloadMenu").mouseenter(fillDownloadDropdownMenu);
            }

            if (!$("#pdfLinkSidebar").length) {
              var pdfDownoadButtonSidebar = $('<li class="menu__list-item menu__list-item--collapsed" id="pdfLinkSidebar"><a role="button" class="menu__link menu__link--sublist">${pluginOptions.downloadButtonText}</a><ul class="menu__list" id="pdfLinkSidebarMenu" style=""></ul></li>');
              $('.navbar-sidebar__items > .menu > .menu__list').append(pdfDownoadButtonSidebar);
              $('#pdfLinkSidebar').click(function() {
                $('#pdfLinkSidebar').toggleClass('menu__list-item--collapsed');
              });
              $('.navbar__toggle').click(fillDownloadSidebarMenu);
            }
          }
  
          $(window).on('load', function () {
            setInterval(checkAndInsertPdfButtons, 1000);
          });

        </script>
        `
        ],
      };
    },

    async postBuild(props) {
      if (pluginOptions.autoBuildPdfs || process.env.BUILD_PDF) {
        await generatePdfFiles(_context.outDir, pluginOptions, props);
      }
    },

  };
}
