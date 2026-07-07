"use client";

import React, { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";

interface PlayerProps {
  url: string;
}

export function WhiteLabelPlayer({ url }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isYoutube, setIsYoutube] = useState(false);
  const [ytPlayer, setYtPlayer] = useState<any>(null);
  const [ytReady, setYtReady] = useState(false);

  // Extract YouTube ID
  const getYoutubeId = (urlStr: string) => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = urlStr.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  const ytId = getYoutubeId(url);

  useEffect(() => {
    if (ytId) {
      setIsYoutube(true);
      // Load YouTube Iframe API
      if (!(window as any).YT) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName("script")[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

        // Bind callback
        (window as any).onYouTubeIframeAPIReady = () => {
          initYtPlayer();
        };
      } else {
        initYtPlayer();
      }
    } else {
      setIsYoutube(false);
    }
  }, [url, ytId]);

  const initYtPlayer = () => {
    if (!ytId) return;
    try {
      const player = new (window as any).YT.Player(`yt-player-${ytId}`, {
        events: {
          onReady: () => {
            setYtPlayer(player);
            setYtReady(true);
            setDuration(player.getDuration() || 0);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState.PLAYING is 1, PAUSED is 2, ENDED is 0
            if (event.data === 1) {
              setIsPlaying(true);
            } else {
              setIsPlaying(false);
            }
          }
        }
      });
    } catch (e) {
      console.error("YT Player load err:", e);
    }
  };

  // Track progress for YT and Native Video
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        if (isYoutube && ytPlayer && ytReady) {
          try {
            setCurrentTime(ytPlayer.getCurrentTime() || 0);
            if (duration === 0) setDuration(ytPlayer.getDuration() || 0);
          } catch (e) {}
        } else if (!isYoutube && videoRef.current) {
          setCurrentTime(videoRef.current.currentTime || 0);
        }
      }, 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isYoutube, ytPlayer, ytReady, duration]);

  // Handle HTML5 Native Video loaded data
  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration || 0);
    }
  };

  // Controls Actions
  const togglePlay = () => {
    if (isYoutube && ytPlayer && ytReady) {
      if (isPlaying) {
        ytPlayer.pauseVideo();
        setIsPlaying(false);
      } else {
        ytPlayer.playVideo();
        setIsPlaying(true);
      }
    } else if (!isYoutube && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (isYoutube && ytPlayer && ytReady) {
      ytPlayer.seekTo(val, true);
    } else if (!isYoutube && videoRef.current) {
      videoRef.current.currentTime = val;
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (isYoutube && ytPlayer && ytReady) {
      ytPlayer.setVolume(val);
      if (val === 0) ytPlayer.mute();
      else ytPlayer.unMute();
    } else if (!isYoutube && videoRef.current) {
      videoRef.current.volume = val / 100;
      videoRef.current.muted = val === 0;
    }
  };

  const toggleMute = () => {
    const newMute = !isMuted;
    setIsMuted(newMute);
    if (isYoutube && ytPlayer && ytReady) {
      if (newMute) ytPlayer.mute();
      else {
        ytPlayer.unMute();
        ytPlayer.setVolume(volume);
      }
    } else if (!isYoutube && videoRef.current) {
      videoRef.current.muted = newMute;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false));
    }
  };

  // Format time
  const formatTime = (timeInSeconds: number) => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = Math.floor(timeInSeconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full aspect-video rounded-3xl overflow-hidden bg-black border border-white/10 group shadow-2xl"
    >
      {isYoutube ? (
        <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
          {/* Black bars overlay to hide YouTube top title bar and bottom logo */}
          <div className="absolute top-0 left-0 w-full h-[60px] bg-black z-10" />
          <div className="absolute bottom-0 left-0 w-full h-[60px] bg-black z-10" />
          
          <iframe
            id={`yt-player-${ytId}`}
            ref={iframeRef}
            src={`https://www.youtube.com/embed/${ytId}?enablejsapi=1&controls=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=1&fs=0`}
            className="w-full h-[calc(100%+120px)] -translate-y-[60px] object-cover scale-[1.03]"
            allow="autoplay; encrypted-media"
            frameBorder="0"
          />
        </div>
      ) : (
        <video
          ref={videoRef}
          src={url}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          onLoadedMetadata={handleLoadedMetadata}
          playsInline
        />
      )}

      {/* Click-to-Play/Pause overlay */}
      <div 
        className="absolute inset-0 cursor-pointer z-20 flex items-center justify-center bg-black/20 group-hover:bg-black/40 transition-colors"
        onClick={togglePlay}
      >
        {/* Play/Pause giant center indicator (fade out on play) */}
        {!isPlaying && (
          <div className="bg-primary/95 text-white p-5 rounded-full shadow-[0_0_30px_rgba(255,70,85,0.4)] hover:scale-110 transition-transform duration-300">
            <Play size={28} className="fill-current ml-1" />
          </div>
        )}
      </div>

      {/* Custom styled control dock (fades in on hover) */}
      <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black via-black/80 to-transparent p-6 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-auto">
        
        {/* Progress slider bar */}
        <div className="flex items-center gap-4 mb-4">
          <span className="text-[10px] font-bold text-secondary font-mono">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            value={currentTime}
            onChange={handleSeek}
            className="flex-1 accent-primary h-1.5 rounded-full bg-white/10 outline-none cursor-pointer"
          />
          <span className="text-[10px] font-bold text-secondary font-mono">{formatTime(duration)}</span>
        </div>

        {/* Buttons and volume dock */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <button 
              onClick={togglePlay}
              className="text-white hover:text-primary transition-colors"
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>

            {/* Volume slider */}
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleMute}
                className="text-white hover:text-primary transition-colors"
              >
                {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={isMuted ? 0 : volume}
                onChange={handleVolumeChange}
                className="w-16 accent-primary h-1 rounded-full bg-white/10 cursor-pointer"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={toggleFullscreen}
              className="text-white hover:text-primary transition-colors"
            >
              <Maximize size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
