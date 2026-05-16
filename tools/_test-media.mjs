import { rewriteHtmlMediaUrls, toPublicAssetRel } from "./media-url.mjs";

console.log(toPublicAssetRel("/wp-content/uploads/2019/09/x.jpg"));
console.log(
  rewriteHtmlMediaUrls('<img src="https://www.guiachapadaveadeiros.com/imagens/foo.jpg"/>'),
);
