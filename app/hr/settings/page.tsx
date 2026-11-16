import {HRGate} from '@/components/careers/hr-gate';
import {MicrosoftSettings} from '@/components/careers/microsoft-settings';
export const dynamic='force-dynamic';
export default function Settings(){return <HRGate returnTo="/hr/settings"><MicrosoftSettings/></HRGate>}
