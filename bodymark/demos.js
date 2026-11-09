// Moving previews for every test tile, drawn on a 400x300 canvas. Ported from MiniApps/mini_app_ideas.html, recoloured to the Bodymark palette.
const IND='#5B2EFF',INK='#12101F',MAD='#FF5A36',WI='#B9A6FF',SAF='#FFD23F',WM='#FF8A6B',CARD='#F1EDFF';
let BF=0;
const L=(a,b,u)=>a+(b-a)*u, clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const ease=x=>{x=clamp(x,0,1);return x*x*(3-2*x)}, fr=(t,P)=>(t%P)/P;
const hash=n=>{const s=Math.sin(n*91.345+7.13)*43758.5453;return s-Math.floor(s)};
const jit=(a,b)=>(hash(a*0.37+b*1.91+BF*13.7)-0.5)*1.8;
function line(c,x1,y1,x2,y2){c.beginPath();c.moveTo(x1,y1);c.quadraticCurveTo((x1+x2)/2+jit(x1,y2),(y1+y2)/2+jit(y1,x2),x2,y2);c.stroke();}
function circ(c,x,y,r){const s=hash(Math.round(x)*0.1+BF)*6;c.beginPath();c.arc(x,y,r,s,s+Math.PI*1.86);c.stroke();}
function dot(c,x,y,r,f){c.beginPath();c.arc(x,y,r,0,7);c.fillStyle=f;c.fill();}
function rr(c,x,y,w,h,r,f){c.beginPath();c.roundRect(x,y,w,h,r);if(f){c.fillStyle=f;c.fill();}c.stroke();}
function txt(c,s,x,y,size,col,w=700,al='center'){c.font=`${w} ${size}px 'Nunito', sans-serif`;c.fillStyle=col;c.textAlign=al;c.textBaseline='middle';c.fillText(s,x,y);}
const score=(c,s,x=200,y=40,col=MAD,size=30)=>txt(c,s,x,y,size,col,800);
const label=(c,s,x,y,col=INK,size=14)=>txt(c,s,x,y,size,col,500);
function ground(c,y){c.strokeStyle=INK;c.lineWidth=2;line(c,14,y,386,y);}
function cone(c,x,y){c.fillStyle=SAF;c.beginPath();c.moveTo(x-10,y);c.lineTo(x,y-20);c.lineTo(x+10,y);c.closePath();c.fill();c.strokeStyle=INK;c.lineWidth=1.5;c.stroke();}
function ball(c,x,y,r=6,f='#fff'){dot(c,x,y,r,f);c.strokeStyle=INK;c.lineWidth=1.8;c.beginPath();c.arc(x,y,r,0,7);c.stroke();}
function flag(c,x,gy){c.strokeStyle=INK;c.lineWidth=2;line(c,x,gy,x,gy-70);c.fillStyle=SAF;c.beginPath();c.moveTo(x,gy-70);c.lineTo(x+22,gy-62);c.lineTo(x,gy-54);c.fill();}
function tripodPhone(c,x,y,inner){c.strokeStyle=INK;c.lineWidth=2;line(c,x,y-34,x-14,y);line(c,x,y-34,x+14,y);line(c,x,y-34,x,y);rr(c,x-12,y-66,24,32,4,'#fff');if(inner)inner(x,y-50);}
function wash(c,x,y,rx,ry,col,a=.4){c.save();c.globalAlpha=a;c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0.2,0,7);c.fill();c.restore();}
const D=a=>[Math.sin(a),Math.cos(a)];
function fig(c,o){
  const s=o.s||1,x=o.x,y=o.y,T=34*s,U=19*s,G=22*s,R=9*s,b=o.b||0;
  const nk=[x+Math.sin(b)*T,y-Math.cos(b)*T],hd=[nk[0]+Math.sin(b)*R*1.45,nk[1]-Math.cos(b)*R*1.45];
  c.strokeStyle=o.col||IND;c.lineWidth=o.lw||3*s;c.lineCap='round';c.lineJoin='round';
  const J=[];
  const lim=(p,a1,a2,l)=>{const d1=D(a1),e=[p[0]+d1[0]*l,p[1]+d1[1]*l],d2=D(a2),w=[e[0]+d2[0]*l,e[1]+d2[1]*l];line(c,p[0],p[1],e[0],e[1]);line(c,e[0],e[1],w[0],w[1]);J.push(e,w);return w;};
  line(c,x,y,nk[0],nk[1]);circ(c,hd[0],hd[1],R);
  const la=o.la??-0.3,ra=o.ra??0.3,ll=o.ll??-0.15,rl=o.rl??0.15;
  const h1=lim(nk,la,o.la2??la,U),h2=lim(nk,ra,o.ra2??ra,U),f1=lim([x,y],ll,o.ll2??ll,G),f2=lim([x,y],rl,o.rl2??rl,G);
  if(o.track){J.push([x,y],nk);const xs=J.map(p=>p[0]).concat(hd[0]),ys=J.map(p=>p[1]).concat(hd[1]-R);
    c.save();c.setLineDash([5,5]);c.strokeStyle=WI;c.lineWidth=1.5;c.strokeRect(Math.min(...xs)-10,Math.min(...ys)-6,Math.max(...xs)-Math.min(...xs)+20,Math.max(...ys)-Math.min(...ys)+12);c.restore();
    J.forEach(p=>{dot(c,p[0],p[1],3.3*s,SAF);c.strokeStyle=INK;c.lineWidth=1;c.beginPath();c.arc(p[0],p[1],3.3*s,0,7);c.stroke();});}
  return {nk,hd,hands:[h1,h2],feet:[f1,f2],hip:[x,y]};
}
function sq(d,gy,s=1){const G=22*s,a1=d*1.7,a2=-d*0.55;return{a1,a2,dx:-G*(Math.sin(a1)+Math.sin(a2)),hy:gy-G*(Math.cos(a1)+Math.cos(a2))};}
function ik(ax,ay,bx,by,l1,l2,sg){const dx=bx-ax,dy=by-ay,d=Math.max(1,Math.min(Math.hypot(dx,dy),l1+l2-0.01)),a=Math.atan2(dy,dx),k=Math.acos(clamp((l1*l1+d*d-l2*l2)/(2*l1*d),-1,1)),g=a+sg*k;return[ax+Math.cos(g)*l1,ay+Math.sin(g)*l1];}
const mmss=s=>Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0');
function bodyLine(c,pts,w=3){c.strokeStyle=IND;c.lineWidth=w;c.lineCap='round';for(let i=0;i<pts.length-1;i++)line(c,pts[i][0],pts[i][1],pts[i+1][0],pts[i+1][1]);}
function plankBody(c,gy,ang,armMode,sag=0){
  const fx=320,fy=gy-4,sh=[fx-170*Math.cos(ang),fy-170*Math.sin(ang)];
  const hip=[(fx+sh[0])/2,(fy+sh[1])/2+sag];
  bodyLine(c,[[fx,fy],hip,sh]);
  if(armMode==='hands'){const hand=[156,gy];const el=ik(sh[0],sh[1],hand[0],hand[1],36,36,-1);bodyLine(c,[sh,el,hand]);}
  else{const el=[sh[0]-2,gy-4];bodyLine(c,[sh,el,[el[0]+34,gy-4]]);}
  circ(c,sh[0]-16*Math.cos(ang)-4,sh[1]-16*Math.sin(ang)-5,9);
  return {sh,hip};
}

