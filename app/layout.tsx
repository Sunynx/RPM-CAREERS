import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'RPM Careers | สมัครงานออนไลน์',description:'ร่วมเป็นส่วนหนึ่งของ Royal Phuket Marina — ระบบสมัครงานออนไลน์'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="th"><body>{children}</body></html>}
