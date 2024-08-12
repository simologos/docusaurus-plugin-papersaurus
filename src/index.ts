/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {LoadContext, Plugin} from '@docusaurus/types';
import {generatePdfFiles} from './generate';
import {PluginOptions, PapersaurusPluginOptions} from './types';
import {processOptions} from './validateOptions';


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

      const siteConfig = _context.siteConfig

      return {
        headTags: [`
        ${(pluginOptions.jQueryUrl ? "<script src='" + pluginOptions.jQueryUrl + "'></script>" : "")}
        <script>
          var pdfData = {};

          const getBaseUrl = function (href) {
            return '${siteConfig.baseUrl}${siteConfig.baseUrl?.endsWith("/") ? "" : "/"}';
          };
          
          const getDownloadItems = function () {
          
            const stripTrailingSlash = (str) => {
              return str.endsWith('/') ?
                str.slice(0, -1) : str;
            };
          
            var downloadItems = [];
            var activePdfData = pdfData[stripTrailingSlash(document.location.pathname)] || [];
          
            for (var i = 0, il = activePdfData.length; i < il; i++) {
              if (activePdfData[i].type === 'root') {
          
                downloadItems.push({
                  title: 'Download complete version: <br/> <strong style=font-size:16px>' + activePdfData[i].label + '</strong>',
                  path: getBaseUrl() + activePdfData[i].file
                });
                continue;
              }
          
              if (activePdfData[i].type === 'section') {
                downloadItems.push({
                  title: 'Download section: <br/> <strong style=font-size:16px>' + activePdfData[i].label + '</strong>',
                  path: getBaseUrl() + activePdfData[i].file
                });
                continue;
              }
          
              if (activePdfData[i].type === 'chapter') {
                downloadItems.push({
                  title: 'Download page: <br/> <strong style=font-size:16px>' + activePdfData[i].label + '</strong>',
                  path: getBaseUrl() + activePdfData[i].file
                });
              }
            }
          
            return downloadItems;
          };
          
          const fillDownloadDropdownMenu = function () {
            $('#pdfDownloadMenuList').empty();
          
            const downloadItems = getDownloadItems();
          
            var printPopupContent = '';
            downloadItems.forEach(function (downloadItem) {
              printPopupContent += '<li>';
              printPopupContent += '<a class="dropdown__link" href="' + downloadItem.path + '" download>' + downloadItem.title + '</a>';
              printPopupContent += '</li>';
            });
            if (printPopupContent.length === 0) {
              printPopupContent = '<li>No PDF downloads on this page</li>';
            }
          
            $("#pdfDownloadMenuList").append(printPopupContent);
          };
          
          const fillDownloadSidebarMenu = function () {
            $('#pdfLinkSidebarMenu').empty();
          
            const downloadItems = getDownloadItems();
          
            var printMenuContent = '';
            downloadItems.forEach(function (downloadItem) {
              printMenuContent += '<li class="menu__list-item">';
              printMenuContent += '<a class="menu__link" href="' + downloadItem.path + '" download>' + downloadItem.title + '</a>';
              printMenuContent += '</li>';
            });
            if (printMenuContent.length === 0) {
              printMenuContent = '<li>No PDF downloads on this page</li>';
            }
            $('#pdfLinkSidebarMenu').append(printMenuContent);
          };
          
          const checkAndInsertPdfButtons = function () {
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
              $('#pdfLinkSidebar').click(function () {
                $('#pdfLinkSidebar').toggleClass('menu__list-item--collapsed');
              });
              $('.navbar__toggle').click(fillDownloadSidebarMenu);
            }
          };
          
          $(window).on('load', function () {
            fetch(getBaseUrl() + 'pdfs.json')
              .then((response) => response.json())
              .then(function (json) {
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
