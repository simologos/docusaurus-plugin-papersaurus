import { Joi } from "@docusaurus/utils-validation";
import { PluginOptions, PapersaurusPluginOptions, PageFunction, Margins, UsePath } from "./types";

const isStringOrArrayOfStrings = Joi.alternatives().try(
  Joi.string(),
  Joi.array().items(Joi.string())
);

const defaultCoverPageFunction: PageFunction = (siteConfig, _pluginConfig, pageTitle, _version) => {
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
};

const defaultPageHeaderFunction: PageFunction = (_siteConfig, pluginConfig, pageTitle, _version) => {
  return `
    <div style="justify-content: center;align-items: center;height:2.5cm;display:flex;margin: 0 1.5cm;color: #005479;font-size:9px;font-family:sans-serif;width:100%;">
      <span style="flex-grow: 1; width: 50%; text-align:left;">${pluginConfig.author}</span>
      <span style="flex-grow: 1; width: 50%; text-align:right;">${pageTitle}</span>
    </div>
  `;
};

const defaultPageFooterFunction: PageFunction = (_siteConfig, pluginConfig, _pageTitle, _version) => {
  return `
    <div style="height:1cm;display:flex;margin: 0 1.5cm;color: #005479;font-size:9px;font-family:sans-serif;width:100%;">
      <span style="flex-grow: 1; width: 33%;">© ${pluginConfig.author}</span>
      <span style="flex-grow: 1; width: 33%; text-align:center;">${new Date().toISOString().substring(0,10)}</span>
      <span style="flex-grow: 1; width: 33%; text-align:right;">Page <span class='pageNumber'></span> / <span class='totalPages'></span></span>
    </div>
  `;
};

const marginsSchema = Joi.object<Margins>({
  top: Joi.string().required(),
  right: Joi.string().required(),
  bottom: Joi.string().required(),
  left: Joi.string().required(),
});

const schema = Joi.object<PapersaurusPluginOptions>({
  addDownloadButton: Joi.boolean().default(true),
  autoBuildPdfs: Joi.boolean().default(true),
  downloadButtonText: Joi.string().default("Download as PDF"),
  ignoreDocs: isStringOrArrayOfStrings.default([]),
  stylesheets: isStringOrArrayOfStrings.default([]),
  alwaysIncludeSiteStyles: Joi.boolean().default(false),
  scripts: isStringOrArrayOfStrings.default([]),
  coverPageHeader: Joi.string().default("..."),
  coverPageFooter: Joi.string().default("..."),
  getPdfCoverPage: Joi.func().default(() => defaultCoverPageFunction),
  getPdfPageHeader: Joi.func().default(() => defaultPageHeaderFunction),
  getPdfPageFooter: Joi.func().default(() => defaultPageFooterFunction),
  margins: marginsSchema.default({
    top: "5cm",
    right: "2cm",
    bottom:"2.3cm",
    left: "2cm",
  }),
  coverMargins: marginsSchema.default({
    top: "10cm",
    right: "0",
    bottom: "3cm",
    left: "0",
  }),
  author: Joi.string().default(""),
  footerParser: Joi.object<RegExp>().instance(RegExp),
  keepDebugHtmls: Joi.boolean().default(false),
  sidebarNames: isStringOrArrayOfStrings.default([]),
  versions: isStringOrArrayOfStrings.default([]),
  subfolders: isStringOrArrayOfStrings.default([]),
  productTitles: isStringOrArrayOfStrings.default([]),
  useExtraPaths: Joi.array().items(Joi.object<UsePath>({
    serverPath: Joi.string().required(),
    localPath: Joi.string().required(),
  })).default([]),
  ignoreCssSelectors: isStringOrArrayOfStrings.default([]),
  jQueryUrl: Joi.string().allow('').default("https://code.jquery.com/jquery-3.6.0.min.js"),
});

type ValidateFn = (
  schema: Joi.Schema,
  options: PluginOptions | undefined
) => Required<PluginOptions>;

export function validateOptions({
  options,
  validate,
}: {
  options: PluginOptions | undefined;
  validate: ValidateFn;
}): Required<PluginOptions> {
  return validate(schema, options || {});
}

export function processOptions(
  options: PluginOptions | undefined,
): PapersaurusPluginOptions {
  const pluginOptions = { ...options } as PapersaurusPluginOptions;
  if (!pluginOptions.footerParser) {
    pluginOptions.footerParser = RegExp(`© ${pluginOptions.author}\\d{4}-\\d{2}-\\d{2}Page \\d* \\/ \\d*`, 'g');
  }

  ensureArray(pluginOptions, "ignoreDocs");
  ensureArray(pluginOptions, "stylesheets");
  ensureArray(pluginOptions, "scripts");
  ensureArray(pluginOptions, "sidebarNames");
  ensureArray(pluginOptions, "subfolders");
  ensureArray(pluginOptions, "productTitles");
  ensureArray(pluginOptions, "ignoreCssSelectors");

  return pluginOptions;
}

function ensureArray<T>(object: T, key: keyof T): void {
  if (!Array.isArray(object[key])) {
    (object as any)[key] = [object[key]];
  }
}