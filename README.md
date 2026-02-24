# Outlook Calendar Manager (Green prop)

Outlook カレンダーを効率的に閲覧・管理するための、React ベースの Outlook アドインです。
特にチームメンバーの空き状況確認（タイムライン表示）や、複数人の予定を一括管理することに特化しています。

## ⚙️ 開発環境のセットアップ (Windows)

このプロジェクトは Windows 環境での開発をベースとしています。以下の手順で開発環境をゼロから構築できます。

### 1. 前提条件のインストール

以下のツールがインストールされていることを確認してください。

- **Node.js**: v18以上 (LTS推奨)
- **Git**: リポジトリのクローン用
- **Visual Studio Code**: 推奨エディタ
  - 拡張機能 `Debugger for Edge` (または最新の内置デバッガ) が必要です。

### 2. リポジトリのクローンと依存関係のインストール

```powershell
git clone <repository-url>
cd OutlookCalendarManager
npm install
```

### 3. 開発用証明書のインストール（初回のみ）

Office アドインは HTTPS で動作する必要があるため、ローカル用の信頼された証明書をインストールします。

```powershell
npx office-addin-dev-certs install
```

### 4. Edge WebView のループバック許可（初回のみ）

Windows のセキュリティ設定により、Edge WebView から localhost への接続が制限されている場合があります。以下の手順で許可します。

1. ターミナルで `npm run dev-server` を起動。
2. 別ターミナルで `npm run start` を実行。
3. プロンプトが表示されたら **「Y」** と入力して Enter。
   `? Allow localhost loopback for Microsoft Edge WebView? (Y/n)`

---

## 🐳 Docker での開発 (オプション)

ホスト環境を最小限に抑えたい場合は、Docker を利用して開発サーバーを起動できます。

### 1. 初回準備

ホスト側で一度だけ開発用証明書をインストールしておく必要があります（コンテナ内でこの証明書を参照します）。

```powershell
npx office-addin-dev-certs install
```

### 2. コンテナの起動

```powershell
docker-compose up
```

これにより：

- `https://localhost:3000` で開発サーバーが起動します。
- ホスト側の証明書がコンテナに同期され、HTTPS 通信が正しく動作します。
- ソースコードの変更は自動的に検知・反映されます。

---

## 🚀 開発ワークフロー

### 開発サーバーの起動

```powershell
npm run dev-server
```

`https://localhost:3000` でサーバーが待機します。

### アドインの確認 (Sideloading)

現在は自動サイドロードをオフに設定しています (`--no-sideload`)。

1. `npm run dev-server` を実行。
2. Outlook (Desktop または Web) を起動。
3. 予定作成画面などで「アドイン」メニューから読み込んでください。

---

## 🛠️ デバッグ方法 (VS Code)

`.vscode/launch.json` が設定されており、F5 キーでデバッグを開始できます。

- **Outlook Desktop (Classic)**:
  - 構成から `Outlook Desktop (Edge Chromium) にアタッチ` を選択して **F5**。
- **新しい Outlook (New Outlook)**:
  - [DEBUG_NEW_OUTLOOK.md](./DEBUG_NEW_OUTLOOK.md) を参照。
- **ブラウザのみ**:
  - 構成から `Edge: Taskpane のみ` を選択して **F5**。

> [!TIP]
> ブレークポイントが効かない場合は、VS Code で `OutlookCalendarManager` フォルダをルートとして開いているか確認してください。

---

## 🔐 Azure App Registration (Graph API)

このアドインは Microsoft Graph API を使用します。組織の Azure ポータルで以下の設定が必要です。

- **アプリケーションの種類**: シングルページ アプリケーション (SPA)
- **リダイレクト URI**: `https://localhost:3000/taskpane.html`
- **必要なアクセス許可 (API Permissions)**:
  - `Calendars.ReadWrite` (予定の取得・作成)
  - `User.Read` (ユーザー情報の取得)
  - `MailboxSettings.Read` (タイムゾーン等の取得)

---

## 📂 プロジェクト構成

```text
OutlookCalendarManager/
├── src/
│   ├── taskpane/           # アドインのメインUI (React)
│   ├── services/           # Graph API 等の通信ロジック (graphService.ts)
│   ├── config/             # 👥 メンバー・グループ設定 (groupConfig.ts)
│   └── utils/              # 共通ユーティリティ
├── manifest.xml            # クラシック Outlook 用マニフェスト
├── manifest.json           # 新しい Outlook / Teams モダナイズ用
└── webpack.config.js       # ビルド設定
```

### 👥 構成のカスタマイズ

表示するチームメンバーやグループは [src/config/groupConfig.ts](./src/config/groupConfig.ts) で管理しています。新メンバーの追加や会議室の変更時はこのファイルを編集してください。

---

## 📖 参考ドキュメント

- [MAINTENANCE.md](./MAINTENANCE.md): 挙動のチューニング・メンテナンスガイド
- [DEBUGGING.md](./DEBUGGING.md): 詳細なデバッグ手順
- [DEBUG_NEW_OUTLOOK.md](./DEBUG_NEW_OUTLOOK.md): 新しい Outlook でのデバッグ
- [SETUP_DEBUG.md](./SETUP_DEBUG.md): 初回セットアップの補足
