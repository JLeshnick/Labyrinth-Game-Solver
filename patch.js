    const fs = require('fs');
    const path = require('path');
    
    const filepath = path.join(__dirname, 'src', 'App.
  tsx');
    let content = fs.readFileSync(filepath, 'utf8');
    
    // 1. Fix process.platform check
    content = content.replace("process.platform ===
  'win32'", "/Win/.test(navigator.userAgent)");

    // 2. Remove unused isFixed variable warning
    content = content.replace('const isFixed = cIdx % 2
  === 0 && rIdx % 2 === 0;', '');

    // 3. Move showToast declaration above Settings &
  Theme states to fix hoisting
    const toastCode = `  // Toast System
      const [toastText, setToastText] = useState<string |
  null>(null);
      const showToast = useCallback((msg: string) => {
        setToastText(msg);
        const audioMuted = localStorage.
  getItem("labyrinth_audio_muted") === "true";
        if (!audioMuted) playClickSound();
      }, []);`;

    content = content.replace(toastCode, '');
    const targetPos = content.indexOf('  // Settings &
  Theme states');
    content = content.slice(0, targetPos) + toastCode +
  '\n\n' + content.slice(targetPos);

    fs.writeFileSync(filepath, content, 'utf8');
    console.log('App.tsx patched successfully!');
    EOF

    node patch.js
    rm patch.js
    npm run build:electron

