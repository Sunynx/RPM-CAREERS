import {cloneElement,isValidElement,type ReactNode,type ReactElement} from 'react';
import translations from './translations.json';
const dictionary=translations as Record<string,string>;
export function translateText(text:string):string{
 const trimmed=text.trim();if(dictionary[trimmed]!==undefined)return text.replace(trimmed,dictionary[trimmed]);
 for(const prefix of ['เลือก','ลบรายการ ','ลบ ','เพิ่ม','บันทึกล่าสุด '])if(trimmed.startsWith(prefix))return (dictionary[prefix.trim()]||prefix)+' '+translateText(trimmed.slice(prefix.length));
 return text;
}
// Translate presentation only: retain form values, event handlers and React keys.
export function localize(node:ReactNode,language:'th'|'en'):ReactNode{
 if(language==='th')return node;
 if(typeof node==='string')return translateText(node);
 if(Array.isArray(node))return node.map((child,index)=>{const translated=localize(child,language);return isValidElement(translated)&&translated.key===null?cloneElement(translated,{key:index}):translated;});
 if(!isValidElement(node))return node;
 const element=node as ReactElement<Record<string,any>>;const original=element.props;
 if(original.translate==='no')return node;
 const props:Record<string,any>={};
 for(const key of ['placeholder','aria-label','title','alt','data-label'])if(typeof original[key]==='string')props[key]=translateText(original[key]);
 if(element.type==='option'&&original.value===undefined&&typeof original.children==='string')props.value=original.children;
 if(original.children!==undefined)props.children=localize(original.children,language);
 return cloneElement(element,props);
}
