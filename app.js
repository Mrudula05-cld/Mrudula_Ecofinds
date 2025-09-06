// EcoFinds core (localStorage-based prototype)
const store = {
  get(key, fallback){ try{ return JSON.parse(localStorage.getItem(key)) ?? fallback }catch{ return fallback } },
  set(key, val){ localStorage.setItem(key, JSON.stringify(val)) },
  push(key, val){ const arr = store.get(key, []); arr.push(val); store.set(key, arr); }
};

const KEYS = {
  users: 'eco_users',
  session: 'eco_session',
  products: 'eco_products'
};

const EcoUI = {
  isAuthed(){ return !!store.get(KEYS.session, null) },
  me(){ const email = store.get(KEYS.session, null); const users = store.get(KEYS.users, []); return users.find(u=>u.email===email) || null },
  renderAuthLinks(){
    const c = document.getElementById('authLinks'); if(!c) return;
    c.innerHTML = '';
    if(this.isAuthed()){
      c.innerHTML = `
        <a href="dashboard.html">Dashboard</a>
        <a class="primary" href="sell.html">Sell</a>
        <a href="#" id="signOut">Sign out</a>
      `;
      setTimeout(()=>{
        const el = document.getElementById('signOut');
        if(el) el.onclick = () => { localStorage.removeItem(KEYS.session); location.href='index.html' };
      },0);
    }else{
      c.innerHTML = `<a href="auth.html">Sign in</a> <a class="primary" href="auth.html">Create account</a>`;
    }
  },
  requireAuth(){
    if(!this.isAuthed()){ location.href='auth.html'; }
  }
};

// Seed sample data for first run
(function seed(){
  const seeded = store.get('eco_seeded', false);
  if(seeded) return;
  const sample = [
    {title:'Trek FX 3 Disc', description:'Excellent condition hybrid bike, recently serviced. Includes bottle cage and lights.', category:'Cycles', price:35000, image:'assets/hero-2.png'},
    {title:'Solid Wood Study Table', description:'Minimal scratches, 120x60cm with drawer.', category:'Furniture', price:4200, image:'assets/hero-3.png'},
    {title:'Kindle Paperwhite', description:'Waterproof, 8GB, great battery life.', category:'Electronics', price:6500, image:'assets/hero-1.png'}
  ];
  const now = Date.now();
  sample.forEach((s,i)=>{
    const p = {
      id: 'seed-'+i, ...s, sellerEmail:'seed@ecofinds.app', createdAt: now - i*100000
    };
    store.push(KEYS.products, p);
  });
  store.set('eco_seeded', true);
})();

const EcoAuth = {
  mode: 'signup',
  init(){
    const q = new URLSearchParams(location.search);
    if(q.get('mode')==='login') this.mode='login';
    this.render();
    document.getElementById('toggle').addEventListener('click', (e)=>{
      e.preventDefault();
      this.mode = this.mode==='signup'?'login':'signup';
      this.render();
    });
    document.getElementById('submitBtn').addEventListener('click', ()=> this.submit());
  },
  render(){
    const title = document.getElementById('modeTitle');
    const username = document.getElementById('username');
    const toggleRow = document.getElementById('toggleRow');
    if(this.mode==='signup'){
      title.textContent = 'Create your account';
      username.parentElement.style.display='grid';
      document.getElementById('submitBtn').textContent = 'Sign Up';
      toggleRow.innerHTML = 'Already have an account? <a href="#" id="toggle">Log in</a>';
    }else{
      title.textContent = 'Welcome back';
      username.parentElement.style.display='none';
      document.getElementById('submitBtn').textContent = 'Log In';
      toggleRow.innerHTML = 'New here? <a href="#" id="toggle">Create one</a>';
    }
    document.getElementById('toggle').onclick = (e)=>{ e.preventDefault(); this.mode = this.mode==='signup'?'login':'signup'; this.render(); };
  },
  submit(){
    const email = document.getElementById('email').value.trim().toLowerCase();
    const password = document.getElementById('password').value;
    const users = store.get(KEYS.users, []);

    if(this.mode==='signup'){
      const username = document.getElementById('username').value.trim();
      if(users.some(u=>u.email===email)) return alert('Account already exists.');
      users.push({email, password, username});
      store.set(KEYS.users, users);
      store.set(KEYS.session, email);
      location.href = 'dashboard.html';
    }else{
      const u = users.find(u=>u.email===email && u.password===password);
      if(!u) return alert('Invalid credentials.');
      store.set(KEYS.session, email);
      location.href = 'dashboard.html';
    }
  }
};

