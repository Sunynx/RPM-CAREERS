import {authConfig} from '@/lib/microsoft-auth';
import {getM365Secret} from '@/lib/m365-secret';

const SITE_HOSTNAME='royalphuketmarina2002.sharepoint.com';
const SITE_PATH='/sites/HRApplication';
export const SHAREPOINT_SITE_URL=`https://${SITE_HOSTNAME}${SITE_PATH}`;

type ColumnDefinition=Record<string,unknown>&{name:string;displayName:string};
type ListDefinition={displayName:string;description:string;template:'genericList'|'documentLibrary';columns:ColumnDefinition[]};

const text=(name:string,displayName:string,extra:Record<string,unknown>={}):ColumnDefinition=>({name,displayName,text:{},...extra});
const multiline=(name:string,displayName:string):ColumnDefinition=>({name,displayName,text:{allowMultipleLines:true,linesForEditing:12}});
const dateTime=(name:string,displayName:string,dateOnly=false,extra:Record<string,unknown>={}):ColumnDefinition=>({name,displayName,dateTime:{format:dateOnly?'dateOnly':'dateTime'},...extra});
const choice=(name:string,displayName:string,choices:string[],extra:Record<string,unknown>={}):ColumnDefinition=>({name,displayName,choice:{allowTextEntry:false,choices,displayAs:'dropDownMenu'},...extra});
const uniqueText=(name:string,displayName:string):ColumnDefinition=>text(name,displayName,{required:true,indexed:true,enforceUniqueValues:true});
const indexedText=(name:string,displayName:string,required=false):ColumnDefinition=>text(name,displayName,{required,indexed:true});

const salaryChoices=['ตามตกลง','ตามประสบการณ์','12,000–15,000 บาท','15,000–20,000 บาท','20,000–25,000 บาท','25,000–30,000 บาท','30,000–35,000 บาท','35,000–40,000 บาท','40,000–45,000 บาท','45,000–50,000 บาท','50,000 บาทขึ้นไป'];

