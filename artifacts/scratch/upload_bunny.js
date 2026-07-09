const fs = require('fs');
const https = require('https');
require('dotenv').config({ path: '../../.env.local' });

const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID;
const API_KEY = process.env.BUNNY_API_KEY;
const filePath = 'd:\\project\\PlayNationUz\\public\\videos\\oyindizayn.mp4';
const title = "O'yin Dizayni Asoslari";

async function uploadVideo() {
  try {
    console.log("1. Creating video object in Bunny.net...");
    const createReqOptions = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${LIBRARY_ID}/videos`,
      method: 'POST',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const videoId = await new Promise((resolve, reject) => {
      const req = https.request(createReqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          resolve(json.guid);
        });
      });
      req.on('error', reject);
      req.write(JSON.stringify({ title }));
      req.end();
    });

    console.log(`Video ID created: ${videoId}`);
    console.log("2. Uploading video file...");

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    const uploadReqOptions = {
      hostname: 'video.bunnycdn.com',
      path: `/library/${LIBRARY_ID}/videos/${videoId}`,
      method: 'PUT',
      headers: {
        'AccessKey': API_KEY,
        'Content-Type': 'application/octet-stream',
        'Content-Length': stat.size
      }
    };

    await new Promise((resolve, reject) => {
      const req = https.request(uploadReqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          console.log("Upload response:", data);
          resolve();
        });
      });
      req.on('error', reject);
      fileStream.pipe(req);
    });

    console.log(`\n\n✅ Upload complete!`);
    console.log(`Video URL format for database: bunny://${videoId}`);
    
    // Now insert to Supabase
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    console.log("3. Saving to Supabase database...");
    const { data, error } = await supabase.from('gamedev_lessons').insert({
      title: title,
      author: 'Maroqli UZ',
      level: "Boshlang'ich",
      video_url: `bunny://${videoId}`,
      img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070'
    });
    
    if (error) {
      console.error("Supabase error:", error);
    } else {
      console.log("Saved to database successfully!");
    }

  } catch (err) {
    console.error("Error:", err);
  }
}

uploadVideo();
