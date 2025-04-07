# Slack MCP → Claude Desktop ブリッジ

このプロジェクトは、SlackのMCPサーバーとClaude Desktopを接続するためのブリッジサーバーです。SlackのメッセージをClaude APIに転送し、Claude Desktopと同じモデル（claude-3-7-sonnet）を使って応答を返します。

## 必要条件

- Node.js 16以上
- Slack Bot Token（`xoxb-` で始まるトークン）
- Slack Signing Secret
- Slack App Token（`xapp-` で始まるトークン）
- Anthropic API Key（Claude API用）

## セットアップ手順

### 1. Slackアプリの作成

1. [Slack API](https://api.slack.com/apps)にアクセスして「Create New App」をクリックします。
2. 「From scratch」を選び、アプリ名とワークスペースを設定します。
3. 左サイドバーの「Socket Mode」を選び、有効にします。
4. 「App Token」をメモしておきます（`xapp-` で始まるトークン）。
5. 左サイドバーの「OAuth & Permissions」を選びます。
6. 「Bot Token Scopes」で以下の権限を追加します：
   - `app_mentions:read`
   - `chat:write`
   - `users:read`
   - `channels:history`
   - `groups:history`
   - `im:history`
   - `mpim:history`
   - `commands` （スラッシュコマンドのため）
7. 左サイドバーの「Slash Commands」を選び、新しいコマンドを追加します：
   - コマンド: `/summarize`
   - 説明: `スレッドの会話を要約します`
   - 使用ヒント: `[スレッドID]`
   - escape: チェック
8. ワークスペースにアプリをインストールします。
9. 「Bot User OAuth Token」をメモしておきます（`xoxb-` で始まるトークン）。
10. 左サイドバーの「Basic Information」で「Signing Secret」をメモしておきます。

### 2. Anthropic API Keyの取得

1. [Anthropic Console](https://console.anthropic.com/)にアクセスします。
2. APIキーを作成し、メモしておきます。

### 3. ブリッジサーバーのセットアップ

1. このリポジトリをクローンします：
   ```
   git clone https://github.com/makikub/slack-mcp-claude-bridge.git
   cd slack-mcp-claude-bridge
   ```

2. 依存関係をインストールします：
   ```
   npm install
   ```

3. `.env.example`を`.env`にコピーし、先ほどメモした情報を設定します：
   ```
   cp .env.example .env
   ```
   
   そして`.env`ファイルを編集して、各トークンと設定を入力します。

4. サーバーを起動します：
   ```
   npm start
   ```

## 使い方

### 通常のチャット

1. SlackでBotをチャンネルに招待します（`/invite @あなたのボット名`）。
2. メッセージを送信すると、Botが自動的にClaude APIを使って応答します。
3. スレッド内でのやり取りも可能です。

### スレッド要約機能

1. 任意のスレッドで以下のコマンドを実行します：
   ```
   /summarize [スレッドID]
   ```
   
   スレッドIDはスレッドの最初のメッセージのタイムスタンプです。スレッドの最初のメッセージの「...」メニューから「メッセージへのリンクをコピー」を選択して、URLからIDを抽出できます（例: `https://workspace.slack.com/archives/C12345678/p1617283945123400` の `1617283945.123400` 部分がスレッドIDです）。

2. ボットがスレッド内の会話を要約し、元のスレッドに返信します。

## 注意点

- このブリッジは各チャンネルごとにメッセージ履歴を保持します。長時間の使用やメモリ使用量には注意してください。
- Anthropic APIの利用には料金が発生する場合があります。料金プランを確認してください。
- セキュリティのため、`.env`ファイルをGitにコミットしないようにしてください。

## トラブルシューティング

- サーバーが起動しない場合は、`.env`ファイルの設定を確認してください。
- Slackでボットが応答しない場合は、ボットの権限設定とチャンネルへの招待を確認してください。
- スラッシュコマンドが動作しない場合は、Slackアプリの設定でコマンドが正しく登録されているか確認してください。
- エラーが発生した場合は、コンソールのログを確認してください。

## ライセンス

MIT