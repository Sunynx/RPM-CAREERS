export type JobData={titleTh:string;titleEn:string;department:string;location:string;salary:string;detailsTh:string;detailsEn:string};
export type Job={id:string;status:'open'|'closed';data:JobData;created:string;updated:string};
export type CompanyContent={aboutTh:string;aboutEn:string};
export const defaultCompany:CompanyContent={aboutTh:'Royal Phuket Marina เป็นจุดหมายปลายทางริมทะเลบนชายฝั่งตะวันออกของภูเก็ต ผสานท่าจอดเรือ ที่อยู่อาศัยริมน้ำ พื้นที่ธุรกิจ และพื้นที่สำหรับกิจกรรมไว้ด้วยกัน พร้อมเป็นประตูสู่การเดินทางไปยังอ่าวพังงาและหมู่เกาะในทะเลอันดามัน เรามองหาคนที่พร้อมร่วมสร้างประสบการณ์ที่ดีให้กับผู้มาเยือนและชุมชนของเรา',aboutEn:'Royal Phuket Marina is a waterfront destination on Phuket’s east coast, bringing together a marina, waterfront residences, commercial spaces and event venues. It is a gateway to Phang Nga Bay and the islands of the Andaman Sea. We welcome people who want to help create memorable experiences for our visitors and community.'};
export function parseJob(value:unknown):JobData|null{
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const d=value as Record<string,unknown>;const result:Record<string,string>={};
 for(const [key,max] of Object.entries({titleTh:150,titleEn:150,department:150,location:200,salary:150,detailsTh:8000,detailsEn:8000})){
  const v=d[key]??'';if(typeof v!=='string'||v.length>max)return null;result[key]=v.trim();
 }
 if(!result.titleTh)return null;return result as JobData;
}
export function parseCompany(value:unknown):CompanyContent|null{
 if(!value||typeof value!=='object')return null;const d=value as CompanyContent;
 if(typeof d.aboutTh!=='string'||typeof d.aboutEn!=='string'||!d.aboutTh.trim()||!d.aboutEn.trim()||d.aboutTh.length>10000||d.aboutEn.length>10000)return null;
 return {aboutTh:d.aboutTh.trim(),aboutEn:d.aboutEn.trim()};
}
