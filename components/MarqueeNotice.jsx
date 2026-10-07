'use client';

import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { collection, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default function MarqueeNotice() {
  const [marqueeTexts, setMarqueeTexts] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchMarqueeTexts();
  }, []);

  useEffect(() => {
    if (marqueeTexts.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % marqueeTexts.length);
      }, 80000); // 25 seconds per message
      return () => clearInterval(interval);
    }
  }, [marqueeTexts]);

  const fetchMarqueeTexts = async () => {
    try {
      const marqueeQuery = query(
        collection(db, 'marqueeTexts'),
        where('isActive', '==', true),
        orderBy('priority', 'asc'),
        orderBy('createdAt', 'desc')
      );
      const marqueeSnapshot = await getDocs(marqueeQuery);
      const marqueeData = marqueeSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMarqueeTexts(marqueeData);
    } catch (error) {
      console.error('Error fetching marquee texts:', error);
    }
  };

  if (marqueeTexts.length === 0 || !isVisible) return null;

  const currentNotice = marqueeTexts[currentIndex];

  return (
    <div className="text-black bg-white py-2 px-4 relative overflow-hidden">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="flex items-center space-x-2 flex-shrink-0">
            <Bell className="h-4 w-4 animate-pulse" />
            <span className="font-semibold text-sm">Notice:</span>
          
          </div>
          <div className="overflow-hidden w-full">
            <div className="marquee-slide-wrapper">
              <div
                key={currentNotice.id + currentIndex} // change key to reset animation
                className="marquee-slide-text"
                style={{
                  color: currentNotice.textColor || '#000000',
                }}
              >
                {currentNotice.text}
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="ml-4 flex-shrink-0 hover:bg-black hover:bg-opacity-20 rounded-full p-1 transition-colors"
          aria-label="Close notice"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <style jsx>{`
        .marquee-slide-wrapper {
          width: 100%;
          overflow: hidden;
          position: relative;
        }

        .marquee-slide-text {
          display: inline-block;
          white-space: nowrap;
          animation: slide-left 80s linear 1;
        }

        @keyframes slide-left {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }

        @media (hover: hover) {
          .marquee-slide-text:hover {
            animation-play-state: paused;
          }
        }
      `}</style>
    </div>
  );
}
