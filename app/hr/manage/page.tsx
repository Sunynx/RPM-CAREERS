import CareersApp from '@/components/careers/app-shell';
import {HRGate} from '@/components/careers/hr-gate';
export const dynamic='force-dynamic';
export default function Manage(){return <HRGate returnTo="/hr/manage"><CareersApp initialView="manage" backstage/></HRGate>}
