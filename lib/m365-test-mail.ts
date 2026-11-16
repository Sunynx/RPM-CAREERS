import {receiptMessage} from '@/lib/receipt-template';
import {env} from 'cloudflare:workers';
import {authConfig} from '@/lib/microsoft-auth';
import {getM365Secret} from '@/lib/m365-secret';
export function testMailSender(){return String((env as unknown as {M365_SENDER_EMAIL?:string}).M365_SENDER_EMAIL||'').trim();}
export function validMailAddress(value:unknown):value is string{return typeof value==='string'&&value.length<=254&&/^[^\s<>@,;]+@[^\s<>@,;]+\.[^\s<>@,;]+$/.test(value);}
export async function sendMicrosoftTestMail(recipient:string){
 const sender=testMailSender(),config=authConfig(),secret=await getM365Secret();
 if(!validMailAddress(sender))return {status:400,data:{error:'ยังไม่ได้ตั้งค่า mailbox ผู้ส่ง กรุณาให้ผู้ดูแลตั้งค่า M365_SENDER_EMAIL'}};
 if(!secret||!config.tenant||!config.client)return {status:400,data:{error:'ข้อมูลแอป Microsoft ยังไม่ครบ กรุณาตรวจ Tenant ID, Client ID และ Secret'}};
 let sendStarted=false;
 try{
  const tokenResponse=await fetch(`https://login.microsoftonline.com/${encodeURIComponent(config.tenant)}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:config.client,client_secret:secret,scope:'https://graph.microsoft.com/.default',grant_type:'client_credentials'}),signal:AbortSignal.timeout(10000)});
  if(!tokenResponse.ok)return {status:400,data:{error:`Microsoft ไม่ยอมรับข้อมูลแอป (HTTP ${tokenResponse.status}) กรุณาตรวจ Secret Value, วันหมดอายุ และ tenant`}};
  const token=await tokenResponse.json() as {access_token?:string};
  if(!token.access_token)return {status:502,data:{error:'Microsoft ไม่ได้ส่ง access token กลับมา กรุณาตรวจข้อมูลแอป'}};
  sendStarted=true;
  const message=receiptMessage({email:recipient,name:'ผู้สมัครทดสอบ',nameEn:'Test Applicant',position:'ตำแหน่งตัวอย่าง / Sample position',language:'th',applicationId:'TEST-'+new Date().toISOString().slice(0,10)});
  message.subject='[TEST] '+message.subject;
  message.body.content=message.body.content.replace('</div><table','</div><p style="margin:0;padding:16px;text-align:center;background-color:#fff3cd;color:#664d03;font-family:Tahoma,Arial,sans-serif">อีเมลทดสอบเท่านั้น ไม่มีการส่งใบสมัครจริง / Test email only. No application was submitted.</p><table');
  const response=await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(sender)}/sendMail`,{method:'POST',headers:{Authorization:`Bearer ${token.access_token}`,'Content-Type':'application/json'},body:JSON.stringify({message,saveToSentItems:true}),signal:AbortSignal.timeout(10000)});
  if(response.status===202)return {status:200,data:{accepted:true,message:'Microsoft รับคำขอส่งอีเมลแล้ว (202 Accepted) กรุณาตรวจ Inbox/Junk ของผู้รับและ Sent Items ของผู้ส่ง ยังไม่ใช่การยืนยันว่าอีเมลถึง Inbox'}};
  // Only return a bounded error code, never raw provider content, credentials, or tokens.
  let code='';try{const body=await response.json() as {error?:{code?:unknown}};if(typeof body.error?.code==='string'&&/^[a-zA-Z0-9_.-]{1,100}$/.test(body.error.code))code=body.error.code;}catch{}
  const detail=`HTTP ${response.status}${code?` · ${code}`:''}`;
  if(response.status>=500)return {status:502,data:{unknown:true,error:`ยังยืนยันผลส่งไม่ได้ (${detail}) ตรวจ Sent Items และผู้รับก่อนกดส่งใหม่ เพื่อหลีกเลี่ยงอีเมลซ้ำ`}};
  return {status:400,data:{error:`Microsoft ปฏิเสธการส่ง (${detail}) ${response.status===403?'ตรวจ Mail.Send, admin consent และขอบเขตสิทธิ์ mailbox ใน Exchange':response.status===404?'ตรวจว่า mailbox ผู้ส่งมีอยู่จริงใน Microsoft 365':'ตรวจ mailbox ผู้ส่งและสิทธิ์ของแอปใน Microsoft 365'}`}};
 }catch{return {status:502,data:{unknown:sendStarted,error:sendStarted?'การเชื่อมต่อขาดระหว่างส่ง ยังยืนยันผลไม่ได้ ตรวจ Sent Items และผู้รับก่อนส่งใหม่ เพื่อหลีกเลี่ยงอีเมลซ้ำ':'เชื่อมต่อ Microsoft เพื่อขอ token ไม่สำเร็จ กรุณาลองใหม่ภายหลัง'}};}
}
