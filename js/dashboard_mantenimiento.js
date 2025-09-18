/* ===== Gráfico simple (canvas, sin librerías) ===== */
const canvas = document.getElementById('salesChart');
if (canvas?.getContext) {
  const c = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height, pad = 36;

  // datos mock (30 días)
  const days = Array.from({length:30}, (_,i)=>i+1);
  const values = days.map(()=>Math.round(1500 + Math.random()*3500));
  const avg = values.reduce((a,b)=>a+b,0)/values.length;

  c.fillStyle = '#fff'; c.fillRect(0,0,W,H);

  // líneas guía
  c.strokeStyle = '#e5e5e5'; c.lineWidth = 1;
  for (let i=0;i<=4;i++){
    const y = pad + (H-pad*2)*i/4;
    c.beginPath(); c.moveTo(pad,y); c.lineTo(W-pad,y); c.stroke();
  }

  const max = Math.max(...values)*1.1;
  const toY = v => H - pad - (v/max)*(H-pad*2);
  const toX = i => pad + (W-pad*2)*i/(values.length-1);

  // promedio
  c.strokeStyle = '#e05a5a'; c.lineWidth = 2;
  c.beginPath(); c.moveTo(pad,toY(avg)); c.lineTo(W-pad,toY(avg)); c.stroke();

  // ventas
  c.strokeStyle = '#2f6ee9'; c.lineWidth = 2; c.beginPath();
  values.forEach((v,i)=>{ const x=toX(i), y=toY(v); i?c.lineTo(x,y):c.moveTo(x,y); });
  c.stroke();
}

/* ===== Producto más vendido (mock) ===== */
const topProducts = [
  {name:'Jean cargo bleach', meta:'TALLE XL · CELESTE', color:'#6ac47a'},
  {name:'Buzo oversize', meta:'TALLE M · NEGRO', color:'#6ac47a'},
];
const ulP = document.getElementById('topProducts');
if (ulP){
  ulP.innerHTML = topProducts.map(p=>`
    <li class="top-item">
      <div class="thumb">IMG</div>
      <div class="pdata">
        <strong>${p.name}</strong>
        <div class="meta">${p.meta} <span class="badge-col" style="background:${p.color}"></span></div>
      </div>
    </li>`).join('');
}

/* ===== Últimas órdenes (mock) ===== */
const lastOrders = [
  {id:'ORD-2025-0901', date:'2025-08-31'},
  {id:'ORD-2025-0902', date:'2025-09-01'},
  {id:'ORD-2025-0903', date:'2025-09-02'},
];
const ulO = document.getElementById('lastOrders');
if (ulO){
  ulO.innerHTML = lastOrders.map(o=>`
    <li>
      <a href="orden_mantenimiento.html">${o.id}</a>
      <span class="lo-meta">${new Date(o.date).toLocaleDateString('es-AR')}</span>
    </li>`).join('');
}

/* ===== Calendario simple ===== */
function renderCalendar(el, d=new Date()){
  if (!el) return;
  el.innerHTML = '';
  const y=d.getFullYear(), m=d.getMonth();
  const f=new Date(y,m,1), l=new Date(y,m+1,0);
  const startDow=(f.getDay()+6)%7, total=startDow+l.getDate(), rows=Math.ceil(total/7)*7;

  const head=document.createElement('div');
  head.className='cal-head';
  head.innerHTML=`
    <button class="btn-prev" aria-label="Mes anterior"><i class="bi bi-chevron-left"></i></button>
    <div>${d.toLocaleString('es-AR',{month:'long',year:'numeric'})}</div>
    <button class="btn-next" aria-label="Mes siguiente"><i class="bi bi-chevron-right"></i></button>`;
  el.appendChild(head);

  const grid=document.createElement('div'); grid.className='cal-grid';
  ['L','M','X','J','V','S','D'].forEach(dw=>{
    const s=document.createElement('span'); s.className='cal-dow'; s.textContent=dw; grid.appendChild(s);
  });

  for (let i=0;i<rows;i++){
    const n=i-startDow+1, cell=document.createElement('span');
    if(n>0 && n<=l.getDate()){
      cell.textContent=n; cell.className='cal-day';
      const t=new Date();
      if(n===t.getDate() && m===t.getMonth() && y===t.getFullYear()) cell.classList.add('today');
    } else cell.textContent='';
    grid.appendChild(cell);
  }
  el.appendChild(grid);

  head.querySelector('.btn-prev').onclick=()=>renderCalendar(el,new Date(y,m-1,1));
  head.querySelector('.btn-next').onclick=()=>renderCalendar(el,new Date(y,m+1,1));
}
renderCalendar(document.getElementById('calendar'));
