/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {LoadContext, Plugin, DocusaurusConfig} from '@docusaurus/types';
import {generatePdfFiles} from './generate';
import {PluginOptions, PapersaurusPluginOptions} from './types';
import {processOptions} from './validateOptions';
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
  options?: PluginOptions,
): Plugin<void> {

  let pluginOptions:PapersaurusPluginOptions = processOptions(options);

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
        ${(pluginOptions.jQueryUrl ? "<script src='" + pluginOptions.jQueryUrl + "'></script>" : "")}
        <script>
          var pdfData = {};

          const getBaseUrl = function(href) {
            return '${siteConfig.baseUrl}${siteConfig.baseUrl?.endsWith("/") ? "" : "/"}';
          };

          const getPdfDataForHref = function(href) {
            if (href in pdfData) {
              return pdfData[href];
            }
            if (href.endsWith('/')) {
              href = href.substr(0, href.length-1);
            }
            else {
              href = href + '/';
            }
            if (href in pdfData) {
              return pdfData[href];
            }
            return "";
          };

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
            var activePdfData = getPdfDataForHref(activePageSidebarLink.attr('href'));
            downloadItems.push({
              title: 'Download this chapter (' + activePageSidebarLink.text() +')',
              path: getBaseUrl() + activePdfData.file,
              type: 'page'
            });

            var parentMenuItem = activePageSidebarLink.parent().parent().parent();
            while (parentMenuItem && parentMenuItem.length > 0) {
              if (parentMenuItem.hasClass("menu__list-item")) {
                var parentSidebarLinkQuery = parentMenuItem.find(".menu__link");
                if (parentSidebarLinkQuery.length > 0) {
                  var parentSidebarLink = parentSidebarLinkQuery.first();
                  var parentPdfData = getPdfDataForHref(parentSidebarLink.attr('href'));
                  downloadItems.push({
                    title: 'Download section (' + parentSidebarLink.text() +')',
                    path: getBaseUrl() + parentPdfData.file,
                    type: 'section'
                  });
                }
                parentMenuItem = parentSidebarLink.parent().parent().parent();
              }
              else {
                parentMenuItem = null;
              }
            }

            downloadItems.push({
              title: 'Download complete documentation',
              path: getBaseUrl() + activePdfData.root,
              type: 'page'
            });

            return downloadItems;
          };

          const fillDownloadDropdownMenu = function() {
            $('#pdfDownloadMenuList').empty();

            const downloadItems = getDownloadItems();

            var printPopupContent = '';
            downloadItems.forEach(function(downloadItem) {
              printPopupContent += '<li>';
              printPopupContent += '<a class="dropdown__link" href="' + downloadItem.path + '" download>' + downloadItem.title + '</a>';
              printPopupContent += '</li>';
            });
            if (printPopupContent.length === 0) {
              printPopupContent = '<li>No PDF downloads on this page</li>';
            }

            $("#pdfDownloadMenuList").append(printPopupContent);
          };

          const fillDownloadSidebarMenu = function() {
            $('#pdfLinkSidebarMenu').empty();

            const downloadItems = getDownloadItems();

            var printMenuContent = '';
            downloadItems.forEach(function(downloadItem) {
              printMenuContent += '<li class="menu__list-item">';
              printMenuContent += '<a class="menu__link" href="' + downloadItem.path + '" download>' + downloadItem.title + '</a>';
              printMenuContent += '</li>';
            });
            if (printMenuContent.length === 0) {
              printMenuContent = '<li>No PDF downloads on this page</li>';
            }
            $('#pdfLinkSidebarMenu').append(printMenuContent);
          };

          const checkAndInsertPdfButtons = function() {
            if (!$("html").hasClass("plugin-docs")) {
              return;
            }
            if (!$("#pdfLink").length) {
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
          };

          $(window).on('load', function () {
            fetch(getBaseUrl() + 'pdfs.json')
            .then((response) => response.json())
            .then(function(json) {
              pdfData = json;
              checkAndInsertPdfButtons();
              setInterval(checkAndInsertPdfButtons, 1000);
            });
          });
        </script>`
        ],
      };
    },

    async postBuild(props) {
      let forceBuild = process.env.BUILD_PDF || "";
      if ((pluginOptions.autoBuildPdfs && !forceBuild.startsWith("0")) || forceBuild.startsWith("1")) {
        await generatePdfFiles(_context.outDir, pluginOptions, props);
      }
    },

  };
}

export { validateOptions } from "./validateOptions";
