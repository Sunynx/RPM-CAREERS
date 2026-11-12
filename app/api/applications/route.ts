import { env } from 'cloudflare:workers';
export const dynamic='force-dynamic';
const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'no-store'}});
const statuses=['Draft','New','Review','Interview','Offered','Rejected'];
export async function GET(){try{const r=await env.DB!.prepare('SELECT * FROM applications ORDER BY updated DESC').all();return json(r.results.map((x:any)=>({...x,data:JSON.parse(x.data)})))}catch{return json({error:'ไม่สามารถโหลดใบสมัครได้ กรุณาลองใหม่'},500)}}
export async function POST(req:Request){
 if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Forbidden'},403);
 try{const b=await req.json() as any; if(!b.data||typeof b.data!=='object'||JSON.stringify(b.data).length>160000)return json({error:'ข้อมูลไม่ถูกต้อง'},400);
 const status=b.status==='Draft'?'Draft':'New'; const d=b.data;
 if(status==='New'&&['race','religion','blood'].some(k=>d[k])&&!d.sensitiveConsent)return json({error:'โปรดยืนยันการใช้ข้อมูลอ่อนไหวหรือเว้นว่างข้อมูลดังกล่าว'},400);
 if(status==='New'&&(!d.position||!d.nameTh||!d.phone||!d.email||!d.certify||!d.acknowledge||!d.signature))return json({error:'กรุณากรอกข้อมูลที่จำเป็นและยืนยันใบสมัคร'},400);
 if(status==='New'&&(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email)||!/^\+?[0-9\s-]{9,15}$/.test(d.phone)))return json({error:'โปรดตรวจสอบอีเมลและเบอร์โทรศัพท์'},400);
 let id=b.id; const now=new Date().toISOString();
 if(id){const old=await env.DB!.prepare('SELECT status FROM applications WHERE id=?').bind(id).first();if(!old||old.status!=='Draft')return json({error:'ใบสมัครนี้ไม่ใช่ฉบับร่าง'},409);await env.DB!.prepare('UPDATE applications SET data=?,status=?,updated=? WHERE id=?').bind(JSON.stringify(d),status,now,id).run()}
 else{id='RPM-'+now.slice(0,10).replaceAll('-','')+'-'+crypto.randomUUID().slice(0,8).toUpperCase();await env.DB!.prepare('INSERT INTO applications (id,status,data,created,updated,note) VALUES (?,?,?,?,?,?)').bind(id,status,JSON.stringify(d),now,now,'').run()}
 return json({id,status});}catch{return json({error:'บันทึกไม่สำเร็จ กรุณาลองใหม่'},500)}
}
export async function PATCH(req:Request){if(req.headers.get('origin')&&req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Forbidden'},403);try{const b=await req.json() as any;if(!b.id||!statuses.includes(b.status)||b.status==='Draft')return json({error:'สถานะไม่ถูกต้อง'},400);const old=await env.DB!.prepare('SELECT id FROM applications WHERE id=? AND status!=?').bind(b.id,'Draft').first();if(!old)return json({error:'ไม่พบใบสมัคร'},404);await env.DB!.prepare('UPDATE applications SET status=?,note=?,updated=? WHERE id=?').bind(b.status,String(b.note||'').slice(0,10000),new Date().toISOString(),b.id).run();return json({ok:true})}catch{return json({error:'อัปเดตไม่สำเร็จ'},500)}}
