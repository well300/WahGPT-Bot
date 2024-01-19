import axios from "axios";
import whatsappweb from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import chalk from "chalk";
import * as dotenv from "dotenv";

dotenv.config();

const { Client, LocalAuth } = whatsappweb;
const whatsapp = new Client({
  puppeteer: {},
  authStrategy: new LocalAuth(),
});

const conversations = {};

whatsapp.initialize();

whatsapp.on("qr", (qr) => {
  console.log(chalk.yellow("📱 Scan the QR code below to log in:"));
  qrcode.generate(qr, { small: true });
});

whatsapp.on("authenticated", () => {
  console.log(chalk.green("✅ Authentication complete"));
});

whatsapp.on("ready", () => {
  console.log(chalk.green("🚀 Ready to accept messages"));
});

async function getChatGPTResponse(text) {
  const apiUrl = `${process.env.CHATGPT_API_URL}?text=${encodeURIComponent(text)}`;
  try {
    const response = await axios.get(apiUrl);
    if (response.data.status) {
      return response.data.result;
    } else {
      throw new Error(`API error: ${response.data.result}`);
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error calling ChatGPT API: ${error.message}`));
    throw new Error("Error calling ChatGPT API");
  }
}

async function getDALLEImage(text) {
  const apiUrl = `${process.env.DALLE_API_URL}?text=${encodeURIComponent(text)}`;
  try {
    const response = await axios.get(apiUrl, { responseType: "arraybuffer" });
    const data = Buffer.from(response.data, "binary").toString("base64");
    return data;
  } catch (error) {
    console.error(chalk.red(`❌ Error calling DALL·E API: ${error.message}`));
    throw new Error("Error calling DALL·E API");
  }
}

async function main() {
  whatsapp.on("message", async (message) => {
    try {
      console.log(
        chalk.cyan(
          `👤 From: ${message._data.id.remote} (${message._data.notifyName})`
        )
      );
      console.log(chalk.cyan(`💬 Message: ${message.body}`));

      const chat = await message.getChat();

      if (
        chat.isGroup &&
        !message.mentionedIds.includes(whatsapp.info.wid._serialized)
      ) {
        return;
      }

      if (
        conversations[message._data.id.remote] === undefined ||
        message.body === "reset"
      ) {
        console.log(
          chalk.yellow(
            `🔄 Creating new conversation for ${message._data.id.remote}`
          )
        );
        if (message.body === "reset") {
          message.reply(chalk.yellow("✨ Conversation reset"));
          return;
        }
        conversations[message._data.id.remote] = {};
      }

      if (message.body.startsWith("/dalle")) {
        const text = message.body.replace("/dalle", "").trim();
        try {
          const imageBase64 = await getDALLEImage(text);

          if (imageBase64) {
            const mimetype = "image/png"; // Change the mimetype based on the actual response from the DALL·E API
            const filename = "dalle_generated_image.png"; // Set the desired filename

            const media = new whatsappweb.MessageMedia(
              mimetype,
              imageBase64,
              filename,
              null
            );

            console.log(chalk.green("📸 Sending DALL·E generated image"));
            message.reply(media);
          } else {
            throw new Error("Failed to generate DALL·E image");
          }
        } catch (dalleError) {
          console.error(chalk.red(`❌ ${dalleError.message}`));
          message.reply(chalk.red("❌ Failed to generate DALL·E image"));
        }

        return;
      }

      const response = await getChatGPTResponse(message.body);

      // Add a default emoji at the start of every response
      const defaultEmoji = "*🤖 Response:* ";
      let emojiResponse = `${defaultEmoji} ${response}`;

      // Add emojis based on conditions or keywords in the response
      if (response.toLowerCase().includes("hello")) {
        emojiResponse += " 👋";
      } else if (response.toLowerCase().includes("thank you")) {
        emojiResponse += " 🙏";
      } else if (response.toLowerCase().includes("good morning")) {
        emojiResponse += " 🌅";
      } else if (response.toLowerCase().includes("good night")) {
        emojiResponse += " 🌃";
      } else if (response.toLowerCase().includes("good evening")) {
        emojiResponse += " 🌆";
      } else if (response.toLowerCase().includes("good afternoon")) {
        emojiResponse += " ☀️";
      } else if (response.toLowerCase().includes("good day")) {
        emojiResponse += " 🌤️";
      }

      console.log(chalk.green(`✉️ Response: ${emojiResponse}`));

      message.reply(emojiResponse);
    } catch (mainError) {
      console.error(chalk.red(`❗️ ${mainError.message}`));
      message.reply(
        chalk.red("❗️ An error occurred while processing your request")
      );
    }
  });
}

main().catch((initError) => {
  console.error(chalk.red(`❗️ ${initError.message}`));
  process.exit(1);
});
