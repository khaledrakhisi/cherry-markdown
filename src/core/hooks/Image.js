/**
 * Copyright (C) 2021 THL A29 Limited, a Tencent company.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import SyntaxBase from '@/core/SyntaxBase';
import { escapeHTMLSpecialCharOnce as $e, encodeURIOnce } from '@/utils/sanitize';
import { processExtendAttributesInAlt, processExtendStyleInAlt } from '@/utils/image';
import { compileRegExp, isLookbehindSupported, NOT_ALL_WHITE_SPACES_INLINE } from '@/utils/regexp';
import { replaceLookbehind } from '@/utils/lookbehind-replace';

const replacerFactory = function (type, match, leadingChar, alt, link, title, config, globalConfig) {
  const refType = typeof link === 'undefined' ? 'ref' : 'url';
  let attrs = '';
  if (refType === 'ref') {
    // TODO: 全局引用
    return match;
  }

  if (refType === 'url') {
    const extent = processExtendAttributesInAlt(alt);
    let style = processExtendStyleInAlt(alt);
    if (style) {
      style = ` style="${style}" `;
    }
    attrs = title && title.trim() !== '' ? ` title="${$e(title)}"` : '';
    const processedURL = globalConfig.urlProcessor(link, type);
    const defaultWrapper = `<${type} src="${encodeURIOnce(
      processedURL,
    )}"${attrs} ${extent} ${style} controls="controls">${$e(alt || '')}</${type}>`;
    return `${leadingChar}${config.videoWrapper ? config.videoWrapper(link) : defaultWrapper}`;
  }
  // should never happen
  return match;
};

export default class Image extends SyntaxBase {
  static HOOK_NAME = 'image';

  constructor({ config, globalConfig }) {
    super(null);
    this.urlProcessor = globalConfig.urlProcessor;
    // TODO: URL Validator
    this.extendMedia = {
      tag: ['video', 'audio'],
      replacer: {
        video(match, leadingChar, alt, link, title) {
          return replacerFactory('video', match, leadingChar, alt, link, title, config, globalConfig);
        },
        audio(match, leadingChar, alt, link, title) {
          return replacerFactory('audio', match, leadingChar, alt, link, title, config, globalConfig);
        },
      },
    };
    this.RULE = this.rule(this.extendMedia);
  }

  toHtml(match, leadingChar, alt, link, title, ref) {
    // console.log(match, alt, link, ref, title);
    const refType = typeof link === 'undefined' ? 'ref' : 'url';
    let attrs = '';
    if (refType === 'ref') {
      // 全局引用，理应在CommentReference中被替换，没有被替换说明没有定义引用项
      return match;
    }
    if (refType === 'url') {
      const extent = processExtendAttributesInAlt(alt);
      let style = processExtendStyleInAlt(alt);
      if (style) {
        style = ` style="${style}" `;
      }
      attrs = title && title.trim() !== '' ? ` title="${$e(title.replace(/["']/g, ''))}"` : '';
      let srcProp = 'src';
      let srcValue;
      const cherryOptions = this.$engine.$cherry.options;
      if (cherryOptions.callback && cherryOptions.callback.beforeImageMounted) {
        const imgAttrs = cherryOptions.callback.beforeImageMounted(srcProp, link);
        srcProp = imgAttrs.srcProp || srcProp;
        srcValue = imgAttrs.src || link;
      }
      return `${leadingChar}<img ${srcProp}="${encodeURIOnce(
        this.urlProcessor(srcValue, 'image'),
      )}" ${extent} ${style} alt="${$e(alt || '')}"${attrs}/>`;
    }
    // should never happen
    return match;
  }

  makeHtml(str) {
    let $str = str;
    if (this.test($str)) {
      if (isLookbehindSupported()) {
        $str = $str.replace(this.RULE.reg, this.toHtml.bind(this));
      } else {
        $str = replaceLookbehind($str, this.RULE.reg, this.toHtml.bind(this), true, 1);
      }
    }
    if (this.testMedia($str)) {
      $str = $str.replace(this.RULE.regExtend, (match, leadingChar, mediaType, alt, link, title, ref, ...args) => {
        if (!this.extendMedia.replacer[mediaType]) {
          return match;
        }
        return this.extendMedia.replacer[mediaType].call(this, match, leadingChar, alt, link, title, ref, ...args);
      });
    }
    return $str;
  }

  testMedia(str) {
    return this.RULE.regExtend && this.RULE.regExtend.test(str);
  }

  rule(extendMedia) {
    const ret = {
      // lookbehind启用分组是为了和不兼容lookbehind的场景共用一个回调
      begin: isLookbehindSupported() ? '((?<!\\\\))!' : '(^|[^\\\\])!',
      content: [
        '\\[([^\\n]*?)\\]', // ?<alt>
        '[ \\t]*', // any spaces
        `${
          '(?:' +
          '\\(' +
          '([^"][^\\s]+?)' + // ?<link> url
          '(?:[ \\t]((?:".*?")|(?:\'.*?\')))?' + // ?<title> optional
          '\\)' +
          '|' + // or
          '\\[('
        }${NOT_ALL_WHITE_SPACES_INLINE})\\]` + // ?<ref> global ref
          ')',
      ].join(''),
      end: '', // TODO: extend attrs e.g. {width=50 height=60}
    };
    if (extendMedia) {
      const extend = { ...ret };
      // TODO: 支持Lookbehind
      extend.begin = `(^|[^\\\\])!(${extendMedia.tag.join('|')})`;
      ret.regExtend = compileRegExp(extend, 'g');
    }
    ret.reg = compileRegExp(ret, 'g');
    return ret;
  }
}
