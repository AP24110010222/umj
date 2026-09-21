/**
 * Uma Maheshwari Jewellers - Subtle Gold Dust & Luxury Sparkle Effect
 * Adds delicate, high-end golden ambient particle movement in the Hero section.
 */
function initGoldParticles(canvasId = "hero-particles") {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Check if reduced motion is requested
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const ctx = canvas.getContext("2d");
  let width, height;
  let particles = [];
  const PARTICLE_COUNT = 38; // Elegant and minimal, never cluttered

  function resize() {
    width = canvas.width = canvas.parentElement.offsetWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  }

  window.addEventListener("resize", resize);
  resize();

  class GoldParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      this.x = Math.random() * width;
      this.y = initial ? Math.random() * height : height + 10;
      this.size = Math.random() * 2.2 + 0.8;
      this.speedY = Math.random() * 0.45 + 0.15;
      this.speedX = (Math.random() - 0.5) * 0.3;
      this.opacity = Math.random() * 0.6 + 0.2;
      this.pulseSpeed = Math.random() * 0.02 + 0.008;
      this.pulseDir = Math.random() > 0.5 ? 1 : -1;
      // Rich gold palette: Champagne gold, Royal 22K gold, warm amber gold
      const hues = [
        "rgba(212, 175, 55,",   // Metallic 22K Gold
        "rgba(243, 224, 168,",  // Champagne Gold
        "rgba(230, 192, 110,",  // Soft warm Gold
        "rgba(255, 235, 179,"   // Bright Gold Sparkle
      ];
      this.baseColor = hues[Math.floor(Math.random() * hues.length)];
    }

    update() {
      this.y -= this.speedY;
      this.x += this.speedX;

      // Pulse opacity
      this.opacity += this.pulseSpeed * this.pulseDir;
      if (this.opacity > 0.75) {
        this.pulseDir = -1;
      } else if (this.opacity < 0.15) {
        this.pulseDir = 1;
      }

      if (this.y < -10 || this.x < -10 || this.x > width + 10) {
        this.reset();
      }
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `${this.baseColor} ${this.opacity})`;
      ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
      ctx.shadowBlur = this.size * 3;
      ctx.fill();
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push(new GoldParticle());
  }

  let animationFrameId;
  function animate() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    animationFrameId = requestAnimationFrame(animate);
  }

  animate();
}

window.initGoldParticles = initGoldParticles;
