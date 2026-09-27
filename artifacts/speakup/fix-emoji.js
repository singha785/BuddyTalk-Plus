const fs = require('fs');
const path = require('path');

const filePath = process.argv[2] || 'app/onboarding.tsx';

if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  { corrupted: 'ðŸŒ±', correct: '🌱' },
  { corrupted: 'ðŸŒ¿', correct: '🌿' },
  { corrupted: 'ðŸŒ³', correct: '🌳' },
];

let totalReplacements = 0;
let changedPatterns = [];

for (const { corrupted, correct } of replacements) {
  const regex = new RegExp(corrupted.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
  const matches = content.match(regex);
  const count = matches ? matches.length : 0;
  if (count > 0) {
    content = content.replace(regex, correct);
    totalReplacements += count;
    changedPatterns.push(`  ${corrupted} -> ${correct}  (${count}x)`);
  }
}

if (totalReplacements === 0) {
  console.log('No matching corrupted patterns found. File left unchanged.');
  process.exit(0);
}

const backupPath = filePath + '.bak-before-emoji-fix';
fs.copyFileSync(filePath, backupPath);

fs.writeFileSync(filePath, content, 'utf8');

console.log(`Done. Backup saved to: ${backupPath}`);
console.log(`Total replacements: ${totalReplacements}`);
console.log('Patterns fixed:');
changedPatterns.forEach(p => console.log(p));