const lists:ListDefinition[]=[
 {displayName:'Applications',description:'ข้อมูลหลักของใบสมัครงาน / Main application records',template:'genericList',columns:[
  uniqueText('ApplicationKey','Application Key'),uniqueText('ApplicationNumber','เลขที่ใบสมัคร / Application No.'),
  dateTime('SubmittedAt','วันที่ส่งใบสมัคร / Submitted at',false,{required:true,indexed:true}),
  text('FullNameTH','ชื่อ-นามสกุล (ไทย)',{required:true}),text('FullNameEN','Full name (English)'),text('Nickname','ชื่อเล่น / Nickname'),
  indexedText('Email','อีเมล / Email',true),text('Phone','โทรศัพท์ / Phone',{required:true}),text('PositionApplied','ตำแหน่งที่สมัคร / Position',{required:true}),indexedText('JobKey','Job Key'),
  choice('ExpectedSalary','เงินเดือนที่ต้องการ / Expected salary',salaryChoices),dateTime('AvailableStartDate','วันที่พร้อมเริ่มงาน / Available start date',true),
  choice('RecruitmentStatus','สถานะ / Status',['New','Review','Interview','Offered','Rejected'],{required:true,indexed:true}),
  {name:'AssignedHR',displayName:'ผู้รับผิดชอบ / Assigned HR',personOrGroup:{allowMultipleSelection:false,chooseFromType:'peopleOnly'},indexed:true},
  choice('PreferredLanguage','ภาษา / Language',['th','en']),text('PrivacyNoticeVersion','Privacy notice version'),dateTime('AcknowledgedAt','Acknowledged at'),
  dateTime('RetentionUntil','เก็บข้อมูลถึง / Retention until',true),text('LegacyApplicationID','Legacy application ID')
 ]},
 {displayName:'ApplicationDetails',description:'ข้อมูลแบบฟอร์มส่วนขยายในรูป JSON / Extended application form data',template:'genericList',columns:[
  uniqueText('ApplicationKey','Application Key'),{name:'SchemaVersion',displayName:'Schema version',number:{decimalPlaces:'none'}},
  multiline('PersonalJSON','Personal JSON'),multiline('FamilyJSON','Family JSON'),multiline('EducationJSON','Education JSON'),multiline('LanguagesJSON','Languages JSON'),
  multiline('EmploymentJSON','Employment JSON'),multiline('ReferencesJSON','References JSON'),multiline('AdditionalJSON','Additional JSON'),multiline('ConfirmationJSON','Confirmation JSON')
 ]},
 {displayName:'ApplicationDocuments',description:'Resume, CV, รูปถ่าย และ PDF ใบสมัคร / Application files',template:'documentLibrary',columns:[
  indexedText('ApplicationKey','Application Key',true),text('ApplicationNumber','เลขที่ใบสมัคร / Application No.'),
  choice('DocumentType','ประเภทเอกสาร / Document type',['Resume','Photo','ApplicationPDF','Other']),text('OriginalFileName','ชื่อไฟล์ต้นฉบับ / Original file name'),
  text('SourceFileKey','Source file key'),text('PDFTemplateVersion','PDF template version')
 ]},
 {displayName:'ApplicationEvents',description:'ประวัติเหตุการณ์และการเปลี่ยนสถานะ / Application audit events',template:'genericList',columns:[
  uniqueText('EventKey','Event Key'),indexedText('ApplicationKey','Application Key',true),
  choice('EventType','ประเภทเหตุการณ์ / Event type',['Submitted','StatusChanged','DocumentUploaded','EmailAccepted','EmailFailed','SyncFailed']),
  dateTime('OccurredAt','เวลาเกิดเหตุการณ์ / Occurred at',false,{required:true,indexed:true}),text('ActorObjectID','Actor object ID'),text('ActorName','ชื่อผู้ดำเนินการ / Actor'),
  text('FromStatus','สถานะเดิม / From status'),text('ToStatus','สถานะใหม่ / To status'),text('ResultCode','Result code'),text('CorrelationID','Correlation ID')
 ]},
 {displayName:'HRNotes',description:'บันทึกภายในของ HR / Internal HR notes',template:'genericList',columns:[
  uniqueText('NoteKey','Note Key'),indexedText('ApplicationKey','Application Key',true),multiline('NoteText','บันทึก / Note'),
  dateTime('CreatedAt','สร้างเมื่อ / Created at'),dateTime('UpdatedAt','แก้ไขเมื่อ / Updated at'),text('AuthorObjectID','Author object ID'),text('AuthorName','ผู้บันทึก / Author')
 ]},
 {displayName:'Jobs',description:'ตำแหน่งงานและช่วงเงินเดือน / Job openings',template:'genericList',columns:[
  uniqueText('JobKey','Job Key'),text('TitleEN','Job title (English)'),text('Department','แผนก / Department'),text('Location','สถานที่ / Location'),
  choice('SalaryRange','เงินเดือน / Salary range',salaryChoices),choice('JobStatus','สถานะงาน / Job status',['Open','Closed'],{required:true,indexed:true}),
  multiline('DescriptionTH','รายละเอียด (ไทย)'),multiline('DescriptionEN','Description (English)')
 ]}
];

class GraphError extends Error{constructor(public status:number,public code:string){super(code);}}

async function appToken(){
 const config=authConfig(),secret=await getM365Secret();
 if(!config.tenant||!config.client||!secret)throw new GraphError(400,'MicrosoftAppNotConfigured');
 const response=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.client,client_secret:secret,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}),signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw new GraphError(response.status,'TokenRequestFailed');
 const body=await response.json() as {access_token?:string};
 if(!body.access_token)throw new GraphError(502,'MissingAccessToken');
 return body.access_token;
}

