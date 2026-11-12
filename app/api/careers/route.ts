import {env} from 'cloudflare:workers';
import {defaultCompany} from '@/lib/careers-content';
export const dynamic='force-dynamic';
export async function GET(){try{
 const results=await env.DB!.prepare("SELECT * FROM jobs WHERE status='open' ORDER BY created DESC LIMIT 200").all();
 const content=await env.DB!.prepare('SELECT data FROM homepage_content WHERE id=?').bind('company').first<{data:string}>();
 return Response.json({jobs:results.results.map((r:any)=>({...r,data:JSON.parse(r.data)})),company:content?JSON.parse(content.data):defaultCompany},{headers:{'Cache-Control':'no-store'}});
}catch{return Response.json({error:'ไม่สามารถโหลดตำแหน่งงานได้'},{status:500})}}
