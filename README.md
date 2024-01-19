# WhatsApp Chat Bot with ChatGPT and DALL·E Integration 🤖💬🎨
## Overview 🚀
This JavaScript script utilizes the `whatsapp-web.js` library to create a WhatsApp chat bot with advanced features. The bot interacts with users, generates DALL·E images, and utilizes the ChatGPT API for intelligent responses.

## Features 🌟
- **WhatsApp Interaction:** Connects to WhatsApp Web to send and receive messages.
- **ChatGPT Integration:** Utilizes the ChatGPT API for generating intelligent responses.
- **DALL·E Image Generation:** Generates images using the DALL·E API based on user input.
- **Command Handling:** Supports commands like "/dalle" for image generation and "/reset" for resetting conversations.
- **Emoji Responses:** Adds emojis to responses based on certain conditions or keywords.

## Prerequisites 🛠️
- Node.js installed
- WhatsApp account with QR code scanning capability

## Getting Started 🏁
1. Install dependencies:

   ```bash
   npm install
   ```

2. Set up your environment variables: `Optional`

   Create a `.env` file with the following:

   ```dotenv
   # .env
   CHATGPT_API_KEY=your_chatgpt_api_key
   ```

3. Run the script:

   ```bash
   node your-script-name.js
   ```

4. Scan the QR code displayed in the console with your WhatsApp to log in.
## Commands 🤖👨‍💻

- **/dalle [text]:** Generates a DALL·E image based on the provided text.
- **/reset:** Resets the conversation context.

## Error Handling 🚨
- Comprehensive error handling at various levels.
- Detailed error messages for better debugging.
- Graceful handling of unexpected errors during message processing.

## Advanced Customization 🛠️
- Extend command functionality to support additional features.
- Implement user authentication and preferences.
- Add more emojis or customize response patterns.

## Contributing 🤝

Contributions are welcome! Feel free to submit issues or pull requests.

## License 📄

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.
