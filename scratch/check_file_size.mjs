import fs from 'fs';

const filePath = 'd:/project/maroqli-uz/scratch/SHIROQ v1.1.rar';
if (fs.existsSync(filePath)) {
  const stats = fs.statSync(filePath);
  console.log("File size in bytes:", stats.size);
  console.log("File size in MB:", (stats.size / (1024 * 1024)).toFixed(2));
} else {
  console.log("File not found at", filePath);
}
