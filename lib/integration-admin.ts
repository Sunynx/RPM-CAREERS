import {env} from 'cloudflare:workers';
import {getHRUser,canManageCareers} from '@/lib/hr-auth';
export async function canManageIntegrations(){const user=await getHRUser();if(!user||!await canManageCareers())return false;if(user.provider==='chatgpt')return true;return String((env as unknown as {M365_SETUP_OBJECT_IDS?:string}).M365_SETUP_OBJECT_IDS||'').split(',').map(x=>x.trim().toLowerCase()).includes(user.userId.toLowerCase());}
