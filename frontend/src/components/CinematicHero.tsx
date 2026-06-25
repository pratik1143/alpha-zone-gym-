'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Clock, Flame, Dumbbell, Sparkles } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export default function CinematicHero() {
  const containerRef = useRef<HTMLDivElement>(null);
  const stickyRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const smokeCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // Preloading & frames store
  const [images, setImages] = useState<string[]>([]);
  const [isPreloaded, setIsPreloaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const currentFrameIdx = useRef(0);
  const scrollProgress = useRef(0);
  const particles = useRef<Particle[]>([]);

  // Scroll phase calculations for UI triggers
  const [phase, setPhase] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [phaseProgress, setPhaseProgress] = useState(0); // 0 to 1 inside current phase

  // Fetch images list
  useEffect(() => {
    async function fetchImages() {
      try {
        const res = await fetch('/api/images');
        const data = await res.json();
        if (data.images && data.images.length > 0) {
          setImages(data.images);
        } else {
          // Fallback static files list if API fails
          const fallbackList = Array.from({ length: 240 }, (_, i) => {
            const num = String(i + 1).padStart(3, '0');
            return `/alpha/ezgif-frame-${num}.png`;
          });
          setImages(fallbackList);
        }
      } catch (err) {
        console.error('Failed to load images from API:', err);
      }
    }
    fetchImages();
  }, []);

  // Preloading images in memory
  useEffect(() => {
    if (images.length === 0) return;

    let loadedCount = 0;
    const preloadedImagesList: HTMLImageElement[] = [];

    // Preload all frames concurrently
    const promises = images.map((src, index) => {
      return new Promise((resolve) => {
        const img = new Image();
        // ATTENTION: Register handlers before setting src to ensure cached files trigger loaded states
        img.onload = () => {
          preloadedImagesList[index] = img;
          loadedCount++;
          setLoadingProgress(Math.round((loadedCount / images.length) * 100));
          resolve(src);
        };
        img.onerror = (err) => {
          console.error('Failed to load image frame:', src, err);
          loadedCount++;
          setLoadingProgress(Math.round((loadedCount / images.length) * 100));
          resolve(src); // continue even if one fails
        };
        img.src = src; 
      });
    });

    Promise.all(promises).then(() => {
      // Keep only successfully loaded images
      imagesRef.current = preloadedImagesList.filter(Boolean);
      setTimeout(() => {
        setIsPreloaded(true);
      }, 500);
    });
  }, [images]);

  // Render a specific frame on canvas (object-fit: cover implementation)
  const drawFrame = (index: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imagesRef.current[index];

    if (!canvas || !ctx || !img) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Compute dimensions to fill viewport
    const imgWidth = img.width;
    const imgHeight = img.height;
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    const imgRatio = imgWidth / imgHeight;
    const canvasRatio = canvasWidth / canvasHeight;

    let drawWidth = canvasWidth;
    let drawHeight = canvasHeight;
    let drawX = 0;
    let drawY = 0;

    if (imgRatio > canvasRatio) {
      drawWidth = canvasHeight * imgRatio;
      drawX = (canvasWidth - drawWidth) / 2;
    } else {
      drawHeight = canvasWidth / imgRatio;
      drawY = (canvasHeight - drawHeight) / 2;
    }

    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
  };

  // Resize handler
  useEffect(() => {
    if (!isPreloaded) return;

    const handleResize = () => {
      const c1 = canvasRef.current;
      const c2 = smokeCanvasRef.current;
      if (c1 && c2) {
        c1.width = window.innerWidth;
        c1.height = window.innerHeight;
        c2.width = window.innerWidth;
        c2.height = window.innerHeight;
        drawFrame(currentFrameIdx.current);
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, [isPreloaded]);

  // Main scroll controller (GSAP ScrollTrigger)
  useEffect(() => {
    if (!isPreloaded || imagesRef.current.length === 0) return;

    gsap.registerPlugin(ScrollTrigger);

    const totalFrames = imagesRef.current.length;

    // Initial draw of the first frame
    drawFrame(0);

    const scrollTriggerInstance = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: 'bottom bottom',
      pin: stickyRef.current, // Pin via ScrollTrigger to avoid overflow sticky bugs
      scrub: true,
      onUpdate: (self) => {
        const progress = self.progress;
        scrollProgress.current = progress;

        // Map scroll progress to active frame index
        const frameIdx = Math.min(
          totalFrames - 1,
          Math.floor(progress * totalFrames)
        );
        currentFrameIdx.current = frameIdx;
        drawFrame(frameIdx);

        // Compute current section phase based on percentages
        // Section 1: 0% to 15%
        // Section 2: 15% to 35%
        // Section 3: 35% to 55%
        // Section 4: 55% to 80%
        // Section 5: 80% to 90%
        // Section 6: 90% to 100%
        let currentPhase: 1 | 2 | 3 | 4 | 5 | 6 = 1;
        let subProgress = 0;

        if (progress < 0.15) {
          currentPhase = 1;
          subProgress = progress / 0.15;
        } else if (progress < 0.35) {
          currentPhase = 2;
          subProgress = (progress - 0.15) / 0.20;
        } else if (progress < 0.55) {
          currentPhase = 3;
          subProgress = (progress - 0.35) / 0.20;
        } else if (progress < 0.80) {
          currentPhase = 4;
          subProgress = (progress - 0.55) / 0.25;
        } else if (progress < 0.90) {
          currentPhase = 5;
          subProgress = (progress - 0.80) / 0.10;
        } else {
          currentPhase = 6;
          subProgress = (progress - 0.90) / 0.10;
        }

        setPhase(currentPhase);
        setPhaseProgress(subProgress);
      }
    });

    return () => {
      scrollTriggerInstance.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
    };
  }, [isPreloaded]);

  // Smoke particles animation loop
  useEffect(() => {
    if (!isPreloaded) return;

    let animId: number;

    const animateParticles = () => {
      const canvas = smokeCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) {
        animId = requestAnimationFrame(animateParticles);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn particles only in Section 6 (progress > 90%)
      const p = scrollProgress.current;
      if (p > 0.88) {
        const intensity = Math.min(1, (p - 0.88) * 8.33); // scales 0 to 1 from 88% to 100%
        
        // Emit particles
        if (Math.random() < 0.25 * intensity) {
          particles.current.push({
            x: Math.random() * canvas.width,
            y: canvas.height + 30,
            vx: (Math.random() - 0.5) * 1.5,
            vy: -Math.random() * 2.0 - 0.8,
            size: Math.random() * 30 + 15,
            alpha: Math.random() * 0.12 * intensity,
            life: 0,
            maxLife: Math.random() * 120 + 80
          });
        }
      }

      // Update & Draw particles
      particles.current = particles.current.filter(item => {
        item.life++;
        item.x += item.vx;
        item.y += item.vy;
        item.size += 0.2; // expansion

        const ageRatio = item.life / item.maxLife;
        const currentAlpha = item.alpha * (1 - ageRatio);

        if (currentAlpha > 0 && item.life < item.maxLife) {
          ctx.beginPath();
          const grad = ctx.createRadialGradient(item.x, item.y, 0, item.x, item.y, item.size);
          // Neon green glowing core tint, fading to transparent
          grad.addColorStop(0, `rgba(212, 255, 0, ${currentAlpha * 0.35})`);
          grad.addColorStop(0.3, `rgba(15, 23, 42, ${currentAlpha * 0.12})`);
          grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

          ctx.fillStyle = grad;
          ctx.arc(item.x, item.y, item.size, 0, Math.PI * 2);
          ctx.fill();
          return true;
        }
        return false;
      });

      animId = requestAnimationFrame(animateParticles);
    };

    animateParticles();

    return () => cancelAnimationFrame(animId);
  }, [isPreloaded]);

  // Compute CSS filter styling based on scroll progression
  // Zoom: Section 2 to 4 scale increases (1.0 to 1.18)
  // Contrast/Brightness: Section 3 contrast increases (1.0 to 1.25)
  const getCanvasStyle = () => {
    const p = scrollProgress.current;
    let scale = 1.0;
    let brightness = 1.0;
    let contrast = 1.0;
    let filterBlur = 0;

    // Scale calculation
    if (p < 0.15) {
      scale = 1.0;
    } else if (p < 0.8) {
      scale = 1.0 + ((p - 0.15) / 0.65) * 0.18; // scale from 1.0 to 1.18
    } else {
      scale = 1.18;
    }

    // Dynamic contrast & brightness emerging from darkness
    if (p < 0.15) {
      brightness = 0.05; // start extremely dark
      contrast = 0.8;
      filterBlur = 5;
    } else if (p < 0.35) {
      // emerging
      const sub = (p - 0.15) / 0.20;
      brightness = 0.05 + sub * 0.75; // go up to 0.8
      contrast = 0.8 + sub * 0.2; // go up to 1.0
      filterBlur = 5 * (1 - sub);
    } else if (p < 0.55) {
      // definition increases
      const sub = (p - 0.35) / 0.20;
      brightness = 0.8 + sub * 0.3; // go up to 1.1
      contrast = 1.0 + sub * 0.35; // go up to 1.35
    } else {
      brightness = 1.1;
      contrast = 1.35;
    }

    return {
      transform: `scale(${scale}) translate3d(0, 0, 0)`,
      filter: `brightness(${brightness}) contrast(${contrast}) blur(${filterBlur}px)`,
      transition: 'filter 0.1s ease-out'
    };
  };

  return (
    <>
      {/* ─── Sleek Loader Screen ─── */}
      <AnimatePresence>
        {!isPreloaded && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.8, ease: 'easeInOut' } }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black select-none font-poppins"
          >
            <div className="absolute w-[400px] h-[400px] bg-[#d4ff00]/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="text-center space-y-6 z-10">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="font-rowdies text-3xl md:text-4xl font-bold tracking-widest text-[#d4ff00] drop-shadow-[0_0_15px_rgba(212,255,0,0.3)] uppercase"
              >
                ALPHA ZONE OS
              </motion.div>
              
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <svg className="w-full h-full rotate-[-90deg]">
                  <circle cx="48" cy="48" r="40" stroke="#1e293b" strokeWidth="4" fill="transparent" />
                  <motion.circle
                    cx="48"
                    cy="48"
                    r="40"
                    stroke="#d4ff00"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray="251.2"
                    strokeDashoffset={251.2 - (251.2 * loadingProgress) / 100}
                  />
                </svg>
                <span className="absolute font-mono text-sm font-bold text-white">{loadingProgress}%</span>
              </div>
              
              <div className="text-xs text-slate-400 font-mono tracking-[0.25em] uppercase">
                CACHING IMMERSIVE SEQUENCE...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Pinned Scroll container (600vh height for scroll space) ─── */}
      <div ref={containerRef} className="relative h-[650vh] bg-slate-950">
        
        {/* Pinned viewport container (pinned by ScrollTrigger) */}
        <div ref={stickyRef} className="relative h-screen w-full overflow-hidden flex items-center justify-center z-10">
          
          {/* Layer 1: Pinned Frame Canvas */}
          <canvas
            ref={canvasRef}
            style={getCanvasStyle()}
            className="absolute inset-0 w-full h-full object-cover z-0 origin-center will-change-transform"
          />

          {/* Layer 2: Smoke Particles Overlay Canvas */}
          <canvas
            ref={smokeCanvasRef}
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          />

          {/* Layer 3: Dynamic Spotlight Glow Overlay (mix-blend overlay) */}
          <div 
            style={{
              opacity: scrollProgress.current > 0.85 ? (scrollProgress.current - 0.85) * 6.67 : 0
            }}
            className="absolute inset-0 z-15 bg-[radial-gradient(circle_at_center,rgba(212,255,0,0.18)_0%,transparent_60%)] mix-blend-screen pointer-events-none transition-opacity duration-200"
          />

          {/* Vignette Overlay to maintain typography reading contrast */}
          <div 
            style={{
              // vignette starts strong, gets slightly weaker as body emerges, then stays constant
              opacity: scrollProgress.current < 0.15 ? 0.90 : 0.70 + (1 - Math.min(1, (scrollProgress.current - 0.15) / 0.2)) * 0.20
            }}
            className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/40 to-black/90 z-5 pointer-events-none transition-opacity duration-200"
          />

          {/* ─── Layer 4: Interactive Typography overlays ─── */}
          
          {/* Section 1 Typography Overlay (visible at the start, fades out) */}
          <AnimatePresence>
            {phase === 1 && (
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1 - phaseProgress, y: -20 * phaseProgress }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 z-20 pointer-events-none"
              >
                <span className="inline-flex items-center gap-2 bg-[#d4ff00]/10 text-[#d4ff00] text-[9px] font-extrabold px-5 py-2 rounded-full uppercase tracking-[0.25em] border border-[#d4ff00]/30 backdrop-blur-md shadow-[0_0_15px_rgba(212,255,0,0.15)] mb-6">
                  <span className="w-2 h-2 rounded-full bg-[#d4ff00] animate-pulse" />
                  SCROLL DOWN TO INITIATE EXPERIENCE
                </span>
                
                <h1 className="font-rowdies text-5xl md:text-8xl font-bold tracking-tight text-white uppercase leading-none">
                  Sculpt Your <span className="text-[#d4ff00] drop-shadow-[0_0_20px_rgba(212,255,0,0.4)]">Body</span>
                </h1>
                
                <h2 className="font-rowdies text-3xl md:text-5xl font-bold tracking-wide text-slate-300 uppercase leading-none mt-4">
                  Elevate Your <span className="text-white border-b-4 border-[#d4ff00] pb-1">Spirit</span>
                </h2>
                
                <p className="text-slate-400 text-xs md:text-sm font-mono tracking-widest mt-8 uppercase animate-pulse">
                  [ The body emerges step by step ]
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 2 & 3 Typography HUD Indicators */}
          <AnimatePresence>
            {(phase === 2 || phase === 3) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute top-28 left-6 md:left-12 z-20 text-left pointer-events-none font-mono"
              >
                <div className="text-[10px] text-[#d4ff00] uppercase tracking-[0.2em] font-bold">EMERGENCE IN PROGRESS</div>
                <div className="h-[2px] bg-[#d4ff00]/30 w-32 mt-1.5 overflow-hidden">
                  <div className="h-full bg-[#d4ff00]" style={{ width: `${phaseProgress * 100}%` }} />
                </div>
                <div className="text-[9px] text-slate-400 mt-2 uppercase">
                  {phase === 2 ? 'STRUCTURE FORMING · CHEST & SHOULDERS' : 'MUTATION STAGE · DEFINITION MAXIMIZING'}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 4 Indicator */}
          <AnimatePresence>
            {phase === 4 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute bottom-16 right-6 md:right-12 z-20 text-right pointer-events-none font-mono"
              >
                <div className="text-[10px] text-[#d4ff00] uppercase tracking-[0.2em] font-bold">CINEMATIC SCROLL STREAMING</div>
                <div className="text-xs text-white mt-1">FRAME {Math.floor(scrollProgress.current * images.length)} / {images.length}</div>
                <div className="text-[8px] text-slate-500 mt-1 uppercase">SCROLL PROGRESS MAPPED TO PERFORMANCE TIME</div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Section 5 & 6 Final Reveal Overlay */}
          <AnimatePresence>
            {(phase === 5 || phase === 6) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none text-center px-6">
                
                {/* Stats cards fly out container */}
                <div className="absolute inset-0 z-30 pointer-events-none hidden md:block">
                  {/* Hours (Top-Left) */}
                  <div 
                    style={{
                      transform: `translate3d(${-(40 + phaseProgress * 80)}px, ${-(50 + phaseProgress * 120)}px, 0)`,
                      opacity: phaseProgress
                    }}
                    className="absolute top-[35%] left-[22%] transition-transform duration-75"
                  >
                    <GlassCard
                      icon={<Clock className="text-[#d4ff00] w-5 h-5" />}
                      title="ACTIVE HOURS"
                      value="250+ Hours"
                    />
                  </div>

                  {/* Calories (Top-Right) */}
                  <div 
                    style={{
                      transform: `translate3d(${40 + phaseProgress * 80}px, ${-(50 + phaseProgress * 120)}px, 0)`,
                      opacity: phaseProgress
                    }}
                    className="absolute top-[35%] right-[22%] transition-transform duration-75"
                  >
                    <GlassCard
                      icon={<Flame className="text-amber-500 w-5 h-5" />}
                      title="DAILY BURN"
                      value="850 Kcal"
                    />
                  </div>

                  {/* Sets (Bottom-Left) */}
                  <div 
                    style={{
                      transform: `translate3d(${-(50 + phaseProgress * 90)}px, ${50 + phaseProgress * 120}px, 0)`,
                      opacity: phaseProgress
                    }}
                    className="absolute bottom-[35%] left-[22%] transition-transform duration-75"
                  >
                    <GlassCard
                      icon={<Dumbbell className="text-teal-400 w-5 h-5" />}
                      title="COMPLETED SETS"
                      value="12 Sets"
                    />
                  </div>

                  {/* Poses (Bottom-Right) */}
                  <div 
                    style={{
                      transform: `translate3d(${50 + phaseProgress * 90}px, ${50 + phaseProgress * 120}px, 0)`,
                      opacity: phaseProgress
                    }}
                    className="absolute bottom-[35%] right-[22%] transition-transform duration-75"
                  >
                    <GlassCard
                      icon={<Sparkles className="text-purple-400 w-5 h-5" />}
                      title="YOGA POSES"
                      value="36 Poses"
                    />
                  </div>
                </div>

                {/* Mobile stats representation */}
                {phase === 6 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute bottom-6 left-0 right-0 z-30 px-6 block md:hidden max-w-sm mx-auto pointer-events-auto"
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-900/70 border border-white/10 backdrop-blur-md p-2 rounded-xl flex items-center gap-2">
                        <Clock className="text-[#d4ff00] w-4 h-4" />
                        <div className="text-left"><div className="text-[7px] text-slate-400 uppercase">HOURS</div><div className="text-[10px] font-black text-white">250+ Hrs</div></div>
                      </div>
                      <div className="bg-slate-900/70 border border-white/10 backdrop-blur-md p-2 rounded-xl flex items-center gap-2">
                        <Flame className="text-amber-500 w-4 h-4" />
                        <div className="text-left"><div className="text-[7px] text-slate-400 uppercase">BURN</div><div className="text-[10px] font-black text-white">850 Kcal</div></div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Final Hero Title Branding (Section 6) */}
                {phase === 6 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-4 z-20 pt-8"
                  >
                    <span className="inline-flex items-center gap-2 bg-[#d4ff00]/20 text-[#d4ff00] text-[9px] font-extrabold px-6 py-2 rounded-full uppercase tracking-[0.3em] border border-[#d4ff00]/40 shadow-[0_0_20px_rgba(212,255,0,0.3)]">
                      ALPHA ZONE OS
                    </span>
                    
                    <h1 className="font-rowdies text-5xl md:text-8xl font-bold tracking-tight text-white uppercase leading-none drop-shadow-[0_0_30px_rgba(0,0,0,0.8)]">
                      LIMITLESS <span className="text-[#d4ff00] drop-shadow-[0_0_15px_rgba(212,255,0,0.4)]">POWER</span>
                    </h1>
                    
                    <p className="text-slate-400 text-xs md:text-sm font-mono tracking-widest max-w-md mx-auto uppercase">
                      The athlete has fully emerged. Sculpting physical limits.
                    </p>

                    <div className="pt-4 pointer-events-auto flex justify-center gap-4">
                      <a
                        href="#signup"
                        className="bg-[#d4ff00] text-black font-rowdies font-bold text-xs tracking-wider px-8 py-4 rounded-full hover:bg-white hover:scale-105 transition-all shadow-[0_0_25px_rgba(212,255,0,0.35)]"
                      >
                        FITNESS NOW
                      </a>
                    </div>
                  </motion.div>
                )}

              </div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </>
  );
}

// Sub-component: Glassmorphic stats card
interface GlassCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
}

function GlassCard({ icon, title, value }: GlassCardProps) {
  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex gap-4 min-w-[180px] items-center shadow-[0_30px_60px_rgba(0,0,0,0.6)] border-[#d4ff00]/15">
      <div className="p-2.5 rounded-xl bg-white/5 border border-white/5 shadow-inner shrink-0">
        {icon}
      </div>
      <div className="text-left min-w-0">
        <div className="text-[7.5px] font-black text-slate-400 tracking-[0.15em] uppercase truncate">{title}</div>
        <div className="text-sm font-extrabold text-white tracking-tight leading-none mt-1">{value}</div>
      </div>
    </div>
  );
}
