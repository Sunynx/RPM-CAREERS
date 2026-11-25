import type { Metadata, Viewport } from 'next';
import './globals.css';
export const viewport: Viewport = {width:'device-width',initialScale:1,viewportFit:'cover',themeColor:'#1e365b'};
export const metadata: Metadata = {
 title:'RPM Careers',
 description:'ร่วมเป็นส่วนหนึ่งของ Royal Phuket Marina — ระบบสมัครงานออนไลน์',
 icons:{icon:{url:'/rpm-full-logo-favicon.png',type:'image/png',sizes:'64x64'}},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>}
