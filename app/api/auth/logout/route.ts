import {authConfig,authCookie,HR_COOKIE,FLOW_COOKIE} from '@/lib/microsoft-auth';
export const dynamic='force-dynamic';
export async function GET(){const headers=new Headers({'Cache-Control':'no-store',Location:authConfig().microsoft?'/hr':'/signout-with-chatgpt?return_to=%2Fhr'});headers.append('Set-Cookie',authCookie(HR_COOKIE,'',0));headers.append('Set-Cookie',authCookie(FLOW_COOKIE,'',0));return new Response(null,{status:302,headers});}
