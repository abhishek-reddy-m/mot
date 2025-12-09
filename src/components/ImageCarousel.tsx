'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Photo = {
  id: string;
  url: string;
  isMain?: boolean;
};

interface ImageCarouselProps {
  photos: Photo[];
  alt: string;
  height?: string;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

export function ImageCarousel({ 
  photos, 
  alt, 
  height = 'h-64',
  autoPlay = true,
  autoPlayInterval = 4000
}: ImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Sort photos so main photo is first
  const sortedPhotos = [...photos].sort((a, b) => {
    if (a.isMain) return -1;
    if (b.isMain) return 1;
    return 0;
  });

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sortedPhotos.length);
  }, [sortedPhotos.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + sortedPhotos.length) % sortedPhotos.length);
  }, [sortedPhotos.length]);

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
  };

  // Auto-play functionality
  useEffect(() => {
    if (!autoPlay || isHovered || sortedPhotos.length <= 1) return;

    const interval = setInterval(goToNext, autoPlayInterval);
    return () => clearInterval(interval);
  }, [autoPlay, autoPlayInterval, isHovered, goToNext, sortedPhotos.length]);

  if (!sortedPhotos || sortedPhotos.length === 0) {
    return (
      <div className={`${height} w-full bg-gray-200 rounded-lg flex items-center justify-center`}>
        <span className="text-gray-400">No images available</span>
      </div>
    );
  }

  if (sortedPhotos.length === 1) {
    return (
      <div className={`${height} w-full overflow-hidden rounded-lg`}>
        <img
          src={sortedPhotos[0].url}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>
    );
  }

  return (
    <div 
      className={`relative ${height} w-full overflow-hidden rounded-lg group`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Images */}
      <div 
        className="flex h-full transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {sortedPhotos.map((photo, index) => (
          <div key={photo.id} className="min-w-full h-full flex-shrink-0">
            <img
              src={photo.url}
              alt={`${alt} - Image ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToPrevious(); }}
        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-label="Previous image"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToNext(); }}
        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        aria-label="Next image"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
        {sortedPhotos.map((_, index) => (
          <button
            key={index}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); goToSlide(index); }}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              index === currentIndex 
                ? 'bg-white w-4' 
                : 'bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Go to image ${index + 1}`}
          />
        ))}
      </div>

      {/* Image Counter */}
      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
        {currentIndex + 1} / {sortedPhotos.length}
      </div>
    </div>
  );
}
