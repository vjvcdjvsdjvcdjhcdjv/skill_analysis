import React, {useState} from 'react';
import {supabase} from '../services/supabase.ts';

export function PasswordRecoveryView({onDone}:{onDone:()=>void}) {
  const [password,setPassword]=useState('');
  const [confirm,setConfirm]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  async function submit(e:React.FormEvent) {
    e.preventDefault(); if(busy)return; setError('');
    if(password.length<8 || password!==confirm){setError('Use at least 8 characters and make sure both passwords match.');return;}
    setBusy(true);
    try {
      const {error}=await supabase.auth.updateUser({password});
      if(error)throw error;
      setSaved(true);setPassword('');setConfirm('');
    }catch(e){setError(e instanceof Error?e.message:'The reset link may have expired. Request a new one.');}
    finally{setBusy(false);}
  }
  return <main className="min-h-screen flex items-center justify-center p-6 bg-[#f6f8f6] text-[#17333b]">
    <section className="w-full max-w-md rounded-3xl bg-white border p-8 space-y-5">
      <h1 className="text-2xl font-bold">{saved?'Password updated':'Set a new password'}</h1>
      {saved?<><p>Your new password is ready.</p><button onClick={onDone} className="rounded-xl bg-[#276459] text-white px-5 py-3">Continue to Home</button></>:<form onSubmit={submit} className="space-y-4">
        <label className="block">New password<input className="block border rounded-lg p-3 w-full" type="password" autoComplete="new-password" minLength={8} required value={password} onChange={e=>setPassword(e.target.value)}/></label>
        <label className="block">Confirm new password<input className="block border rounded-lg p-3 w-full" type="password" autoComplete="new-password" minLength={8} required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label>
        {error&&<p role="alert" className="text-red-700">{error}</p>}
        <button disabled={busy} className="rounded-xl bg-[#276459] text-white px-5 py-3 disabled:opacity-50">{busy?'Saving…':'Save new password'}</button>
        <button type="button" className="block underline" onClick={onDone}>Back to app</button>
      </form>}
    </section>
  </main>;
}
