# デバッグ手順

## デバッグパネルの開き方・構成の選び方

1. **左サイドバー**で「**実行とデバッグ**」アイコン（▶＋虫マーク）をクリックするか、**Ctrl+Shift+D** でデバッグパネルを開く。
2. 上部の **「構成」ドロップダウン** をクリックすると、次のいずれかが表示されます：
   - **Outlook Desktop (Edge Chromium) にアタッチ** … Outlook でアドインを開き、ブレークポイントで止めたいとき
   - **Edge: Taskpane のみ（ブラウザでデバッグ）** … ブラウザだけで Taskpane を開いてデバッグしたいとき
3. 使いたい構成を選び、**緑の▶（開始）ボタン** を押すか **F5** でデバッグ開始。

**「Edge Chromium にアタッチ」が出ない場合**  
- フォルダーは **outlook-calendar-addon**（プロジェクトのルート）を開いていますか？  
- ルートに `.vscode/launch.json` を用意してあるので、**ファイル → フォルダーを開く** で `outlook-calendar-addon` を選び直すと構成が表示されます。  
- 表示されないときは、**構成ドロップダウン → 「launch.json を開く」** で `.vscode/launch.json` が存在するか確認してください。

---

## 前提

- **開発用証明書**: 初回のみ `npx office-addin-dev-certs install` で HTTPS 用証明書をインストールしてください。
- **ワークスペース**: VS Code で `OutlookCalendarManager` フォルダーを開いてください（ルートで開いている場合は launch の `webRoot` が合わない場合があります）。

---

## 方法1: Outlook 上でデバッグ（推奨）

1. **F5** を押すか、デバッグパネルで **「Outlook Desktop (Edge Chromium) にアタッチ」** を選んで開始。
2. 自動で以下が行われます：
   - 開発サーバーが起動（https://localhost:3000）
   - Outlook が開き、アドインがサイドロードされる
   - デバッガーが Edge Chromium にアタッチ
3. タスクペインを開き、**ブレークポイント**を置いた箇所で止まります。
4. 終了時は **Shift+F5** でデバッグ停止。必要なら「Stop Debug」タスクでアドイン停止。

**ソースマップ**: `webpack.config.js` で `devtool: "source-map"` が有効なため、`src/` 内の TypeScript にブレークポイントを置けます。

---

## 方法2: ブラウザだけで Taskpane をデバッグ

Outlook を開かず、Taskpane の UI や API 呼び出しだけ確認したい場合：

1. デバッグパネルで **「Edge: Taskpane のみ（ブラウザでデバッグ）」** を選択して **F5**。
2. 開発サーバーが起動したあと、Edge で `https://localhost:3000/taskpane.html` が開きます。
3. **注意**: Office ホスト外のため `Office.onReady()` が完了しない場合があります。React の状態や `graphService` のブレークポイント用として利用してください。

---

## 方法3: 手動でサーバー起動 → Outlook → アタッチ

1. ターミナルで `npm run dev-server` を実行し、起動を待つ。
2. 別タスクで `npm run start -- desktop --app outlook` を実行し、Outlook を開く。
3. デバッグパネルで **「Outlook Desktop (Edge Chromium) にアタッチ」** を選び、**preLaunchTask を使わず**アタッチする場合は、launch の `preLaunchTask` を一時削除するか、既存の **「Debug: Outlook Desktop」** のみ行い、F5 で「Outlook Desktop (Edge Chromium) にアタッチ」を実行。

---

## ブレークポイントが効かない場合

- **webRoot**: ワークスペースが `outlook-calendar-addon` の場合は、launch の `webRoot` を `"${workspaceFolder}/OutlookCalendarManager"` に変更してみてください。
- **Edge のリモートデバッグ**: Outlook が別の Edge プロファイルを使っている場合、ポート 9229 でアタッチできないことがあります。その場合は「Edge: Taskpane のみ」でブラウザデバッグを利用するか、Outlook のタスクペイン上で右クリック → **検証** から DevTools を開いてコンソール・ネットワークを確認してください。
