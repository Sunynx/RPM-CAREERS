import {env} from 'cloudflare:workers';
import {generateApplicationPdf} from '@/lib/application-pdf';
import {GraphError,SHAREPOINT_SITE_HOSTNAME,SHAREPOINT_SITE_PATH,sharePointGraph,sharePointToken} from '@/lib/sharepoint-provision';
import type {JobData} from '@/lib/careers-content';
import {getSystemSettings} from '@/lib/system-settings';

type GraphList={id:string;displayName?:string;name?:string};
type SyncContext={token:string;siteId:string;lists:Record<string,string>;documentsDriveId:string};
type CachedContext=Omit<SyncContext,'token'>;
type StoredFile={key:string;name:string;type:string;size:number};

const requiredLists=['Applications','ApplicationDetails','ApplicationDocuments','ApplicationEvents','HRNotes','Jobs'] as const;
const cleanFields=(fields:Record<string,unknown>)=>Object.fromEntries(Object.entries(fields).filter(([,value])=>value!==undefined&&value!==null&&value!==''));
const safeJson=(value:unknown)=>JSON.stringify(value??null);
const odata=(value:string)=>value.replaceAll("'","''");
const pathPart=(value:string)=>encodeURIComponent(value.replace(/[~"#%&*:<>?/\\{|}]/g,'-').replace(/[. ]+$/g,'').slice(0,120)||'file');
const salaryAmount=(value:unknown)=>{const text=String(value??'').trim();if(!/^\d[\d,]*(?:\.\d+)?$/.test(text))return undefined;const amount=Number(text.replaceAll(',',''));return Number.isFinite(amount)?amount:undefined;};
let cachedContext:Promise<CachedContext>|null=null;

async function resolveContext(token:string):Promise<CachedContext>{
 const site=await sharePointGraph<{id:string}>(token,`/sites/${SHAREPOINT_SITE_HOSTNAME}:${SHAREPOINT_SITE_PATH}?$select=id`);
 const response=await sharePointGraph<{value:GraphList[]}>(token,`/sites/${encodeURIComponent(site.id)}/lists?$select=id,name,displayName&$top=200`);
 const lists:Record<string,string>={};for(const list of response.value){const name=String(list.displayName||list.name||'');if(name)lists[name]=list.id;}
 const missing=requiredLists.filter(name=>!lists[name]);if(missing.length)throw new GraphError(409,'SharePointSchemaMissing');
 const applicationColumns=await sharePointGraph<{value:Array<{id:string;name?:string}>}>(token,`/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(lists.Applications)}/columns?$select=id,name&$top=200`);
 if(!applicationColumns.value.some(column=>column.name?.toLowerCase()==='expectedsalaryamount'))await sharePointGraph(token,`/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(lists.Applications)}/columns`,{method:'POST',body:JSON.stringify({name:'ExpectedSalaryAmount',displayName:'เงินเดือนที่ต้องการ / Expected salary',number:{decimalPlaces:'none'}})});
 const legacySalary=applicationColumns.value.find(column=>column.name?.toLowerCase()==='expectedsalary');if(legacySalary)await sharePointGraph(token,`/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(lists.Applications)}/columns/${encodeURIComponent(legacySalary.id)}`,{method:'PATCH',body:JSON.stringify({displayName:'ช่วงเงินเดือนเดิม / Legacy salary range',hidden:true})});
 const drive=await sharePointGraph<{id:string}>(token,`/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(lists.ApplicationDocuments)}/drive?$select=id`);
 return {siteId:site.id,lists,documentsDriveId:drive.id};
}

async function context():Promise<SyncContext>{
 const token=await sharePointToken();
 cachedContext??=resolveContext(token);
 try{return {token,...await cachedContext};}
 catch(error){cachedContext=null;throw error;}
}

async function findItem(ctx:SyncContext,listName:string,keyName:string,key:string){
 const query=`?$expand=fields($select=${encodeURIComponent(keyName)})&$filter=${encodeURIComponent(`fields/${keyName} eq '${odata(key)}'`)}&$top=2`;
 const result=await sharePointGraph<{value:Array<{id:string}>}>(ctx.token,`/sites/${encodeURIComponent(ctx.siteId)}/lists/${encodeURIComponent(ctx.lists[listName])}/items${query}`);
 return result.value[0]?.id||'';
}

async function upsertItem(ctx:SyncContext,listName:string,keyName:string,key:string,fields:Record<string,unknown>){
 const itemId=await findItem(ctx,listName,keyName,key);
 if(itemId){await sharePointGraph(ctx.token,`/sites/${encodeURIComponent(ctx.siteId)}/lists/${encodeURIComponent(ctx.lists[listName])}/items/${encodeURIComponent(itemId)}/fields`,{method:'PATCH',body:JSON.stringify(cleanFields(fields))});return itemId;}
 const item=await sharePointGraph<{id:string}>(ctx.token,`/sites/${encodeURIComponent(ctx.siteId)}/lists/${encodeURIComponent(ctx.lists[listName])}/items`,{method:'POST',body:JSON.stringify({fields:cleanFields(fields)})});
 return item.id;
}

async function ensureFolder(ctx:SyncContext,parentId:string|null,name:string){
 const base=parentId?`/drives/${encodeURIComponent(ctx.documentsDriveId)}/items/${encodeURIComponent(parentId)}/children`:`/drives/${encodeURIComponent(ctx.documentsDriveId)}/root/children`;
 try{return await sharePointGraph<{id:string}>(ctx.token,base,{method:'POST',body:JSON.stringify({name,folder:{},'@microsoft.graph.conflictBehavior':'fail'})});}
 catch(error){if(!(error instanceof GraphError)||error.status!==409)throw error;const location=parentId?`/drives/${encodeURIComponent(ctx.documentsDriveId)}/items/${encodeURIComponent(parentId)}:/${pathPart(name)}`:`/drives/${encodeURIComponent(ctx.documentsDriveId)}/root:/${pathPart(name)}`;return sharePointGraph<{id:string}>(ctx.token,location+'?$select=id');}
}

async function uploadBytes(ctx:SyncContext,folders:string[],fileName:string,bytes:ArrayBuffer,contentType:string,fields:Record<string,unknown>){
 const encoded=[...folders,fileName].map(pathPart).join('/');
 const response=await fetch(`https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(ctx.documentsDriveId)}/root:/${encoded}:/content`,{method:'PUT',headers:{Authorization:`Bearer ${ctx.token}`,'Content-Type':contentType},body:bytes,signal:AbortSignal.timeout(30000)});
 if(!response.ok){let code='FileUploadFailed';try{const body=await response.json() as {error?:{code?:unknown}};if(typeof body.error?.code==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(body.error.code))code=body.error.code;}catch{}throw new GraphError(response.status,code);}
 const item=await response.json() as {id:string};
 await sharePointGraph(ctx.token,`/drives/${encodeURIComponent(ctx.documentsDriveId)}/items/${encodeURIComponent(item.id)}/listItem/fields`,{method:'PATCH',body:JSON.stringify(cleanFields(fields))});
}

async function uploadStoredFile(ctx:SyncContext,applicationId:string,year:string,file:StoredFile,kind:'Resume'|'Photo',index=0){
 if(!/^[a-f0-9-]{36}$/i.test(file.key))throw new GraphError(400,'InvalidStoredFile');
 const stored=await env.BUCKET!.get(file.key);if(!stored)throw new GraphError(404,'StoredFileMissing');
 const prefix=kind==='Photo'?'Photo':`Resume-${index+1}`;
 await uploadBytes(ctx,[year,applicationId],`${prefix}-${file.name}`,await stored.arrayBuffer(),stored.httpMetadata?.contentType||file.type,{ApplicationKey:applicationId,ApplicationNumber:applicationId,DocumentType:kind,OriginalFileName:file.name,SourceFileKey:file.key});
}

function details(data:Record<string,any>){
 const familyKeys=['living','marital','registered','spouseIncome','spouse','spouseJob','spousePhone','spouseAddress','children','childrenSchool','father','fatherAge','fatherJob','fatherStatus','fatherPhone','mother','motherAge','motherJob','motherStatus','motherPhone','military'];
 const additionalKeys=['computer','fax','typing','otherSkills','shift','guarantor','rotate','relative','relativeRelation','emergency','emergencyRelation','emergencyPhone','noExperience'];
 const confirmationKeys=['certify','acknowledge','sensitiveConsent','signature','signatureDate','applicationLanguage'];
 const excluded=new Set(['files','photo','education','languages','employment','references',...familyKeys,...additionalKeys,...confirmationKeys]);
 const pick=(keys:string[])=>Object.fromEntries(keys.filter(key=>data[key]!==undefined).map(key=>[key,data[key]]));
 const personal=Object.fromEntries(Object.entries(data).filter(([key])=>!excluded.has(key)));
 return {PersonalJSON:safeJson(personal),FamilyJSON:safeJson(pick(familyKeys)),EducationJSON:safeJson(data.education||[]),LanguagesJSON:safeJson(data.languages||[]),EmploymentJSON:safeJson(data.employment||[]),ReferencesJSON:safeJson(data.references||[]),AdditionalJSON:safeJson(pick(additionalKeys)),ConfirmationJSON:safeJson(pick(confirmationKeys))};
}

export async function syncApplicationToSharePoint(applicationId:string,data:Record<string,any>,submittedAt:string,origin:string){
 const [ctx,settings]=await Promise.all([context(),getSystemSettings()]),year=String(new Date(submittedAt).getUTCFullYear());
 const retention=new Date(submittedAt);retention.setUTCFullYear(retention.getUTCFullYear()+settings.retentionYears);
 const loader=async(path:string)=>{if(path.startsWith('/api/files?key=')){const key=new URL(path,'https://local.invalid').searchParams.get('key')||'';const file=await env.BUCKET!.get(key);if(!file)throw new GraphError(404,'StoredPhotoMissing');return file.arrayBuffer();}const response=await fetch(new URL(path,origin),{cache:'no-store'});if(!response.ok)throw new GraphError(response.status,'PdfAssetMissing');return response.arrayBuffer();};
 const recordWork=Promise.all([
  upsertItem(ctx,'Applications','ApplicationKey',applicationId,{Title:data.nameTh||applicationId,ApplicationKey:applicationId,ApplicationNumber:applicationId,SubmittedAt:submittedAt,FullNameTH:data.nameTh,FullNameEN:data.nameEn,Nickname:data.nickname,Email:data.email,Phone:data.phone,PositionApplied:data.position,ExpectedSalaryAmount:salaryAmount(data.salary),AvailableStartDate:data.startDate,RecruitmentStatus:'New',PreferredLanguage:data.applicationLanguage==='en'?'en':'th',PrivacyNoticeVersion:settings.privacyNoticeVersion,AcknowledgedAt:submittedAt,RetentionUntil:retention.toISOString().slice(0,10)}),
  upsertItem(ctx,'ApplicationDetails','ApplicationKey',applicationId,{Title:applicationId,ApplicationKey:applicationId,SchemaVersion:1,...details(data)})
 ]);
 const folderWork=ensureFolder(ctx,null,year).then(yearFolder=>ensureFolder(ctx,yearFolder.id,applicationId));
 const pdfWork=generateApplicationPdf({id:applicationId,data,created:submittedAt},loader);
 await Promise.all([recordWork,folderWork]);
 const files=(Array.isArray(data.files)?data.files:[]) as StoredFile[];
 const uploadWork:Promise<unknown>[]=[...files.map((file,index)=>uploadStoredFile(ctx,applicationId,year,file,'Resume',index))];
 if(data.photo?.key)uploadWork.push(uploadStoredFile(ctx,applicationId,year,data.photo as StoredFile,'Photo'));
 uploadWork.push(pdfWork.then(pdf=>{const pdfBuffer=pdf.buffer.slice(pdf.byteOffset,pdf.byteOffset+pdf.byteLength) as ArrayBuffer;return uploadBytes(ctx,[year,applicationId],`Application-${applicationId}.pdf`,pdfBuffer,'application/pdf',{ApplicationKey:applicationId,ApplicationNumber:applicationId,DocumentType:'ApplicationPDF',OriginalFileName:`Application-${applicationId}.pdf`,PDFTemplateVersion:'1'});}));
 await Promise.all(uploadWork);
 await upsertItem(ctx,'ApplicationEvents','EventKey',`${applicationId}:Submitted`,{Title:`Submitted ${applicationId}`,EventKey:`${applicationId}:Submitted`,ApplicationKey:applicationId,EventType:'Submitted',OccurredAt:submittedAt,ActorName:data.nameTh||data.nameEn||'Applicant',ToStatus:'New',ResultCode:'Success',CorrelationID:crypto.randomUUID()});
 return {applicationId};
}

export async function syncApplicationReviewToSharePoint(applicationId:string,status:string,note:string|undefined,actorName:string){
 const ctx=await context(),occurredAt=new Date().toISOString();
 const itemId=await findItem(ctx,'Applications','ApplicationKey',applicationId);if(!itemId)throw new GraphError(404,'ApplicationNotFoundInSharePoint');
 await sharePointGraph(ctx.token,`/sites/${encodeURIComponent(ctx.siteId)}/lists/${encodeURIComponent(ctx.lists.Applications)}/items/${encodeURIComponent(itemId)}/fields`,{method:'PATCH',body:JSON.stringify({RecruitmentStatus:status})});
 if(note!==undefined)await upsertItem(ctx,'HRNotes','NoteKey',`${applicationId}:HRNote`,{Title:`HR note ${applicationId}`,NoteKey:`${applicationId}:HRNote`,ApplicationKey:applicationId,NoteText:note,UpdatedAt:occurredAt,AuthorName:actorName});
 const eventKey=`${applicationId}:StatusChanged:${occurredAt}:${crypto.randomUUID().slice(0,8)}`;
 await upsertItem(ctx,'ApplicationEvents','EventKey',eventKey,{Title:`Status changed ${applicationId}`,EventKey:eventKey,ApplicationKey:applicationId,EventType:'StatusChanged',OccurredAt:occurredAt,ActorName:actorName,ToStatus:status,ResultCode:'Success',CorrelationID:crypto.randomUUID()});
}

export async function syncJobToSharePoint(jobId:string,status:string,data:JobData){const ctx=await context();await upsertItem(ctx,'Jobs','JobKey',jobId,{Title:data.titleTh||data.titleEn||jobId,JobKey:jobId,TitleEN:data.titleEn,Department:data.department,Location:data.location,SalaryRange:data.salary,JobStatus:status==='open'?'Open':'Closed',DescriptionTH:data.detailsTh,DescriptionEN:data.detailsEn});}

export async function deleteJobFromSharePoint(jobId:string){const ctx=await context(),itemId=await findItem(ctx,'Jobs','JobKey',jobId);if(itemId)await sharePointGraph(ctx.token,`/sites/${encodeURIComponent(ctx.siteId)}/lists/${encodeURIComponent(ctx.lists.Jobs)}/items/${encodeURIComponent(itemId)}`,{method:'DELETE'});}

async function deleteInBatches(items:Array<{id:string}>,remove:(id:string)=>Promise<unknown>){for(let index=0;index<items.length;index+=10)await Promise.all(items.slice(index,index+10).map(item=>remove(item.id)));}

export async function clearSharePointApplicationData(){
 const ctx=await context();const deleted:Record<string,number>={};
 for(const listName of ['ApplicationEvents','HRNotes','ApplicationDetails','Applications']){
  let count=0;
  for(let page=0;page<100;page++){
   const result=await sharePointGraph<{value:Array<{id:string}>}>(ctx.token,`/sites/${encodeURIComponent(ctx.siteId)}/lists/${encodeURIComponent(ctx.lists[listName])}/items?$select=id&$top=200`);
   if(!result.value.length)break;
   await deleteInBatches(result.value,id=>sharePointGraph(ctx.token,`/sites/${encodeURIComponent(ctx.siteId)}/lists/${encodeURIComponent(ctx.lists[listName])}/items/${encodeURIComponent(id)}`,{method:'DELETE'}));count+=result.value.length;
  }
  deleted[listName]=count;
 }
 let documentCount=0;
 for(let page=0;page<100;page++){
  const result=await sharePointGraph<{value:Array<{id:string}>}>(ctx.token,`/drives/${encodeURIComponent(ctx.documentsDriveId)}/root/children?$select=id&$top=200`);
  if(!result.value.length)break;
  await deleteInBatches(result.value,id=>sharePointGraph(ctx.token,`/drives/${encodeURIComponent(ctx.documentsDriveId)}/items/${encodeURIComponent(id)}`,{method:'DELETE'}));documentCount+=result.value.length;
 }
 deleted.ApplicationDocuments=documentCount;return deleted;
}

export function sharePointSyncMessage(error:unknown){if(error instanceof GraphError){if(error.code==='SharePointSchemaMissing')return 'โครงสร้างฐานข้อมูล SharePoint ไม่ครบ กรุณาเปิดหน้าตั้งค่า Microsoft 365 แล้วกดสร้าง/ตรวจฐานข้อมูล';if(error.status===403)return 'SharePoint ปฏิเสธสิทธิ์ กรุณาตรวจ Sites.Manage.All และ Grant admin consent';if(error.code==='StoredFileMissing'||error.code==='StoredPhotoMissing')return 'ไม่พบไฟล์ Resume หรือรูปในพื้นที่ชั่วคราว กรุณาอัปโหลดใหม่';return `บันทึก SharePoint ไม่สำเร็จ (HTTP ${error.status} · ${error.code})`; }return 'เชื่อมต่อ SharePoint ไม่สำเร็จ กรุณาลองใหม่';}
