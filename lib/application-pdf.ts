import {PDFDocument,rgb,type PDFFont,type PDFPage} from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import {applicationLabels} from '@/lib/application-fields';
type Application={id:string;data:Record<string,any>;created?:string};
type Loader=(path:string)=>Promise<ArrayBuffer>;
const loadAsset:Loader=async path=>{const response=await fetch(path,{cache:'no-store'});if(!response.ok)throw Error('Unable to load PDF assets');return response.arrayBuffer();};
const string=(value:unknown)=>value===undefined||value===null?'':typeof value==='boolean'?(value?'ยืนยัน / Yes':'ไม่ / No'):String(value).replace(/[\u0000-\u0008\u000b-\u001f]/g,'');
export async function generateApplicationPdf(application:Application,loader:Loader=loadAsset){
 const d=application.data;
 const [template,thaiBytes,latinBytes]=await Promise.all(['/pdf/application-form-template.pdf','/pdf/NotoSansThai-Regular.ttf','/pdf/LiberationSans-Regular.ttf'].map(loader));
 const doc=await PDFDocument.load(template);doc.registerFontkit(fontkit);
 const thai=await doc.embedFont(thaiBytes,{subset:true}),latin=await doc.embedFont(latinBytes,{subset:true});
 const pages=doc.getPages(),ink=rgb(.08,.19,.32);
 const runs=(text:string)=>text.match(/[\u0e00-\u0e7f]+|[^\u0e00-\u0e7f]+/gu)||[];
 const fontFor=(text:string):PDFFont=>/[\u0e00-\u0e7f]/u.test(text)?thai:latin;
 const thaiChars=new Set(thai.getCharacterSet()),latinChars=new Set(latin.getCharacterSet());
 const safe=(text:string)=>Array.from(text).map(c=>(fontFor(c)===thai?thaiChars:latinChars).has(c.codePointAt(0)!)?c:'?').join('');
 const width=(text:string,size:number)=>runs(text).reduce((sum,run)=>sum+fontFor(run).widthOfTextAtSize(run,size),0);
 function draw(page:PDFPage,text:string,x:number,top:number,size:number){for(const run of runs(text)){const font=fontFor(run);page.drawText(run,{x,y:page.getHeight()-top-size,font,size,color:ink});x+=font.widthOfTextAtSize(run,size);}}
 function box(page:number,value:unknown,x:number,top:number,w:number,h=12,label='',maxSize=9){let text=safe(string(value).replace(/\s+/g,' ').trim());if(!text)return;let size=maxSize;while(width(text,size)>w&&size>6.2)size-=.2;if(width(text,size)>w){const chars=Array.from(text);let low=0,high=chars.length;while(low<high){const mid=Math.ceil((low+high)/2);if(width(chars.slice(0,mid).join('')+'...',size)<=w)low=mid;else high=mid-1;}text=chars.slice(0,low).join('')+'...';}draw(pages[page],text,x,top+Math.max(0,(h-size)/2)-1,size);}
 const field=(key:string,page:number,x:number,y:number,w:number,h=12,size=9)=>box(page,d[key],x,y,w,h,applicationLabels[key]||key,size);
 function dot(page:number,x:number,y:number){pages[page].drawCircle({x,y:pages[page].getHeight()-y,size:2,color:ink});}
 function choice(key:string,page:number,top:number,options:Record<string,number>){const x=options[string(d[key])];if(x!==undefined)dot(page,x,top);}
 const date=(value:unknown)=>{const text=string(value);if(/^\d{4}-\d{2}-\d{2}$/.test(text))return text.slice(8,10)+'/'+text.slice(5,7)+'/'+text.slice(0,4);return text;};
 // Page one: the supplied form's original field positions, in PDF points.
 field('position',0,150,214,250,15,10);box(0,d.salary?Number(d.salary).toLocaleString('en-US'):d.salary,495,217,82,12,'เงินเดือนที่ต้องการ',10);
 field('nameEn',0,231,247,145,12);field('nameTh',0,205,268,172,12);field('nickname',0,415,271,55,12);
 if(d.gender==='ชาย')box(0,'X',560,246,15);else if(d.gender==='หญิง')box(0,'X',560,268,15);
 field('address',0,159,302,218,12,8);field('phone',0,418,302,51,10,7);field('email',0,480,305,97,10,7);
 box(0,date(d.dob),146,330,83);if(d.dob){const at=new Date(application.created||d.signatureDate||Date.now()),birth=new Date(d.dob);if(Number.isFinite(at.getTime())&&Number.isFinite(birth.getTime()))box(0,at.getFullYear()-birth.getFullYear()-(at.getMonth()<birth.getMonth()||(at.getMonth()===birth.getMonth()&&at.getDate()<birth.getDate())?1:0),267,330,24);}
 field('nationality',0,328,331,50);field('race',0,418,331,51);field('religion',0,517,331,60);
 field('idCard',0,146,351,181);box(0,date(d.issuedDate),132,382,61);box(0,date(d.expiry),267,382,60);field('issuedAt',0,339,376,130,10,8);field('province',0,513,362,64);field('tax',0,430,403,147);
 field('hospital',0,388,432,95);
 choice('living',0,454,{'บ้านส่วนตัว':180,'บ้านเช่า':271,'อยู่กับผู้ปกครอง':356,'อยู่กับผู้อื่น':476});
 choice('marital',0,483,{'โสด':177,'แต่งงาน':249,'หย่า':332,'หม้าย':418,'แยกกันอยู่':506});
 if(d.marital==='แต่งงาน'){choice('registered',0,512,{'จดทะเบียน':177,'ไม่ได้จดทะเบียน':249});choice('spouseIncome',0,512,{'มี':486,'ไม่มี':531});field('spouse',0,157,546,180);field('spouseJob',0,408,546,168);field('spouseAddress',0,143,575,154,12,8);}
 field('children',0,359,575,64);field('childrenSchool',0,533,575,44);
 field('father',0,151,604,91,12,8);field('fatherAge',0,274,604,25);field('fatherJob',0,353,604,70,12,8);choice('fatherStatus',0,598,{'มีชีวิต':439,'ถึงแก่กรรม':486});
 field('mother',0,151,632,91,12,8);field('motherAge',0,274,632,25);field('motherJob',0,353,632,70,12,8);choice('motherStatus',0,627,{'มีชีวิต':439,'ถึงแก่กรรม':486});
 choice('military',0,655,{'ได้รับการยกเว้น':194,'ศึกษาวิชาทหาร':293,'ผ่านการเกณฑ์ทหาร':419,'อื่น ๆ':515});
 // Fixed education rows in the original form. Additional records are omitted to keep the original two-page form.
 const educationY=[758,787,816,845,874,903];const used=new Set<number>();
 for(const row of Array.isArray(d.education)?d.education:[]){const level=string(row?.level);const index=level.includes('ประถม')?0:level.includes('มัธยม')?1:level.includes('อนุปริญญา')||level.includes('ปวส')?3:level.includes('อาชีว')||level.includes('ปวช')?2:level.includes('ปริญญาตรี')?4:5;
  if(used.has(index))continue;used.add(index);const y=educationY[index];box(0,row.institute,176,y,180,16,'สถาบัน / Institute');box(0,row.from,362,y,55,16,'ปีเริ่ม / From');box(0,row.to,425,y,54,16,'ปีสิ้นสุด / To');box(0,row.course||level,489,y,91,16,'สาขา / Course');}
 // Page two: language ratings, employment, references and declarations.
 const levels=['ดีมาก','ดี','พอใช้','นิดหน่อย'];
 (Array.isArray(d.languages)?d.languages:[]).forEach((row:any,i:number)=>{if(i>=4)return;const top=86+i*27;box(1,row.language,65,top,48,17,'ภาษา / Language',8);['speaking','understanding','reading','writing'].forEach((key,j)=>{const rating=levels.indexOf(row[key]);if(rating>=0)box(1,'X',123+j*119.5+rating*29.85,top,18,17);});});
 if(d.noExperience===true)box(1,'ไม่มีประสบการณ์ทำงาน / No previous employment',68,248,495,17);
 else (Array.isArray(d.employment)?d.employment:[]).forEach((row:any,i:number)=>{if(i>=7)return;const top=244+i*26.9;box(1,row.company,66,top,129,22,'บริษัท / Company',8);box(1,row.from,200,top,39,22,'เริ่มงาน / From',7);box(1,row.to,245,top,38,22,'สิ้นสุด / To',7);box(1,row.position,289,top,85,22,'ตำแหน่ง / Position',8);box(1,row.responsibility,380,top,139,22,'หน้าที่ / Responsibilities',8);box(1,row.salary,525,top,65,22,'เงินเดือน / Last salary',8);});
 (Array.isArray(d.references)?d.references:[]).forEach((row:any,i:number)=>{if(i>=2)return;const top=500+i*27;box(1,row.name,32,top,100,23,'ชื่อบุคคลอ้างอิง / Reference name',8);box(1,row.relation,138,top,107,23,'ความสัมพันธ์ / Relationship',8);box(1,row.address,251,top,108,23,'ที่อยู่บุคคลอ้างอิง / Reference address',8);box(1,row.position,365,top,107,23,'ตำแหน่งบุคคลอ้างอิง / Reference position',8);box(1,row.phone,479,top,111,23,'โทรศัพท์บุคคลอ้างอิง / Reference phone',8);});
 if(d.computer){pages[1].drawRectangle({x:162,y:1008-586,width:150,height:13,color:rgb(1,1,1)});dot(1,44,576);field('computer',1,162,574,150,11,8);}if(d.fax==='ใช้งานได้')dot(1,44,592);if(d.typing){pages[1].drawRectangle({x:136,y:1008-620,width:176,height:13,color:rgb(1,1,1)});dot(1,44,610);field('typing',1,136,608,176,11,8);}if(d.otherSkills){pages[1].drawRectangle({x:66,y:1008-655,width:246,height:15,color:rgb(1,1,1)});dot(1,44,626);field('otherSkills',1,66,641,246,11,8);}
 choice('shift',1,561,{'ได้':517,'ไม่ได้':559});choice('guarantor',1,599,{'ได้':517,'ไม่ได้':559});choice('rotate',1,634,{'ได้':518,'ไม่ได้':560});field('relative',1,205,682,240,11,8);field('relativeRelation',1,518,682,72,11,8);
 field('signature',1,218,806,158,13,9);box(1,date(d.signatureDate||application.created?.slice(0,10)),417,806,147,13,'วันที่ยืนยัน / Date',8);
 if(d.photo?.key&&/^[a-f0-9-]{36}$/i.test(d.photo.key)){try{const bytes=await loader('/api/files?key='+encodeURIComponent(d.photo.key));const image=d.photo.type==='image/png'?await doc.embedPng(bytes):await doc.embedJpg(bytes);const dims=image.scaleToFit(90,110);pages[0].drawRectangle({x:493,y:doc.getPage(0).getHeight()-200,width:90,height:110,color:rgb(1,1,1)});pages[0].drawImage(image,{x:493+(90-dims.width)/2,y:doc.getPage(0).getHeight()-200+(110-dims.height)/2,width:dims.width,height:dims.height});}catch{/* Leave the original photo box blank when the protected image is unavailable. */}}
 for(const [i,page] of doc.getPages().entries()){draw(page,`${application.id}  |  ${i+1} / ${doc.getPageCount()}`,30,979,8);}
 doc.setTitle(`Application ${application.id} — Royal Phuket Marina`);doc.setAuthor('Royal Phuket Marina');doc.setSubject('Application data in the supplied company form');
 return doc.save();
}
export async function downloadApplicationPdf(application:Application){const bytes=await generateApplicationPdf(application);const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));const link=document.createElement('a');link.href=url;link.download=`Application-${application.id.replace(/[^a-zA-Z0-9-]/g,'')}.pdf`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}

