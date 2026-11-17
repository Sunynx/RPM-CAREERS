import {defaultCompany,type JobData,type CompanyContent} from './careers-content';
const sample:JobData={titleTh:'เจ้าหน้าที่ IT Support (ทดสอบ)',titleEn:'IT Support Officer (Test)',department:'Information Technology',location:'Royal Phuket Marina, Phuket',salary:'20,000–25,000 บาท',detailsTh:'ข้อมูลตัวอย่างสำหรับทดสอบระบบเท่านั้น\n\nหน้าที่รับผิดชอบ\n• ดูแลคอมพิวเตอร์และระบบเครือข่าย\n• ช่วยเหลือผู้ใช้งานและประสานงานภายใน\n\nคุณสมบัติ\n• มีพื้นฐานด้าน IT และการแก้ปัญหา\n• มีทักษะการสื่อสารและทำงานเป็นทีม',detailsEn:'Sample data for testing only.\n\nResponsibilities\n• Support computers and network systems\n• Assist users and coordinate with internal teams\n\nQualifications\n• Basic IT troubleshooting skills\n• Good communication and teamwork'};
export function fillTestJob(current:JobData):JobData{
 const next={...current};for(const key of Object.keys(sample) as (keyof JobData)[])if(!next[key]?.trim())next[key]=sample[key];return next;
}
export function fillTestCompany(current:CompanyContent):CompanyContent{
 return {aboutTh:current.aboutTh.trim()?current.aboutTh:defaultCompany.aboutTh,aboutEn:current.aboutEn.trim()?current.aboutEn:defaultCompany.aboutEn};
}
