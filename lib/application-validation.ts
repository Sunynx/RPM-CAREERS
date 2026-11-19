import {salaryOptions} from '@/lib/salary-options';
export type ApplicationData = Record<string, any>;
export type ApplicationIssue = {step:number;path:string;message:string};
export const requiredFields:Record<string,{step:number;label:string}> = Object.fromEntries([
 [0,'position','ตำแหน่งที่ต้องการ'],[0,'startDate','วันที่เริ่มงานได้'],[0,'salary','เงินเดือนที่ต้องการ'],[0,'nameTh','ชื่อ–นามสกุลภาษาไทย'],[0,'nameEn','ชื่อ–นามสกุลภาษาอังกฤษ'],[0,'gender','เพศ'],[0,'dob','วันเดือนปีเกิด'],[0,'nationality','สัญชาติ'],[0,'address','ที่อยู่ปัจจุบัน'],[0,'phone','โทรศัพท์'],[0,'email','อีเมล'],
 [1,'living','สถานภาพความเป็นอยู่'],[1,'marital','สถานภาพสมรส'],[1,'fatherStatus','สถานะบิดา'],[1,'motherStatus','สถานะมารดา'],[1,'military','สถานภาพทางทหาร'],
 [5,'shift','การทำงานเป็นกะ'],[5,'guarantor','การจัดหาผู้ค้ำประกัน'],[5,'rotate','การหมุนเวียนตำแหน่ง'],[5,'emergency','ชื่อผู้ติดต่อฉุกเฉิน'],[5,'emergencyRelation','ความสัมพันธ์กับผู้ติดต่อฉุกเฉิน'],[5,'emergencyPhone','โทรศัพท์ผู้ติดต่อฉุกเฉิน'],[6,'signature','ชื่อผู้ยืนยันใบสมัคร']
].map(([step,key,label])=>[key,{step,label}])) as Record<string,{step:number;label:string}>;
export const rowRules:Record<string,{step:number;label:string;fields:Record<string,string>}>={
 education:{step:2,label:'ประวัติการศึกษา',fields:{level:'ระดับการศึกษา',institute:'ชื่อสถาบัน',from:'ปีที่เริ่มศึกษา',to:'ปีที่สิ้นสุด / ปีปัจจุบัน',course:'สาขาวิชา / หลักสูตร'}},
 languages:{step:3,label:'ทักษะภาษา',fields:{language:'ภาษา',speaking:'การพูด',understanding:'ความเข้าใจ',reading:'การอ่าน',writing:'การเขียน'}},
 employment:{step:4,label:'ประสบการณ์ทำงาน',fields:{company:'ชื่อสถานประกอบการ',position:'ตำแหน่ง',from:'เดือนที่เริ่มงาน',salary:'เงินเดือนครั้งล่าสุด',responsibility:'หน้าที่รับผิดชอบ'}},
 references:{step:5,label:'บุคคลอ้างอิง',fields:{name:'ชื่อ–นามสกุล',relation:'ความสัมพันธ์',address:'สถานที่ทำงาน / ที่อยู่',position:'ตำแหน่ง (หากไม่มีให้ระบุว่าไม่มี)',phone:'โทรศัพท์'}}
};
export function isRequiredField(key:string,d:ApplicationData){
 return !!requiredFields[key] || (['registered','spouseIncome','spouse'].includes(key)&&d.marital==='แต่งงาน') || (['spouseJob','spousePhone','spouseAddress'].includes(key)&&d.marital==='แต่งงาน'&&d.spouseIncome==='มี') || (['father','mother'].includes(key)&&['มีชีวิต','ถึงแก่กรรม'].includes(d[key+'Status'])) || (key==='relativeRelation'&&hasValue(d.relative)&&String(d.relative).trim()!=='ไม่มี');
}
export function isRequiredRowField(key:string,field:string,row:ApplicationData){return key!=='references' && !!rowRules[key]?.fields[field] && !(key==='education'&&row.level==='ไม่ได้รับการศึกษาในระบบ'&&field!=='level');}
const hasValue=(v:unknown)=>typeof v==='number'?Number.isFinite(v):typeof v==='string'&&v.trim().length>0;
const phoneOk=(v:unknown)=>typeof v==='string'&&/^\+?[0-9\s-]{9,15}$/.test(v.trim())&&v.replace(/\D/g,'').length>=9;
const numeric=(v:unknown)=>hasValue(v)&&['number','string'].includes(typeof v)&&Number.isFinite(Number(v))&&Number(v)>=0;
const dateOk=(v:unknown)=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const n=new Date(v+'T00:00:00Z');return Number.isFinite(n.getTime())&&n.toISOString().slice(0,10)===v;};
const monthOk=(v:unknown)=>typeof v==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(v);
export function validateApplication(data:unknown,onlyStep?:number):ApplicationIssue[]{
 const d:ApplicationData=data&&typeof data==='object'&&!Array.isArray(data)?data:{};const errors:ApplicationIssue[]=[];
 const add=(step:number,path:string,message:string)=>{if((onlyStep===undefined||onlyStep===step)&&!errors.some(e=>e.path===path))errors.push({step,path,message});};
 const need=(step:number,path:string,label:string,value:unknown)=>{if(!hasValue(value))add(step,path,'กรุณากรอก '+label);};
 for(const [key,r] of Object.entries(requiredFields)){need(r.step,key,r.label,d[key]);if(hasValue(d[key])&&!['salary','children','childrenSchool'].includes(key)&&typeof d[key]!=='string')add(r.step,key,'กรุณากรอก '+r.label+' เป็นข้อความ');}
 for(const k of ['registered','spouseIncome','spouse','spouseJob','spousePhone','spouseAddress','father','mother','relativeRelation'])if(isRequiredField(k,d))need(k==='relativeRelation'?5:1,k,({registered:'การจดทะเบียนสมรส',spouseIncome:'รายได้คู่สมรส',spouse:'ชื่อคู่สมรส',spouseJob:'อาชีพคู่สมรส',spousePhone:'โทรศัพท์คู่สมรส',spouseAddress:'สถานที่ทำงานคู่สมรส',father:'ชื่อบิดา',mother:'ชื่อมารดา',relativeRelation:'ความสัมพันธ์กับคนรู้จักในบริษัท'} as Record<string,string>)[k],d[k]);
 const choices:Record<string,string[]>={gender:['ชาย','หญิง','อื่น ๆ','ไม่ประสงค์ระบุ'],living:['บ้านส่วนตัว','บ้านเช่า','อยู่กับผู้ปกครอง','อยู่กับผู้อื่น'],marital:['โสด','แต่งงาน','หย่า','หม้าย','แยกกันอยู่'],fatherStatus:['มีชีวิต','ถึงแก่กรรม','ไม่ทราบ / ไม่สะดวกให้ข้อมูล'],motherStatus:['มีชีวิต','ถึงแก่กรรม','ไม่ทราบ / ไม่สะดวกให้ข้อมูล'],military:['ได้รับการยกเว้น','ศึกษาวิชาทหาร','ผ่านการเกณฑ์ทหาร','อื่น ๆ','ไม่เกี่ยวข้อง'],fax:['ใช้งานได้','ใช้งานไม่ได้'],shift:['ได้','ไม่ได้'],guarantor:['ได้','ไม่ได้'],rotate:['ได้','ไม่ได้']};
 for(const [key,options] of Object.entries(choices))if(hasValue(d[key])&&!options.includes(d[key]))add(requiredFields[key]?.step??3,key,'กรุณาเลือก '+(requiredFields[key]?.label??'การใช้โทรสาร')+' จากตัวเลือก');
 if(d.marital==='แต่งงาน'){for(const [key,options] of Object.entries({registered:['จดทะเบียน','ไม่ได้จดทะเบียน'],spouseIncome:['มี','ไม่มี']}))if(hasValue(d[key])&&!options.includes(d[key]))add(1,key,'กรุณาเลือกข้อมูลคู่สมรสจากตัวเลือก');}
 for(const [key,r] of Object.entries(rowRules)){
  if(key==='employment'&&d.noExperience===true)continue;
  const rows=d[key];if(key==='references'&&(!Array.isArray(rows)||!rows.length))continue;if(!Array.isArray(rows)||!rows.length){add(r.step,key,key==='employment'?'กรุณาเพิ่มประสบการณ์ทำงาน หรือเลือกว่ายังไม่มีประสบการณ์ทำงาน':'กรุณาเพิ่ม'+r.label+'อย่างน้อย 1 รายการ');continue;}
  if(rows.length>(key==='references'?2:key==='languages'?6:8))add(r.step,key,'จำนวนรายการ'+r.label+'เกินที่กำหนด');
  rows.forEach((raw:unknown,i:number)=>{
   const row:ApplicationData=raw&&typeof raw==='object'&&!Array.isArray(raw)?raw:{};const prefix=key+'.'+i+'.';
   for(const [field,label] of Object.entries(r.fields))if(isRequiredRowField(key,field,row)){need(r.step,prefix+field,r.label+' '+(i+1)+': '+label,row[field]);if(hasValue(row[field])&&!['salary','from','to'].includes(field)&&typeof row[field]!=='string')add(r.step,prefix+field,'กรุณากรอก '+label+' เป็นข้อความ');}
   if(key==='references'&&hasValue(row.phone)&&!phoneOk(row.phone))add(r.step,prefix+'phone','กรุณาตรวจสอบโทรศัพท์บุคคลอ้างอิง '+(i+1));
   if(key==='education'&&row.level!=='ไม่ได้รับการศึกษาในระบบ'){
    for(const k of ['from','to'])if(hasValue(row[k])&&(!numeric(row[k])||!Number.isInteger(Number(row[k]))||Number(row[k])<1900||Number(row[k])>3000))add(r.step,prefix+k,'กรุณาระบุปีการศึกษาเป็นปี ค.ศ. หรือ พ.ศ. 4 หลัก');
    if(numeric(row.from)&&numeric(row.to)&&Number(row.to)<Number(row.from))add(r.step,prefix+'to','ปีสิ้นสุดการศึกษาต้องไม่ก่อนปีที่เริ่ม');
   }
   if(key==='employment'){
    if(hasValue(row.from)&&!monthOk(row.from))add(r.step,prefix+'from','กรุณาตรวจสอบเดือนที่เริ่มงาน');
    if(hasValue(row.to)&&(!monthOk(row.to)||(monthOk(row.from)&&row.to<row.from)))add(r.step,prefix+'to','เดือนสิ้นสุดต้องไม่ก่อนเดือนที่เริ่มงาน');
    if(hasValue(row.salary)&&!numeric(row.salary))add(r.step,prefix+'salary','เงินเดือนครั้งล่าสุดต้องเป็นตัวเลขตั้งแต่ 0 ขึ้นไป');
   }
  });
 }
 for(const [k,step] of [['phone',0],['emergencyPhone',5],['spousePhone',1],['fatherPhone',1],['motherPhone',1]] as const)if(hasValue(d[k])&&!(k==='spousePhone'&&d.marital!=='แต่งงาน')&&!phoneOk(d[k]))add(step,k,'กรุณาตรวจสอบหมายเลขโทรศัพท์');
 if(hasValue(d.email)&&(typeof d.email!=='string'||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())))add(0,'email','กรุณากรอกอีเมลให้ถูกต้อง');
 for(const k of ['startDate','dob'])if(hasValue(d[k])&&(!dateOk(d[k])||(k==='dob'&&d[k]>new Date().toISOString().slice(0,10))))add(0,k,k==='dob'?'กรุณาระบุวันเกิดที่ถูกต้องและไม่ใช่วันในอนาคต':'กรุณาระบุวันที่เริ่มงานให้ถูกต้อง');
 if(hasValue(d.salary)&&!salaryOptions.some(option=>option.value===d.salary))add(0,'salary','กรุณาเลือกช่วงเงินเดือนจากตัวเลือก');
 for(const [k,step] of [['children',1],['childrenSchool',1]] as const)if(hasValue(d[k])&&(!numeric(d[k])||!Number.isInteger(Number(d[k]))))add(step,k,'กรุณากรอกตัวเลขตั้งแต่ 0 ขึ้นไป โดยไม่มีทศนิยม');
 if(numeric(d.children)&&numeric(d.childrenSchool)&&Number(d.childrenSchool)>Number(d.children))add(1,'childrenSchool','จำนวนบุตรที่กำลังศึกษาต้องไม่เกินจำนวนบุตรทั้งหมด');
 if(!Array.isArray(d.files)||!d.files.some((f:any)=>f&&typeof f.key==='string'&&/^[a-f0-9-]{36}$/i.test(f.key)&&typeof f.name==='string'&&f.name.trim()&&['application/pdf','image/jpeg','image/png'].includes(f.type)&&Number.isFinite(f.size)&&f.size>0&&f.size<=5*1024*1024))add(6,'files','กรุณาแนบ Resume หรือ CV อย่างน้อย 1 ไฟล์ / Please upload a Resume or CV');
 if(d.certify!==true)add(6,'certify','กรุณารับรองความถูกต้องของข้อมูล');
 if(d.acknowledge!==true)add(6,'acknowledge','กรุณายืนยันการรับทราบการใช้ข้อมูล');
 if(['race','religion','blood'].some(k=>hasValue(d[k]))&&d.sensitiveConsent!==true)add(6,'sensitiveConsent','กรุณายินยอมให้ใช้ข้อมูลอ่อนไหวที่เลือกกรอก หรือกลับไปลบข้อมูลดังกล่าว');
 return errors.sort((a,b)=>a.step-b.step);
}
