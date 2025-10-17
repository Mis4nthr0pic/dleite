// Simple ripple effect for buttons
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.btn');
  if (!btn) return;
  const ripple = document.createElement('span');
  const rect = btn.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  ripple.style.cssText = `position:absolute;left:${e.clientX - rect.left - size/2}px;top:${e.clientY - rect.top - size/2}px;width:${size}px;height:${size}px;border-radius:999px;background:rgba(255,255,255,.25);transform:scale(0);opacity:.8;pointer-events:none;animation:ripple .6s ease`;
  btn.style.position = 'relative';
  btn.appendChild(ripple);
  ripple.addEventListener('animationend', () => ripple.remove());
});

const style = document.createElement('style');
style.textContent = `@keyframes ripple{to{transform:scale(2.4);opacity:0}}`;
document.head.appendChild(style);

// ULTIMATE EFFECTS - Floating Particles
(function createParticles(){
  if(document.body.classList.contains('admin')) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'particles-canvas';
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  const particles = [];
  for(let i=0; i<50; i++){
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      radius: Math.random() * 3 + 1,
      opacity: Math.random() * 0.5 + 0.1
    });
  }

  function animate(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;

      if(p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if(p.y < 0 || p.y > canvas.height) p.vy *= -1;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(16, 185, 129, ${p.opacity})`;
      ctx.fill();
    });

    requestAnimationFrame(animate);
  }

  animate();
})();

// 3D Tilt Effect on Cards
document.addEventListener('mousemove', (e) => {
  if(window.innerWidth < 768) return;

  const cards = document.querySelectorAll('.hero-left, .media-frame, .hero-bottle, .carousel');

  cards.forEach(card => {
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if(x >= 0 && x <= rect.width && y >= 0 && y <= rect.height){
      const xRotate = ((y / rect.height) - 0.5) * 10;
      const yRotate = ((x / rect.width) - 0.5) * -10;

      card.style.transform = `perspective(1000px) rotateX(${xRotate}deg) rotateY(${yRotate}deg) translateZ(10px)`;
    }
  });
});

document.addEventListener('mouseleave', () => {
  const cards = document.querySelectorAll('.hero-left, .media-frame, .hero-bottle, .carousel');
  cards.forEach(card => {
    card.style.transform = '';
  });
});

// Animated Counter for Stats
function animateCounter(el) {
  const raw = el.dataset.count;
  if (!raw) return; // no target -> leave static content
  const target = parseInt(String(raw).replace(/\D/g, ''), 10);
  if (isNaN(target)) return;
  const duration = 2000;
  const start = 0;
  const increment = target / (duration / 16);
  let current = start;

  const timer = setInterval(() => {
    current += increment;
    if (current >= target) {
      el.textContent = target + '+';
      clearInterval(timer);
    } else {
      el.textContent = Math.floor(current);
    }
  }, 16);
}

// Intersection Observer for stat counters
const observerOptions = {
  threshold: 0.5,
  rootMargin: '0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const statNumbers = entry.target.querySelectorAll('.stat-number[data-count]');
      statNumbers.forEach(animateCounter);
      observer.unobserve(entry.target);
    }
  });
}, observerOptions);

// Sidebar toggle (mobile)
document.addEventListener('DOMContentLoaded', () => {
  // Observe impact section for counter animation
  const impactSection = document.querySelector('.impact-section');
  if (impactSection) {
    observer.observe(impactSection);
  }

  const toggle = document.getElementById('sidebar-toggle');
  if (toggle) {
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-open');
    });
  }

  // Desktop collapse toggle via localStorage
  const collapseKey = 'sidebar-collapsed';
  if (localStorage.getItem(collapseKey) === '1') {
    document.body.classList.add('sidebar-collapsed');
  }
  document.body.addEventListener('click', (e) => {
    const btn = e.target.closest('#collapse-sidebar');
    if (btn) {
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem(collapseKey, document.body.classList.contains('sidebar-collapsed') ? '1' : '0');
    }
  });

  // Locale dropdown toggle
  const locale = document.getElementById('locale-switch');
  if (locale) {
    const toggle = locale.querySelector('.dropdown-toggle');
    toggle.addEventListener('click', () => locale.classList.toggle('open'));
    document.addEventListener('click', (e) => {
      if (!locale.contains(e.target)) locale.classList.remove('open');
    });
    // Try to set flag label by current language
    try {
      const params = new URLSearchParams(window.location.search);
      const lng = params.get('lng') || document.documentElement.lang || 'pt';
      const label = locale.querySelector('.dropdown-toggle .label');
      const flag = locale.querySelector('.dropdown-toggle .flag');
      if (lng.startsWith('en')) { flag.textContent = '🇺🇸'; label.textContent = 'English'; }
      else { flag.textContent = '🇧🇷'; label.textContent = 'Português'; }
    } catch {}
  }

  // Localized validation messages
  const lang = (document.documentElement.getAttribute('lang') || 'pt').toLowerCase();
  const msgs = lang.startsWith('en') ? {
    required: 'This field is required.',
    email: 'Enter a valid email address.',
    phone: 'Enter only digits (10–15).',
    cnpj: 'Enter a valid 14-digit CNPJ.',
    quantity: 'Enter a positive quantity.',
    date: 'Select a valid date.'
  } : {
    required: 'Este campo é obrigatório.',
    email: 'Informe um email válido.',
    phone: 'Informe apenas números (10 a 15 dígitos).',
    cnpj: 'Informe um CNPJ válido com 14 dígitos.',
    quantity: 'Informe uma quantidade positiva.',
    date: 'Selecione uma data válida.'
  };

  document.addEventListener('invalid', (e) => {
    const el = e.target;
    if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLSelectElement)) return;
    let message = '';
    if (el.validity.valueMissing) message = msgs.required;
    else if (el.type === 'email' && el.validity.typeMismatch) message = msgs.email;
    else if (el.name === 'phone' && el.validity.patternMismatch) message = msgs.phone;
    else if (el.name === 'cnpj' && el.validity.patternMismatch) message = msgs.cnpj;
    else if (el.name === 'quantity_produced' && (el.validity.rangeUnderflow || el.validity.badInput)) message = msgs.quantity;
    else if (el.type === 'date' && el.validity.badInput) message = msgs.date;
    if (message) el.setCustomValidity(message);
  }, true);
  document.addEventListener('input', (e) => {
    const el = e.target;
    if (el && el.setCustomValidity) el.setCustomValidity('');
  });

  // Toast helper
  function showToast(opts){
    const wrap = document.getElementById('toast-wrap');
    if(!wrap) return;
    const div = document.createElement('div');
    div.className = 'toast ' + (opts.type||'');
    const title = document.createElement('div');
    title.className = 'title';
    title.textContent = opts.title || (opts.type==='error' ? (lang.startsWith('en')?'Error':'Erro') : (lang.startsWith('en')?'Info':'Aviso'));
    const body = document.createElement('div');
    body.className = 'body';
    body.textContent = opts.text || '';
    const close = document.createElement('button');
    close.className = 'close';
    close.type = 'button';
    close.textContent = '×';
    close.onclick = () => div.remove();
    div.appendChild(title);
    div.appendChild(body);
    div.appendChild(close);
    wrap.appendChild(div);
    setTimeout(()=>{div.remove();}, opts.duration || 5000);
  }

  if (window.__TOAST) {
    try { showToast(window.__TOAST); } catch {}
    window.__TOAST = null;
  }

  // Simple carousel
  document.querySelectorAll('.carousel').forEach((car) => {
    const slides = car.querySelector('.slides');
    const items = car.querySelectorAll('.slide');
    const prev = car.querySelector('[data-prev]');
    const next = car.querySelector('[data-next]');
    const dotsWrap = car.querySelector('.dots');
    let i = 0;
    function render(){
      slides.style.transform = `translateX(-${i*100}%)`;
      if (dotsWrap){
        dotsWrap.querySelectorAll('.dot').forEach((d,idx)=>{
          d.classList.toggle('active', idx===i);
        });
      }
    }
    function go(n){ i=(n+items.length)%items.length; render(); }
    if (prev) prev.addEventListener('click', ()=>go(i-1));
    if (next) next.addEventListener('click', ()=>go(i+1));
    if (dotsWrap){
      dotsWrap.innerHTML = '';
      items.forEach((_, idx)=>{
        const d=document.createElement('div'); d.className='dot'+(idx===0?' active':''); d.addEventListener('click', ()=>go(idx)); dotsWrap.appendChild(d);
      });
    }
    let t=setInterval(()=>go(i+1), 5000);
    car.addEventListener('mouseenter', ()=>clearInterval(t));
    car.addEventListener('mouseleave', ()=>{ t=setInterval(()=>go(i+1),5000); });
    render();
  });
});
