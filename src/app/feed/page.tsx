"use client";

import React from "react";
import Navbar from "../../components/Navbar";
import { MessageSquare, Heart, Share2, Repeat2, Image as ImageIcon, Send } from "lucide-react";
import { motion } from "framer-motion";

const posts = [
  {
    id: 1,
    user: {
      name: "AnaKiller",
      avatar: "AK",
      role: "Pro Player",
    },
    content: "Bugungi turnirda g'alaba qozondik! Jamoadoshlarimga rahmat. #CS2 #PlayNationUz",
    image: null,
    likes: 124,
    comments: 18,
    reposts: 5,
    time: "2 soat avval",
  },
  {
    id: 2,
    user: {
      name: "ZafarGamer",
      avatar: "ZG",
      role: "Streamer",
    },
    content: "Kechki stream 20:00 da boshlanadi. Yangi skinlarni ko'rib chiqamiz!",
    image: "/api/placeholder/600/400",
    likes: 89,
    comments: 12,
    reposts: 2,
    time: "5 soat avval",
  },
];

const FeedPage = () => {
  return (
    <main className="min-h-screen bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 md:px-6 pt-32 pb-20">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-black mb-8">Hamjamiyat</h1>
          
          {/* Create Post */}
          <div className="glass-card p-6 mb-8">
            <div className="flex space-x-4">
              <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center font-bold">
                ME
              </div>
              <div className="flex-1">
                <textarea 
                  placeholder="Nimalar yangilik?" 
                  className="w-full bg-transparent border-none outline-none resize-none text-lg placeholder:text-secondary h-24"
                />
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <div className="flex items-center space-x-4 text-secondary">
                    <button className="hover:text-primary transition-colors">
                      <ImageIcon size={20} />
                    </button>
                    <button className="hover:text-primary transition-colors">
                      <span className="font-bold text-xs">GIF</span>
                    </button>
                  </div>
                  <button className="btn-primary py-2 px-6 text-sm">
                    Post yozish
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="space-y-6">
            {posts.map((post) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={post.id}
                className="glass-card p-6"
              >
                <div className="flex space-x-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center font-bold text-primary">
                    {post.user.avatar}
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-bold">{post.user.name}</h3>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-secondary uppercase font-bold">
                        {post.user.role}
                      </span>
                    </div>
                    <p className="text-xs text-secondary">{post.time}</p>
                  </div>
                </div>

                <p className="mb-4 leading-relaxed">{post.content}</p>

                {post.image && (
                  <div className="rounded-2xl overflow-hidden mb-4 border border-white/5">
                    <div className="aspect-video bg-white/5" />
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-secondary">
                  <button className="flex items-center space-x-2 hover:text-primary transition-colors">
                    <Heart size={18} />
                    <span className="text-xs">{post.likes}</span>
                  </button>
                  <button className="flex items-center space-x-2 hover:text-primary transition-colors">
                    <MessageSquare size={18} />
                    <span className="text-xs">{post.comments}</span>
                  </button>
                  <button className="flex items-center space-x-2 hover:text-primary transition-colors">
                    <Repeat2 size={18} />
                    <span className="text-xs">{post.reposts}</span>
                  </button>
                  <button className="flex items-center space-x-2 hover:text-primary transition-colors">
                    <Share2 size={18} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

export default FeedPage;
