import {getM365Secret} from '@/lib/m365-secret';
import {env} from 'cloudflare:workers';
type Settings={M365_TENANT_ID?:string;M365_CLIENT_ID?:string;M365_CLIENT_SECRET?:string;M365_SENDER_EMAIL?:string;M365_RECEIPT_ENABLED?:string};
export async function receiptSettings(){
 const e=env as unknown as Settings;
 const missing=['M365_TENANT_ID','M365_CLIENT_ID','M365_SENDER_EMAIL'].filter(key=>!e[key as keyof Settings]?.trim());
 if(!await getM365Secret())missing.push('M365_CLIENT_SECRET');
 return {enabled:e.M365_RECEIPT_ENABLED==='true',ready:e.M365_RECEIPT_ENABLED==='true'&&!missing.length,missing,sender:e.M365_SENDER_EMAIL||''};
}
export function receiptMessage(payload:{email:string;name:string;position:string;language:'th'|'en';applicationId:string}){
 const en=payload.language==='en';
 return {subject:en?'Thank you for applying to Royal Phuket Marina':'ขอบคุณที่สมัครงานกับ Royal Phuket Marina',body:{contentType:'Text',content:en?`Dear ${payload.name},\n\nThank you for applying for the ${payload.position} position at Royal Phuket Marina. We have received your application. Our team will review it and contact you if your qualifications match the position.\n\nApplication number: ${payload.applicationId}\n\nThank you for your interest.\nRoyal Phuket Marina`:`เรียน คุณ ${payload.name}\n\nขอบคุณที่สนใจสมัครงานตำแหน่ง ${payload.position} กับ Royal Phuket Marina บริษัทได้รับใบสมัครของท่านแล้ว ทีมงานจะพิจารณาข้อมูลและติดต่อกลับหากคุณสมบัติตรงกับตำแหน่งงาน\n\nเลขที่ใบสมัคร: ${payload.applicationId}\n\nขอบคุณสำหรับความสนใจที่มีต่อบริษัท\nRoyal Phuket Marina`},toRecipients:[{emailAddress:{address:payload.email}}]};
}
export async function receiptStatement(applicationId:string,data:Record<string,any>,now:string){
 if(!(await receiptSettings()).ready)return null;
 const payload={applicationId,email:data.email.trim(),name:data.nameTh.trim(),position:data.position.trim(),language:data.applicationLanguage==='en'?'en':'th'};
 return env.DB!.prepare('INSERT INTO mail_receipts (id,application_id,payload,status,attempts,error,created,updated) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING').bind('receipt:'+applicationId,applicationId,JSON.stringify(payload),'pending','0','',now,now);
}
async function setResult(id:string,status:string,error=''){await env.DB!.prepare('UPDATE mail_receipts SET status=?,error=?,updated=? WHERE id=?').bind(status,error,new Date().toISOString(),id).run();return status;}
export async function processReceipt(id:string){
 if(!(await receiptSettings()).ready)return 'disabled';
 const claimed=await env.DB!.prepare("UPDATE mail_receipts SET status='sending',attempts=CAST(attempts AS INTEGER)+1,updated=? WHERE id=? AND status IN ('pending','failed') AND CAST(attempts AS INTEGER)<3").bind(new Date().toISOString(),id).run();
 if(!claimed.meta.changes)return 'not-claimed';
 let sendStarted=false;
 try{
  const row=await env.DB!.prepare('SELECT payload FROM mail_receipts WHERE id=?').bind(id).first<{payload:string}>();
  if(!row)return 'not-found';
  const e=env as unknown as Settings;
  const tokenResponse=await fetch('https://login.microsoftonline.com/'+encodeURIComponent(e.M365_TENANT_ID!)+'/oauth2/v2.0/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:e.M365_CLIENT_ID!,client_secret:await getM365Secret(),scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}),signal:AbortSignal.timeout(8000)});
  if(!tokenResponse.ok)return await setResult(id,'failed','token-rejected');
  const token=await tokenResponse.json() as {access_token?:string};if(!token.access_token)return await setResult(id,'failed','token-missing');
  const message=receiptMessage(JSON.parse(row.payload));
  sendStarted=true;
  const response=await fetch('https://graph.microsoft.com/v1.0/users/'+encodeURIComponent(e.M365_SENDER_EMAIL!)+'/sendMail',{method:'POST',headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},body:JSON.stringify({message,saveToSentItems:true}),signal:AbortSignal.timeout(10000)});
  if(response.status===202)return await setResult(id,'accepted');
  if(response.status>=400&&response.status<500)return await setResult(id,'failed','graph-'+response.status);
  return await setResult(id,'unknown','graph-'+response.status);
 }catch{
  // A network interruption after send starts may hide a successful send. Never auto-retry it.
  try{return await setResult(id,sendStarted?'unknown':'failed',sendStarted?'send-outcome-unknown':'token-unavailable');}catch{return 'unknown';}
 }
}
export async function dispatchReceipt(applicationId:string){try{return await processReceipt('receipt:'+applicationId);}catch{return 'failed';}}
