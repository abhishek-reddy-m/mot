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
      <div className="absolute inset-0 z-0 opacity-70" ref={bgRef}>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1920&q=80')] bg-cover bg-center bg-no-repeat"></div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black"></div>
      </div>
      
      {/* Floating geometric elements */}
      <div className="absolute inset-0 z-5">
        <div className="floating absolute top-20 left-10 w-4 h-4 bg-pink-400/20 rounded-full blur-sm"></div>
        <div className="floating absolute top-40 right-20 w-6 h-6 bg-orange-400/20 rounded-full blur-sm"></div>
        <div className="floating absolute bottom-40 left-20 w-3 h-3 bg-purple-400/20 rounded-full blur-sm"></div>
        <div className="floating absolute bottom-20 right-10 w-5 h-5 bg-blue-400/20 rounded-full blur-sm"></div>
        <div className="floating absolute top-1/3 left-1/4 w-2 h-2 bg-yellow-400/30 rounded-full blur-sm"></div>
        <div className="floating absolute top-2/3 right-1/3 w-4 h-4 bg-green-400/20 rounded-full blur-sm"></div>
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
            <span className="inline-block px-6 py-2 bg-white/25 backdrop-blur-md text-white text-sm font-semibold rounded-full shadow-xl border border-white/40">
              🌴 Discover <span className="text-yellow-300 font-bold drop-shadow-lg">Los Angeles</span>
            </span>
          </div>

          {/* Main heading */}
          <h1 className="animate-text mb-3 text-3xl font-bold text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl leading-tight">
            <span className="bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              Discover
            </span>
          </h1>
          
          <h2 className="animate-text mb-6 text-2xl font-bold sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl leading-tight">
            <span className="bg-gradient-to-r from-blue-300 via-blue-200 to-purple-300 bg-clip-text text-transparent drop-shadow-lg">
              Los Angeles
            </span>
          </h2>
          
          <p className="animate-text mx-auto mb-8 max-w-2xl text-base text-gray-300 sm:text-lg md:text-xl leading-relaxed">
            Premium hotels across LA's most iconic neighborhoods.
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
      
      {/* Live booking indicator */}
      <motion.div 
        className="absolute bottom-16 left-1/2 -translate-x-1/2"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-2 border border-white/20">
          <p className="text-white text-xs font-medium flex items-center">
            <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
            Live in Los Angeles • 2,847 guests currently booking
          </p>
        </div>
      </motion.div>
      
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
          onClick={() => window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
        >
          <span className="mb-1 text-xs font-medium text-white/80 group-hover:text-white transition-colors">
            Scroll to explore
          </span>
          <div className="p-1.5 rounded-full border border-white/30 group-hover:border-white/60 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5L12 19M12 19L19 12M12 19L5 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white/80 group-hover:text-white transition-colors"/>
            </svg>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
