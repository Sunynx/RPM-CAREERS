import {env} from 'cloudflare:workers';

export type SystemSettings={retentionYears:number;privacyNoticeVersion:string};
export const defaultSystemSettings:SystemSettings={retentionYears:2,privacyNoticeVersion:'2026-11'};

export async function getSystemSettings():Promise<SystemSettings>{
 try{
  const result=await env.DB!.prepare("SELECT id,value FROM system_settings WHERE id IN ('retention-years','privacy-notice-version')").all<{id:string;value:string}>();
  const values=new Map(result.results.map(row=>[row.id,row.value]));
  const years=Number(values.get('retention-years'));
  const version=String(values.get('privacy-notice-version')||defaultSystemSettings.privacyNoticeVersion).trim();
  return {retentionYears:Number.isInteger(years)&&years>=1&&years<=10?years:defaultSystemSettings.retentionYears,privacyNoticeVersion:/^[a-zA-Z0-9._-]{1,40}$/.test(version)?version:defaultSystemSettings.privacyNoticeVersion};
 }catch{return defaultSystemSettings;}
}

export async function saveSystemSettings(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid settings');
 const input=value as Record<string,unknown>,retentionYears=Number(input.retentionYears),privacyNoticeVersion=String(input.privacyNoticeVersion||'').trim();
 if(!Number.isInteger(retentionYears)||retentionYears<1||retentionYears>10||!/^[a-zA-Z0-9._-]{1,40}$/.test(privacyNoticeVersion))throw Error('Invalid settings');
 const now=new Date().toISOString();
 await env.DB!.batch([
  env.DB!.prepare('INSERT INTO system_settings (id,value,updated) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind('retention-years',String(retentionYears),now),
  env.DB!.prepare('INSERT INTO system_settings (id,value,updated) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET value=excluded.value,updated=excluded.updated').bind('privacy-notice-version',privacyNoticeVersion,now)
 ]);
 return {retentionYears,privacyNoticeVersion};
}