const EcoSell = {
  init(){
    const form = document.getElementById('sellForm');
    const file = document.getElementById('imgFile');
    const url = document.getElementById('imgUrl');
    let imageData = null;

    file.addEventListener('change', async (e)=>{
      const f = e.target.files[0]; if(!f) return;
      const reader = new FileReader();
      reader.onload = () => imageData = reader.result;
      reader.readAsDataURL(f);
    });
    url.addEventListener('input', ()=>{
      imageData = url.value || null;
    });

    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      const me = EcoUI.me();
      if(!me) return alert('Please sign in first.');
      const product = {
        id: 'p_'+Math.random().toString(36).slice(2),
        title: data.title,
        description: data.description,
        category: data.category,
        price: Number(data.price),
        image: imageData || 'assets/hero-1.png',
        sellerEmail: me.email,
        createdAt: Date.now()
      };
      store.push(KEYS.products, product);
      alert('Listing published!');
      location.href = 'shop.html';
    });
  }
};

const EcoShop = {
  init(){
    const params = new URLSearchParams(location.search);
    const qInput = document.getElementById('q');
    qInput.value = params.get('q') || '';

    ['q','filterCategory','sortBy','groupBy'].forEach(id=>{
      const el = document.getElementById(id);
      el.addEventListener('input', ()=> this.render());
    });
    this.render();
  },
  fetch(){
    return store.get(KEYS.products, []);
  },
  render(){
    let items = this.fetch();
    const q = document.getElementById('q').value.toLowerCase().trim();
    const cat = document.getElementById('filterCategory').value;
    if(q) items = items.filter(i => [i.title, i.description, i.category].join(' ').toLowerCase().includes(q));
    if(cat) items = items.filter(i => i.category === cat);

    const sort = document.getElementById('sortBy').value;
    if(sort==='new') items.sort((a,b)=> b.createdAt - a.createdAt);
    if(sort==='low') items.sort((a,b)=> a.price - b.price);
    if(sort==='high') items.sort((a,b)=> b.price - a.price);

    const group = document.getElementById('groupBy').value;
    const container = document.getElementById('list');
    container.innerHTML = '';

    const groups = {};
    if(group){
      for(const it of items){
        const key = group==='category'? it.category : it.sellerEmail;
        groups[key] ||= [];
        groups[key].push(it);
      }
      Object.entries(groups).forEach(([g, arr])=>{
        const h = document.createElement('div'); h.className='card'; h.innerHTML = `<h3 style="margin:0 0 10px">${g}</h3>`;
        const inner = document.createElement('div'); inner.className='grid';
        arr.forEach(it=> inner.appendChild(this.card(it)));
        h.appendChild(inner); container.appendChild(h);
      });
    }else{
      items.forEach(it=> container.appendChild(this.card(it)));
    }
    if(items.length===0){ container.innerHTML = '<p class="muted">No results. Try clearing filters.</p>'; }
  },
  card(it){
    const el = document.createElement('div');
    el.className = 'card item';
    el.innerHTML = `
      <img src="${it.image}" alt="">
      <div class="badge">${it.category}</div>
      <h4>${it.title}</h4>
      <div class="price">₹ ${Number(it.price).toLocaleString('en-IN')}</div>
      <p class="muted" title="${it.description}">${it.description.slice(0,90)}${it.description.length>90?'…':''}</p>
      <div class="row">
        <span class="muted">Seller: ${it.sellerEmail}</span>
        <a class="btn" href="mailto:${it.sellerEmail}?subject=Interested in ${encodeURIComponent(it.title)}">Contact</a>
      </div>
    `;
    return el;
  }
};

const EcoDash = {
  init(){
    const me = EcoUI.me();
    if(!me) return;
    document.getElementById('dashUsername').value = me.username || '';
    document.getElementById('dashEmail').value = me.email || '';

    document.getElementById('saveProfile').onclick = () => {
      const users = store.get(KEYS.users, []);
      const idx = users.findIndex(u=>u.email===me.email);
      users[idx].username = document.getElementById('dashUsername').value.trim();
      store.set(KEYS.users, users);
      alert('Profile saved.');
    };

    this.renderListings();
  },
  renderListings(){
    const me = EcoUI.me();
    const mine = store.get(KEYS.products, []).filter(p=>p.sellerEmail===me.email);
    const c = document.getElementById('myListings'); c.innerHTML='';
    if(mine.length===0){ c.innerHTML = '<p class="muted">No listings yet.</p>'; return; }
    mine.sort((a,b)=> b.createdAt - a.createdAt).forEach(p=>{
      const el = document.createElement('div'); el.className='card item';
      el.innerHTML = `
        <img src="${p.image}" alt="">
        <div class="badge">${p.category}</div>
        <h4>${p.title}</h4>
        <div class="price">₹ ${Number(p.price).toLocaleString('en-IN')}</div>
        <div class="row">
          <a class="btn" href="sell.html">Add another</a>
          <button class="btn" data-id="${p.id}">Delete</button>
        </div>
      `;
      el.querySelector('button[data-id]').onclick = (e)=>{
        const id = e.target.getAttribute('data-id');
        const all = store.get(KEYS.products, []);
        store.set(KEYS.products, all.filter(x=>x.id!==id));
        this.renderListings();
      };
      c.appendChild(el);
    });
  }
};
