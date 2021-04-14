"use strict";
/**
 * Copyright (c) Bucher + Suter.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const generate_1 = require("./generate");
const import_fresh_1 = __importDefault(require("import-fresh"));
const fs = __importStar(require("fs"));
function loadConfig(configPath) {
    if (!fs.existsSync(configPath)) {
        throw new Error(`Config file "${configPath}" not found`);
    }
    const loadedConfig = import_fresh_1.default(configPath);
    return loadedConfig;
}
function default_1(_context, pluginOptions) {
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
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.js"></script>
          <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery-modal/0.9.1/jquery.modal.min.css" />

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
    
            $(window).on('load', function () {

              var pdfDownloadButton = $('' +
                  '<a class="pdfLink" href="#" id="pdfLink">${pluginOptions.downloadButtonText}</a>' +
                  '<form id="pdfPopup" class="modal">' +
                  '</form>' +
                '</div>');

              $(".navbar__items--right").prepend(pdfDownloadButton);

              $("#pdfLink").click(function(){

                var menuLink;
                var downloadItems = [];
                $("a").filter(".menu__link").filter(function() {
                  if ($(this).attr('href') === document.location.pathname) {
                    menuLink = $(this);
                  }
                });
                if (menuLink) {
                  const lastSlashPos = document.location.pathname.lastIndexOf('/');
                  var pdfPath = '';
                  if (lastSlashPos != -1) {
                    pdfPath = document.location.pathname.substring(0,lastSlashPos+1);
                    pdfPath = pdfPath.replace('/docs/', '/pdfs/');
                  }
                  downloadItems.push({
                    title: 'Download this chapter (' + menuLink.text() +')',
                    slug: slugFunction(menuLink.text()),
                    type: 'page'
                  });
                  var parentMenuItem = menuLink.parent().parent().parent();
                  while (parentMenuItem && parentMenuItem.length > 0) {
                    if (parentMenuItem.hasClass("menu__list-item")) {
                      var menuLinkQuery = parentMenuItem.find(".menu__link");
                      if (menuLinkQuery.length > 0) {
                        menuLink = menuLinkQuery.first();
                        slug = slugFunction(menuLink.text());
                        downloadItems.forEach(function(downloadItem) {
                          downloadItem.slug = slug + '-' + downloadItem.slug;
                        });
                        downloadItems.push({
                          title: 'Download section (' + menuLink.text() +')',
                          slug: slug,
                          type: 'section'
                        });
                      }
                      parentMenuItem = menuLink.parent().parent().parent();
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

                  $('#pdfPopup').empty();

                  var printPopupContent = '<h3>Download PDF files</h3>';
                  downloadItems.forEach(function(downloadItem) {
                    printPopupContent += '<p>';
                    printPopupContent += '<a href="' + pdfPath + downloadItem.slug + '.pdf" download>' + downloadItem.title + '</a>';
                    printPopupContent += '</p>';
                  });

                  $("#pdfPopup").append(printPopupContent);
                  $('#pdfPopup').modal();

                  console.log(JSON.stringify(downloadItems));
                }

              });

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
                    generate_1.generatePdfFiles(pluginOptions, siteConfig);
                })();
            });
        },
        async postBuild(props) {
            if (pluginOptions.autoBuildPdfs) {
                await generate_1.generatePdfFiles(pluginOptions, props.siteConfig);
            }
        },
    };
}
exports.default = default_1;
