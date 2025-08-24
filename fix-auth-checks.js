// Fix auth checks in API routes
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const apiDir = path.join(__dirname, 'src', 'app', 'api', 'admin');

// Find all API route files
const routeFiles = execSync(`dir /s /b "${apiDir}\\*route.ts"`, { encoding: 'utf8' })
  .split('\r\n')
  .filter(file => file.trim().length > 0);

console.log(`Found ${routeFiles.length} API route files`);

let modifiedFiles = 0;
for (const filePath of routeFiles) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    const originalContent = content;
    
    // Replace auth check pattern
    content = content.replace(
      /if \(!session \|\| session\.user\.role !== 'ADMIN'\)/g,
      "if (!session?.user || session.user.role !== 'ADMIN')"
    );
    
    // Only write back if changes were made
    if (content !== originalContent) {
      fs.writeFileSync(filePath, content);
      modifiedFiles++;
      console.log(`Updated: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

console.log(`Modified ${modifiedFiles} files`);
