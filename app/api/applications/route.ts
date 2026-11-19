import {receiptStatement,dispatchReceipt} from '@/lib/mail-receipts';
import {canManageCareers,getHRUser} from '@/lib/hr-auth';
import {applicantSession} from '@/lib/applicant-session';
import {env} from 'cloudflare:workers';
import {validateApplication} from '@/lib/application-validation';
import {sharePointSyncMessage,syncApplicationReviewToSharePoint,syncApplicationToSharePoint} from '@/lib/sharepoint-sync';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const statuses=['Draft','New','Review','Interview','Offered','Rejected'];

export async function GET(req:Request){try{
 if(new URL(req.url).searchParams.get('scope')==='hr'){
  if(!await canManageCareers())return json({error:'Forbidden'},403);
  const r=await env.DB!.prepare('SELECT * FROM applications ORDER BY updated DESC').all();
  return json(r.results.map((x:any)=>({...x,data:JSON.parse(x.data)})));
 }
 const session=await applicantSession(req);if(!session.hash)return json([]);
 const r=await env.DB!.prepare('SELECT a.id,a.status,a.data,a.created,a.updated FROM applications a JOIN application_owners o ON a.id=o.application_id WHERE o.owner_hash=? ORDER BY a.updated DESC').bind(session.hash).all();
 return json(r.results.map((x:any)=>({id:x.id,status:x.status,data:JSON.parse(x.data),created:x.created,updated:x.updated})));
}catch{return json({error:'ไม่สามารถโหลดใบสมัครได้ กรุณาลองใหม่'},500)}}

