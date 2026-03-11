import PostalMime from "postal-mime"

function getLinkFromContent(content: string) {
	const linkRegex = /(https:\/\/www\.netflix\.com\/account\/travel\/verify\?[^\s<>]+)/
	const match = content.match(linkRegex)

	if (match && match[1]) {
		return match[1]
	}

	return ""
}

function getCodeFromContent(content: string) {
	const codeRegex = /Enter this code to sign in\s+(\d{4})/
	const match = content.match(codeRegex)

	if (match && match[1]) {
		return match[1]
	}

	return ""
}

export default {
  async email(message: any, env: Record<string, string>, _: any) {
    try {
      const rawEmail = await new Response(message.raw).arrayBuffer()
      const parser = new PostalMime()
      const parsedEmail = await parser.parse(rawEmail)
			const sender = parsedEmail.from?.address || message.from

      const subject = parsedEmail.subject || ""
      let content = parsedEmail.text || parsedEmail.html || ""
			if (sender !== "info@account.netflix.com" && sender) {
				console.log("sender not match")
				return
			}

			if (!subject.includes("Your Netflix temporary access code") && !subject.includes("Netflix: Your sign-in code")) {
        console.log("subject not match")
				return
			}

      const auth = getLinkFromContent(content) || getCodeFromContent(content)
			if (!auth) {
        console.log("auth info not found")
				return
			}

			const tgMessage = auth.startsWith("http")
				? `[Netflix Verify](${auth})`
				: `Netflix auth code: ${auth}`

      const botToken = env.TELEGRAM_BOT_TOKEN
      const chatId = env.TELEGRAM_CHAT_ID

      if (!botToken || !chatId) {
        throw new Error("need to settings TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in env")
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
					parse_mode: "Markdown"
        }),
      })

      if (!tgResponse.ok) {
        const errorData = await tgResponse.text()
        console.error("Telegram API failed:", errorData)
      } else {
        console.log("success sent to Telegram")
      }
    } catch (error) {
      console.error("Unknown error:", error)
      message.setReject("reject interlnal error")
    }
  }
}
