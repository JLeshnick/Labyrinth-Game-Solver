import re

with open('src/App.css', 'r') as f:
    content = f.read()

# 1. Remove all linear-gradients
content = re.sub(r'background:\s*linear-gradient\([^)]+\);', 'background: var(--color-bg-panel);', content)

# 2. Make buttons solid and flat
content = content.replace('background: linear-gradient(135deg, var(--color-accent-gold), #b38510);', 'background: var(--color-bg-white-10);')
content = content.replace('background: linear-gradient(135deg, #ffffff, #f3f4f6, var(--color-accent-gold));', 'background: var(--color-text-main);')
content = re.sub(r'-webkit-text-fill-color:\s*transparent;', '', content)
content = re.sub(r'-webkit-background-clip:\s*text;', '', content)
content = content.replace('background: linear-gradient(135deg, var(--color-accent-gold), #d99c0d);', 'background: var(--color-accent-gold); color: black;')

# 3. Tiles and board background
content = content.replace('background: #2a2542;', 'background: var(--color-bg-secondary);')
content = content.replace('background: #1c1830;', 'background: var(--color-bg-panel);')
content = content.replace('background: rgba(0, 0, 0, 0.4);', 'background: var(--color-bg-panel);')
content = content.replace('background: rgba(0, 0, 0, 0.3);', 'background: var(--color-bg-primary);')
content = content.replace('background: rgba(0, 0, 0, 0.35);', 'background: var(--color-bg-panel-solid);')

# 4. Remove heavy box shadows and drop shadows
content = re.sub(r'box-shadow:\s*[^;]+;', 'box-shadow: none;', content)
content = re.sub(r'filter:\s*drop-shadow\([^)]+\);', 'filter: none;', content)

# 5. Path styling - make them crisp lines
content = content.replace('background: #3e3863;', 'background: var(--color-border-hover);')

# 6. Simplify border radiuses to be more professional (less round)
content = re.sub(r'border-radius:\s*24px;', 'border-radius: 8px;', content)
content = re.sub(r'border-radius:\s*16px;', 'border-radius: 8px;', content)
content = re.sub(r'border-radius:\s*12px;', 'border-radius: 6px;', content)
content = re.sub(r'border-radius:\s*8px;', 'border-radius: 4px;', content)

# 7. Button hover states - remove box shadows
content = re.sub(r'box-shadow:\s*0\s+0\s+15px[^;]+;', '', content)

# 8. Border colors
content = content.replace('border: 1px solid rgba(255, 255, 255, 0.15);', 'border: 1px solid var(--color-border-subtle);')
content = content.replace('border: 2px solid var(--color-accent-gold);', 'border: 1px solid var(--color-accent-gold);')
content = content.replace('border: 2px dashed rgba(255, 190, 26, 0.8);', 'border: 1px dashed var(--color-accent-gold);')
content = content.replace('border: 2px dashed rgba(52, 199, 89, 0.8);', 'border: 1px dashed var(--color-pawn-green);')

with open('src/App.css', 'w') as f:
    f.write(content)

print("CSS transformed")
