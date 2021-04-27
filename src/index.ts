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
          <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>

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

            const checkAndInsertPdfButton = function() {

              if ( !$("#pdfLink").length ) {

                var pdfDownloadButton = $('' +
                '<div class="navbar__item dropdown dropdown--hoverable dropdown--right" id="pdfDownloadMenu">' +
                '  <a class="navbar__item navbar__link pdfLink" id="pdfLink" href="">${pluginOptions.downloadButtonText}</a>' +
                '  <ul class="dropdown__menu" id="pdfDownloadMenuList"></ul>' +
                '</div>');

                $(".navbar__items--right").prepend(pdfDownloadButton);

                $("#pdfDownloadMenu").mouseenter(function(){

                  console.log('Menu mouseenter');

                  $('#pdfDownloadMenuList').empty();

                  var activePageSidebarLink;
                  $("a").filter(".menu__link").filter(function() {
                    if ($(this).attr('href') === document.location.pathname) {
                      activePageSidebarLink = $(this);
                    }
                  });
                  if (!activePageSidebarLink) {
                    $("#pdfDownloadMenuList").append('<li>No PDF downloads on this page</li>');
                    return;
                  }

                  const lastSlashPos = document.location.pathname.lastIndexOf('/');
                  var pdfPath = '';
                  if (lastSlashPos != -1) {
                    pdfPath = document.location.pathname.substring(0,lastSlashPos+1);
                    pdfPath = pdfPath.replace('/docs/', '/pdfs/');
                  }

                  var downloadItems = [];
                  downloadItems.push({
                    title: 'Download this chapter (' + activePageSidebarLink.text() +')',
                    slug: slugFunction(activePageSidebarLink.text()),
                    type: 'page'
                  });
                  var parentMenuItem = activePageSidebarLink.parent().parent().parent();
                  while (parentMenuItem && parentMenuItem.length > 0) {
                    if (parentMenuItem.hasClass("menu__list-item")) {
                      var activePageSidebarLinkQuery = parentMenuItem.find(".menu__link");
                      if (activePageSidebarLinkQuery.length > 0) {
                        activePageSidebarLink = activePageSidebarLinkQuery.first();
                        slug = slugFunction(activePageSidebarLink.text());
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

                  var printPopupContent = '';
                  downloadItems.forEach(function(downloadItem) {
                    printPopupContent += '<li>';
                    printPopupContent += '<a class="dropdown__link" href="' + pdfPath + downloadItem.slug + '.pdf" download>' + downloadItem.title + '</a>';
                    printPopupContent += '</li>';
                  });
                  if (printPopupContent.length === 0) {
                    console.log('printPopupContent.length === 0');
                    printPopupContent = '<li><a class="dropdown__link" href="" download>No PDF downloads on this page.</a></li>';
                  }
                  else {
                    console.log('printPopupContent.length > 0');
                  }

                  $("#pdfDownloadMenuList").append(printPopupContent);
                });

              }
            }
    
            $(window).on('load', function () {
              setInterval(checkAndInsertPdfButton, 1000);
            });

          </script>
        `
        ],
      };
    },

    extendCli(cli) {

      cli
        .command('papersaurus:build')
        .description('Generate pdf files for website')
        .action(() => {

          const CWD = process.cwd();
          const siteConfig = loadConfig(`${CWD}/docusaurus.config.js`);

          (async () => {
            generatePdfFiles(pluginOptions, siteConfig);
          })();  

        });

    },

    async postBuild(props) {
      if (pluginOptions.autoBuildPdfs) {
        await generatePdfFiles(pluginOptions, props.siteConfig);
      }
    },

  };
}
