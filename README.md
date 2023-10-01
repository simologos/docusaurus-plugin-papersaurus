# `docusaurus-plugin-papersaurus`

Plugin for Docusaurus v2 to generate PDF files including table of contents and a cover page.

The plugin is creating a PDF file for each individual document as well as a PDF file for any section and subsection found in sidebar and also one overall PDF file containing all sections.

Optionally the plugin can add a download button to the documentation website which opens a menu with download links for the PDF files of current chapter, current sections and the overall PDF file.

## Introduction

This plugin is ported from existing `papersaurus` project built for [Docusaurus](https://docusaurus.io/) 1.x to use in [Docusaurus](https://docusaurus.io/) 2.x.

It is a [Docusaurus](https://docusaurus.io/) 2.x plugin and can be triggered automatically after docusaurus builds or on docusaurus command line.

It uses  [Puppeteer](https://pptr.dev/) to convert html pages to PDF.

### Please note

1. Puppeteer does not yet support individual headers / footers for the cover page. Therefore this plugin generates a PDF with just uses [easy-pdf-merge](https://www.npmjs.com/package/easy-pdf-merge) See [this SO question](https://stackoverflow.com/questions/55470714/trying-to-hide-first-footer-header-on-pdf-generated-with-puppeteer)

2. Puppeteer does not yet support the generation of TOCs. See [this feature request](https://github.com/puppeteer/puppeteer/issues/1778) and [this Chromium bug](https://bugs.chromium.org/p/chromium/issues/detail?id=840455). Therefore this package generates a PDF, then parses it again to update the page numbers in the TOC. Therefore the parameter  footerParser...

## Installation

```
yarn add docusaurus-plugin-papersaurus
```
or
```
npm install docusaurus-plugin-papersaurus --save
```

## Configuration

Then adapt your `docusaurus.config.js` with the following block:

```
plugins: [
    [
      'docusaurus-plugin-papersaurus',
      {
        keepDebugHtmls: false,
        sidebarNames: ['someSidebar'],
        addDownloadButton: true,
        autoBuildPdfs: true,
        ignoreDocs: ['licenses'],
        author: 'Author name'
      },
    ],
  ],
```

### autoBuildPdfs

Set this parameter to `true`, if you want the plugin to automatically build the PDF files after each docusaurus build. If this is not set the environment variable BUILD_PDF needs to be set before running `docusaurus build`.

Default: `true`

### keepDebugHtmls

The plugin creates one temporary HTML file per generated PDF file that is then converted using  [Puppeteer](https://pptr.dev/) to a PDF file. This HTML file also contains the table of contents including page numbers.
After generating the PDF file, these temporary HTML files are deleted. You may want to keep these HTML files to debug your printing CSS file in a browser.

Set this parameter to `true` to keep the files.

Default: `false`

### sidebarNames

The plugin is using your `sidebars.js` file to find the sections and documents. Since the file can contain multiple sidebars, add the name(s) of the sidebar(s) that should be used to generate files. If none is specified all will be used.

Default: `[]`

### versions

Specify documentation versions to generate pdfs for. If none is specified pdfs will be generated for all versions.

Default: `[]`

### subfolders

If you are using multiple sidebars your files are located in different subfolders. Enter the names of the subfolders located in your docs folder. In case your main sidebar is directly in the docs directory enter an empty string and the names of the other folders.

Example for different directories for the sidebars:

```
  subfolders: ['mainDoc', 'otherDoc'],
```

Example if the main sidebar content is located directly in /doc:

```
  subfolders: ['', 'otherDoc'],
```

Default: `[]`

### productTitles

Add the product name for the different sidebars. This title will be included on the cover page as well as in the header.

The following example shows the configuration if you want to display the product title for the second sidebar but not the first:

```
  sidebarNames: ['someSidebar', 'otherSidebar'],
  productTitles: ['', 'Other'],
```

This would display the 'Other' name on the cover page and the header for all documentation downloaded from the 'otherSidebar' sidebar but not from the 'someSidebar'

Default: `[]`

### addDownloadButton

Set this parameter to `true`, if you want the plugin to add a PDF download button to the documentation website.

Default: `true`

### downloadButtonText

Use this parameter to define the text of the download button.
If you prefer to have an icon instead of a text button, you can replace the text with a button in CSS stylesheet.

Default: `Download as PDF`

### ignoreDocs

If you want to exclude some documents from the section or overall PDF's and want to have it only available as individual chapter PDF, add the id to this parameter.

The parameter type is a string array.

Default: `[]`

### stylesheets

Add the style sheets you would use for printing here. Add the same as in `stylesheets` if you want to use the styles used on the docusaurus web page.

The parameter type is a string array.

Default: `[]`

### alwaysIncludeSiteStyles

Set this parameter to `true`, if you want the plugin to include the styles generated by docusaurus even when you have specified your own `stylesheets`.

Default: `false`

### scripts

Add the scripts you would use for printing here. Add the same as in `scripts` if you want to use the scripts used on the docusaurus web page.

The parameter type is a string array.

Default: `[]`

### coverPageHeader

String containing HTML code which will be displayed as the header of the cover page.

Default: `'...'`

### coverPageFooter

String containing HTML code which will be displayed as the footer of the cover page

Default: `'...'`

### getPdfCoverPage

Function which returns the Cover Page as HTML. Example:

```
getPdfCoverPage: (siteConfig, pluginConfig, pageTitle, version) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      
    </head>

      <body>
        <div style="margin: 2cm;">
          <h1 style="color:#005479;font-size:28px;font-family:sans-serif;font-weight:bold">${siteConfig.projectName}<h1>
          <h2 style="color:#005479;font-size:16px;font-family:sans-serif;">${(pageTitle || siteConfig.tagline)}<h2>

          <dl style="font-family:sans-serif;margin-top:10em;display: flex; flex-flow: row; flex-wrap: wrap; width: 600px; overflow: visible;color:#005479;font-size:12px;font-weight:normal;">
            <dt style="margin-top:1em;flex: 0 0 20%; text-overflow: ellipsis; overflow: hidden;">Author:</dt>    
            <dd style="margin-top:1em;flex:0 0 80%; margin-left: auto; text-align: left;text-overflow: ellipsis; overflow: hidden;">Your name</dd>
            <dt style="margin-top:1em;flex: 0 0 20%; text-overflow: ellipsis; overflow: hidden;">Date:</dt>
            <dd style="margin-top:1em;flex:0 0 80%; margin-left: auto; text-align: left;text-overflow: ellipsis; overflow: hidden;">${new Date().toISOString().substring(0,10)}</dd>
          </dl>
        </div>
      </body>

    </html>
  `;
}
```

### getPdfPageHeader

Function which returns the Header of the content pages as HTML. Example:

```
getPdfPageHeader: (siteConfig, pluginConfig, pageTitle) => {
    return `
      <div style="justify-content: center;align-items: center;height:2.5cm;display:flex;margin: 0 1.5cm;color: #005479;font-size:9px;font-family:sans-serif;width:100%;">
        <div style="flex-grow: 1; width: 50%; text-align:left;margin-left:-3px">
          <img 
            style='display:block; width:2cm;' 
            id='base64image'                 
            src='data:image/svg+xml;base64, <Your Logo as base64>' 
          />
        </div>
        <span style="flex-grow: 1; width: 50%; text-align:right;">${pageTitle}</span>
      </div>
    `;
  },
```

### getPdfPageFooter

Function which returns the Footer of the content pages as HTML. Example:

```
getPdfPageFooter: (siteConfig, pluginConfig, pageTitle) => {
  return `
    <div style="height:1cm;display:flex;margin: 0 1.5cm;color: #005479;font-size:9px;font-family:sans-serif;width:100%;">
      <span style="flex-grow: 1; width: 33%;">© You</span>
      <span style="flex-grow: 1; width: 33%; text-align:center;">${new Date().toISOString().substring(0,10)}</span>
      <span style="flex-grow: 1; width: 33%; text-align:right;">Page <span class='pageNumber'></span> / <span class='totalPages'></span></span>
    </div>`;
},
```

Puppeteer uses classes to inject values at print time. See: https://pptr.dev/#?product=Puppeteer&version=v3.0.4&show=api-pagepdfoptions

### author

String you would like to use as author.

The value may be used in `getPdfCoverPage`, `getPdfPageHeader` or `getPdfPageFooter` with `pluginConfig.author`. 

### footerParser

In order to update the TOC with the correct page numbers, this package has to parse the generated PDF and then manually update the TOC. In order to split the parsed text by pages, a regex expression is used to identify the content footer text. Think of calling jQuery's ```$.text()``` on the footer wrapper. The regular expression must match this text.

Example:

```/© Your Company\d{4}-\d{2}-\d{2}Page \d* \/ \d*/g```

### coverMargins

Margins for the cover page.

Default:
```
{
  top: "10cm",
  right: "0",
  bottom: "3cm",
  left: "0",
}
```

### margins

Margins for content pages.

Default:
```
{
  top: "5cm",
  right: "2cm",
  bottom:"2.3cm",
  left: "2cm",
}
```

### useExtraPaths

In case you have stylesheets or scripts that needs to be included from some other folder than the output folder specify them here.

Example:
```useExtraPaths: [{serverPath: "/", localPath: ".."}]```

Default: `[]`

### ignoreCssSelectors

A list of css selectors that can be used to remove elements of the html before rendering it to pdf.

Example:
```ignoreCssSelectors: [".breadcrumbs", ".theme-doc-version-badge"]```

Default: `[]`

### jQueryUrl

This plugin requires jQuery to insert a download button if `addDownloadButton` is set to `true`. Leave empty in case you provide jQuery some other way.

Default: `https://code.jquery.com/jquery-3.6.0.min.js`

## Limitation

- Just documentations are generated, no pages or blog posts
- No support for translations
