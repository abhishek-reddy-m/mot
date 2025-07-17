"use client";

import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SearchBar } from './search-bar';
import gsap from 'gsap';

export function HeroSection() {
  const bgRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bgRef.current || !textRef.current) return;

    // Parallax effect for background
    const handleMouseMove = (e: MouseEvent) => {
      const { clientX, clientY } = e;
      const xPos = (clientX / window.innerWidth - 0.5) * 30;
      const yPos = (clientY / window.innerHeight - 0.5) * 30;
      
      gsap.to(bgRef.current, {
        x: xPos,
        y: yPos,
        duration: 1.5,
        ease: "power1.out"
      });
    };

    // Text reveal animation
    const tl = gsap.timeline();
    tl.fromTo(
      textRef.current.querySelectorAll(".animate-text"), 
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, stagger: 0.3, duration: 1.2, ease: "power2.out" }
    );

    // Floating elements animation
    const floatingElements = textRef.current.querySelectorAll(".floating");
    floatingElements.forEach((element, index) => {
      gsap.to(element, {
        y: "random(-20, 20)",
        duration: "random(3, 5)",
        repeat: -1,
        yoyo: true,
        ease: "power1.inOut",
        delay: index * 0.2
      });
    });

    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return (
    <div className="relative flex h-screen w-full items-center justify-center overflow-hidden">
      {/* Background parallax effect */}
      <div className="absolute inset-0 z-0 opacity-75" ref={bgRef}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/45 to-black/50"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/20 via-transparent to-slate-900/20"></div>
      </div>
      
      {/* Floating geometric elements */}
      <div className="absolute inset-0 z-5">
        <div className="floating absolute top-20 left-10 w-4 h-4 bg-blue-400/30 rounded-full blur-sm"></div>
        <div className="floating absolute top-40 right-20 w-6 h-6 bg-blue-300/30 rounded-full blur-sm"></div>
        <div className="floating absolute bottom-40 left-20 w-3 h-3 bg-blue-500/30 rounded-full blur-sm"></div>
        <div className="floating absolute bottom-20 right-10 w-5 h-5 bg-blue-400/30 rounded-full blur-sm"></div>
        <div className="floating absolute top-1/3 left-1/4 w-2 h-2 bg-blue-200/40 rounded-full blur-sm"></div>
        <div className="floating absolute top-2/3 right-1/3 w-4 h-4 bg-blue-300/30 rounded-full blur-sm"></div>
      </div>
      
      {/* Content */}
      <div className="container relative z-10 px-4 py-8 text-center h-full flex items-center" ref={textRef}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="w-full"
        >
          {/* Badge */}
          <div className="animate-text mb-4">
            <span className="inline-block px-6 py-2 bg-white/95 backdrop-blur-md text-gray-800 text-sm font-semibold rounded-full shadow-2xl border border-gray-200/50 shadow-gray-900/20">
              🌴 Discover <span className="text-blue-600 font-bold">Los Angeles</span>
            </span>
          </div>

          {/* Main heading */}
          <h1 className="animate-text mb-3 text-3xl font-bold sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight">
            <span className="text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] [text-shadow:_1px_1px_4px_rgb(0_0_0_/_50%)]">
              Discover
            </span>
          </h1>
          
          <h2 className="animate-text mb-6 text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-tight">
            <span className="text-white drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)] [text-shadow:_1px_1px_4px_rgb(0_0_0_/_50%)]">
              Los Angeles
            </span>
          </h2>
          
          <p className="animate-text mx-auto mb-8 max-w-2xl text-base text-white/95 sm:text-lg md:text-xl leading-relaxed drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)] [text-shadow:_1px_1px_2px_rgb(0_0_0_/_40%)]">
            Premium hotels across LA&apos;s most iconic neighborhoods.
          </p>
          
          <motion.div
            className="animate-text mb-16"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
          >
            <SearchBar />
          </motion.div>
        </motion.div>
      </div>
      
      {/* Scroll indicator */}
      <motion.div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 0.8 }}
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2.5 }}
          className="flex cursor-pointer flex-col items-center group"
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: "smooth" })}
        >
          <span className="mb-1 text-xs font-medium text-white/90 group-hover:text-white transition-colors drop-shadow-lg">
            Scroll to explore
          </span>
          <div className="p-1.5 rounded-full border border-blue-300/60 group-hover:border-blue-200/80 transition-colors bg-blue-600/50 backdrop-blur-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5L12 19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/90 group-hover:text-white transition-colors"/>
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
