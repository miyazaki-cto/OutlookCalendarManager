# デバッグセットアップ手順

## 初回セットアップ（1回だけ必要）

`office-addin-debugging start` コマンドは初回実行時に、Edge WebView の localhost ループバック許可を確認するプロンプトを表示します。

### 手順

1. **ターミナルを開く**（VS Code の統合ターミナルでOK）
2. **OutlookCalendarManager フォルダーに移動**:
   ```powershell
   cd OutlookCalendarManager
   ```
3. **開発サーバーを起動**（別ターミナル）:
   ```powershell
   npm run dev-server
   ```
4. **Outlook 起動コマンドを実行**（別ターミナル）:
   ```powershell
   npm run start
   ```
5. **プロンプトが表示されたら「Y」と入力して Enter**:
   ```
   ? Allow localhost loopback for Microsoft Edge WebView? (Y/n)
   ```
6. Outlook が起動することを確認
7. **Ctrl+C** で停止

**一度「Y」を入力すれば、次回からは自動で進みます。**

---

## その後は F5 でデバッグ可能

初回セットアップ後は、VS Code のデバッグパネルで **F5** を押すだけで：
- 開発サーバーが自動起動
- Outlook が自動起動
- デバッガーがアタッチ

されます。