async function graph<T>(token:string,path:string,init:RequestInit={}):Promise<T>{
 const response=await fetch(`https://graph.microsoft.com/v1.0${path}`,{...init,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(init.headers||{})},signal:AbortSignal.timeout(20000)});
 if(!response.ok){let code='GraphRequestFailed';try{const body=await response.json() as {error?:{code?:unknown}};if(typeof body.error?.code==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(body.error.code))code=body.error.code;}catch{}throw new GraphError(response.status,code);}
 return response.status===204?undefined as T:await response.json() as T;
}

type GraphList={id:string;displayName?:string;name?:string};
type GraphColumn={id:string;name?:string};

export async function provisionSharePoint(){
 const token=await appToken();
 const site=await graph<{id:string;webUrl?:string}>(token,`/sites/${SITE_HOSTNAME}:${SITE_PATH}?$select=id,webUrl`);
 const listed=await graph<{value:GraphList[]}>(token,`/sites/${encodeURIComponent(site.id)}/lists?$select=id,name,displayName&$top=200`);
 const byName=new Map(listed.value.map(item=>[String(item.displayName||item.name||'').toLowerCase(),item]));
 const created:string[]=[],existing:string[]=[],columnsAdded:string[]=[];
 for(const definition of lists){
  let list=byName.get(definition.displayName.toLowerCase());
  if(!list){
   try{
    list=await graph<GraphList>(token,`/sites/${encodeURIComponent(site.id)}/lists`,{method:'POST',body:JSON.stringify({displayName:definition.displayName,description:definition.description,columns:definition.columns,list:{template:definition.template}})});
    created.push(definition.displayName);
   }catch(error){
    if(!(error instanceof GraphError)||error.status!==409)throw error;
    const refreshed=await graph<{value:GraphList[]}>(token,`/sites/${encodeURIComponent(site.id)}/lists?$select=id,name,displayName&$top=200`);
    list=refreshed.value.find(item=>String(item.displayName||item.name||'').toLowerCase()===definition.displayName.toLowerCase());
    if(!list)throw error;
    existing.push(definition.displayName);
   }
  }else{
   existing.push(definition.displayName);
   const current=await graph<{value:GraphColumn[]}>(token,`/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(list.id)}/columns?$select=id,name&$top=200`);
   const names=new Set(current.value.map(column=>String(column.name||'').toLowerCase()));
   for(const column of definition.columns){
    if(names.has(column.name.toLowerCase()))continue;
    await graph(token,`/sites/${encodeURIComponent(site.id)}/lists/${encodeURIComponent(list.id)}/columns`,{method:'POST',body:JSON.stringify(column)});
    columnsAdded.push(`${definition.displayName}.${column.name}`);
   }
  }
 }
 return {siteUrl:site.webUrl||SHAREPOINT_SITE_URL,created,existing,columnsAdded,total:lists.length};
}

export function sharePointProvisionError(error:unknown){
 if(error instanceof GraphError){
  if(error.status===403)return {status:403,data:{error:'Microsoft ปฏิเสธสิทธิ์สร้าง List กรุณาเพิ่ม Microsoft Graph > Application permission > Sites.Manage.All แล้วกด Grant admin consent ก่อนลองใหม่',code:error.code}};
  if(error.status===404)return {status:404,data:{error:'ไม่พบ SharePoint Site HRApplication หรือแอปไม่มีสิทธิ์เข้าถึง Site นี้',code:error.code}};
  if(error.status===400&&error.code==='MicrosoftAppNotConfigured')return {status:400,data:{error:'ยังตั้งค่า Tenant ID, Client ID หรือ Client Secret ไม่ครบ',code:error.code}};
  return {status:error.status>=500?502:400,data:{error:`สร้างฐานข้อมูล SharePoint ไม่สำเร็จ (HTTP ${error.status} · ${error.code})`,code:error.code}};
 }
 return {status:500,data:{error:'สร้างฐานข้อมูล SharePoint ไม่สำเร็จ กรุณาลองใหม่',code:'Unknown'}};
}
