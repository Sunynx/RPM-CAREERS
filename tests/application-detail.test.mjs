import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {build} from 'esbuild';
import {mkdir,mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
await mkdir('work',{recursive:true});
const dir=await mkdtemp(join(process.cwd(),'work/detail-test-'));
await build({entryPoints:['components/careers/application-detail.tsx'],bundle:true,platform:'node',format:'esm',external:['react','react/*','lucide-react'],outfile:join(dir,'detail.mjs')});
const {ApplicationDetail}=await import(pathToFileURL(join(dir,'detail.mjs')));
const props={id:'RPM-TEST',language:'th',review:createElement('div',{},'Applicant information'),status:'Review',note:'PRIVATE HR NOTE',statuses:{Draft:'ฉบับร่าง',New:'ใบสมัครใหม่',Review:'กำลังพิจารณา'},busy:false,onClose(){},onStatus(){},onNote(){},onSave(){}};
for(const language of ['th','en']){
 test(`applicant detail excludes all HR controls and internal notes (${language})`,()=>{const html=renderToStaticMarkup(createElement(ApplicationDetail,{...props,language,backstage:false}));assert.ok(html.includes('Applicant information'));assert.ok(html.includes('RPM-TEST'));for(const content of ['hr-review','PRIVATE HR NOTE','<select','<textarea','การพิจารณาโดย HR','HR review'])assert.ok(!html.includes(content),content);});
 test(`authorized HR detail retains the review form (${language})`,()=>{const html=renderToStaticMarkup(createElement(ApplicationDetail,{...props,language,backstage:true}));for(const content of ['hr-review','PRIVATE HR NOTE','<select','<textarea'])assert.ok(html.includes(content),content);});
}
test.after(async()=>await rm(dir,{recursive:true,force:true}));
