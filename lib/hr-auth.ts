import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export async function canManageCareers(){
 const user=await getChatGPTUser();
 const allowed=String((env as unknown as {HR_ADMIN_EMAILS?:string}).HR_ADMIN_EMAILS||'').split(',').map(v=>v.trim().toLowerCase()).filter(Boolean);
 return !!user&&allowed.includes(user.email.toLowerCase());
}
