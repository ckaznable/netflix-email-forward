import PostalMime from "postal-mime"

export default {
  async email(message: any, env: Record<string, string>, ctx: any) {
    const sender = message.from
    const recipient = message.to

    try {
      // 1. 解析電子郵件
      const rawEmail = await new Response(message.raw).arrayBuffer()
      const parser = new PostalMime()
      const parsedEmail = await parser.parse(rawEmail)

      const subject = parsedEmail.subject || "無標題"
      // 擷取純文字內容，如果沒有純文字則嘗試抓 HTML，並限制長度避免超過 TG 限制 (4096字元)
      let content = parsedEmail.text || parsedEmail.html || "無內容"
      if (content.length > 3000) {
        content = content.substring(0, 3000) + "\n\n...[內容過長已截斷]"
      }

      // 2. 準備傳送給 Telegram 的訊息格式
      const tgMessage = `
📧 **收到新郵件** 📧
**來自:** ${sender}
**寄給:** ${recipient}
**標題:** ${subject}

**內容:**
${content}
      `

      // 3. 呼叫 Telegram Bot API
      // 請確保在 Cloudflare 的設定中加入了 TELEGRAM_BOT_TOKEN 與 TELEGRAM_CHAT_ID 變數
      const botToken = env.TELEGRAM_BOT_TOKEN
      const chatId = env.TELEGRAM_CHAT_ID

      if (!botToken || !chatId) {
        throw new Error("Telegram Bot Token 或 Chat ID 未設定")
      }

      const tgApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

      const tgResponse = await fetch(tgApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: tgMessage,
        }),
      })

      if (!tgResponse.ok) {
        const errorData = await tgResponse.text()
        console.error("Telegram API 錯誤:", errorData)
        // 若只是通知失敗，可以選擇不 reject 信件，讓信件依然算作「處理成功」
      } else {
        console.log("成功傳送通知至 Telegram")
      }

    } catch (error) {
      console.error("處理郵件時發生錯誤:", error)
      // 遇到嚴重錯誤時拒絕信件，讓寄件者知道信沒寄達
      message.setReject("內部處理錯誤，無法接收信件")
    }
  }
}
