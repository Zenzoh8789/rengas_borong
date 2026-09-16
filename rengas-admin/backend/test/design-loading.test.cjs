const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function setup(load) {
  const states=[],effects=[],requests=[];let cursor=0;
  const jsx=(type,props)=>({type,props});
  const react={useState: initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return [states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},useEffect:fn=>{if(!effects.length)effects.push(fn)}};
  const mocks={react,'react/jsx-runtime':{jsx,jsxs:jsx},'lucide-react':{},'./Modal':{Modal:'Modal'},'../api/client':{API:'/api',request:async(url,options)=>{requests.push({url,options});return options?{}:load()}},'../api/design-settings':{designImages:v=>({topBannerUrl:v?.topBannerUrl??'',productPhotoUrl:v?.productPhotoUrl??''})}};
  const src=fs.readFileSync(path.join(__dirname,'../../frontend/src/components/Design.tsx'),'utf8');
  const compiled=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
  const context={exports:{},require:n=>{if(!(n in mocks))throw new Error(n);return mocks[n]}};vm.runInNewContext(compiled.outputText,context);
  const flatten=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(flatten)];
  return {requests,effects,render:()=>{cursor=0;return flatten(context.exports.Design({close:()=>{},setToast:()=>{}}))}};
}
test('design loading blocks save and removal until existing images are known',async()=>{
  let resolve;const h=setup(()=>new Promise(r=>{resolve=r}));let nodes=h.render();h.effects[0]();
  const save=nodes.find(n=>n.props?.className==='primary design-save');assert.equal(save.props.disabled,true);
  assert.equal(nodes.find(n=>n.props?.children==='Remove Front Images').props.disabled,true);
  await save.props.onClick();assert.equal(h.requests.length,1);
  resolve({topBannerUrl:'/uploads/100-1.jpg',productPhotoUrl:'/uploads/100-2.jpg'});await new Promise(setImmediate);nodes=h.render();
  assert.equal(nodes.find(n=>n.props?.className==='primary design-save').props.disabled,false);
});
test('failed design load cannot overwrite saved images with blank settings',async()=>{
  const h=setup(()=>Promise.reject(new Error('unavailable')));h.render();h.effects[0]();await new Promise(setImmediate);
  const nodes=h.render();assert.ok(nodes.some(n=>n.props?.role==='alert'));
  const save=nodes.find(n=>n.props?.className==='primary design-save');assert.equal(save.props.disabled,true);await save.props.onClick();
  assert.equal(h.requests.length,1);
});
