type RpmLogoProps={height?:number;className?:string;tone?:'navy'|'white'|'gold';label?:string};

export function RpmLogo({height=24,className='',tone='navy',label}:RpmLogoProps){
 return <span className={`rpm-system-logo rpm-logo-${tone} ${className}`} style={{width:Math.round(height*3),height}} role={label?'img':undefined} aria-label={label} aria-hidden={label?undefined:true}/>;
}
