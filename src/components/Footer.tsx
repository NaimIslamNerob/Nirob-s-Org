import React from 'react';
import { Crown, Heart, Shield, Swords, MessageSquare, Image as ImageIcon } from 'lucide-react';

interface FooterProps {
  onNavigate: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/90 backdrop-blur-md py-10 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-white p-1 flex items-center justify-center overflow-hidden border border-slate-700/80 shadow-md">
              <img
                src="./assets/aistudio/bf806f74-d653-4af6-b7be-37ab74ecbf98_b6272376.jpg"
                alt="Nirofy Logo"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <span className="font-bold text-sm text-white">Nirofy</span>
              <span className="text-xs text-slate-400 block">
                Naim Islam Nerob — Official Web Platform
              </span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-slate-400">
            <button
              onClick={() => onNavigate('home')}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              Profile
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('gallery')}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              Gallery
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('chat')}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              Private Chat
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('chess')}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              Live Chess
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('social')}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              Socials
            </button>
            <span>•</span>
            <button
              onClick={() => onNavigate('coffee')}
              className="hover:text-sky-400 transition-colors cursor-pointer"
            >
              Support
            </button>
          </div>

          {/* Copyright */}
          <div className="text-xs text-slate-500 text-center md:text-right">
            <span>© {new Date().getFullYear()} Nirofy. All rights reserved.</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
