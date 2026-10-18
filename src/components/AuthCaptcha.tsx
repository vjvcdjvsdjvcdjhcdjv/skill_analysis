import React, {useEffect,useRef,useState} from 'react';

export const captchaSiteKey=import.meta.env.VITE_TURNSTILE_SITE_KEY || '';
let loadPromise:Promise<void>|undefined;
function loadWidget():Promise<void> {
  if ((window as any).turnstile) return Promise.resolve();
  if (!loadPromise) loadPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    script.async=true;
    script.onload=()=>resolve();
    script.onerror=()=>{loadPromise=undefined;script.remove();reject(new Error('Security check could not load. Check your connection and reload.'));};
    document.head.appendChild(script);
  });
  return loadPromise;
}
export function AuthCaptcha({onToken,revision}:{onToken:(token:string)=>void;revision:number}) {
  const host=useRef<HTMLDivElement>(null);
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!captchaSiteKey)return;
    let active=true;let id:string|undefined;
    setError('');onToken('');
    loadWidget().then(()=>{
      if(!active || !host.current)return;
      id=(window as any).turnstile.render(host.current,{
        sitekey:captchaSiteKey,callback:onToken,
        'expired-callback':()=>onToken(''),
        'error-callback':()=>{onToken('');setError('Security check failed. Reload and try again.');},
      });
    }).catch(e=>{if(active)setError(e.message);});
    return ()=>{active=false;if(id!==undefined)(window as any).turnstile?.remove(id);};
  },[revision,onToken]);
  if(!captchaSiteKey)return null;
  return <div><div ref={host}/>{error&&<p role="alert" className="text-xs text-red-700">{error}</p>}</div>;
}
