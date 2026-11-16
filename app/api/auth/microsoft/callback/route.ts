import {getM365Secret} from '@/lib/m365-secret';
import {authConfig,authReady,cookieValue,verifyAuth,verifyMicrosoftIdToken,signAuth,authCookie,FLOW_COOKIE,HR_COOKIE} from '@/lib/microsoft-auth';
export const dynamic='force-dynamic';
export async function GET(req:Request){const headers=new Headers({'Cache-Control':'no-store'});headers.append('Set-Cookie',authCookie(FLOW_COOKIE,'',0));try{
 if(!authConfig().microsoft||!await authReady())return new Response('Microsoft sign-in is not configured.',{status:503,headers});
 const url=new URL(req.url),flowToken=cookieValue(req.headers.get('cookie'),FLOW_COOKIE),code=url.searchParams.get('code');
 if(!flowToken||!code||url.searchParams.has('error'))return new Response('Sign-in could not be completed. Please return to /hr and try again.',{status:400,headers});
 const flow=await verifyAuth(flowToken,'rpm-hr-flow');if(flow.state!==url.searchParams.get('state')||typeof flow.verifier!=='string'||typeof flow.nonce!=='string'||flow.redirectUri!==new URL('/api/auth/microsoft/callback',url.origin).href)return new Response('Invalid sign-in request. Please return to /hr.',{status:400,headers});
 const c=authConfig();const response=await fetch(`https://login.microsoftonline.com/${c.tenant}/oauth2/v2.0/token`,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:c.client,client_secret:await getM365Secret(),grant_type:'authorization_code',code,redirect_uri:String(flow.redirectUri),code_verifier:flow.verifier,scope:'openid profile email'}),signal:AbortSignal.timeout(10000)});
 if(!response.ok)return new Response('Sign-in failed. Please contact IT or try again.',{status:401,headers});
 const tokens=await response.json() as {id_token?:string};if(!tokens.id_token)throw Error('Missing identity');const p=await verifyMicrosoftIdToken(tokens.id_token,flow.nonce);
 if(!c.admins.includes(String(p.oid)))return new Response('This Microsoft account is not authorized for HR. Please contact IT.',{status:403,headers});
 const session=await signAuth({oid:p.oid,tid:p.tid,email:typeof p.preferred_username==='string'?p.preferred_username:typeof p.email==='string'?p.email:'',name:typeof p.name==='string'?p.name:'HR'},'rpm-hr-session',8*3600);headers.append('Set-Cookie',authCookie(HR_COOKIE,session,8*3600));headers.set('Location',['/hr/manage','/hr/settings'].includes(String(flow.returnTo))?String(flow.returnTo):'/hr');return new Response(null,{status:302,headers});
 }catch{return new Response('Sign-in could not be verified. Please return to /hr and try again.',{status:401,headers});}}