const IDEAS=[
/* ---------- SPORT ---------- */
{cat:'Sport',title:'Bowling speed gun',top:1,score:'142 km/h',setup:'Phone on tripod, side on',reach:3,build:'Medium',
 how:'Film one delivery side on. The app times the ball over the 22 yard pitch and turns it into km/h.',
 why:'Every cricket fan wants their number, and people argue about it in the comments.',
 draw(c,t){const gy=225,p=fr(t,2.8);ground(c,gy);c.fillStyle='rgba(242,184,72,.35)';c.fillRect(70,gy-3,290,6);
  c.strokeStyle=INK;c.lineWidth=2.5;for(let i=0;i<3;i++)line(c,348+i*6,gy,348+i*6,gy-36);
  const u=clamp(p/0.35,0,1),arm=Math.PI*0.2+u*Math.PI*2;
  const F=fig(c,{x:75,y:gy-44,b:0.15*u,ra:arm,ra2:arm,la:-0.6,ll:-0.4,rl:0.35});
  let bx,by;if(p<0.35){[bx,by]=F.hands[1];}else{const v=clamp((p-0.35)/0.3,0,1);bx=L(85,345,v);by=v<0.7?L(gy-95,gy-5,v/0.7):L(gy-5,gy-28,(v-0.7)/0.3);
   if(v<1){c.strokeStyle=WI;c.lineWidth=3;line(c,bx-40,by-4,bx-12,by);}}
  ball(c,bx,by,6,MAD);
  if(p>0.62){score(c,'142 km/h',200,50);label(c,'20.12 m in 0.51 s',200,82);}else label(c,'timing the ball...',200,50,INK,16);
  tripodPhone(c,200,296);}},
{cat:'Sport',title:'Football shot speed',score:'96 km/h',setup:'Phone on tripod, side on',reach:3,build:'Medium',
 how:'Shoot at goal from 11 m. The app times the ball from your foot to the net.',
 why:'Football fans love comparing shot power with friends.',
 draw(c,t){const gy=235,p=fr(t,2.6);ground(c,gy);
  c.strokeStyle=WI;c.lineWidth=1;for(let i=1;i<6;i++)line(c,325+i*10,gy-90,325+i*10,gy);for(let j=1;j<5;j++)line(c,325,gy-90+j*18,385,gy-90+j*18);
  c.strokeStyle=INK;c.lineWidth=3;line(c,325,gy,325,gy-90);line(c,325,gy-90,385,gy-90);
  const k=clamp(p/0.25,0,1),leg=L(-0.9,1.3,ease(k));
  fig(c,{x:80,y:gy-44,b:-0.1*k,rl:leg,rl2:leg-0.3*(1-k),ll:-0.1,la:-1.0,ra:0.8});
  let bx=112,by=gy-7;if(p>0.25){const v=clamp((p-0.25)/0.25,0,1);bx=L(112,355,v);by=L(gy-7,gy-60,v)-Math.sin(v*Math.PI)*20;if(v<1){c.strokeStyle=WI;c.lineWidth=3;line(c,bx-45,by+4,bx-12,by);}}
  ball(c,bx,by,7);
  if(p>0.5){score(c,'96 km/h',190,50);label(c,'11 m in 0.41 s',190,82);}
  tripodPhone(c,200,298);}},
{cat:'Sport',title:'Keepy ups counter',score:'Touches: 37',setup:'Phone on tripod',reach:3,build:'Easy',
 how:'The camera counts every touch until the ball hits the ground.',
 why:'Easy to try and easy to beat, so viewers film their own attempt.',
 draw(c,t){const gy=250,r=2.2,u=(t*r)%1,k=Math.floor(t*r);ground(c,gy);
  const lift=Math.max(0,1-Math.min(u,1-u)*5);const a1=0.1+lift*1.3,a2=0.1+lift*0.25;
  const o={x:200,y:gy-44,la:-0.9,ra:0.9,ll:-0.12,rl:0.12,track:true};if(k%2){o.rl=a1;o.rl2=a2;}else{o.ll=a1;o.ll2=a2;}
  fig(c,o);ball(c,232,gy-28-Math.sin(u*Math.PI)*110,8);
  score(c,'Touches: '+(k%60+1),200,36,MAD,26);}},
{cat:'Sport',title:'Reactive shuttle',score:'1.92 s',setup:'Phone on tripod, 2 cones',reach:2,build:'Medium',
 how:'An arrow and a voice call left or right. Sprint to that cone and back. The app times you.',
 why:'The same format as the SwitchedOn reel you sent, in your own look.',
 draw(c,t){const gy=222,P=2.6,k=Math.floor(t/P),p=(t%P)/P,dir=hash(k)>0.5?1:-1;ground(c,gy);
  c.save();c.setLineDash([6,6]);c.strokeStyle=WI;c.lineWidth=2;line(c,200,gy-60,200,gy+8);c.restore();
  cone(c,60,gy);cone(c,340,gy);
  let x=200,run=0;if(p>0.15&&p<0.55){x=200+dir*130*ease((p-0.15)/0.4);run=1;}else if(p>=0.55&&p<0.95){x=200+dir*130*(1-ease((p-0.55)/0.4));run=1;}
  const sw=run?Math.sin(t*14)*0.7:0.15;
  fig(c,{x,y:gy-44,b:run?dir*0.12:0,ll:-sw,rl:sw,la:sw*0.8,ra:-sw*0.8,track:true});
  if(p>0.1)txt(c,dir>0?'→':'←',200,42,52,MAD,800);
  score(c,(clamp((p-0.1)/0.85,0,1)*1.92).toFixed(2)+' s',330,42,INK,24);
  tripodPhone(c,200,296,(x0,y0)=>{if(p>0.1)txt(c,dir>0?'→':'←',x0,y0+1,16,MAD,800);});}},
{cat:'Sport',title:'Vertical jump',score:'48 cm',setup:'Phone on floor or tripod',reach:3,build:'Easy',
 how:'The app measures how long you stay in the air and turns that into jump height.',
 why:'Everyone thinks they jump high. The number settles it.',
 draw(c,t){const gy=250,p=fr(t,2.2);ground(c,gy);
  let d=0,j=0;if(p<0.3)d=Math.sin(p/0.3*Math.PI/2)*0.7;else if(p<0.65)j=Math.sin((p-0.3)/0.35*Math.PI);else if(p<0.8)d=Math.sin((p-0.65)/0.15*Math.PI)*0.4;
  const S=sq(d,gy);const arms=j>0?2.9:-1.3*d;
  fig(c,{x:180+S.dx,y:S.hy-j*70,b:d*0.6,ll:S.a1,ll2:S.a2,rl:S.a1,rl2:S.a2,la:arms,ra:arms,track:true});
  c.strokeStyle=INK;c.lineWidth=2;line(c,320,gy,320,gy-130);for(let i=0;i<=12;i++){line(c,320,gy-i*10,i%5?328:336,gy-i*10);}
  c.strokeStyle=MAD;c.lineWidth=2;line(c,300,gy-70*Math.min(1,j+(p>0.475?1:0)),345,gy-70*Math.min(1,j+(p>0.475?1:0)));
  if(p>0.47){score(c,'48 cm',200,40);label(c,'air time 0.63 s',200,72);}}},
{cat:'Sport',title:'Punch speed',score:'7.8 m/s',setup:'Phone on tripod, side on',reach:2,build:'Medium',
 how:'Throw a jab. The app tracks your wrist and gives hand speed in metres per second.',
 why:'Boxing and gym people love a speed number to beat.',
 draw(c,t){const gy=250,p=fr(t,1.4);ground(c,gy);
  const e=p<0.2?ease(p/0.2):p<0.4?1:1-ease((p-0.4)/0.3);const hit=p>0.2?Math.sin(clamp((p-0.2)/0.8,0,1)*Math.PI*3)*0.1*(1-p):0;
  c.save();c.translate(292,10);c.rotate(-hit);c.strokeStyle=INK;c.lineWidth=2;line(c,0,0,0,60);rr(c,-22,60,44,130,14,WM);c.restore();
  fig(c,{x:228,y:gy-44,b:0.1,ll:-0.35,rl:0.3,la:0.7,la2:2.6,ra:L(0.5,1.57,e),ra2:L(2.7,1.57,e)});
  if(e>0.6){c.strokeStyle=WI;c.lineWidth=2.5;for(let i=0;i<3;i++)line(c,190,135+i*10,225,135+i*10);}
  if(p>0.2)score(c,'7.8 m/s',110,50);}},
{cat:'Sport',title:'Sprint timer',score:'2.94 s',setup:'Phone on tripod, 2 markers',reach:2,build:'Medium',
 how:'The phone watches two lines. Your time starts at the first line and stops at the second.',
 why:'Clean before and after progress posts every week.',
 draw(c,t){const gy=240,p=fr(t,2.6);ground(c,gy);flag(c,90,gy);flag(c,310,gy);
  const x=L(10,390,p),ph=t*16,sw=Math.sin(ph)*0.75;
  fig(c,{x,y:gy-44-Math.abs(Math.sin(ph))*4,b:0.25,ll:sw,ll2:sw-0.4,rl:-sw,rl2:-sw-0.4,la:-sw,la2:-sw+1.3,ra:sw,ra2:sw+1.3});
  const tm=clamp((x-90)/220,0,1)*2.94;score(c,tm.toFixed(2)+' s',200,40,x>310?MAD:INK,30);}},
{cat:'Sport',title:'Batting reaction',score:'0.31 s',setup:'Phone on tripod',reach:2,build:'Hard',
 how:'A ball comes at you. The app times how fast your bat starts moving after the ball is released.',
 why:'More cricket, from a different angle than the speed gun.',
 draw(c,t){const gy=245,p=fr(t,2.2);ground(c,gy);c.strokeStyle=INK;c.lineWidth=2.5;for(let i=0;i<3;i++)line(c,345+i*6,gy,345+i*6,gy-36);
  const sw=clamp((p-0.42)/0.14,0,1);const arm=L(-0.6,-1.3,sw);
  const F=fig(c,{x:305,y:gy-44,b:-0.15,la:arm,ra:arm,ll:-0.3,rl:0.2});
  const h=F.hands[0],ba=L(2.6,5.0,ease(sw)),bd=D(ba);c.strokeStyle=INK;c.lineWidth=6;line(c,h[0],h[1],h[0]+bd[0]*46,h[1]+bd[1]*46);c.strokeStyle=SAF;c.lineWidth=3;line(c,h[0],h[1],h[0]+bd[0]*46,h[1]+bd[1]*46);
  let bx,by;if(p<0.5){const v=p/0.5;bx=L(30,270,v);by=v<0.7?L(gy-70,gy-5,v/0.7):L(gy-5,gy-25,(v-0.7)/0.3);}else{const v=clamp((p-0.5)/0.3,0,1);bx=L(270,40,v);by=L(gy-25,20,v);}
  ball(c,bx,by,6,MAD);if(p>0.5){score(c,'0.31 s',120,50);label(c,'release to first bat movement',120,82,INK,13);}}},
{cat:'Sport',title:'Six corner footwork',score:'8.2 s',setup:'Phone on tripod, 6 markers',reach:2,build:'Medium',
 how:'Six spots light up in random order. Touch each one and come back to the middle. The app times the round.',
 why:'Badminton, squash and padel players train this all the time.',
 draw(c,t){const P=1.1,k=Math.floor(t/P),p=(t%P)/P;c.strokeStyle=INK;c.lineWidth=2;rr(c,70,60,260,215,6);c.save();c.setLineDash([6,6]);line(c,70,167,330,167);c.restore();
  const pts=[[92,82],[308,82],[92,167],[308,167],[92,253],[308,253]],ti=Math.floor(hash(k)*6);
  pts.forEach((q,i)=>{c.strokeStyle=INK;c.lineWidth=1.5;if(i===ti)dot(c,q[0],q[1],13,SAF);circ(c,q[0],q[1],13);});
  const v=p<0.5?ease(p/0.5):1-ease((p-0.5)/0.5),x=L(200,pts[ti][0],v),y=L(167,pts[ti][1],v);
  c.save();c.globalAlpha=.6;dot(c,x,y,18,WI);c.restore();c.strokeStyle=IND;c.lineWidth=3;circ(c,x,y,8);
  score(c,'Corner '+(k%6+1)+' of 6',200,30,MAD,22);}},
{cat:'Sport',title:'Basketball shot counter',score:'Made 7 of 10',setup:'Phone on tripod',reach:2,build:'Medium',
 how:'The camera spots makes and misses and keeps the score for you.',
 why:'Shooting challenges are a proven reel format.',
 draw(c,t){const gy=255,P=1.8,k=Math.floor(t/P),p=(t%P)/P;ground(c,gy);
  c.strokeStyle=INK;c.lineWidth=3;line(c,362,60,362,gy);line(c,345,55,345,125);c.strokeStyle=MAD;line(c,305,105,345,105);c.strokeStyle=WI;c.lineWidth=1.5;for(let i=0;i<4;i++)line(c,308+i*11,107,312+i*9,128);
  const make=hash(k)>0.3,up=p<0.2;
  fig(c,{x:90,y:gy-44,la:up?2.7:-0.4,ra:up?2.9:0.4,ll:-0.1,rl:0.1});
  let bx,by;if(p<0.15){bx=105;by=gy-115;}else{const v=clamp((p-0.15)/0.55,0,1),ex=make?325:342,ey=make?100:98;bx=(1-v)*(1-v)*105+2*(1-v)*v*215+v*v*ex;by=(1-v)*(1-v)*(gy-115)+2*(1-v)*v*(-30)+v*v*ey;
   if(p>0.7){const w=(p-0.7)/0.3;if(make){bx=325;by=L(100,gy-8,w);}else{bx=L(342,390,w);by=L(98,60,Math.sin(w*Math.PI))+w*w*150;}}}
  ball(c,bx,by,9,SAF);let m=0;for(let i=k-(k%10);i<=k;i++)if(hash(i)>0.3)m++;
  score(c,'Made '+m+' of '+(k%10+1),180,36,MAD,24);}},
/* ---------- HOME FITNESS ---------- */
{cat:'Home fitness',title:'Push up form counter',top:1,score:'Reps: 32',setup:'Phone on floor, side on',reach:3,build:'Easy',
 how:'Only counts a push up when your chest goes low enough. Half reps do not count.',
 why:'Calling out half reps starts friendly fights in the comments.',
 draw(c,t){const gy=240,P=1.6,p=fr(t,P),k=Math.floor(t/P);ground(c,gy);
  const down=(1-Math.cos(p*2*Math.PI))/2;plankBody(c,gy,0.36-0.25*down,'hands');
  c.strokeStyle=INK;c.lineWidth=2;rr(c,30,70,18,120,6);dot(c,39,190-down*118,7,down>0.8?IND:WM);c.strokeStyle=MAD;line(c,24,96,54,96);
  if(down>0.8)label(c,'full rep ✓',39,212,IND,13);score(c,'Reps: '+(k%40+1),210,40,MAD,28);}},
{cat:'Home fitness',title:'Honest plank timer',score:'1:25',setup:'Phone on floor, side on',reach:3,build:'Easy',
 how:'The clock runs while your body stays straight and stops the moment your hips sag.',
 why:'Most people last less than they think, which makes it shareable.',
 draw(c,t){const gy=240,p=fr(t,6);ground(c,gy);const sag=Math.max(0,(p-0.55)/0.35)*26;
  c.save();c.setLineDash([6,6]);c.strokeStyle=WI;c.lineWidth=2;line(c,320,gy-4,150,gy-56);c.restore();
  plankBody(c,gy,0.18,'elbows',Math.min(sag,26));const secs=Math.min(p,0.71)*120,bad=sag>12;
  score(c,(bad?'Hips dropped at ':'')+mmss(secs),200,44,bad?MAD:INK,bad?24:34);}},
{cat:'Home fitness',title:'Squat depth checker',score:'Reps: 20',setup:'Phone on tripod, side on',reach:3,build:'Easy',
 how:'Shows green when your hips reach knee height and only counts full squats.',
 why:'A form check plus a count, useful for every gym goer.',
 draw(c,t){const gy=255,P=2,p=fr(t,P),k=Math.floor(t/P),s=1.3;ground(c,gy);
  const d=(1-Math.cos(p*2*Math.PI))/2,S=sq(d,gy,s),ky=gy-22*s*Math.cos(S.a2);
  c.save();c.setLineDash([6,6]);c.strokeStyle=WI;c.lineWidth=2;line(c,60,ky,340,ky);c.restore();
  fig(c,{x:190+S.dx,y:S.hy,s,b:d*0.75,ll:S.a1,ll2:S.a2,rl:S.a1,rl2:S.a2,la:Math.min(1.57,d*2.5),ra:Math.min(1.57,d*2.5),track:true});
  const ok=S.hy>=ky-1;label(c,ok?'parallel ✓':'go lower',320,ky-14,ok?IND:MAD,15);score(c,'Reps: '+(k%30+1),200,40);}},
{cat:'Home fitness',title:'Skipping rope counter',score:'140 a minute',setup:'Phone on tripod',reach:2,build:'Easy',
 how:'Counts every jump and gives your jumps per minute.',
 why:'Rope skills look good on camera and are easy to film.',
 draw(c,t){const gy=255,R=2.3,ph=t*R,hop=Math.abs(Math.sin(ph*Math.PI))*12;ground(c,gy);
  const F=fig(c,{x:200,y:gy-44-hop,la:-0.35,la2:-1.0,ra:0.35,ra2:1.0,ll:-0.08,rl:0.08});
  const [h1,h2]=F.hands,th=ph*2*Math.PI,hy=(h1[1]+h2[1])/2,cy=L(2*(F.hd[1]-22)-hy,2*(gy+3)-hy,(1+Math.cos(th))/2);
  c.strokeStyle=MAD;c.lineWidth=2.2;c.beginPath();c.moveTo(h1[0],h1[1]);c.quadraticCurveTo(200,cy,h2[0],h2[1]);c.stroke();
  score(c,'Jumps: '+Math.floor(ph)%200,200,36);label(c,'140 a minute',200,66);}},
{cat:'Home fitness',title:'One leg balance test',top:1,score:'18.0 s',setup:'Phone on tripod',reach:3,build:'Easy',
 how:'Stand on one leg with your eyes closed. The clock stops when your foot touches down. Then compare with your age group.',
 why:'Works for every age, and families test each other.',
 draw(c,t){const gy=255,p=fr(t,7);ground(c,gy);const fall=p>0.85,sw=Math.sin(t*1.9)*0.05*(1+p*2);
  const F=fig(c,{x:130,y:gy-44,b:sw+(fall?0.25:0),la:-1.45,ra:1.45,ll:sw*0.5,rl:fall?0.4:0.9,rl2:fall?0.2:-0.6});
  c.strokeStyle=IND;c.lineWidth=1.8;c.beginPath();c.arc(F.hd[0]+3,F.hd[1]-1,3,0,Math.PI);c.stroke();
  const secs=Math.min(p,0.85)/0.85*18;score(c,secs.toFixed(1)+' s',130,40,fall?MAD:INK,30);
  const bars=[['20s',0.85],['40s',0.6],['60s',0.32],['You',secs/20]];
  bars.forEach((b,i)=>{const x=250+i*34,h=b[1]*130;c.strokeStyle=INK;c.lineWidth=1.5;rr(c,x,gy-h,24,h,4,i===3?SAF:'rgba(157,179,226,.6)');label(c,b[0],x+12,gy+14,INK,12);});
  label(c,'by age group',317,95,INK,13);}},
{cat:'Home fitness',title:'Wall sit timer',score:'2:30',setup:'Phone on tripod, side on',reach:2,build:'Easy',
 how:'Back on the wall, thighs flat. The clock stops when your hips rise.',
 why:'Painful, funny shaking legs, and anyone can try it at home.',
 draw(c,t){const gy=250,p=fr(t,6),s=1.3,G=22*s;ground(c,gy);c.strokeStyle=INK;c.lineWidth=4;line(c,110,40,110,gy);c.lineWidth=1.5;for(let y=50;y<gy;y+=18)line(c,96,y+10,110,y);
  const sh=p>0.5?Math.sin(t*60)*1.6*(p-0.5)*4:0;
  fig(c,{x:124+sh,y:gy-G,s,ll:Math.PI/2,ll2:0,rl:Math.PI/2+0.03,rl2:0.03,la:0.6,la2:1.4,ra:0.7,ra2:1.5});
  if(p>0.5){c.strokeStyle=MAD;c.lineWidth=2;for(let i=0;i<3;i++)line(c,190+i*6,gy-G-22,186+i*6,gy-G-12);}
  score(c,mmss(p*150),260,60,p>0.5?MAD:INK,34);}},
{cat:'Home fitness',title:'Burpee counter',score:'Burpees: 15',setup:'Phone on tripod, side on',reach:2,build:'Medium',
 how:'Counts only full burpees: down, chest to the floor, up and jump.',
 why:'A tough number for fitness challenges.',
 draw(c,t){const gy=250,P=2.4,p=fr(t,P),k=Math.floor(t/P);ground(c,gy);
  if(p<0.2||p>0.8){const j=p>0.8?Math.sin((p-0.8)/0.2*Math.PI):0;fig(c,{x:200,y:gy-44-j*40,la:j?-2.8:-0.2,ra:j?2.8:0.2,track:true});}
  else if(p<0.32||p>0.68){const S=sq(0.9,gy);fig(c,{x:200+S.dx,y:S.hy,b:0.9,ll:S.a1,ll2:S.a2,rl:S.a1,rl2:S.a2,la:0.3,ra:0.3});}
  else plankBody(c,gy,0.12,'hands');
  score(c,'Burpees: '+(k%20+1),200,40);}},
{cat:'Home fitness',title:'Sit and reach',score:'+7 cm',setup:'Phone on floor, side on',reach:2,build:'Medium',
 how:'Sit with straight legs and reach forward. The app reads how far past your toes your hands go.',
 why:'Flexibility tests pull in lots of "I cannot even touch my toes" comments.',
 draw(c,t){const gy=240,p=fr(t,3);ground(c,gy);const e=p<0.5?ease(p/0.4):p<0.7?1:1-ease((p-0.7)/0.3);
  c.strokeStyle=INK;c.lineWidth=1.5;rr(c,225,gy-34,100,26,4,'rgba(242,184,72,.45)');for(let i=0;i<=10;i++)line(c,225+i*10,gy-34,225+i*10,gy-(i%5?28:22));
  const hip=[110,gy-8],ft=[220,gy-8];bodyLine(c,[hip,ft,[223,gy-24]]);
  const lean=0.15+1.15*e,sh=[hip[0]+Math.sin(lean)*60,hip[1]-Math.cos(lean)*60],q=L(-0.3,0.25,e),hd=[sh[0]+Math.sin(lean)*15,sh[1]-Math.cos(lean)*15],hand=[sh[0]+70*Math.cos(q),sh[1]+70*Math.sin(q)];
  bodyLine(c,[hip,sh,hand]);circ(c,hd[0]+3,hd[1]-4,9);
  const cm=Math.round((hand[0]-225)/3);score(c,(cm>0?'+':'')+cm+' cm',200,44,cm>0?MAD:INK,30);}},
{cat:'Home fitness',title:'Dead hang timer',score:'1:12',setup:'Phone on tripod',reach:2,build:'Easy',
 how:'Hang from a bar. The clock stops the moment you let go.',
 why:'A grip strength test anyone with a bar can try.',
 draw(c,t){const p=fr(t,8),s=1.2,U=19*s;c.strokeStyle=INK;c.lineWidth=5;line(c,90,50,310,50);c.lineWidth=2;line(c,90,50,90,290);line(c,310,50,310,290);
  const sw=Math.sin(t*1.2)*0.04,ny=52+2*U*0.989;
  fig(c,{x:200,y:ny+34*s,s,b:sw,la:-(Math.PI-0.15),ra:Math.PI-0.15,ll:sw-0.05,rl:sw+0.05});
  score(c,mmss(p*90),355,150,INK,22);c.strokeStyle=INK;c.lineWidth=1.5;rr(c,340,175,24,90,6);rr(c,340,175+90*p,24,90*(1-p),6,p>0.7?MAD:SAF);label(c,'grip',352,280,INK,12);}},
/* ---------- CHALLENGES ---------- */
{cat:'Challenges',title:'Reaction time test',top:1,play:'reaction',score:'0.24 s',setup:'Any phone, no camera',reach:3,build:'Easy',
 how:'Wait for the screen to change, then tap as fast as you can.',
 why:'Ten seconds to play, so this is the one viewers will try most.',
 draw(c,t){const p=fr(t,3),go=p>0.45;c.strokeStyle=INK;c.lineWidth=3;rr(c,140,28,120,236,18,go?SAF:'#fff');
  txt(c,go?'TAP!':'wait...',200,140,go?34:22,go?INK:MAD,800);
  const v=ease((p-0.45)/0.1);const fx=L(330,215,v),fy=L(290,175,v);c.strokeStyle=IND;c.lineWidth=12;line(c,fx+80,fy+60,fx,fy);dot(c,fx,fy,7,WM);
  if(p>0.58){score(c,'0.24 s',330,70,MAD,28);label(c,'adult average',330,100,INK,13);label(c,'about 0.25 s',330,118,INK,13);}}},
{cat:'Challenges',title:'Tap speed test',play:'tap',score:'9.4 taps a second',setup:'Any phone, no camera',reach:2,build:'Easy',
 how:'Tap as many times as you can in 5 seconds.',
 why:'A tiny test with a clear number people try to beat.',
 draw(c,t){const p=fr(t,5);c.strokeStyle=INK;c.lineWidth=3;rr(c,120,28,160,236,18,'#fff');const n=Math.floor(p*47);
  txt(c,String(n),200,120,56,MAD,800);label(c,(5-p*5).toFixed(1)+' s left',200,170);
  const tap=Math.abs(Math.sin(t*15));c.strokeStyle=IND;c.lineWidth=12;line(c,310,290,250,220+tap*14);dot(c,250,220+tap*14,7,WM);line(c,90,290,150,226+(1-tap)*14);dot(c,150,226+(1-tap)*14,7,WM);}},
{cat:'Challenges',title:'Freeze test',score:'Wobble: 12',setup:'Front camera',reach:2,build:'Easy',
 how:'Stand perfectly still for 10 seconds. The camera measures every tiny wobble.',
 why:'Looks easy, is hard, so people retry and post.',
 draw(c,t){const gy=255,p=fr(t,10);ground(c,gy);
  for(let i=6;i>=0;i--){const tt=t-i*0.09,ox=Math.sin(tt*7)*2.5+Math.sin(tt*13)*1.8;if(i){dot(c,200+ox*1.6,gy-44-34-13+Math.cos(tt*9)*1.5,3,'rgba(200,69,42,'+(0.5-i*0.06)+')');}}
  const ox=Math.sin(t*7)*0.02;fig(c,{x:200,y:gy-44,b:ox,la:-0.2,ra:0.2,track:true});
  c.strokeStyle=INK;c.lineWidth=4;c.beginPath();c.arc(330,70,30,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-p));c.stroke();txt(c,Math.ceil(10-p*10)+'',330,70,24,INK,800);
  score(c,'Wobble: '+(8+Math.floor(p*6)),110,60,MAD,24);}},
{cat:'Challenges',title:'Body Simon Says',score:'Level 6',setup:'Front camera',reach:3,build:'Medium',
 how:'Copy a growing chain of arm poses. One wrong pose ends the game.',
 why:'A game, not a workout, so it reaches kids and families too.',
 draw(c,t){const gy=262,seq=[0,1,3,2,0,4],P=0.9,i=Math.floor(t/P)%6;ground(c,gy);
  const poses=[[-2.75,2.75],[-1.57,0.3],[-0.3,1.57],[-1.57,1.57],[-0.2,0.2]],icons=['↑↑','←','→','← →','↓↓'];
  seq.forEach((q,j)=>{c.strokeStyle=INK;c.lineWidth=1.5;rr(c,22+j*60,14,52,34,8,j===i?SAF:(j<i?'rgba(157,179,226,.5)':'#fff'));txt(c,icons[q],48+j*60,31,15,INK,800);});
  const ps=poses[seq[i]];fig(c,{x:200,y:gy-48,s:1.15,la:ps[0],ra:ps[1],track:true});score(c,'Level 6',330,90,MAD,22);}},
{cat:'Challenges',title:'Steady hand trace',score:'96% on track',setup:'Front camera',reach:2,build:'Medium',
 how:'Trace a wavy lane in the air with one finger. Stay inside the lane to keep your score.',
 why:'Satisfying to watch and quick to try.',
 draw(c,t){const yf=x=>160+Math.sin(x*0.03)*50+Math.sin(x*0.011)*20,p=fr(t,4),X=30+p*340;
  c.save();c.globalAlpha=.35;c.strokeStyle=WI;c.lineWidth=26;c.beginPath();for(let x=30;x<=370;x+=5){x===30?c.moveTo(x,yf(x)):c.lineTo(x,yf(x));}c.stroke();c.restore();
  c.strokeStyle=MAD;c.lineWidth=3;c.beginPath();for(let x=30;x<=X;x+=4){const y=yf(x)+Math.sin(x*0.4)*3+(hash(Math.floor(x/12))-0.5)*6;x===30?c.moveTo(x,y):c.lineTo(x,y);}c.stroke();
  dot(c,X,yf(X),8,SAF);c.strokeStyle=IND;c.lineWidth=10;line(c,X+40,yf(X)+80,X+4,yf(X)+8);
  score(c,Math.round(100-p*4)+'% on track',200,36,MAD,24);}},
{cat:'Challenges',title:'Hole in the wall',score:'Fit! 94%',setup:'Front camera',reach:3,build:'Medium',
 how:'A wall with a body shaped hole comes at you. Match the pose before it arrives.',
 why:'A party game format that kids and families love.',
 draw(c,t){const P=3,k=Math.floor(t/P),p=(t%P)/P,poses=[{la:-1.2,ra:2.6,ll:-0.5,rl:0.15},{la:-2.6,ra:2.6,ll:-0.15,rl:0.15},{la:-1.57,ra:1.57,ll:-0.15,rl:1.4,rl2:0}],ps=poses[k%3];
  const sc=L(0.22,1,ease(p/0.7));c.save();c.translate(200,160);c.scale(sc,sc);c.strokeStyle=INK;c.lineWidth=2/sc;rr(c,-150,-130,300,265,10,'rgba(242,184,72,.55)');
  fig(c,Object.assign({x:0,y:30,s:1.3,col:CARD,lw:18},ps));c.restore();
  const m=ease(p/0.5);fig(c,{x:200,y:190,s:1.3,la:L(-0.3,ps.la,m),ra:L(0.3,ps.ra,m),ll:L(-0.15,ps.ll,m),rl:L(0.15,ps.rl,m),rl2:ps.rl2!==undefined?L(0.15,ps.rl2,m):undefined});
  if(p>0.7)score(c,'Fit! 94%',200,20,MAD,24);}},
{cat:'Challenges',title:'Body dodge game',score:'Dodged: 23',setup:'Front camera',reach:3,build:'Medium',
 how:'Things fall from the top of the screen. Move your body left and right to dodge them.',
 why:'Plays like a video game where your body is the controller.',
 draw(c,t){const gy=262;ground(c,gy);const x=200+Math.sin(t*1.4)*110,v=Math.cos(t*1.4);
  for(let i=0;i<5;i++){const cyc=t*0.55+i/5,kk=Math.floor(cyc),y=(cyc%1)*260-10,bx=40+hash(kk*7+i)*320;dot(c,bx,y,10,i%2?MAD:SAF);c.strokeStyle=INK;c.lineWidth=1.5;c.beginPath();c.arc(bx,y,10,0,7);c.stroke();}
  fig(c,{x,y:gy-44,b:-v*0.2,la:-0.6,ra:0.6,ll:-0.25,rl:0.25,track:true});score(c,'Dodged: '+(Math.floor(t*2)%99),320,26,INK,20);}},
{cat:'Challenges',title:'Clap on the beat',score:'On beat: 92%',setup:'Front camera and mic',reach:2,build:'Medium',
 how:'Clap on the beat. The app sees and hears each clap and scores your timing.',
 why:'Music plus a challenge fits trending audio.',
 draw(c,t){const gy=262,B=0.6,ph=(t/B)%1,cl=Math.max(0,1-Math.min(ph,1-ph)*6);ground(c,gy);
  c.strokeStyle=INK;c.lineWidth=2;circ(c,80,45,18);if(cl>0.5)dot(c,80,45,14,SAF);for(let i=0;i<5;i++){const x=80+(i+1-ph)*60;dot(c,x,45,7,IND);}
  fig(c,{x:200,y:gy-48,s:1.15,la:L(-1.3,-0.7,cl),la2:L(-1.9,1.25,cl),ra:L(1.3,0.7,cl),ra2:L(1.9,-1.25,cl)});
  if(cl>0.5){c.strokeStyle=MAD;c.lineWidth=2;for(let i=0;i<3;i++){const a=-1.2+i*0.6;line(c,200+Math.sin(a)*24,150-Math.cos(a)*24,200+Math.sin(a)*36,150-Math.cos(a)*36);}}
  score(c,'On beat: 92%',300,100,MAD,22);}},
{cat:'Challenges',title:'Staring contest',score:'No blink 0:41',setup:'Front camera',reach:3,build:'Easy',
 how:'A staring contest against the app. The timer stops the moment you blink.',
 why:'Watching people fail is funny, and the comments fill up with scores.',
 draw(c,t){const p=fr(t,5),bl=p>0.88;c.strokeStyle=IND;c.lineWidth=3;circ(c,200,165,95);
  [-35,35].forEach(dx=>{if(bl){line(c,200+dx-16,145,200+dx+16,145);}else{c.lineWidth=3;circ(c,200+dx,145,17);dot(c,200+dx+Math.sin(t)*3,147,7,INK);}});
  c.lineWidth=3;line(c,180,215,220,215);
  const s=Math.min(p,0.88)*50;score(c,bl?'Blinked! '+mmss(s):'No blink '+mmss(s),200,36,bl?MAD:INK,24);}},
{cat:'Challenges',title:'Air drawing',score:'Star match 87%',setup:'Front camera',reach:2,build:'Medium',
 how:'Draw a star in the air with one finger. The app scores how close it is to the real shape.',
 why:'Quick, visual and easy to retry.',
 draw(c,t){const p=fr(t,4),cx=200,cy=165,R=95,order=[0,2,4,1,3,0],P=order.map(i=>[cx+Math.sin(i*Math.PI*2/5)*R,cy-Math.cos(i*Math.PI*2/5)*R]);
  c.save();c.setLineDash([7,7]);c.strokeStyle=WI;c.lineWidth=3;c.beginPath();P.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();c.restore();
  const q=Math.min(p/0.85,1)*5;c.strokeStyle=MAD;c.lineWidth=3.5;c.beginPath();let tip=P[0];
  for(let s=0;s<=q*20;s++){const u=s/20,seg=Math.min(4,Math.floor(u)),f=u-seg,a=P[seg],b=P[seg+1];tip=[L(a[0],b[0],f)+Math.sin(s*1.3)*3,L(a[1],b[1],f)+Math.cos(s*1.7)*3];s?c.lineTo(tip[0],tip[1]):c.moveTo(tip[0],tip[1]);}c.stroke();
  dot(c,tip[0],tip[1],7,SAF);if(p>0.85)score(c,'Star match 87%',200,284,MAD,24);}},
{cat:'Challenges',title:'Try not to laugh',top:1,score:'Lasted 0:23',setup:'Front camera',reach:3,build:'Easy',
 how:'A joke clip plays. The camera watches your face and catches your first smile.',
 why:'Try not to laugh is one of the biggest challenge formats online.',
 draw(c,t){const p=fr(t,5),sm=ease((p-0.3)/0.5),caught=sm>0.7;c.strokeStyle=IND;c.lineWidth=3;circ(c,170,165,90);
  [-30,30].forEach(dx=>{dot(c,170+dx,140,6,INK);line(c,170+dx-14,118-sm*4,170+dx+14,118-sm*6);});
  c.beginPath();c.moveTo(135,205);c.quadraticCurveTo(170,205+sm*36,205,205);c.stroke();
  c.strokeStyle=INK;c.lineWidth=1.5;rr(c,320,60,26,200,8);rr(c,320,60+200*(1-sm),26,200*sm,8,caught?MAD:SAF);c.strokeStyle=MAD;line(c,312,120,354,120);label(c,'smile',333,276,INK,13);
  score(c,caught?'Smiled at 0:23':'0:'+String(Math.floor(p*30)).padStart(2,'0'),170,30,caught?MAD:INK,24);}},
