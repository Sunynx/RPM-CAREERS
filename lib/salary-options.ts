export const salaryOptions=[
 {value:'ตามตกลง',en:'Negotiable'},
 {value:'ตามประสบการณ์',en:'Based on experience'},
 ...[[12000,15000],[15000,20000],[20000,25000],[25000,30000],[30000,35000],[35000,40000],[40000,45000],[45000,50000]].map(([from,to])=>{const range=`${from.toLocaleString('en-US')}–${to.toLocaleString('en-US')}`;return {value:range+' บาท',en:range+' THB'};}),
 {value:'50,000 บาทขึ้นไป',en:'50,000 THB and above'}
];
export function salaryLabel(value:string,language:'th'|'en'){return language==='en'?(salaryOptions.find(option=>option.value===value)?.en||value):value;}
