const { App } = require('@slack/bolt');
const { WebClient } = require('@slack/web-api');
const Anthropic = require('anthropic');
const express = require('express');
const dotenv = require('dotenv');

// 環境変数のロード
dotenv.config();

// Slack Boltアプリの初期化
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN
});

// Slack WebClientの初期化
const webClient = new WebClient(process.env.SLACK_BOT_TOKEN);

// Anthropic APIクライアントの初期化
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// メッセージ履歴を保存するオブジェクト (チャネルID => メッセージ配列)
const messageHistory = {};

// スレッド要約コマンドのリスナー
app.command('/summarize', async ({ command, ack, respond }) => {
  try {
    // コマンドを確認
    await ack();
    
    const { channel_id, text, user_id } = command;
    
    // スレッドIDの取得（テキストからスレッドIDを抽出）
    let thread_ts = text.trim();
    
    if (!thread_ts) {
      return await respond('要約するスレッドのIDを指定してください。使い方: /summarize [スレッドID]');
    }
    
    // "タイピング中"のインジケータを表示
    await respond({
      text: "スレッドを要約中...",
      response_type: 'ephemeral'
    });
    
    // スレッドの会話履歴を取得
    const result = await webClient.conversations.replies({
      channel: channel_id,
      ts: thread_ts
    });
    
    if (!result.messages || result.messages.length === 0) {
      return await respond('指定されたスレッドが見つからないか、メッセージがありません。');
    }
    
    // メッセージを処理して会話履歴を作成
    const messages = [];
    
    for (const message of result.messages) {
      // botのメッセージはスキップしない（要約に含める）
      if (message.user) {
        try {
          // ユーザー情報を取得
          const userInfo = await webClient.users.info({ user: message.user });
          const userName = userInfo.user.real_name || userInfo.user.name;
          
          messages.push({
            role: message.bot_id ? 'assistant' : 'user',
            content: message.text,
            name: userName
          });
        } catch (error) {
          // ユーザー情報が取得できない場合は名前なしで追加
          messages.push({
            role: message.bot_id ? 'assistant' : 'user',
            content: message.text
          });
        }
      }
    }
    
    // 要約のためのプロンプト
    const summaryPrompt = {
      role: 'user',
      content: 'このスレッドの内容を簡潔に要約してください。重要なポイントや結論を含めてください。'
    };
    
    // Claude APIにリクエスト（会話履歴 + 要約プロンプト）
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      messages: [...messages, summaryPrompt],
    });
    
    // 要約結果をスレッドに返信
    await webClient.chat.postMessage({
      channel: channel_id,
      thread_ts: thread_ts,
      text: `*スレッド要約*\n\n${response.content[0].text}`
    });
    
    // コマンド実行者にも通知
    await respond({
      text: '要約が完了しました。スレッドをご確認ください。',
      response_type: 'ephemeral'
    });
    
  } catch (error) {
    console.error('要約処理中にエラーが発生しました:', error);
    await respond({
      text: '要約処理中にエラーが発生しました。',
      response_type: 'ephemeral'
    });
  }
});

// メッセージイベントのリスナー
app.message(async ({ message, say }) => {
  try {
    // botのメッセージは無視
    if (message.subtype === 'bot_message') {
      return;
    }

    // チャネルIDを取得
    const channelId = message.channel;
    
    // 新しいチャネルの場合は履歴を初期化
    if (!messageHistory[channelId]) {
      messageHistory[channelId] = [];
    }
    
    // ユーザー情報を取得
    const userInfo = await webClient.users.info({ user: message.user });
    const userName = userInfo.user.real_name || userInfo.user.name;
    
    // メッセージを履歴に追加
    messageHistory[channelId].push({
      role: 'user',
      content: message.text,
      name: userName
    });
    
    // "タイピング中"のインジケータを表示
    await webClient.chat.postMessage({
      channel: channelId,
      text: "考え中...",
      thread_ts: message.thread_ts || message.ts
    });
    
    // Claude APIにリクエスト
    const response = await anthropic.messages.create({
      model: "claude-3-7-sonnet-20250219",
      max_tokens: 4000,
      messages: messageHistory[channelId],
    });
    
    // Claudeの応答を履歴に追加
    messageHistory[channelId].push({
      role: 'assistant',
      content: response.content[0].text
    });
    
    // Claudeの応答をSlackに送信
    await say({
      text: response.content[0].text,
      thread_ts: message.thread_ts || message.ts
    });
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
    await say({
      text: 'メッセージの処理中にエラーが発生しました。',
      thread_ts: message.thread_ts || message.ts
    });
  }
});

// Expressサーバーの設定（ヘルスチェック用）
const expressApp = express();
expressApp.get('/', (req, res) => {
  res.send('Slack-Claude Bridge Server is running!');
});

// サーバー起動
(async () => {
  const port = process.env.PORT || 3000;
  
  // Boltアプリを起動
  await app.start();
  console.log('⚡️ Boltアプリが起動しました');
  
  // Expressサーバーを起動
  expressApp.listen(port, () => {
    console.log(`⚡️ Expressサーバーが起動しました: http://localhost:${port}`);
  });
})();