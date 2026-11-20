type RpmLogoProps={height?:number;className?:string};

export function RpmLogo({height=24,className=''}:RpmLogoProps){
 return <img className={'rpm-system-logo '+className} src="/royal-phuket-marina-logo.png" width={Math.round(height*3)} height={height} alt="" aria-hidden="true"/>;
}
