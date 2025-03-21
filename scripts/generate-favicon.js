const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');
const pngToIco = require('png-to-ico');

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (flag, defaultValue) => {
  const index = args.indexOf(flag);
  return index !== -1 && index < args.length - 1 ? args[index + 1] : defaultValue;
};

// Configuration (with command line options)
const size = parseInt(getArg('--size', '64'), 10);
const backgroundColor = getArg('--bg', '#1E293B'); // Dark blue background
const textColor = getArg('--color', '#FFFFFF'); // White text
const letter = getArg('--text', 'B'); // Default: First letter of Beats19182
const borderColor = getArg('--border', '#64748B'); // Light gray border
const outputPath = getArg('--output', path.join(__dirname, '../src/app/favicon.ico'));

async function generateFavicon() {
  // Create canvas
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Draw background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, size, size);

  // Draw text
  ctx.fillStyle = textColor;
  const fontSize = Math.floor(size * 0.625); // Scale font size based on canvas size
  ctx.font = `bold ${fontSize}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, size / 2, size / 2);

  // Add a circle around the letter
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = Math.max(2, Math.floor(size * 0.03)); // Scale line width based on canvas size
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - Math.floor(size * 0.08), 0, Math.PI * 2);
  ctx.stroke();

  // Save as PNG first
  const pngBuffer = canvas.toBuffer('image/png');
  const tempPngPath = path.join(__dirname, 'temp-favicon.png');
  fs.writeFileSync(tempPngPath, pngBuffer);

  try {
    // Convert PNG to ICO
    const icoBuffer = await pngToIco([tempPngPath]);
    
    // Save the ICO file
    fs.writeFileSync(outputPath, icoBuffer);
    console.log(`Favicon successfully generated at: ${outputPath}`);
    console.log(`Settings used: 
  - Size: ${size}x${size}
  - Background: ${backgroundColor}
  - Text: ${letter} (${textColor})
  - Border: ${borderColor}
`);
  } catch (error) {
    console.error('Error converting to ICO:', error);
  } finally {
    // Clean up temp file
    if (fs.existsSync(tempPngPath)) {
      fs.unlinkSync(tempPngPath);
    }
  }
}

function showHelp() {
  console.log(`
Generate a custom favicon for Beats19182

Usage:
  node generate-favicon.js [options]

Options:
  --text TEXT        Text to display in the favicon (default: "B")
  --bg COLOR         Background color (default: "#1E293B")
  --color COLOR      Text color (default: "#FFFFFF")
  --border COLOR     Border color (default: "#64748B")
  --size SIZE        Size in pixels (default: 64)
  --output PATH      Output file path (default: src/app/favicon.ico)
  --help             Show this help message

Examples:
  node generate-favicon.js --text M --bg #FF0000
  node generate-favicon.js --size 128 --border #000000
`);
}

// Show help if requested
if (args.includes('--help')) {
  showHelp();
} else {
  generateFavicon().catch(console.error);
} 