const assert=require('node:assert/strict');const {test}=require('node:test');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const ts=require('typescript');
function setup(upload){
 const states=[],effects=[],requests=[];let cursor=0,saved=0;
 const jsx=(type,props)=>({type,props});const react={useState:initial=>{const i=cursor++;if(!(i in states))states[i]=initial;return[states[i],v=>{states[i]=typeof v==='function'?v(states[i]):v}]},useEffect:fn=>{if(!effects.length)effects.push(fn)},useRef:()=>({current:null})};
 const mocks={react,'react/jsx-runtime':{jsx,jsxs:jsx},'lucide-react':{},'./Modal':{Modal:'Modal'},'../api/client':{API:'/api',request:async(url,options)=>{requests.push({url,options});return options?{}:[{id:1,name:'Test'}]}}};
 const source=fs.readFileSync(path.join(__dirname,'../../frontend/src/components/EditProduct.tsx'),'utf8');const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}});
 const context={exports:{},require:n=>{if(!(n in mocks))throw new Error(n);return mocks[n]},fetch:upload,FormData:class{append(){}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL:()=>{}}};vm.runInNewContext(compiled.outputText,context);
 const flatten=n=>!n||typeof n!=='object'?[]:[n,...[n.props?.children].flat(Infinity).flatMap(flatten)];
 return {requests,effects,saved:()=>saved,render:()=>{cursor=0;return flatten(context.exports.EditProduct({product:{id:1,code:'P',description:'Product',category:{id:1},uom:'PCS',price:1,imageUrl:'/uploads/100-1.jpg'},close:()=>{},onSaved:()=>saved++,setToast:()=>{}}))}};
}
test('Edit Product waits for upload and sends the returned URL only when Save is clicked',async()=>{
 let resolve;const h=setup(()=>new Promise(r=>{resolve=r}));let nodes=h.render();h.effects[0]();await new Promise(setImmediate);nodes=h.render();
 nodes.find(n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[{type:'image/png'}]},currentTarget:{value:'chosen'}});
 nodes=h.render();await nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});assert.equal(h.requests.filter(r=>r.options).length,0);
 resolve({ok:true,json:async()=>({imageUrl:'/uploads/100-2.jpg'})});await new Promise(setImmediate);nodes=h.render();
 assert.equal(h.requests.filter(r=>r.options).length,0);
 await nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 const req=h.requests.find(r=>r.options);assert.equal(req.options.method,'PATCH');assert.equal(JSON.parse(req.options.body).imageUrl,'/uploads/100-2.jpg');assert.equal(h.saved(),1);
});
test('failed product image upload preserves the original image on subsequent Save',async()=>{
 const h=setup(async()=>({ok:false}));let nodes=h.render();h.effects[0]();await new Promise(setImmediate);nodes=h.render();
 nodes.find(n=>n.type==='input'&&n.props.type==='file').props.onChange({target:{files:[{type:'image/png'}]},currentTarget:{value:'chosen'}});
 await new Promise(setImmediate);nodes=h.render();await nodes.find(n=>n.type==='form').props.onSubmit({preventDefault(){}});
 assert.equal(JSON.parse(h.requests.find(r=>r.options).options.body).imageUrl,'/uploads/100-1.jpg');
});