export async function printApplicationPdf(application:Application,preview:Window){
 const bytes=await generateApplicationPdf(application);
 if(preview.closed)throw Error('Print window was closed');
 const url=URL.createObjectURL(new Blob([new Uint8Array(bytes)],{type:'application/pdf'}));
 const page=preview.document;page.title=`Print application ${application.id}`;
 page.body.replaceChildren();page.body.style.cssText='margin:0;height:100vh;display:flex;flex-direction:column;background:#f4f5f8;font:14px Tahoma,Arial,sans-serif';
 const bar=page.createElement('div');bar.style.cssText='padding:12px 16px;display:flex;gap:16px;align-items:center;flex-wrap:wrap';
 const button=page.createElement('button');button.textContent='พิมพ์แบบฟอร์ม / Print form';button.style.cssText='padding:10px 18px;border:0;border-radius:6px;background:#1a2e50;color:white;cursor:pointer';
 const note=page.createElement('span');note.textContent='หากหน้าพิมพ์ไม่เปิด ให้กดปุ่มพิมพ์ในแถบ PDF / You can also use the PDF viewer’s print button.';
 const frame=page.createElement('iframe');frame.title='Application form PDF';frame.style.cssText='width:100%;flex:1;border:0';
 const print=()=>{try{frame.contentWindow?.focus();frame.contentWindow?.print();}catch{note.textContent='กรุณากดปุ่มพิมพ์ในแถบ PDF / Please use the PDF viewer’s print button.';}};
 button.onclick=print;frame.onload=()=>{preview.setTimeout(print,900);};frame.src=url;
 bar.appendChild(button);bar.appendChild(note);page.body.appendChild(bar);page.body.appendChild(frame);preview.focus();
 preview.addEventListener('beforeunload',()=>URL.revokeObjectURL(url),{once:true});
}
