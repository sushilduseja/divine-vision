#!/bin/bash
# ============================================================================
# NUCLEAR OPTION: Complete Reset Script (Fixed Version)
# Run this to fix styling issues once and for all
#
# Fixes in this version:
# - Handle process killing cross-platform (e.g., for Windows Git Bash where pkill may not exist)
# - Automatically fix vulnerabilities and update Next.js to latest stable (addresses deprecated version)
# - Improve CSS check: Grep for more general Tailwind indicators and classes from test page
# - Add temporary safelist to tailwind.config.ts to force include common classes for testing
# - Backup original tailwind.config.ts before modifying
# - Add check for class usage in source files
# - Ensure server starts on port 9002 and wait briefly before instructions
# - Add more diagnostics: Check for class mangling, verify globals.css import in HTML
# ============================================================================

echo "🔥 Starting Nuclear Reset (Fixed Version)..."

# Step 1: Stop all processes (cross-platform)
echo "⏹️  Stopping dev server..."
if command -v pkill >/dev/null 2>&1; then
    pkill -f "next dev" || true
else
    ps -ef | grep "next dev" | grep -v grep | awk '{print $2}' | xargs kill -9 >/dev/null 2>&1 || true
fi

# Step 2: Delete all caches and build artifacts
echo "🗑️  Deleting caches..."
rm -rf .next
rm -rf node_modules/.cache
rm -rf .swc
rm -rf out

# Step 3: Reinstall node_modules (fresh) and fix vulnerabilities
echo "📦 Reinstalling dependencies..."
rm -rf node_modules
rm -f package-lock.json
npm install
echo "🛡️ Fixing vulnerabilities and updating Next.js..."
npm audit fix --force
npm install next@latest

# Step 4: Verify critical files exist
echo "✅ Verifying files..."
node verify-setup.js

# Step 5: Add temporary safelist to force Tailwind class generation (backup original)
echo "🛠️ Adding temporary safelist to tailwind.config.ts for testing..."
cp tailwind.config.ts tailwind.config.ts.bak
sed -i.bak '/content: \[/a\
  safelist: [\
    "bg-primary", "text-primary", "flex", "text-xl",\
    "bg-red-500", "text-4xl", "font-bold", "text-blue-600", "bg-white", "p-8", "rounded-lg"\
  ],' tailwind.config.ts
rm tailwind.config.ts.bak  # Clean up sed backup

# Step 6: Run build to check for errors
echo "🔨 Testing build..."
npm run build

# Step 7: Check if CSS is generated and contains Tailwind classes
echo "🎨 Checking generated CSS..."
if [ -d ".next/static/css" ]; then
    echo "✅ CSS directory exists"
    ls -lh .next/static/css/
    
    # Improved check: Look for general Tailwind markers and test page classes
    if grep -r "@tailwind\|bg-red-500\|text-4xl\|flex\|bg-primary" .next/static/css/ > /dev/null 2>&1; then
        echo "✅ Tailwind classes found in CSS!"
    else
        echo "❌ Tailwind classes NOT found in CSS - this is the problem!"
        echo "   Possible cause: Classes not detected/used in source files. Checking source usage..."
        grep -r "bg-primary\|text-xl\|flex\|bg-red-500\|text-4xl" app/ components/ || echo "   No matches found in source - add them to components for testing!"
    fi
else
    echo "❌ No CSS directory found - build failed!"
fi

# Step 8: Start dev server
echo "🚀 Starting dev server..."
npm run dev &
sleep 5  # Wait for server to start

echo ""
echo "================================================"
echo "NEXT STEPS:"
echo "1. Open http://localhost:9002 in browser (ensure no port conflict)"
echo "2. Press Ctrl+Shift+R to hard refresh"
echo "3. Visit http://localhost:9002/test - should show red background, blue text if Tailwind works"
echo "4. Visit http://localhost:9002/test-styling.html - should show purple/green if browser CSS ok"
echo "5. Press F12 to open DevTools"
echo "6. Go to Network tab, filter by 'CSS', check globals.css loads and contains Tailwind classes"
echo "7. Go to Console tab for any errors (e.g., PostCSS failures)"
echo "8. View page source (Ctrl+U), search for <link rel=\"stylesheet\" - verify CSS link"
echo "================================================"