/* ---------- HEALTH AND DESK ---------- */
{cat:'Health and desk',title:'Posture alarm',score:'Neck 32°',setup:'Laptop camera',reach:2,build:'Medium',
 how:'Watches you while you work and warns you when your head drifts forward.',
 why:'Office workers relate, and it is useful every single day.',
 draw(c,t){const p=fr(t,5),s=1.2,gy=195+22*s;ground(c,gy);
  c.strokeStyle=INK;c.lineWidth=3;line(c,230,160,385,160);line(c,370,160,370,gy);line(c,95,195,165,195);line(c,98,195,95,110);line(c,105,195,105,gy);
  c.lineWidth=2;line(c,265,158,320,158);line(c,320,158,345,104);
  const lean=L(0.05,0.55,ease(p/0.7));const F=fig(c,{x:135,y:195,s,b:lean,ll:Math.PI/2,ll2:0,rl:Math.PI/2,rl2:0.02,la:1.2,la2:1.9,ra:1.25,ra2:1.95});
  const ang=Math.round(lean*58);const bad=ang>25;score(c,'Neck '+ang+'°',290,50,bad?MAD:INK,26);if(bad)label(c,'Sit up!',290,82,MAD,18);}},
{cat:'Health and desk',title:'Breathing coach',score:'6 breaths a minute',setup:'Front camera',reach:1,build:'Easy',
 how:'A circle grows and shrinks to guide slow breathing. The camera follows your shoulders to check you are with it.',
 why:'Calm content that reaches a different audience.',
 draw(c,t){const ph=(t%10)/10,b=(1-Math.cos(ph*2*Math.PI))/2;wash(c,200,150,50+70*b,50+70*b,WI,.45);c.strokeStyle=IND;c.lineWidth=3;circ(c,200,150,50+70*b);
  txt(c,ph<0.5?'Breathe in':'Breathe out',200,150,24,INK,800);label(c,'5 seconds in, 5 seconds out',200,285);}},
{cat:'Health and desk',title:'20 20 20 eye break',score:'Breaks today: 9',setup:'Laptop camera',reach:1,build:'Easy',
 how:'Every 20 minutes it asks you to look about 6 m away for 20 seconds, and the camera checks you looked away.',
 why:'Screen workers know the tired eye feeling. The 20 20 20 rule comes from eye doctors.',
 draw(c,t){const p=fr(t,6);c.strokeStyle=INK;c.lineWidth=3;rr(c,60,50,200,140,10,'#fff');line(c,140,190,180,190);line(c,160,190,160,220);line(c,120,222,200,222);
  if(p<0.6){txt(c,mmss((1-p/0.6)*1200),160,120,40,INK,800);}else{txt(c,'Look far away',160,105,20,MAD,800);txt(c,Math.ceil(20-(p-0.6)/0.4*20)+' s',160,145,30,INK,800);
   c.strokeStyle=IND;c.lineWidth=2.5;line(c,290,170,355,170);line(c,355,170,345,163);line(c,355,170,345,177);label(c,'6 m',322,190,INK,13);
   c.strokeStyle=INK;line(c,368,175,368,130);wash(c,368,115,18,22,'#9DB3E2',.7);}}},
