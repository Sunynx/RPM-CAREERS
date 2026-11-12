import CareersApp from '@/components/careers/app-shell';
import {HRGate} from '@/components/careers/hr-gate';
export const dynamic='force-dynamic';
export default function HR(){return <HRGate returnTo="/hr"><CareersApp initialView="hr" backstage/></HRGate>}
