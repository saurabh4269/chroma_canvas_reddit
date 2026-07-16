# Layouts

No app shell / nav / sidebar. Two entrypoints:

1. **Inline splash** (`splash.html`) — Reddit feed webview
2. **Expanded game** (`game.html`) — full Phaser canvas (`#game-container`)

Phaser scenes stack: Boot → Preloader → MainMenu → Game (+ UIScene) → GameOver