async function allocateId(now:string){const dateParts=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Bangkok',year:'2-digit',month:'2-digit',day:'2-digit'}).formatToParts(new Date(now));const part=(type:string)=>dateParts.find(p=>p.type===type)!.value;const dateCode=part('year')+part('month')+part('day');for(let attempt=0;attempt<5;attempt++){const id=dateCode+'-'+crypto.randomUUID().slice(0,4).toUpperCase();if(!await env.DB!.prepare('SELECT id FROM applications WHERE id=?').bind(id).first())return id;}throw Error('Unable to allocate application reference');}

export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Forbidden'},403);
 try{
  const b=await req.json() as any;if(!b.data||typeof b.data!=='object'||Array.isArray(b.data)||JSON.stringify(b.data).length>160000)return json({error:'ข้อมูลไม่ถูกต้อง'},400);
  const requestedStatus=b.status==='Draft'?'Draft':'New',d=b.data,now=new Date().toISOString();
  if(requestedStatus==='New'){const issues=validateApplication(d);if(issues.length)return json({error:'กรุณากรอกข้อมูลจำเป็นให้ครบก่อนส่งใบสมัคร',issues},400);}
  const session=await applicantSession(req,true),isHR=await canManageCareers();let id=typeof b.id==='string'&&b.id?b.id:'';
  if(requestedStatus==='New'){
   let verified=0;for(const file of d.files){if(!file||typeof file.key!=='string'||!/^[a-f0-9-]{36}$/i.test(file.key))return json({error:'ข้อมูลไฟล์ Resume หรือ CV ไม่ถูกต้อง'},400);const owner=await env.DB!.prepare('SELECT owner_hash FROM file_owners WHERE file_key=?').bind(file.key).first<{owner_hash:string}>();const stored=await env.BUCKET!.head(file.key);if(!owner||owner.owner_hash!==session.hash||!stored||stored.size<=0||stored.size>5*1024*1024||!['application/pdf','image/jpeg','image/png'].includes(stored.httpMetadata?.contentType||''))return json({error:'ไม่สามารถยืนยันสิทธิ์หรือข้อมูลไฟล์ Resume/CV กรุณาอัปโหลดใหม่'},400);verified++;}
   if(!verified)return json({error:'กรุณาอัปโหลด Resume หรือ CV ก่อนส่งใบสมัคร',issues:[{step:6,path:'files',message:'กรุณาแนบ Resume หรือ CV ที่อัปโหลดสำเร็จ / Please upload a Resume or CV'}]},400);
   if(d.photo?.key){const photoOwner=await env.DB!.prepare('SELECT owner_hash FROM file_owners WHERE file_key=?').bind(d.photo.key).first<{owner_hash:string}>();const photo=await env.BUCKET!.head(d.photo.key);if(!photoOwner||photoOwner.owner_hash!==session.hash||!photo||!['image/jpeg','image/png'].includes(photo.httpMetadata?.contentType||''))return json({error:'ไม่สามารถยืนยันสิทธิ์หรือข้อมูลรูปผู้สมัคร กรุณาอัปโหลดรูปใหม่'},400);}
  }
  if(id){const old=await env.DB!.prepare('SELECT status FROM applications WHERE id=?').bind(id).first<{status:string}>();if(!old||old.status!=='Draft')return json({error:'ใบสมัครนี้ไม่ใช่ฉบับร่าง'},409);if(!isHR){const owner=await env.DB!.prepare('SELECT owner_hash FROM application_owners WHERE application_id=?').bind(id).first<{owner_hash:string}>();if(!owner||owner.owner_hash!==session.hash)return json({error:'Forbidden'},403);}}
  else{id=await allocateId(now);await env.DB!.batch([env.DB!.prepare('INSERT INTO applications (id,status,data,created,updated,note) VALUES (?,?,?,?,?,?)').bind(id,'Draft',JSON.stringify(d),now,now,''),env.DB!.prepare('INSERT INTO application_owners (application_id,owner_hash) VALUES (?,?)').bind(id,session.hash)]);}
  if(requestedStatus==='Draft'){
   await env.DB!.prepare('UPDATE applications SET data=?,status=?,updated=? WHERE id=?').bind(JSON.stringify(d),'Draft',now,id).run();
   const response=json({id,status:'Draft'});if(session.cookie)response.headers.set('Set-Cookie',session.cookie);return response;
  }
  try{await syncApplicationToSharePoint(id,d,now,new URL(req.url).origin);}catch(error){const response=json({error:sharePointSyncMessage(error),id,sharePoint:'failed'},502);if(session.cookie)response.headers.set('Set-Cookie',session.cookie);return response;}
  let mirrorWarning='';let queued=false;
  try{const statements=[env.DB!.prepare('UPDATE applications SET data=?,status=?,updated=? WHERE id=?').bind(JSON.stringify(d),'New',now,id)];const receipt=await receiptStatement(id,d,now);if(receipt){statements.push(receipt);queued=true;}await env.DB!.batch(statements);if(queued)await dispatchReceipt(id);}catch{mirrorWarning='บันทึก SharePoint สำเร็จ แต่สำเนาในระบบเว็บไซต์หรืออีเมลตอบรับยังไม่สมบูรณ์ กรุณาแจ้ง HR พร้อมเลขที่ใบสมัคร';}
  const response=json({id,status:'New',sharePoint:'synced',warning:mirrorWarning||undefined});if(session.cookie)response.headers.set('Set-Cookie',session.cookie);return response;
 }catch{return json({error:'บันทึกไม่สำเร็จ กรุณาลองใหม่'},500)}
}

export async function PATCH(req:Request){
 if(!await canManageCareers())return json({error:'Forbidden'},403);if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Forbidden'},403);
 try{
  const b=await req.json() as any;if(!b.id||!statuses.includes(b.status)||b.status==='Draft')return json({error:'สถานะไม่ถูกต้อง'},400);
  const old=await env.DB!.prepare('SELECT id FROM applications WHERE id=? AND status!=?').bind(b.id,'Draft').first();if(!old)return json({error:'ไม่พบใบสมัคร'},404);
  const user=await getHRUser();
  try{await syncApplicationReviewToSharePoint(b.id,b.status,Object.prototype.hasOwnProperty.call(b,'note')?String(b.note||'').slice(0,10000):undefined,user?.displayName||user?.email||'HR');}catch(error){return json({error:sharePointSyncMessage(error),sharePoint:'failed'},502);}
  if(Object.prototype.hasOwnProperty.call(b,'note'))await env.DB!.prepare('UPDATE applications SET status=?,note=?,updated=? WHERE id=?').bind(b.status,String(b.note||'').slice(0,10000),new Date().toISOString(),b.id).run();else await env.DB!.prepare('UPDATE applications SET status=?,updated=? WHERE id=?').bind(b.status,new Date().toISOString(),b.id).run();
  return json({ok:true,sharePoint:'synced'});
 }catch{return json({error:'อัปเดตไม่สำเร็จ'},500)}
}