/* ---------- FAMILY ---------- */
{cat:'Family',title:'Jumping jack race',score:'Dad 18, Son 21',setup:'Phone on tripod',reach:3,build:'Easy',
 how:'Two people do jumping jacks side by side. The app counts both and calls the winner.',
 why:'Family battles get shared and tagged.',
 draw(c,t){const gy=250;ground(c,gy);[[130,1.15,1.6,'Dad'],[285,0.8,1.9,'Son']].forEach(([x,s,r,n])=>{const j=(1-Math.cos(t*r*2*Math.PI))/2,h=Math.sin(j*Math.PI)*6;
   fig(c,{x,y:gy-44*s-h,s,la:-L(0.3,2.8,j),ra:L(0.3,2.8,j),ll:-L(0.08,0.4,j),rl:L(0.08,0.4,j),track:true});score(c,n+' '+Math.floor(t*r)%60,x,30,n==='Son'?MAD:INK,22);});}},
{cat:'Family',title:'Freeze dance',score:'Caught moving: 1',setup:'Phone on tripod',reach:3,build:'Medium',
 how:'Music plays, then stops. Anyone still moving gets called out on screen.',
 why:'A party game for kids, families and friend groups.',
 draw(c,t){const gy=255,p=fr(t,4),fz=p>=0.6;ground(c,gy);
  [80,200,320].forEach((x,i)=>{const mv=!fz||i===1,tt=mv?t:Math.floor(t/4)*4+2.4;fig(c,{x,y:gy-40,s:0.9,b:Math.sin(tt*5+i)*0.2,la:-1.2+Math.sin(tt*6+i)*1.2,ra:1.2+Math.sin(tt*5.5+i*2)*1.2,ll:-0.3+Math.sin(tt*6+i)*0.2,rl:0.3});
   if(fz&&i===1){c.strokeStyle=MAD;c.lineWidth=2.5;rr(c,x-45,90,90,170,10);label(c,'moved!',x,80,MAD,16);}});
  score(c,fz?'FREEZE!':'♪ dance ♪',200,36,fz?MAD:INK,28);}},
];

