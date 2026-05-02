# NAI Prompt Generator

PWA 版（iPad / スマホ / PC）と Chrome 拡張版（NovelAI Image Generator 直接連携）の両方をビルド可能。

---

## セットアップ

```bash
npm install
```

## ローカル開発（PWA）

```bash
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

## ローカル開発（Chrome 拡張）

```bash
npm run dev:ext
```

`http://localhost:5174` で起動しつつ、`dist-ext/` に拡張のソースが書き出されます。
`chrome://extensions/` で「パッケージ化されていない拡張機能を読み込む」→ `dist-ext/` を選択。

## Chrome 拡張のビルド

```bash
npm run build:ext
# 出力: dist-ext/
```

1. Chrome で `chrome://extensions/` を開く
2. 右上「デベロッパーモード」を ON
3. 「パッケージ化されていない拡張機能を読み込む」→ `dist-ext/` を選択
4. NovelAI Image Generator (https://novelai.net/image) を開く
5. 拡張アイコンをクリック → サイドパネルが開く
6. プロンプトを構築し「🪄 NovelAI へ送信」でテキストエリアへ反映

### 送信モード

- **上書き**: NovelAI 側の既存値を完全に置き換え
- **末尾追加**: 既存値の末尾に `, ` で連結

### ターゲット要素が見つからない場合

NovelAI の DOM が変わって自動検出に失敗したら、出力タブの「🎯 ポジ要素を選択 / ネガ要素を選択」をクリックし、NovelAI ページ上で対象 textarea をクリックして登録してください。設定は `chrome.storage.local` に永続化されます。

### 互換性

- Side Panel API は **Chrome / Edge 114+** が必要です。
- データは `chrome.storage.local` に保存されます（PWA 版の `localStorage` とはオリジンが異なるため別管理）。両方使う場合は管理タブの「📥 書き出し」→ もう一方で「➕ マージ読み込み」でデータを移行できます。

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
