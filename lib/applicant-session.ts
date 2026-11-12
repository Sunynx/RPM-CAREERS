const COOKIE='rpm_applicant';
export async function applicantSession(req:Request,create=false){
 const raw=(req.headers.get('cookie')||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
 let token=raw&&/^[a-f0-9]{64}$/.test(raw)?raw:null;
 let cookie:string|undefined;
 if(!token&&create){token=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');cookie=COOKIE+'='+token+'; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000';}
 const hash=token?Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(v=>v.toString(16).padStart(2,'0')).join(''):null;
 return {hash,cookie};
}