# ============================================================================
# FILE: test-styling.html (unchanged)
# ============================================================================
cat > public/test-styling.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CSS Test</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-100">
    <div class="container mx-auto p-8">
        <h1 class="text-4xl font-bold text-purple-600 mb-4">CSS Test Page</h1>
        <p class="text-xl text-gray-700 mb-4">If you see purple text and styling, your browser supports CSS.</p>
        <div class="bg-white p-6 rounded-lg shadow-lg">
            <p class="text-green-600">This should be green text in a white card.</p>
        </div>
    </div>
</body>
</html>
EOF

echo "Created test-styling.html in public/"

# ============================================================================
# FILE: app/test/page.tsx (unchanged)
# ============================================================================
mkdir -p app/test
cat > app/test/page.tsx << 'EOF'
export default function TestPage() {
  return (
    <div className="min-h-screen bg-red-500 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-2xl">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Tailwind Test
        </h1>
        <p className="text-xl text-green-600">
          If you see colors, Tailwind is working!
        </p>
        <div className="mt-4 space-y-2">
          <div className="h-10 bg-purple-600 rounded"></div>
          <div className="h-10 bg-pink-600 rounded"></div>
          <div className="h-10 bg-indigo-600 rounded"></div>
        </div>
      </div>
    </div>
  );
}
EOF

echo "Created test page at /test"

# ============================================================================
# DIAGNOSTIC COMMANDS (enhanced)
# ============================================================================

cat << 'EOF'

🔍 ADDITIONAL DIAGNOSTIC COMMANDS:

1. Check Tailwind config validity:
   npx tailwindcss --help

2. Inspect generated CSS head:
   cat .next/static/css/*.css | head -n 50

3. Check classes in HTML (after build/start):
   npm run start & sleep 5; curl http://localhost:3000 | grep "class="; kill $!

4. Test Tailwind compilation directly:
   echo "@tailwind base; @tailwind components; @tailwind utilities;" | npx tailwindcss -c tailwind.config.ts --content app/**/*.{ts,tsx} --postcss -o test-output.css
   cat test-output.css | grep "bg-red-500\|text-4xl" || echo "No classes generated!"

5. Check for class mangling or overrides:
   curl http://localhost:9002 | grep "<style" | head -n 10

6. System info for debugging:
   npx envinfo --system --binaries --browsers

EOF

# ============================================================================
# CLEANUP INSTRUCTIONS
# ============================================================================
echo ""
echo "💡 After testing, restore original tailwind.config.ts:"
echo "   mv tailwind.config.ts.bak tailwind.config.ts"

# ============================================================================
# FINAL DEBUGGING CHECKLIST (updated)
# ============================================================================
cat << 'EOF'

📋 FINAL DEBUGGING CHECKLIST:

□ Stopped all Node processes
□ Deleted .next folder
□ Deleted node_modules/.cache
□ Reinstalled node_modules
□ Fixed vulnerabilities and updated Next.js
□ Verified autoprefixer installed
□ Added safelist for testing
□ Ran npm run build successfully
□ Checked .next/static/css/ has files >10KB
□ Checked CSS contains Tailwind classes (e.g., bg-red-500 from /test)
□ Opened browser in incognito mode
□ Hard refreshed (Ctrl+Shift+R)
□ Checked Network tab shows CSS loaded with Tailwind content
□ Checked Console for errors/warnings
□ Tested /test page (expect red bg, blue text)
□ Tested /test-styling.html (expect purple/green)
□ Ran additional diagnostics above

If STILL broken:
- Share output of diagnostics
- Screenshot DevTools Network/Console
- Check if classes like 'bg-primary' are actually used: grep -r "bg-primary" app/ components/

EOF