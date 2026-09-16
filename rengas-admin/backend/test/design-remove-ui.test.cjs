const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('Remove Front Images clears both fields locally and only Save Design sends removal', async () => {
  let states = [], cursor = 0;
  const effects = [];
  const requests = [];
  let closed = false;
  const jsx = (type, props) => ({ type, props });
  const react = { useState: initial => {
    const index = cursor++;
    if (!(index in states)) states[index] = initial;
    return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
  }, useEffect: fn => { if (!effects.length) effects.push(fn); } };
  const mocks = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx }, 'lucide-react': {}, './Modal': { Modal: 'Modal' },
    '../api/client': { API: '/api', request: async (url, options) => {
      requests.push({ url, options });
      return { id: 1, topBannerUrl: '/uploads/100-1.jpg', productPhotoUrl: '/uploads/100-2.jpg' };
    } },
    '../api/design-settings': { designImages: value => ({ topBannerUrl: value?.topBannerUrl ?? '', productPhotoUrl: value?.productPhotoUrl ?? '' }) },
  };
  const source = fs.readFileSync(path.join(__dirname, '../../frontend/src/components/Design.tsx'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } });
  const context = { exports: {}, require: name => { if (!(name in mocks)) throw new Error(name); return mocks[name]; } };
  vm.runInNewContext(compiled.outputText, context);
  const render = () => { cursor = 0; return context.exports.Design({ close: () => { closed = true; }, setToast: () => {} }); };
  const flatten = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)];
  let tree = render(); effects[0](); await new Promise(setImmediate); tree = render();
  const remove = flatten(tree).find(node => node.type === 'button' && node.props.children === 'Remove Front Images');
  remove.props.onClick();
  assert.equal(states[0].topBannerUrl, ''); assert.equal(states[0].productPhotoUrl, '');
  assert.equal(requests.length, 1); // loading only; no file deletion at click time
  tree = render();
  await flatten(tree).find(node => node.props?.className === 'primary design-save').props.onClick();
  assert.deepEqual(JSON.parse(requests[1].options.body), { topBannerUrl: '', productPhotoUrl: '' });
  assert.equal(requests[1].options.method, 'PATCH'); assert.equal(closed, true);
});
