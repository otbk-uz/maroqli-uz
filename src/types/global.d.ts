import { ElectronAPI } from './index';

declare global {
  interface Window {
    electron?: ElectronAPI;
    YT?: {
      Player: new (elementId: string, options: Record<string, unknown>) => any;
    };
    onYouTubeIframeAPIReady?: () => void;
  }

  interface HTMLElement {
    webkitRequestFullscreen?: () => Promise<void>;
    msRequestFullscreen?: () => Promise<void>;
  }

  interface Document {
    webkitExitFullscreen?: () => Promise<void>;
    msExitFullscreen?: () => Promise<void>;
  }
}

export {};
