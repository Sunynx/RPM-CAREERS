import {authConfig} from '@/lib/microsoft-auth';
import {canManageCareers,getHRUser} from '@/lib/hr-auth';
import {chatGPTSignInPath,chatGPTSignOutPath} from '@/app/chatgpt-auth';
export async function HRGate({children,returnTo}:{children:React.ReactNode;returnTo:string}){
 const user=await getHRUser();const microsoft=authConfig().microsoft;
 if(!user)return <main><section className="hr-access"><img src="/royal-phuket-marina-logo.png" alt="Royal Phuket Marina" className="brand-logo"/><h1>พื้นที่สำหรับ HR · HR workspace</h1><p>เข้าสู่ระบบด้วยบัญชีที่ได้รับสิทธิ์ / Sign in with an authorized account.</p><a className="primary" href={microsoft?'/api/auth/microsoft/login?return_to='+encodeURIComponent(returnTo):chatGPTSignInPath(returnTo)} target="_top">{microsoft?'เข้าสู่ระบบ Microsoft 365 / Sign in with Microsoft 365':'เข้าสู่ระบบ HR / HR sign in'}</a><a href="/">กลับหน้าเว็บไซต์ / Back to careers</a></section></main>;
 if(!await canManageCareers())return <main><section className="hr-access"><h1>บัญชีนี้ยังไม่มีสิทธิ์ HR / HR access required</h1><p>โปรดติดต่อผู้ดูแลระบบเพื่อเพิ่มสิทธิ์บัญชีนี้ / Contact your administrator to request access.</p><a href={microsoft?'/api/auth/logout':chatGPTSignOutPath(returnTo)} target="_top">ออกจากระบบ / Sign out</a><a href="/">กลับหน้าเว็บไซต์ / Back to careers</a></section></main>;
 return <>{children}</>;
}
