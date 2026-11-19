'use client';
import {useEffect,useState} from 'react';
import {Cloud,Database,KeyRound,Mail,RefreshCw,Save,Settings2,ShieldCheck,Trash2,TriangleAlert} from 'lucide-react';

type SystemPolicy={retentionYears:number;privacyNoticeVersion:string};
type SettingsResponse={tenant:string;client:string;secretConfigured:boolean;microsoftEnabled:boolean;sender:string;sharePointSite:string;systemSettings:SystemPolicy};

export function MicrosoftSettings(){
 const [settings,setSettings]=useState<SettingsResponse|null>(null),[policy,setPolicy]=useState<SystemPolicy>({retentionYears:2,privacyNoticeVersion:'2026-11'});
 const [recipient,setRecipient]=useState(''),[secret,setSecret]=useState(''),[message,setMessage]=useState(''),[mailMessage,setMailMessage]=useState(''),[sharePointMessage,setSharePointMessage]=useState(''),[clearMessage,setClearMessage]=useState('');
 const [busy,setBusy]=useState(false),[clearArmed,setClearArmed]=useState(false);

 async function load(){const r=await fetch('/api/integrations/microsoft');if(!r.ok){setMessage('บัญชีนี้ไม่มีสิทธิ์ตั้งค่าระบบ หรือโหลดข้อมูลไม่สำเร็จ');return;}const data=await r.json() as SettingsResponse;setSettings(data);setPolicy(data.systemSettings);}
 useEffect(()=>{load().catch(()=>setMessage('โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่'));},[]);
 useEffect(()=>{if(!clearArmed)return;const timer=setTimeout(()=>setClearArmed(false),15000);return()=>clearTimeout(timer);},[clearArmed]);

 async function perform(action:'save'|'test'){
  setBusy(true);setMessage('');
  try{const r=await fetch('/api/integrations/microsoft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action==='save'?{action,secret}:{action})});const data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error);setSecret('');await load();setMessage(action==='save'?'บันทึก Client Secret แบบเข้ารหัสแล้ว':'Microsoft ยืนยัน Tenant, Client ID และ Secret แล้ว');}
  catch(error:any){setMessage(error.message||'ไม่สำเร็จ กรุณาตรวจ Secret Value วันหมดอายุ และสิทธิ์ของแอป');}finally{setBusy(false);}
 }

 async function savePolicy(){setBusy(true);setMessage('');try{const r=await fetch('/api/integrations/microsoft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save-system-settings',settings:policy})});const data=await r.json() as {error?:string;settings?:SystemPolicy};if(!r.ok)throw Error(data.error);if(data.settings)setPolicy(data.settings);setMessage('บันทึกนโยบายระบบแล้ว ค่านี้จะใช้กับใบสมัครใหม่และการซิงก์ครั้งถัดไป');}catch(error:any){setMessage(error.message||'บันทึกนโยบายไม่สำเร็จ');}finally{setBusy(false);}}

 async function sendTest(){setBusy(true);setMailMessage('');try{const r=await fetch('/api/integrations/microsoft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'send-test',recipient:recipient.trim()})});const data=await r.json() as {message?:string;error?:string};setMailMessage(r.ok?data.message||'Microsoft รับคำขอแล้ว':data.error||'ส่งไม่สำเร็จ กรุณาลองใหม่');}catch{setMailMessage('ยังยืนยันผลส่งไม่ได้ กรุณาตรวจ Sent Items และผู้รับก่อนส่งใหม่');}finally{setBusy(false);}}

 async function syncExisting(){setBusy(true);setSharePointMessage('');try{const r=await fetch('/api/integrations/microsoft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'sync-sharepoint-existing'})});const data=await r.json() as {error?:string;applicationCount?:number;jobCount?:number;failed?:string[];hasMore?:boolean};if(!r.ok)throw Error(data.error);const failed=data.failed?.length?` · ไม่สำเร็จ ${data.failed.length} รายการ: ${data.failed.slice(0,3).join(' | ')}`:'';const more=data.hasMore?' · ยังมีข้อมูลเพิ่มเติม กรุณากดซ้ำ':'';setSharePointMessage(`ซิงก์ใบสมัคร ${data.applicationCount||0} รายการ และตำแหน่งงาน ${data.jobCount||0} รายการแล้ว${failed}${more}`);}catch(error:any){setSharePointMessage(error.message||'เชื่อมต่อ SharePoint ไม่สำเร็จ');}finally{setBusy(false);}}

 async function provisionSharePoint(){setBusy(true);setSharePointMessage('');try{const r=await fetch('/api/integrations/microsoft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'provision-sharepoint'})});const data=await r.json() as {error?:string};if(!r.ok)throw Error(data.error);await syncExisting();}catch(error:any){setSharePointMessage(error.message||'ตรวจโครงสร้าง SharePoint ไม่สำเร็จ');}finally{setBusy(false);}}

 async function clearTestData(){
  if(!clearArmed){setClearArmed(true);setClearMessage('กดปุ่มยืนยันอีกครั้งภายใน 15 วินาที ระบบจะลบเฉพาะข้อมูลใบสมัครและไฟล์ ไม่ลบ Lists หรือการตั้งค่า');return;}
  if(!window.confirm('ยืนยันลบข้อมูลใบสมัครทดสอบทั้งหมด? การดำเนินการนี้ย้อนกลับไม่ได้ แต่จะไม่ลบ Lists, ตำแหน่งงาน หรือการตั้งค่า Microsoft 365')){setClearArmed(false);return;}
  setBusy(true);setClearMessage('');
  try{const r=await fetch('/api/integrations/microsoft',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'clear-test-data',confirmation:'DELETE_TEST_APPLICATIONS'})});const data=await r.json() as {error?:string;fileCount?:number;sharePoint?:Record<string,number>};if(!r.ok)throw Error(data.error);const rows=Object.values(data.sharePoint||{}).reduce((sum,value)=>sum+value,0);setClearMessage(`ล้างข้อมูลแล้ว: SharePoint ${rows} รายการ และไฟล์ชั่วคราว ${data.fileCount||0} ไฟล์ โครงสร้าง Lists ยังอยู่ครบ`);setClearArmed(false);}catch(error:any){setClearMessage(error.message||'ล้างข้อมูลไม่สำเร็จ กรุณาตรวจ SharePoint ก่อนลองใหม่');}finally{setBusy(false);}
 }

 return <main className="admin-settings-page">
  <section className="admin-settings-hero">
   <div><a href="/hr">กลับพื้นที่ HR / Back to HR</a><span className="eyebrow">ADMIN CONTROL CENTER</span><h1>การตั้งค่าระบบ <span>System settings</span></h1><p>จัดการนโยบายข้อมูล การเชื่อมต่อ Microsoft 365, SharePoint และการส่งอีเมลจากที่เดียว</p></div>
   <div className="admin-health"><ShieldCheck size={24}/><span>สิทธิ์เฉพาะผู้ดูแลระบบ<br/><b>Administrator access only</b></span></div>
  </section>
  {message&&<p className="manage-message" role="status">{message}</p>}
  {!settings?<section className="settings-card"><p>กำลังโหลดการตั้งค่าระบบ…</p></section>:<>
   <section className="settings-overview" aria-label="สถานะระบบ">
    <div><Cloud/><span>Microsoft app</span><b>{settings.secretConfigured?'พร้อมใช้งาน':'ต้องตั้งค่า'}</b></div>
    <div><Database/><span>Data source</span><b>SharePoint primary</b></div>
    <div><Mail/><span>Email sender</span><b>{settings.sender||'ยังไม่ตั้งค่า'}</b></div>
    <div><KeyRound/><span>HR login</span><b>{settings.microsoftEnabled?'Microsoft 365':'ChatGPT / Pending'}</b></div>
   </section>

   <div className="admin-settings-grid">
    <section className="settings-card" id="policy"><div className="settings-card-title"><Settings2/><div><h2>นโยบายใบสมัคร</h2><p>Application & data policy</p></div></div>
     <div className="fields"><label className="field"><span>ระยะเวลาเก็บข้อมูล (ปี)</span><input type="number" min={1} max={10} value={policy.retentionYears} onChange={e=>setPolicy({...policy,retentionYears:Number(e.target.value)})}/><small>กำหนด RetentionUntil ใน SharePoint ตั้งแต่ 1–10 ปี</small></label><label className="field"><span>Privacy notice version</span><input maxLength={40} value={policy.privacyNoticeVersion} onChange={e=>setPolicy({...policy,privacyNoticeVersion:e.target.value})} placeholder="เช่น 2026-11"/><small>บันทึกกับทุกใบสมัครเพื่อระบุข้อความที่ผู้สมัครรับทราบ</small></label></div>
     <div className="settings-fixed"><span><b>Resume/CV</b> บังคับแนบก่อนส่ง</span><span><b>File limit</b> 5 MB ต่อไฟล์</span><span><b>Storage</b> SharePoint เป็นข้อมูลหลัก</span></div>
     <button className="primary" disabled={busy} onClick={savePolicy}><Save size={16}/> บันทึกนโยบาย</button>
    </section>

    <section className="settings-card" id="microsoft"><div className="settings-card-title"><KeyRound/><div><h2>Microsoft 365 application</h2><p>Identity, credentials & access</p></div></div>
     <div className="settings-meta"><div><small>Directory (tenant) ID</small><b>{settings.tenant}</b></div><div><small>Application (client) ID</small><b>{settings.client}</b></div><div><small>Client Secret</small><b>{settings.secretConfigured?'Configured':'Not configured'}</b></div><div><small>Microsoft HR login</small><b>{settings.microsoftEnabled?'Enabled':'Pending activation'}</b></div></div>
     <form autoComplete="off" onSubmit={e=>{e.preventDefault();perform('save')}}><label className="field"><span>เปลี่ยน Client Secret Value</span><input type="password" name="m365-client-secret" autoComplete="new-password" maxLength={8000} value={secret} onChange={e=>setSecret(e.target.value)} placeholder="วาง Value ใหม่เมื่อต้องการเปลี่ยน Secret"/><small>ใช้ Secret Value ไม่ใช่ Secret ID ระบบจะไม่แสดงค่าย้อนกลับ</small></label><div className="action-row"><button className="primary" disabled={busy||!secret.trim()}><Save size={16}/> บันทึก Secret</button><button type="button" className="secondary" disabled={busy||!settings.secretConfigured} onClick={()=>perform('test')}><RefreshCw size={16}/> ตรวจการเชื่อมต่อ</button></div></form>
    </section>

    <section className="settings-card settings-wide" id="sharepoint"><div className="settings-card-title"><Database/><div><h2>SharePoint database</h2><p>Schema, synchronization & document storage</p></div></div>
     <div className="settings-endpoint"><span>Site</span><a href={settings.sharePointSite} target="_blank" rel="noreferrer">{settings.sharePointSite}</a><b>Primary</b></div>
     <p>ระบบใช้ Applications, ApplicationDetails, ApplicationDocuments, ApplicationEvents, HRNotes และ Jobs โดยข้อมูลใบสมัครใหม่ต้องบันทึก SharePoint สำเร็จก่อนจึงจะแสดงว่าส่งสำเร็จ</p>
     <div className="action-row"><button type="button" className="primary" disabled={busy||!settings.secretConfigured} onClick={provisionSharePoint}><RefreshCw size={16}/> ตรวจโครงสร้างและซิงก์ข้อมูล</button><button type="button" className="secondary" disabled={busy||!settings.secretConfigured} onClick={syncExisting}>ซิงก์ข้อมูลเดิมอีกครั้ง</button></div>
     {sharePointMessage&&<p className="settings-result" role="status">{sharePointMessage}</p>}
    </section>

    <section className="settings-card settings-wide" id="email"><div className="settings-card-title"><Mail/><div><h2>อีเมลตอบรับและการทดสอบ</h2><p>Application acknowledgment email</p></div></div>
     <p><b>ผู้ส่ง / From:</b> {settings.sender||'ยังไม่ได้ตั้งค่า M365_SENDER_EMAIL'}</p><form onSubmit={e=>{e.preventDefault();sendTest()}}><div className="settings-inline-form"><label className="field"><span>อีเมลผู้รับทดสอบ</span><input type="email" required maxLength={254} value={recipient} onChange={e=>setRecipient(e.target.value)} placeholder="your.name@company.com" disabled={busy}/></label><button className="primary" disabled={busy||!settings.secretConfigured||!settings.sender||!recipient.trim()}>ส่งอีเมลทดสอบ</button></div></form><p className="muted">ส่งอีเมลจริง 1 ฉบับ กรุณาตรวจ Inbox/Junk และ Sent Items หลังทดสอบ</p>{mailMessage&&<p className="settings-result" role="status">{mailMessage}</p>}
    </section>

    <section className="settings-card settings-wide danger-zone" id="danger"><div className="settings-card-title"><TriangleAlert/><div><h2>Danger zone</h2><p>ล้างข้อมูลจำลองก่อนเปิดใช้งานจริง</p></div></div>
     <div className="danger-copy"><div><b>ล้างข้อมูลใบสมัครทดสอบทั้งหมด</b><p>ลบเฉพาะรายการใน Applications, Details, Events, HR Notes, Resume, รูป และ PDF รวมถึงสำเนา D1/R2</p><small>ไม่ลบ Lists, คอลัมน์, ตำแหน่งงาน, เนื้อหาหน้าแรก, Client Secret หรือการตั้งค่า Microsoft 365</small></div><button type="button" className={clearArmed?'primary danger-btn':'secondary danger-btn'} disabled={busy} onClick={clearTestData}><Trash2 size={16}/>{clearArmed?'ยืนยันล้างข้อมูลทั้งหมด':'ล้างข้อมูลทดสอบ'}</button></div>
     {clearMessage&&<p className="settings-result danger-result" role="status">{clearMessage}</p>}
    </section>
   </div>
  </>}
 </main>;
}
