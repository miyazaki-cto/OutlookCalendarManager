# Outlook Calendar Manager (Green prop)

Outlook カレンダーを効率的に閲覧・管理するための、React ベースの Outlook アドインです。
特にチームメンバーの空き状況確認（タイムライン表示）や、複数人の予定を一括管理することに特化しています。

## 概要

このアドインは、Microsoft Graph API を使用してユーザーのカレンダーデータを取得し、視覚的なインターフェースを提供します。
ブラウザ（Outlook Web）およびデスクトップ版 Outlook の両方で動作し、IE11 互換も考慮されています。

## 技術スタック

- **Core**: React 18, TypeScript
- **UI Framework**: Fluent UI React Components (@fluentui/react-components)
- **Calendar Library**: React Big Calendar
- **API**: Microsoft Graph API (@microsoft/microsoft-graph-client)
- **Build Tool**: Webpack, Babel
- **Office Add-in Tooling**: Office.js, office-addin-debugging

## 主な機能

### 1. 複数の表示モード

- **カレンダー表示**: 標準的な月/週単位のカレンダー表示。時刻は 24 時間制（HH:mm）で統一されています。
- **週ライン表示**: チームメンバーの 1 週間の予定を横並びで表示し、空き時間を視覚的に把握可能。
- **日ライン表示**: 当日のチームメンバーの予定を詳細に表示。8時以前の予定（終日予定含む）も 8:00 のセルにタイトルが表示され、視認性が確保されています。
- **リスト表示**: 選択日の予定をリスト形式で表示。予定タイトルの前に担当者名 `[名前]` が自動付与されます。
- **共通の日付移動機能**: 「日ライン」「リスト」表示では、前日・今日・翌日への切り替えやカレンダーからの日付選択が可能です。

### 2. 高度なフィルタリング

- **バッチ適用機能**: メンバー選択時は一時的な状態（チェックのみ）として保持され、「適用」ボタンを押すことで一括してデータ取得を開始します。
- **選択数の可視化**: フィルターヘッダーに現在の選択数 `(N)` が表示され、折りたたんだ状態でも選択状況が把握できます。
- **グループ/メンバー選択**: チーム（グループ）単位や、個別のメンバーを組み合わせて表示。
- **個別折り畳みセクション**: グループとメンバーごとに折り畳みが可能。
- **状態の永続化**: フィルターの選択状態、セクションの開閉状態は `localStorage` に保存されます。

### 3. イベント管理

- **作成・編集・削除**: カレンダーやタイムラインの空き時間をクリックして予定を作成。
- **自動参加者追加**: イベント作成時、ログインユーザーが自動的に出席者として追加されます。
- **イベント内容のクリーンアップ**: Outlook 特有の改行や HTML タグを排除し、プレーンテキストで編集可能です。

### 4. UI/UX の最適化

- **取得範囲の設定**: 過去・未来の予定取得期間（ヶ月単位）をモーダルで管理。
- **レスポンシブデザイン**: モバイルからデスクトップまで最適なレイアウトを提供。
- **常に表示されるローディング**: データ取得中は画面上部に固定されたスピナーが表示され、スクロール状態に関わらず進捗が確認できます。

## プロジェクト構成

```
OutlookCalendarManager/
├── src/
│   ├── taskpane/           # アドインのメインUI
│   │   ├── components/     # Reactコンポーネント (App, CalendarView, MemberTimelineView等)
│   │   └── index.tsx       # エントリーポイント
│   ├── services/           # Graph API 等の通信ロジック
│   ├── config/             # グループ・メンバーのマスターデータ (groupConfig.ts)
│   ├── types/              # TypeScriptの型定義
│   └── utils/              # 共通ユーティリティ (カラー管理等)
├── manifest.xml            # Officeアドインの構成ファイル
└── package.json            # 依存関係とスクリプト
```

## 開発環境のセットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 開発用証明書のインストール（初回のみ）

```bash
npx office-addin-dev-certs install
```

### 3. 開発サーバーの起動

```bash
npm start
```

※ `npm start` は現在、Outlook の自動起動を行わない設定 (`--no-sideload`) になっています。サーバー起動後、手動で Outlook を開いてアドインを読み込んでください。

## カスタマイズ方法

### メンバー・グループの変更

`src/config/groupConfig.ts` を編集することで、表示対象のグループやメンバーのリストを更新できます。

### 取得期間のデフォルト値

`src/taskpane/components/App.tsx` の初期状態（`pastMonths`, `futureMonths` 等）を変更することで、初期ロード時の期間を変更できます。

## デバッグ方法

詳細なデバッグ手順については、以下のドキュメントを参照してください：

- [DEBUGGING.md](./DEBUGGING.md): 基本的なデバッグ手順
- [SETUP_DEBUG.md](./SETUP_DEBUG.md): 初期設定手順

## 注意事項

- **IE11 対応**: `App.css` にて `-ms-flex` などのプレフィックスを使用しています。レイアウト変更時は IE11 での崩れに注意してください。
- **Graph API アクセス許可**: `manifest.xml` および Azure App Registration にて、カレンダーの読み書き権限 (`Calendars.ReadWrite`) が必要です。
