import {env} from 'cloudflare:workers';
import {headers} from 'next/headers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {authConfig,microsoftUser} from '@/lib/microsoft-auth';
export async function getHRUser(){if(authConfig().microsoft)return microsoftUser((await headers()).get('cookie'));const user=await getChatGPTUser();return user?{...user,provider:'chatgpt' as const}:null;}
export async function canManageCareers(){
 const user=await getHRUser();if(!user)return false;
 if(user.provider==='microsoft')return authConfig().admins.includes(user.userId);
 const allowed=String((env as unknown as {HR_ADMIN_EMAILS?:string}).HR_ADMIN_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 return allowed.includes(user.email.toLowerCase());
}
