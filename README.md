# NAI Prompt Generator — PWA 版 (iPad / スマホ / PC)

GitHub Pages にデプロイし、iPad の「ホーム画面に追加」でネイティブアプリのように使えます。
オフラインでも動作します。

---

## セットアップ

```bash
cd nai-prompt-generator-pwa
npm install
```

## ローカル開発

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

---

## GitHub Pages にデプロイ

### 1. GitHub リポジトリを作成

```bash
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/G-kidosaki/nai-prompt-generator.git
git push -u origin main
```

### 2. vite.config.js の base を確認

```js
base: "/nai-prompt-generator/",
//           ↑ リポジトリ名に合わせる
```

### 3. デプロイ

```bash
npm run deploy
```

これで `https://G-kidosaki.github.io/nai-prompt-generator/` で公開されます。

### 4. GitHub の設定（初回のみ）

1. リポジトリの **Settings** → **Pages**
2. Source を **Deploy from a branch** に設定
3. Branch を **gh-pages** / **/ (root)** に設定
4. Save

---

## iPad へのインストール

1. Safari で `https://G-kidosaki.github.io/nai-prompt-generator/` を開く
2. 画面下部の **共有ボタン** (↑) をタップ
3. **「ホーム画面に追加」** をタップ
4. 名前を確認して **「追加」**

→ ホーム画面にアプリアイコンが追加され、
   フルスクリーンで動作します（Safari のアドレスバーなし）。

---

## iPad 向けの最適化ポイント

- **safe-area-inset**: ホームバーやノッチを避けたレイアウト
- **タッチ最適化**: ボタンサイズ拡大、`-webkit-tap-highlight-color` 無効化
- **オフライン対応**: Service Worker によるアセットキャッシュ
- **コピー**: `navigator.clipboard` + `execCommand` フォールバック
- **フォント**: `font-size: 16px` で iOS の自動ズームを防止
- **スクロール**: `-webkit-overflow-scrolling: touch` 対応
- **出力テキスト**: `user-select: all` で長押しコピーしやすく

---

## データについて

- データは **ブラウザの localStorage** に保存されます
- Safari の「サイトデータを削除」で消えるため、
  重要なデータは **書き出し機能** でバックアップしてください
- Electron 版・Artifact 版とプロンプト一覧 JSON は互換性があります

---

## Electron 版との共存

| 項目 | Electron 版 | PWA 版 |
|------|------------|--------|
| 保存先 | `%APPDATA%` JSON ファイル | localStorage |
| オフライン | ✅ | ✅ (Service Worker) |
| OS 連携 | ✅ ネイティブ | ホーム画面に追加 |
| iPad 対応 | ❌ | ✅ |
| JSON互換 | ✅ | ✅ |

プロンプト一覧は JSON エクスポート/インポートで
Electron 版 ↔ PWA 版 間のデータ移行ができます。