/* ---------- ATHLETE IDEAS (added round 2) ---------- */
function runner(c,x,gy,t,o={}){const s=o.s||1,ph=t*16,sw=Math.sin(ph)*0.75;return fig(c,Object.assign({x,y:gy-44*s-Math.abs(Math.sin(ph))*4,b:0.25,ll:sw,ll2:sw-0.4,rl:-sw,rl2:-sw-0.4,la:-sw,la2:-sw+1.3,ra:sw,ra2:sw+1.3},o));}
const dash=(c,x1,y1,x2,y2,col=WI)=>{c.save();c.setLineDash([6,6]);c.strokeStyle=col;c.lineWidth=2;line(c,x1,y1,x2,y2);c.restore();};
const NEW=[
{cat:'Speed',title:'Bolt ghost race',top:1,hook:'I raced Usain Bolt\'s ghost over 10 m.',score:'Bolt 1.89 s, you 2.21 s',setup:'Phone on tripod, side on',reach:3,build:'Medium',
 how:'Sprint 10 m while Bolt\'s real 10 m split from his 9.58 world record runs beside you as a ghost.',
 why:'A famous name and a race in the first second. Everyone wants to see the gap.',
 draw(c,t){const gy=250,P=3.2,tt=fr(t,P)*P-0.3,x0=40,x1=360;ground(c,gy);c.strokeStyle=INK;c.lineWidth=2;line(c,x0,gy-130,x0,gy+6);c.strokeStyle=MAD;line(c,x1,gy-130,x1,gy+6);
  const gx=x0+(x1-x0)*clamp(tt/1.89,0,1),yx=x0+(x1-x0)*clamp(tt/2.21,0,1);
  c.save();c.globalAlpha=0.6;runner(c,gx,gy-34,t,{col:WI,s:0.9});c.restore();label(c,'BOLT',gx,gy-138,IND,12);
  runner(c,yx,gy,t+0.3);
  if(tt>=2.21)score(c,'Bolt 1.89 s, you 2.21 s',200,30,MAD,22);else score(c,Math.max(0,tt).toFixed(2)+' s',200,30,INK,28);}},
{cat:'Speed',title:'Top speed vs Bolt',top:1,hook:'My top speed vs Usain Bolt\'s 44.7 km/h.',score:'31.4 km/h',setup:'Phone on tripod, 2 markers',reach:3,build:'Medium',
 how:'Run through a 20 m zone at full speed. The app turns your time into km/h and shows it on a dial next to Bolt\'s peak.',
 why:'One number and one famous comparison. Instant curiosity.',
 draw(c,t){const p=fr(t,4),cx=200,cy=200,R=125,v=p<0.55?31.4*ease(p/0.5):31.4;
  c.strokeStyle=INK;c.lineWidth=3;c.beginPath();c.arc(cx,cy,R,Math.PI,2*Math.PI);c.stroke();
  for(let k=0;k<=50;k+=5){const a=Math.PI+k/50*Math.PI,r1=k%10?R-8:R-16;c.lineWidth=2;line(c,cx+Math.cos(a)*r1,cy+Math.sin(a)*r1,cx+Math.cos(a)*R,cy+Math.sin(a)*R);if(k%10===0)label(c,String(k),cx+Math.cos(a)*(R-30),cy+Math.sin(a)*(R-30),INK,13);}
  const ab=Math.PI+44.7/50*Math.PI;c.strokeStyle=SAF;c.lineWidth=8;c.beginPath();c.arc(cx,cy,R+8,ab-0.05,ab+0.05);c.stroke();label(c,'Bolt 44.7',cx+Math.cos(ab)*(R+26)-12,cy+Math.sin(ab)*(R+26)-6,INK,13);
  const av=Math.PI+v/50*Math.PI+(p<0.55?0:Math.sin(t*20)*0.006);c.strokeStyle=MAD;c.lineWidth=4;line(c,cx,cy,cx+Math.cos(av)*(R-22),cy+Math.sin(av)*(R-22));dot(c,cx,cy,7,INK);
  score(c,v.toFixed(1)+' km/h',cx,cy+42,MAD,30);label(c,'you',cx,cy+72,INK,14);}},
{cat:'Speed',title:'Racing yesterday\'s me',hook:'Racing yesterday\'s me.',score:'0.08 s faster',setup:'Phone on tripod, side on',reach:3,build:'Hard',
 how:'The app saves every sprint and plays yesterday\'s run as a see through ghost beside today\'s.',
 why:'A daily series with drama built in. People come back to see who wins.',
 draw(c,t){const gy=240,P=3.8,tt=fr(t,P)*P-0.3,x0=40,x1=360;ground(c,gy);flag(c,x0,gy);flag(c,x1,gy);
  const gx=x0+(x1-x0)*clamp(tt/3.12,0,1),yx=x0+(x1-x0)*clamp(tt/3.04,0,1);
  c.save();c.globalAlpha=0.55;runner(c,gx,gy,t+0.15,{col:WI});c.restore();runner(c,yx,gy,t);
  if(tt<3.04){label(c,'yesterday',gx-20,gy-122,IND,12);score(c,Math.max(0,tt).toFixed(2)+' s',200,36,INK,28);}else score(c,'0.08 s faster',200,36,MAD,28);}},
{cat:'Speed',title:'False start test',hook:'Could you pass the Olympic false start rule?',score:'0.142 s',setup:'Phone on tripod, side on',reach:3,build:'Medium',
 how:'Get set. The app plays the start sound and times your first move. Under 0.100 s is a false start in official racing.',
 why:'A real rule from elite sprinting, tested on yourself.',
 draw(c,t){const gy=225,p=fr(t,3),bang=p>0.3;ground(c,gy);
  if(p<0.35)fig(c,{x:130,y:gy-40,b:1.2,la:0.1,ra:0.2,ll:1.1,ll2:-0.6,rl:-0.7,rl2:0.4,track:bang});else runner(c,130+(p-0.35)*260,gy,t);
  txt(c,bang?'BANG':'set...',300,50,bang?28:22,bang?MAD:INK,800);
  const mx=60,mw=280,my=258;c.strokeStyle=INK;c.lineWidth=1.5;rr(c,mx,my,mw,14,4,'#fff');c.fillStyle='rgba(200,69,42,.45)';c.fillRect(mx,my,mw/3,14);label(c,'false start',mx+mw/6,my+28,MAD,12);label(c,'0.3 s',mx+mw,my+28,INK,12);
  if(p>0.35){const r=0.142;c.strokeStyle=IND;c.lineWidth=3;line(c,mx+mw*r/0.3,my-6,mx+mw*r/0.3,my+20);score(c,'0.142 s',110,50,IND,28);}}},
{cat:'Speed',title:'Agility T test',hook:'The agility test coaches use. My time:',score:'9.8 s',setup:'Phone on tripod, 4 cones',reach:2,build:'Medium',
 how:'Sprint forward, shuffle left, shuffle right, back pedal home. The app times the full T.',
 why:'A known test with a known pattern, easy to compare with friends.',
 draw(c,t){const A=[200,262],B=[200,90],Cc=[80,90],Dd=[320,90],path=[A,B,Cc,Dd,B,A];[A,B,Cc,Dd].forEach(q=>cone(c,q[0],q[1]+10));
  c.save();c.setLineDash([6,6]);c.strokeStyle=WI;c.lineWidth=2;c.beginPath();path.forEach((q,i)=>i?c.lineTo(q[0],q[1]):c.moveTo(q[0],q[1]));c.stroke();c.restore();
  const p=fr(t,5),segs=[];let tot=0;for(let i=0;i<5;i++){const d=Math.hypot(path[i+1][0]-path[i][0],path[i+1][1]-path[i][1]);segs.push(d);tot+=d;}
  let dist=Math.min(p/0.85,1)*tot,i=0;while(i<4&&dist>segs[i]){dist-=segs[i];i++;}const f=Math.min(1,dist/segs[i]),x=L(path[i][0],path[i+1][0],f),y=L(path[i][1],path[i+1][1],f);
  c.save();c.globalAlpha=.6;dot(c,x,y,16,WI);c.restore();c.strokeStyle=IND;c.lineWidth=3;circ(c,x,y,8);
  score(c,(Math.min(p/0.85,1)*9.8).toFixed(1)+' s',330,230,p>0.85?MAD:INK,26);label(c,'sprint',228,180,INK,12);label(c,'shuffle',140,70,INK,12);label(c,'shuffle',260,70,INK,12);}},
{cat:'Power',title:'Leg power in watts',top:1,hook:'How many watts do my legs make?',score:'4,256 W',setup:'Phone on tripod',reach:3,build:'Easy',
 how:'Do one max jump. The app measures the height and uses the Sayers formula with your body weight to give peak power in watts.',
 why:'Nobody expects a jump to give watts. Comparing it to light bulbs makes it fun.',
 draw(c,t){const gy=255,p=fr(t,2.2);ground(c,gy);let d=0,j=0;if(p<0.3)d=Math.sin(p/0.3*Math.PI/2)*0.7;else if(p<0.65)j=Math.sin((p-0.3)/0.35*Math.PI);else if(p<0.8)d=Math.sin((p-0.65)/0.15*Math.PI)*0.4;
  const S=sq(d,gy),arms=j>0?2.9:-1.3*d;fig(c,{x:130+S.dx,y:S.hy-j*70,b:d*0.6,ll:S.a1,ll2:S.a2,rl:S.a1,rl2:S.a2,la:arms,ra:arms,track:true});
  const glow=p>0.3&&p<0.95?1:0;wash(c,300,105,50,50,SAF,0.15+glow*0.5);c.strokeStyle=INK;c.lineWidth=2.5;circ(c,300,105,32);line(c,288,135,288,155);line(c,312,135,312,155);line(c,286,155,314,155);line(c,290,164,310,164);
  if(p>0.45){score(c,'4,256 W',300,200,MAD,28);label(c,'48 cm jump, 75 kg',300,228,INK,13);}}},
{cat:'Power',title:'Standing broad jump',hook:'How far can I jump from standing?',score:'2.48 m',setup:'Phone on tripod, side on',reach:3,build:'Medium',
 how:'Jump forward from a line. The app finds your heels on landing and reads the distance.',
 why:'A classic athlete test that viewers can try in any park.',
 draw(c,t){const gy=240,p=fr(t,2.8);ground(c,gy);c.strokeStyle=INK;c.lineWidth=1.5;for(let m=0;m<=3;m++){const x=60+m*93;line(c,x,gy,x,gy+10);label(c,m+' m',x,gy+22,INK,12);}
  let x=60,y=0,d=0,air=0;if(p<0.25)d=Math.sin(p/0.25*Math.PI/2)*0.7;else if(p<0.6){const v=(p-0.25)/0.35;x=L(60,290,v);y=Math.sin(v*Math.PI)*70;air=1;}else{x=290;d=p<0.75?Math.sin((p-0.6)/0.15*Math.PI)*0.6:0;}
  const S=sq(d,gy);if(air)fig(c,{x,y:gy-34-y,b:0.4,ll:1.2,ll2:0.3,rl:1.25,rl2:0.35,la:2.2,ra:2.3,track:true});else fig(c,{x:x+S.dx,y:S.hy,b:d*0.6,ll:S.a1,ll2:S.a2,rl:S.a1,rl2:S.a2,la:-1.3*d,ra:-1.3*d,track:true});
  c.strokeStyle=INK;c.lineWidth=3;line(c,60,gy-6,60,gy+4);if(p>=0.6){c.strokeStyle=MAD;c.lineWidth=3;line(c,290,gy-16,290,gy+6);score(c,'2.48 m',200,45,MAD,32);}}},
{cat:'Power',title:'Pogo hop springiness',hook:'How springy are my ankles?',score:'RSI 2.4',setup:'Phone on tripod',reach:2,build:'Medium',
 how:'Do 10 fast hops. The app measures how short each ground contact is and gives a reactive strength score.',
 why:'Sprinters and jumpers chase this number, and most people have never heard of it.',
 draw(c,t){const gy=240,P=0.5,ph=(t%P)/P,k=Math.floor(t/P),air=ph>0.36;ground(c,gy);const h=air?Math.sin((ph-0.36)/0.64*Math.PI)*34:0;
  if(!air)wash(c,150,gy,22,6,MAD,.5);fig(c,{x:150,y:gy-44-h,la:-0.4,ra:0.4,ll:-0.05,rl:0.05,track:true});
  for(let i=0;i<6;i++){const v=0.16+hash(k-i)*0.05,hh=v*480;c.strokeStyle=INK;c.lineWidth=1.5;rr(c,250+i*22,gy-hh,16,hh,3,i===0?MAD:WI);}
  label(c,'contact time per hop',318,gy+18,INK,12);score(c,'RSI 2.4',300,50,MAD,28);label(c,'contact 0.18 s',300,80,INK,14);}},
{cat:'Power',title:'Bar path tracker',hook:'The line my bar really draws.',score:'0.72 m/s',setup:'Phone on tripod, side on',reach:2,build:'Medium',
 how:'Film a squat or deadlift side on. The app tracks the plate, draws its path and gives bar speed on the way up.',
 why:'Lifters love seeing their bar path. It looks great on screen.',
 draw(c,t){const gy=255,s=1.3,P=2.2,T=34*s;ground(c,gy);
  const at=tt=>{const p=fr(tt,P),d=(1-Math.cos(p*2*Math.PI))/2,S=sq(d,gy,s),b=d*0.75,hx=170+S.dx;return{S,b,hx,bx:hx+Math.sin(b)*T-6+Math.sin(p*Math.PI*2)*4,by:S.hy-Math.cos(b)*T+2};};
  c.strokeStyle=MAD;c.lineWidth=2.5;c.beginPath();for(let i=0;i<40;i++){const q=at(t-i*0.055);i?c.lineTo(q.bx,q.by):c.moveTo(q.bx,q.by);}c.stroke();
  const q=at(t);fig(c,{x:q.hx,y:q.S.hy,s,b:q.b,ll:q.S.a1,ll2:q.S.a2,rl:q.S.a1,rl2:q.S.a2,la:2.2,la2:0.6,ra:2.3,ra2:0.7});
  c.strokeStyle=INK;c.lineWidth=3;circ(c,q.bx,q.by,24);dot(c,q.bx,q.by,4,INK);
  const up=fr(t,P)>0.5;score(c,up?'0.72 m/s':'lowering',310,50,up?MAD:INK,24);label(c,'bar path',310,80,INK,14);}},
{cat:'Power',title:'Clap push up air time',hook:'How much air on a clap push up?',score:'Air 0.21 s',setup:'Phone on floor, side on',reach:2,build:'Medium',
 how:'The app times how long your hands stay off the floor on each explosive push up.',
 why:'Explosive moves look great, and air time turns them into a number to beat.',
 draw(c,t){const gy=240,P=1.8,p=fr(t,P);ground(c,gy);let down=0,air=0;if(p<0.35)down=Math.sin(p/0.35*Math.PI/2);else if(p<0.5)down=1-(p-0.35)/0.15;else if(p<0.75)air=Math.sin((p-0.5)/0.25*Math.PI);
  const ang=0.36-0.25*down+air*0.18,fx=320,fy=gy-4,sh=[fx-170*Math.cos(ang),fy-170*Math.sin(ang)];bodyLine(c,[[fx,fy],sh]);circ(c,sh[0]-16*Math.cos(ang)-4,sh[1]-16*Math.sin(ang)-5,9);
  if(air>0.2){const hp=[sh[0]+6,sh[1]+40];bodyLine(c,[sh,[sh[0]+2,sh[1]+22],hp]);c.strokeStyle=MAD;c.lineWidth=2;for(let i=0;i<3;i++){const a=i*0.9-0.9;line(c,hp[0]+Math.cos(a)*10,hp[1]+Math.sin(a)*10,hp[0]+Math.cos(a)*20,hp[1]+Math.sin(a)*20);}}
  else{const hand=[156,gy],el=ik(sh[0],sh[1],hand[0],hand[1],36,36,-1);bodyLine(c,[sh,el,hand]);}
  score(c,'Air 0.21 s',200,40,MAD,28);}},
{cat:'Calisthenics',title:'Handstand judge',top:1,hook:'AI judges my handstand like an Olympic judge.',score:'9.1 / 10',setup:'Phone on tripod',reach:3,build:'Medium',
 how:'Hold a handstand. The app checks how straight your line is and how long you hold, then gives a score out of 10.',
 why:'A judge\'s score is a hook on its own, and people argue with it.',
 draw(c,t){const gy=262,s=1.15,U=19*s,T=34*s,sw=Math.sin(t*1.3)*0.05;ground(c,gy);dash(c,200,gy,200,30);
  const ny=gy-2*U*Math.cos(0.12);fig(c,{x:200+Math.sin(sw)*T,y:ny-Math.cos(sw)*T,s,b:Math.PI+sw,la:-0.12,ra:0.12,ll:Math.PI+0.06+sw*1.5,rl:Math.PI-0.06+sw*1.5,track:true});
  ['9.0','9.2','9.1'].forEach((v,i)=>{c.strokeStyle=INK;c.lineWidth=1.5;rr(c,272+i*38,200,32,42,4,'#fff');txt(c,v,288+i*38,221,14,IND,800);});
  score(c,'9.1 / 10',95,50,MAD,30);label(c,'line 96% straight',95,82,INK,13);label(c,'hold '+mmss(12+fr(t,30)*30),95,104,INK,13);}},
{cat:'Calisthenics',title:'Front lever angle',top:1,hook:'Is my front lever actually flat?',score:'2° below flat',setup:'Phone on tripod, side on',reach:3,build:'Easy',
 how:'Hold a front lever. The app measures your body angle against the floor, live.',
 why:'Every calisthenics athlete wonders this. The angle settles it.',
 draw(c,t){const bar=60,p=fr(t,4);c.strokeStyle=INK;c.lineWidth=5;line(c,60,bar,340,bar);
  const deg=p<0.6?L(14,2,ease(p/0.6)):2+Math.sin(t*3)*0.6,th=deg*Math.PI/180,hand=[250,bar],sh=[262,bar+38],ft=[sh[0]-185*Math.cos(th),sh[1]+185*Math.sin(th)],hip=[(sh[0]+ft[0])/2,(sh[1]+ft[1])/2];
  dash(c,sh[0],sh[1],50,sh[1]);bodyLine(c,[hand,sh]);bodyLine(c,[sh,hip,ft]);c.strokeStyle=IND;c.lineWidth=3;circ(c,sh[0]+15,sh[1]+4,9);
  c.strokeStyle=MAD;c.lineWidth=2;c.beginPath();c.arc(sh[0],sh[1],80,Math.PI-th,Math.PI);c.stroke();
  const ok=deg<3;score(c,Math.round(deg)+'° below flat',200,200,ok?IND:MAD,28);if(ok)label(c,'✓ flat enough',200,232,IND,15);}},
{cat:'Calisthenics',title:'Strict pull up check',top:1,hook:'Only chin over bar counts.',score:'Reps: 14',setup:'Phone on tripod',reach:3,build:'Easy',
 how:'Counts a pull up only when your chin clears the bar and your arms fully straighten at the bottom.',
 why:'Half rep pull ups are everywhere. A strict counter starts debates.',
 draw(c,t){const P=1.8,p=fr(t,P),k=Math.floor(t/P),u=(1-Math.cos(p*2*Math.PI))/2,bar=60;
  c.strokeStyle=INK;c.lineWidth=5;line(c,90,bar,310,bar);c.lineWidth=2;line(c,90,bar,90,290);line(c,310,bar,310,290);dash(c,60,bar+2,340,bar+2);
  const nk=[200,bar+L(48,6,u)],hip=[200,nk[1]+40],hl=[176,bar],hr=[224,bar],el=ik(nk[0],nk[1],hl[0],hl[1],27,27,-1),er=ik(nk[0],nk[1],hr[0],hr[1],27,27,1);
  bodyLine(c,[hl,el,nk,er,hr]);bodyLine(c,[nk,hip,[194,hip[1]+46]]);bodyLine(c,[hip,[206,hip[1]+46]]);const hy=nk[1]-14;c.strokeStyle=IND;c.lineWidth=3;circ(c,200,hy,10);
  if(hy+10<=bar+3)label(c,'chin over bar ✓',200,270,IND,16);score(c,'Reps: '+(k%25+1),200,26,MAD,24);}},
{cat:'Calisthenics',title:'L sit timer',hook:'My L sit, timed until my legs drop.',score:'0:24',setup:'Phone on tripod, side on',reach:2,build:'Easy',
 how:'The clock runs while your legs stay level and stops the moment they sink.',
 why:'Short, hard and honest. A clean progress number for calisthenics.',
 draw(c,t){const gy=250,p=fr(t,6);ground(c,gy);c.strokeStyle=INK;c.lineWidth=3;line(c,180,gy-30,240,gy-30);line(c,185,gy-30,185,gy);line(c,235,gy-30,235,gy);
  const drop=Math.min(20,Math.max(0,(p-0.6)/0.3)*20),ph=drop*Math.PI/180,hand=[205,gy-30],sh=[205,gy-68],hip=[198,gy-36],ft=[hip[0]+88*Math.cos(ph),hip[1]+88*Math.sin(ph)];
  dash(c,hip[0],hip[1],320,hip[1]);bodyLine(c,[hand,sh,hip,ft]);circ(c,207,gy-83,9);
  const bad=drop>10,secs=Math.min(p,0.75)*32;score(c,(bad?'Legs dropped at ':'')+mmss(secs),200,50,bad?MAD:INK,bad?22:32);}},
{cat:'Calisthenics',title:'Pistol squat depth',hook:'One leg. Full depth. Counted.',score:'Left leg: 8',setup:'Phone on tripod, side on',reach:2,build:'Easy',
 how:'Counts a pistol squat only when your hips reach knee height on the standing leg.',
 why:'A skill most people cannot do, so every clean rep gets attention.',
 draw(c,t){const gy=255,P=2.4,p=fr(t,P),k=Math.floor(t/P),s=1.3;ground(c,gy);const d=(1-Math.cos(p*2*Math.PI))/2,S=sq(d,gy,s),ky=gy-22*s*Math.cos(S.a2);dash(c,60,ky,340,ky);
  const fl=L(0.5,1.55,d);fig(c,{x:170+S.dx,y:S.hy,s,b:d*0.8,ll:S.a1,ll2:S.a2,rl:fl,rl2:fl,la:1.45,ra:1.55,track:true});
  const ok=S.hy>=ky-1;label(c,ok?'full depth ✓':'go lower',325,ky-14,ok?IND:MAD,15);score(c,'Left leg: '+(k%10+1),200,40);}},
{cat:'Calisthenics',title:'Dip depth counter',hook:'Are your dips deep enough?',score:'Dips: 22',setup:'Phone on tripod, side on',reach:2,build:'Easy',
 how:'Counts a dip only when your shoulder drops to elbow height.',
 why:'Depth arguments again, the comments do the work.',
 draw(c,t){const P=1.8,p=fr(t,P),k=Math.floor(t/P),u=(1-Math.cos(p*2*Math.PI))/2,by=165;c.strokeStyle=INK;c.lineWidth=4;line(c,120,by,300,by);c.lineWidth=2;line(c,140,by,140,290);line(c,280,by,280,290);
  const hand=[205,by],sh=[208,by-L(44,16,u)],el=ik(sh[0],sh[1],hand[0],hand[1],24,24,1),hip=[sh[0]-6,sh[1]+40];
  bodyLine(c,[sh,el,hand]);bodyLine(c,[sh,hip,[hip[0]-4,hip[1]+26],[hip[0]-26,hip[1]+40]]);c.strokeStyle=IND;c.lineWidth=3;circ(c,sh[0]+4,sh[1]-14,9);
  if(u>0.85)label(c,'deep enough ✓',320,by-40,IND,15);score(c,'Dips: '+(k%30+1),200,40);}},
{cat:'Running',title:'Running form score',hook:'AI scores my running form.',score:'Form 78 / 100',setup:'Phone on tripod, side on',reach:3,build:'Hard',
 how:'Film yourself running side on. The app reads cadence, bounce and knee angle at landing and gives a form score.',
 why:'Runners obsess over form. A score out of 100 begs for comments.',
 draw(c,t){const gy=240;c.strokeStyle=INK;c.lineWidth=2;rr(c,60,gy,220,16,8);for(let i=0;i<6;i++){const x=60+((i*40-t*120)%220+220)%220;line(c,x,gy+8,Math.min(x+12,272),gy+8);}
  const ph=t*10,sw=Math.sin(ph)*0.7,bob=Math.abs(Math.sin(ph))*6;fig(c,{x:170,y:gy-44-bob,b:0.12,ll:sw,ll2:sw-0.5,rl:-sw,rl2:-sw-0.5,la:-sw,la2:-sw+1.3,ra:sw,ra2:sw+1.3,track:true});
  [['cadence','172'],['bounce','7 cm'],['knee','18°']].forEach((r,i)=>{label(c,r[0],335,90+i*45,INK,13);txt(c,r[1],335,110+i*45,18,IND,800);});
  score(c,'Form 78 / 100',170,36,MAD,26);}},
{cat:'Running',title:'Landing knee check',hook:'Is my knee caving when I land?',score:'Knee in 14°',setup:'Phone on tripod, front on',reach:2,build:'Medium',
 how:'Step off a box and land. Filmed front on, the app checks whether your knees fall inward.',
 why:'Injury prevention gets saved and shared by athletes and coaches.',
 draw(c,t){const gy=255,P=2.4,k=Math.floor(t/P),p=(t%P)/P,bad=k%2===0;c.strokeStyle=INK;c.lineWidth=2;rr(c,55,gy-50,80,50,4,'rgba(242,184,72,.4)');ground(c,gy);
  const land=p>0.35,dy=land?Math.sin(clamp((p-0.35)/0.4,0,1)*Math.PI)*16:0,cave=bad?dy*0.8:0;let x=200,hy=gy-44+dy;if(!land){const v=p/0.35;x=L(95,200,v);hy=L(gy-94,gy-44,v*v);}
  const fy=land?gy:hy+44,ky=(hy+fy)/2,kl=[x-15+cave,ky],kr=[x+15-cave,ky];
  c.strokeStyle=bad&&dy>6?MAD:IND;c.lineWidth=3;line(c,x-8,hy,kl[0],kl[1]);line(c,kl[0],kl[1],x-17,fy);line(c,x+8,hy,kr[0],kr[1]);line(c,kr[0],kr[1],x+17,fy);
  bodyLine(c,[[x,hy],[x,hy-34]]);bodyLine(c,[[x,hy-34],[x-24,hy-14]]);bodyLine(c,[[x,hy-34],[x+24,hy-14]]);circ(c,x,hy-47,9);
  [kl,kr].forEach(q=>{dot(c,q[0],q[1],4,SAF);});
  if(land&&p>0.45)score(c,bad?'Knee in 14°':'Knees tracked ✓',290,60,bad?MAD:IND,24);}},
{cat:'Athlete data',title:'Heart rate from my face',hook:'My heart rate, read from just my face.',score:'168 to 112 bpm',setup:'Front camera, good light',reach:3,build:'Hard',
 how:'After a sprint, look at the camera. The app reads tiny colour changes in your skin to estimate pulse and shows how fast it drops.',
 why:'It feels like magic. Honest limit: it is an estimate, less exact than a chest strap.',
 draw(c,t){const p=fr(t,6),bpm=Math.round(L(168,112,ease(p/0.9)));c.strokeStyle=IND;c.lineWidth=3;circ(c,110,150,70);dot(c,88,140,5,INK);dot(c,132,140,5,INK);line(c,95,180,125,180);
  c.save();c.setLineDash([5,5]);c.strokeStyle=SAF;c.lineWidth=2;c.strokeRect(80,94,60,24);c.restore();
  c.strokeStyle=MAD;c.lineWidth=2.5;c.beginPath();const per=60/bpm;for(let x=0;x<=170;x+=2){const tt=t-(170-x)/120,ph=((tt%per)+per)%per/per,y=160-(ph<0.12?Math.sin(ph/0.12*Math.PI)*40:0);x?c.lineTo(205+x,y):c.moveTo(205+x,y);}c.stroke();
  score(c,bpm+' bpm',290,60,MAD,30);label(c,'after a sprint',290,92,INK,13);label(c,'estimate from skin colour',200,272,INK,13);}},
{cat:'Athlete data',title:'Daily test series',hook:'Day 47 of testing my speed every morning.',score:'3.21 s to 2.98 s',setup:'Any test on this page',reach:3,build:'Easy',
 how:'Run the same test every morning. The app saves each score and ends every video with your progress chart.',
 why:'A series gives people a reason to follow and come back tomorrow.',
 draw(c,t){const p=fr(t,6),n=Math.floor(clamp(p/0.85,0,1)*46)+1;c.strokeStyle=INK;c.lineWidth=2;line(c,50,70,50,250);line(c,50,250,370,250);
  const val=i=>3.21-0.26*(1-Math.exp(-i/18))+(hash(i)-0.5)*0.05,X=i=>50+i*6.6,Y=v=>250-(3.26-v)/0.34*170;
  c.strokeStyle=IND;c.lineWidth=2.5;c.beginPath();for(let i=1;i<=n;i++){i>1?c.lineTo(X(i),Y(val(i))):c.moveTo(X(i),Y(val(i)));}c.stroke();dot(c,X(n),Y(val(n)),6,MAD);
  score(c,'Day '+n,110,36,MAD,28);label(c,'20 m sprint: '+val(n).toFixed(2)+' s',275,36,INK,15);label(c,'faster ↑',52,60,INK,12);label(c,'days',360,268,INK,12);}},
];
const DROP=['Bowling speed gun','Batting reaction','Posture alarm','Breathing coach','20 20 20 eye break'];
const HOOKS={'Football shot speed':'How hard can I actually kick?','Keepy ups counter':'Every touch counted. No drops allowed.','Reactive shuttle':'Left or right? React now.','Vertical jump':'My vertical, measured to the centimetre.','Punch speed':'How fast is my jab, really?','Sprint timer':'My 20 m time, every single morning.','Six corner footwork':'Six corners. Random order. Go.','Basketball shot counter':'10 shots. The AI keeps score.',
 'Push up form counter':'The AI only counts real push ups.','Honest plank timer':'This plank timer stops when you cheat.','Squat depth checker':'Half squats do not count here.','Skipping rope counter':'140 jumps a minute. Can you beat it?','One leg balance test':'Eyes closed, one leg. How long can you last?','Wall sit timer':'My legs started shaking at 1:15.','Burpee counter':'Only full burpees count.','Sit and reach':'Can you reach past your toes?','Dead hang timer':'How long can you just hang?',
 'Reaction time test':'Tap the moment it turns yellow.','Tap speed test':'How many taps in 5 seconds?','Freeze test':'Stand still. The AI sees every wobble.','Body Simon Says':'Copy the poses. One mistake and you are out.','Steady hand trace':'Trace the line in the air. Stay inside.','Hole in the wall':'Match the hole before the wall hits you.','Body dodge game':'My body is the game controller.','Clap on the beat':'Clap on the beat. The AI is listening.','Staring contest':'Do not blink. The AI is watching.','Air drawing':'Draw a perfect star in the air.','Try not to laugh':'The AI catches your first smile.','Jumping jack race':'Dad vs son. 30 seconds of jumping jacks.','Freeze dance':'When the music stops, the AI sees who moved.'};
