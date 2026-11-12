// @ts-nocheck  (migrado do protótipo; tipagem gradual nas próximas etapas)
/* Motor de áudio (trilha gerada no navegador, só para o protótipo) */
import { store } from "../core/state";

export function ac(){if(!store.AC){store.AC=new(window.AudioContext||window.webkitAudioContext)();store.master=store.AC.createGain();store.master.gain.value=.7;
  const comp=store.AC.createDynamicsCompressor();store.master.connect(comp).connect(store.AC.destination);
  store.dly=store.AC.createDelay();store.dly.delayTime.value=.38;const fb=store.AC.createGain();fb.gain.value=.3;const wet=store.AC.createGain();wet.gain.value=.35;
  store.dly.connect(fb).connect(store.dly);store.dly.connect(wet).connect(store.master)}
  if(store.AC.state==="suspended")store.AC.resume();return store.AC}
export const hz=m=>440*2**((m-69)/12);
export function env(c,dest,t,a,peak,hold,rel){const g=c.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(peak,t+a);g.gain.setValueAtTime(peak,t+hold);g.gain.linearRampToValueAtTime(0,t+hold+rel);g.connect(dest);return g}
export function chord(tr,i,t,bar,bus){const c=store.AC,ch=tr.prog[i%tr.prog.length].map(n=>n+tr.key);
  ch.forEach(n=>["triangle","sine"].forEach((type,k)=>{const o=c.createOscillator();o.type=type;o.frequency.value=hz(n+12)*(k?1.004:1);
    o.connect(env(c,bus,t,1.2,.035,bar,1.4));o.start(t);o.stop(t+bar+1.6)}));
  const b=c.createOscillator();b.type="sine";b.frequency.value=hz(ch[0]-12);b.connect(env(c,bus,t,.4,.12,bar-.2,.8));b.start(t);b.stop(t+bar+1);
  const step=60/tr.bpm*tr.step,pat=[0,1,2,3,2,1];
  for(let s=0;s<Math.round(bar/step);s++){const n=ch[pat[s%6]%ch.length]+24,tt=t+s*step,o=c.createOscillator(),g=c.createGain();
    o.type="triangle";o.frequency.value=hz(n);g.gain.setValueAtTime(0,tt);g.gain.linearRampToValueAtTime(.07,tt+.01);g.gain.exponentialRampToValueAtTime(.0001,tt+1.6);
    o.connect(g);g.connect(bus);g.connect(store.dly);o.start(tt);o.stop(tt+1.7)}}
export function startVoice(tr,offset){const c=ac(),bus=c.createGain(),lp=c.createBiquadFilter();lp.type="lowpass";lp.frequency.value=1600;
  bus.gain.setValueAtTime(0,c.currentTime);bus.gain.linearRampToValueAtTime(1,c.currentTime+1.4);bus.connect(lp).connect(store.master);
  const bar=60/tr.bpm*4;let i=Math.floor(offset/bar),t=c.currentTime+.05;
  const st={bus,timer:0};const run=()=>{while(t<c.currentTime+1.2){chord(tr,i++,t,bar,bus);t+=bar}};run();st.timer=setInterval(run,300);return st}
export function stopVoice(st,f=.8){if(!st)return;clearInterval(st.timer);const g=st.bus.gain,n=store.AC.currentTime;g.cancelScheduledValues(n);g.setValueAtTime(g.value,n);g.linearRampToValueAtTime(0,n+f);setTimeout(()=>st.bus.disconnect(),f*1000+2500)}
