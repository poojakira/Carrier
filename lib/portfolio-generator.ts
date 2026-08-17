/**
 * Portfolio Generator — produces a fully self-contained HTML document
 * with Three.js 3D effects, responsive design, and all user data.
 */

export interface PortfolioProfile {
  name: string;
  headline: string;
  summary: string;
  location: string;
  email?: string;
  skills: string[];
  projects: { name: string; description: string; url?: string; tech?: string[] }[];
  experience: { company: string; title: string; startDate: string; endDate?: string; description: string }[];
  education: { institution: string; degree: string; field?: string; year?: string }[];
  certifications?: string[];
}

export type PortfolioStyle =
  | 'Minimal Dark'
  | 'Gradient Modern'
  | 'Cyberpunk Neon'
  | 'Clean Professional'
  | 'Creative Artistic';

interface StyleConfig {
  bgPrimary: string;
  bgSecondary: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentGlow: string;
  particleColor: string;
  geometryColor: string;
  cardBg: string;
  fontHeading: string;
  fontBody: string;
}

function getStyleConfig(style: PortfolioStyle): StyleConfig {
  switch (style) {
    case 'Minimal Dark':
      return {
        bgPrimary: '#0a0a0a',
        bgSecondary: '#111111',
        textPrimary: '#ffffff',
        textSecondary: '#a0a0a0',
        accent: '#3b82f6',
        accentGlow: 'rgba(59,130,246,0.3)',
        particleColor: '#3b82f6',
        geometryColor: '#3b82f6',
        cardBg: 'rgba(255,255,255,0.03)',
        fontHeading: "'Inter', sans-serif",
        fontBody: "'Inter', sans-serif",
      };
    case 'Gradient Modern':
      return {
        bgPrimary: '#0f0c29',
        bgSecondary: '#1a1a3e',
        textPrimary: '#ffffff',
        textSecondary: '#b4b4d0',
        accent: '#a855f7',
        accentGlow: 'rgba(168,85,247,0.3)',
        particleColor: '#a855f7',
        geometryColor: '#ec4899',
        cardBg: 'rgba(168,85,247,0.05)',
        fontHeading: "'Inter', sans-serif",
        fontBody: "'Inter', sans-serif",
      };
    case 'Cyberpunk Neon':
      return {
        bgPrimary: '#0a0015',
        bgSecondary: '#120020',
        textPrimary: '#f0f0f0',
        textSecondary: '#c0c0e0',
        accent: '#00ffcc',
        accentGlow: 'rgba(0,255,204,0.4)',
        particleColor: '#ff00ff',
        geometryColor: '#00ffcc',
        cardBg: 'rgba(0,255,204,0.03)',
        fontHeading: "'Orbitron', sans-serif",
        fontBody: "'Inter', sans-serif",
      };
    case 'Clean Professional':
      return {
        bgPrimary: '#0d1117',
        bgSecondary: '#161b22',
        textPrimary: '#f0f6fc',
        textSecondary: '#8b949e',
        accent: '#58a6ff',
        accentGlow: 'rgba(88,166,255,0.2)',
        particleColor: '#58a6ff',
        geometryColor: '#58a6ff',
        cardBg: 'rgba(88,166,255,0.03)',
        fontHeading: "'Inter', sans-serif",
        fontBody: "'Inter', sans-serif",
      };
    case 'Creative Artistic':
      return {
        bgPrimary: '#1a0a2e',
        bgSecondary: '#16213e',
        textPrimary: '#ffffff',
        textSecondary: '#c4b5fd',
        accent: '#f59e0b',
        accentGlow: 'rgba(245,158,11,0.3)',
        particleColor: '#f59e0b',
        geometryColor: '#ef4444',
        cardBg: 'rgba(245,158,11,0.04)',
        fontHeading: "'Playfair Display', serif",
        fontBody: "'Inter', sans-serif",
      };
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function generatePortfolio(
  profile: PortfolioProfile,
  style: PortfolioStyle,
  customDescription: string
): string {
  const s = getStyleConfig(style);
  const name = escapeHtml(profile.name || 'Your Name');
  const headline = escapeHtml(profile.headline || 'Professional');
  const summary = escapeHtml(profile.summary || '');
  const location = escapeHtml(profile.location || '');
  const email = escapeHtml(profile.email || '');

  const skillsHtml = (profile.skills || [])
    .map(
      (skill, i) =>
        `<div class="skill-item" style="animation-delay:${i * 0.1}s"><span class="skill-name">${escapeHtml(skill)}</span><div class="skill-bar"><div class="skill-fill" style="width:${75 + Math.floor(Math.random() * 25)}%"></div></div></div>`
    )
    .join('');

  const projectsHtml = (profile.projects || [])
    .map(
      (p) =>
        `<div class="project-card tilt-card"><h3>${escapeHtml(p.name)}</h3><p>${escapeHtml(p.description)}</p>${p.tech ? `<div class="tech-tags">${p.tech.map((t) => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>` : ''}${p.url ? `<a href="${escapeHtml(p.url)}" target="_blank" rel="noopener" class="project-link">View Project →</a>` : ''}</div>`
    )
    .join('');

  const experienceHtml = (profile.experience || [])
    .map(
      (e) =>
        `<div class="timeline-item fade-in"><div class="timeline-marker"></div><div class="timeline-content"><h3>${escapeHtml(e.title)}</h3><div class="timeline-meta">${escapeHtml(e.company)} • ${escapeHtml(e.startDate)}${e.endDate ? ` – ${escapeHtml(e.endDate)}` : ' – Present'}</div><p>${escapeHtml(e.description)}</p></div></div>`
    )
    .join('');

  const educationHtml = (profile.education || [])
    .map(
      (e) =>
        `<div class="education-item fade-in"><h3>${escapeHtml(e.degree)}${e.field ? ` in ${escapeHtml(e.field)}` : ''}</h3><div class="education-meta">${escapeHtml(e.institution)}${e.year ? ` • ${escapeHtml(e.year)}` : ''}</div></div>`
    )
    .join('');

  const fontImports =
    style === 'Cyberpunk Neon'
      ? `<link href="https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">`
      : style === 'Creative Artistic'
        ? `<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700;900&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">`
        : `<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap" rel="stylesheet">`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${name} — Portfolio</title>
${fontImports}
<style>
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{background:${s.bgPrimary};color:${s.textPrimary};font-family:${s.fontBody};line-height:1.7;overflow-x:hidden}
::-webkit-scrollbar{width:8px}
::-webkit-scrollbar-track{background:${s.bgSecondary}}
::-webkit-scrollbar-thumb{background:${s.accent};border-radius:4px}

/* Navigation */
nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:16px 40px;display:flex;justify-content:space-between;align-items:center;backdrop-filter:blur(20px);background:rgba(0,0,0,0.5);border-bottom:1px solid rgba(255,255,255,0.05);transition:all 0.3s}
nav .logo{font-family:${s.fontHeading};font-weight:700;font-size:1.2rem;color:${s.accent}}
nav ul{list-style:none;display:flex;gap:24px}
nav ul li a{color:${s.textSecondary};text-decoration:none;font-size:0.9rem;font-weight:500;transition:color 0.3s}
nav ul li a:hover{color:${s.accent}}

/* Three.js Canvas */
#three-canvas{position:fixed;top:0;left:0;width:100%;height:100%;z-index:-1;pointer-events:none}

/* Sections */
section{min-height:100vh;padding:120px 60px;position:relative;max-width:1200px;margin:0 auto}
.section-title{font-family:${s.fontHeading};font-size:2.5rem;font-weight:700;margin-bottom:60px;position:relative;display:inline-block}
.section-title::after{content:'';position:absolute;bottom:-12px;left:0;width:60px;height:3px;background:${s.accent};border-radius:2px}

/* Hero */
#hero{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:100vh;position:relative}
#hero-geometry{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:400px;height:400px;opacity:0.15;pointer-events:none}
.hero-name{font-family:${s.fontHeading};font-size:clamp(2.5rem,8vw,5rem);font-weight:900;background:linear-gradient(135deg,${s.accent},${s.textPrimary});-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:16px;position:relative;z-index:2}
.hero-headline{font-size:clamp(1.2rem,3vw,1.8rem);color:${s.textSecondary};font-weight:300;margin-bottom:32px;position:relative;z-index:2}
.hero-cta{display:inline-flex;gap:16px;position:relative;z-index:2}
.hero-cta a{padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;transition:all 0.3s}
.hero-cta .primary{background:${s.accent};color:${s.bgPrimary};box-shadow:0 4px 30px ${s.accentGlow}}
.hero-cta .primary:hover{transform:translateY(-2px);box-shadow:0 8px 40px ${s.accentGlow}}
.hero-cta .secondary{border:1px solid ${s.accent};color:${s.accent}}
.hero-cta .secondary:hover{background:${s.accent};color:${s.bgPrimary}}

/* About */
.about-content{font-size:1.15rem;color:${s.textSecondary};max-width:700px;line-height:1.9}
.about-meta{margin-top:32px;display:flex;gap:32px;flex-wrap:wrap}
.about-meta .meta-item{display:flex;align-items:center;gap:8px;color:${s.textSecondary}}
.about-meta .meta-item .dot{width:8px;height:8px;border-radius:50%;background:${s.accent}}

/* Skills */
.skills-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px}
.skill-item{padding:16px 20px;background:${s.cardBg};border:1px solid rgba(255,255,255,0.05);border-radius:12px;transition:all 0.3s;opacity:0;animation:fadeSlideIn 0.5s forwards}
.skill-item:hover{border-color:${s.accent};box-shadow:0 0 20px ${s.accentGlow}}
.skill-name{font-weight:600;font-size:0.95rem;margin-bottom:10px;display:block}
.skill-bar{height:4px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden}
.skill-fill{height:100%;background:linear-gradient(90deg,${s.accent},${s.geometryColor});border-radius:4px;transition:width 1.5s ease-in-out}

/* Projects */
.projects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}
.project-card{background:${s.cardBg};border:1px solid rgba(255,255,255,0.05);border-radius:16px;padding:32px;transition:all 0.3s;transform-style:preserve-3d;perspective:1000px}
.project-card:hover{border-color:${s.accent};box-shadow:0 20px 60px rgba(0,0,0,0.4);transform:translateY(-4px)}
.project-card h3{font-family:${s.fontHeading};font-size:1.3rem;margin-bottom:12px;color:${s.textPrimary}}
.project-card p{color:${s.textSecondary};font-size:0.95rem;margin-bottom:16px}
.tech-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.tag{padding:4px 12px;background:rgba(255,255,255,0.05);border-radius:20px;font-size:0.8rem;color:${s.accent};border:1px solid rgba(255,255,255,0.08)}
.project-link{color:${s.accent};text-decoration:none;font-weight:600;font-size:0.9rem;transition:color 0.3s}
.project-link:hover{text-decoration:underline}

/* Timeline / Experience */
.timeline{position:relative;padding-left:40px}
.timeline::before{content:'';position:absolute;left:8px;top:0;bottom:0;width:2px;background:linear-gradient(180deg,${s.accent},transparent)}
.timeline-item{position:relative;margin-bottom:48px;padding-left:24px}
.timeline-marker{position:absolute;left:-40px;top:8px;width:18px;height:18px;border-radius:50%;background:${s.bgPrimary};border:3px solid ${s.accent};box-shadow:0 0 15px ${s.accentGlow}}
.timeline-content h3{font-family:${s.fontHeading};font-size:1.2rem;margin-bottom:6px}
.timeline-meta{color:${s.accent};font-size:0.9rem;font-weight:500;margin-bottom:10px}
.timeline-content p{color:${s.textSecondary};font-size:0.95rem}

/* Education */
.education-grid{display:grid;gap:24px}
.education-item{padding:24px 32px;background:${s.cardBg};border:1px solid rgba(255,255,255,0.05);border-radius:12px;transition:all 0.3s}
.education-item:hover{border-color:${s.accent}}
.education-item h3{font-family:${s.fontHeading};font-size:1.1rem;margin-bottom:6px}
.education-meta{color:${s.textSecondary};font-size:0.9rem}

/* Contact */
#contact{text-align:center}
.contact-content{font-size:1.2rem;color:${s.textSecondary};margin-bottom:32px}
.contact-links{display:flex;gap:16px;justify-content:center;flex-wrap:wrap}
.contact-links a{padding:12px 28px;border:1px solid ${s.accent};color:${s.accent};text-decoration:none;border-radius:8px;font-weight:500;transition:all 0.3s}
.contact-links a:hover{background:${s.accent};color:${s.bgPrimary}}

/* Animations */
@keyframes fadeSlideIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
.fade-in{opacity:0;transform:translateY(30px);transition:opacity 0.6s ease,transform 0.6s ease}
.fade-in.visible{opacity:1;transform:translateY(0)}

/* 3D Tilt */
.tilt-card{transition:transform 0.15s ease}

/* Responsive */
@media(max-width:768px){
  section{padding:80px 24px}
  nav{padding:12px 20px}
  nav ul{gap:12px}
  nav ul li a{font-size:0.8rem}
  .hero-name{font-size:2.2rem}
  .projects-grid{grid-template-columns:1fr}
  .skills-grid{grid-template-columns:1fr}
  .hero-cta{flex-direction:column;gap:12px}
  .about-meta{flex-direction:column;gap:16px}
  #hero-geometry{width:250px;height:250px}
}
@media(max-width:480px){
  nav ul{display:none}
  section{padding:60px 16px}
}

/* Custom style note */
${customDescription ? `/* User preference: ${customDescription.replace(/\*\//g, '')} */` : ''}
</style>
</head>
<body>

<canvas id="three-canvas"></canvas>

<nav>
  <div class="logo">${name.split(' ')[0]}</div>
  <ul>
    <li><a href="#hero">Home</a></li>
    <li><a href="#about">About</a></li>
    <li><a href="#skills">Skills</a></li>
    <li><a href="#projects">Projects</a></li>
    <li><a href="#experience">Experience</a></li>
    <li><a href="#education">Education</a></li>
    <li><a href="#contact">Contact</a></li>
  </ul>
</nav>

<section id="hero">
  <div id="hero-geometry"></div>
  <h1 class="hero-name">${name}</h1>
  <p class="hero-headline">${headline}</p>
  <div class="hero-cta">
    <a href="#projects" class="primary">View My Work</a>
    <a href="#contact" class="secondary">Get In Touch</a>
  </div>
</section>

<section id="about">
  <h2 class="section-title fade-in">About Me</h2>
  <p class="about-content fade-in">${summary || 'A passionate professional dedicated to building exceptional digital experiences.'}</p>
  <div class="about-meta fade-in">
    ${location ? `<div class="meta-item"><div class="dot"></div><span>${location}</span></div>` : ''}
    ${email ? `<div class="meta-item"><div class="dot"></div><span>${email}</span></div>` : ''}
  </div>
</section>

<section id="skills">
  <h2 class="section-title fade-in">Skills & Expertise</h2>
  <div class="skills-grid">${skillsHtml || '<p class="fade-in" style="color:' + s.textSecondary + '">Skills will appear here.</p>'}</div>
</section>

<section id="projects">
  <h2 class="section-title fade-in">Projects</h2>
  <div class="projects-grid">${projectsHtml || '<p class="fade-in" style="color:' + s.textSecondary + '">Projects will appear here.</p>'}</div>
</section>

<section id="experience">
  <h2 class="section-title fade-in">Experience</h2>
  <div class="timeline">${experienceHtml || '<p class="fade-in" style="color:' + s.textSecondary + '">Experience will appear here.</p>'}</div>
</section>

<section id="education">
  <h2 class="section-title fade-in">Education</h2>
  <div class="education-grid">${educationHtml || '<p class="fade-in" style="color:' + s.textSecondary + '">Education will appear here.</p>'}</div>
</section>

<section id="contact">
  <h2 class="section-title fade-in">Let&rsquo;s Connect</h2>
  <p class="contact-content fade-in">I&rsquo;m always open to new opportunities and collaborations.</p>
  <div class="contact-links fade-in">
    ${email ? `<a href="mailto:${email}">Email Me</a>` : ''}
    <a href="#hero">Back to Top</a>
  </div>
</section>

<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"><\/script>
<script>
(function(){
  // === THREE.JS 3D BACKGROUND ===
  const canvas = document.getElementById('three-canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 50;

  // Particle System
  const particleCount = 800;
  const particleGeometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const velocities = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    positions[i] = (Math.random() - 0.5) * 100;
    positions[i + 1] = (Math.random() - 0.5) * 100;
    positions[i + 2] = (Math.random() - 0.5) * 100;
    velocities[i] = (Math.random() - 0.5) * 0.02;
    velocities[i + 1] = (Math.random() - 0.5) * 0.02;
    velocities[i + 2] = (Math.random() - 0.5) * 0.02;
  }

  particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const particleMaterial = new THREE.PointsMaterial({
    color: new THREE.Color('${s.particleColor}'),
    size: 0.5,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
  });

  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  // Hero Geometry — Rotating Icosahedron
  const icoGeometry = new THREE.IcosahedronGeometry(8, 1);
  const icoMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('${s.geometryColor}'),
    wireframe: true,
    transparent: true,
    opacity: 0.3,
  });
  const icosahedron = new THREE.Mesh(icoGeometry, icoMaterial);
  scene.add(icosahedron);

  // Secondary geometry ring
  const torusGeometry = new THREE.TorusGeometry(12, 0.3, 16, 100);
  const torusMaterial = new THREE.MeshBasicMaterial({
    color: new THREE.Color('${s.accent}'),
    wireframe: true,
    transparent: true,
    opacity: 0.15,
  });
  const torus = new THREE.Mesh(torusGeometry, torusMaterial);
  torus.rotation.x = Math.PI / 3;
  scene.add(torus);

  // Mouse interaction
  let mouseX = 0, mouseY = 0;
  document.addEventListener('mousemove', (e) => {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    // Animate particles
    const pos = particleGeometry.attributes.position.array;
    for (let i = 0; i < particleCount * 3; i += 3) {
      pos[i] += velocities[i];
      pos[i + 1] += velocities[i + 1];
      pos[i + 2] += velocities[i + 2];

      if (Math.abs(pos[i]) > 50) velocities[i] *= -1;
      if (Math.abs(pos[i + 1]) > 50) velocities[i + 1] *= -1;
      if (Math.abs(pos[i + 2]) > 50) velocities[i + 2] *= -1;
    }
    particleGeometry.attributes.position.needsUpdate = true;

    // Rotate geometries
    icosahedron.rotation.x += 0.003;
    icosahedron.rotation.y += 0.005;
    torus.rotation.z += 0.002;
    torus.rotation.x += 0.001;

    // Mouse parallax
    camera.position.x += (mouseX * 5 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 5 - camera.position.y) * 0.02;
    camera.lookAt(scene.position);

    // Scroll-based positioning
    const scrollY = window.scrollY;
    particles.rotation.y = scrollY * 0.0003;
    icosahedron.position.y = -scrollY * 0.01;

    renderer.render(scene, camera);
  }
  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  // === SCROLL ANIMATIONS ===
  const fadeElements = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

  fadeElements.forEach(el => observer.observe(el));

  // === 3D TILT ON PROJECT CARDS ===
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;
      const rotateX = (y - centerY) / centerY * -8;
      const rotateY = (x - centerX) / centerX * 8;
      card.style.transform = 'perspective(1000px) rotateX(' + rotateX + 'deg) rotateY(' + rotateY + 'deg) translateY(-4px)';
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)';
    });
  });

  // === SMOOTH NAV SCROLL HIGHLIGHT ===
  const sections = document.querySelectorAll('section');
  const navLinks = document.querySelectorAll('nav ul li a');
  window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 200;
      if (window.scrollY >= sectionTop) {
        current = section.getAttribute('id');
      }
    });
    navLinks.forEach(link => {
      link.style.color = link.getAttribute('href') === '#' + current ? '${s.accent}' : '${s.textSecondary}';
    });
  });
})();
<\/script>

</body>
</html>`;
}
