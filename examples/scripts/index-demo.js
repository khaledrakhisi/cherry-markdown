var CustomHookA = Cherry.createSyntaxHook('codeBlock', Cherry.constants.HOOKS_TYPE_LIST.PAR, {
  makeHtml(str) {
    console.warn('custom hook', 'hello');
    return str;
  },
  rule(str) {
    const regex = {
      begin: '',
      content: '',
      end: '',
    };
    regex.reg = new RegExp(regex.begin + regex.content + regex.end, 'g');
    return regex;
  },
});

var basicConfig = {
  id: 'markdown',
  externals: {
    echarts: window.echarts,
    katex: window.katex,
    MathJax: window.MathJax,
  },
  isPreviewOnly: false,
  engine: {
    global: {
      urlProcessor(url, srcType) {
        console.log(`url-processor`, url, srcType);
        return url;
      },
    },
    syntax: {
      table: {
        enableChart: false,
        // chartEngine: Engine Class
      },
      fontEmphasis: {
        allowWhitespace: true, // 是否允许首尾空格
      },
      mathBlock: {
        engine: 'MathJax', // katex或MathJax
        src: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js', // 如果使用MathJax plugins，则需要使用该url通过script标签引入
      },
      inlineMath: {
        engine: 'MathJax', // katex或MathJax
      },
      emoji: {
        useUnicode: false,
        customResourceURL: 'https://github.githubassets.com/images/icons/emoji/unicode/${code}.png?v8',
        upperCase: true,
      },
      // toc: {
      //     tocStyle: 'nested'
      // }
      // 'header': {
      //   strict: false
      // }
    },
    customSyntax: {
      // SyntaxHookClass
      CustomHook: {
        syntaxClass: CustomHookA,
        force: false,
        after: 'br',
      },
    },
  },
  toolbars: {
    toolbar: [
      'bold',
      'italic',
      'strikethrough',
      '|',
      'color',
      'header',
      '|',
      'list',
      {
        insert: ['image', 'audio', 'video', 'link', 'hr', 'br', 'code', 'formula', 'toc', 'table', 'pdf', 'word'],
      },
      'graph',
      'togglePreview',
      'settings',
      'switchModel',
      'codeTheme',
      'export',
    ],
    sidebar: ['mobilePreview', 'copy'],
  },
  editor: {
    defaultModel: 'edit&preview',
  },
  previewer: {
    // 自定义markdown预览区域class
    // className: 'markdown'
  },
  keydown: [],
  //extensions: [],
};

var objectNode = /** @type {HTMLObjectElement} */ (document.querySelector('object[name="demo-val"]'));

var onloadeddata = function() {
  var value = objectNode ? objectNode.contentDocument.documentElement.textContent : '';
  var config = Object.assign({}, basicConfig, { value: value });
  window.cherry = new Cherry(config);
};

if (!window.markdownLoaded && objectNode) {
  objectNode.onload = onloadeddata;
} else {
  onloadeddata();
}