IDEAS.forEach(x=>{x.top=0;x.hook=HOOKS[x.title];if(x.cat==='Sport')x.cat='Ball sports';});
IDEAS.splice(0,IDEAS.length,...NEW,...IDEAS.filter(x=>!DROP.includes(x.title)));


const MAP={"Bolt ghost race":"ghost","False start test":"falsestart","Standing broad jump":"broadjump","Bar path tracker":"barpath","Handstand judge":"handstand","Front lever angle":"lever","Strict pull up check":"pullup","L sit timer":"lsit","Pistol squat depth":"pistol","Dip depth counter":"dips","Running form score":"runform","Landing knee check":"kneecheck","Daily test series":"daily","Football shot speed":"shotspeed","Keepy ups counter":"keepyups","Vertical jump":"vjump","Sprint timer":"sprint","Six corner footwork":"sixcorner","Push up form counter":"pushup","Honest plank timer":"plank","Squat depth checker":"squat","Skipping rope counter":"rope","One leg balance test":"balance","Wall sit timer":"wallsit","Burpee counter":"burpee","Sit and reach":"sitreach","Dead hang timer":"deadhang","Reaction time test":"reaction","Body Simon Says":"simon","Hole in the wall":"holewall","Body dodge game":"dodge","Try not to laugh":"nolaugh","Jumping jack race":"jacksrace","Freeze dance":"freezedance"};
const BY={};IDEAS.forEach(i=>{if(MAP[i.title])BY[MAP[i.title]]=i.draw;});
BY.bodyage=(c,t)=>{const k=Math.floor(t/4)%2;(k?BY.vjump:BY.balance)(c,t);};
export function drawDemo(id,c,t){BF=Math.floor(t*12.5)%3;c.setTransform(c.canvas.width/400,0,0,c.canvas.height/300,0,0);c.fillStyle=CARD;c.fillRect(0,0,400,300);const f=BY[id];if(f)try{f(c,t,400,300);}catch(e){}}
export const HAS_DEMO=id=>!!BY[id];
