// src/api.ts
import axios from "axios";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export const transcribeAudio = async (
  audioBlob: Blob,
  type: string,
): Promise<string> => {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio." + type);
  formData.append("model", "whisper-1");

  const response = await axios.post(
    "https://api.openai.com/v1/audio/transcriptions",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
    },
  );
  // return "Person A (Sarah):\"Hey, aren’t you Alex from ChainBridge Ventures? I think we’re both in the same Telegram group, Crypto Innovators. It’s great to finally meet in person.\"\n" +
  //     "Person B (Alex):\"Yeah, that’s me! Nice to meet you, Sarah. ChainBridge Ventures keeps me busy, but it’s fun. You’re with DigitalFin Labs, right? I’ve seen some of your posts on LinkedIn.\"\n" +
  //     "Person A:\"Yep, that’s right! I’m the lead blockchain developer there. We’re working on some new DeFi tools, actually. I think we even crossed paths on Twitter. Your handle is @AlexBlockchain, right?\"\n" +
  //     "Person B:\"Exactly! I recognized your handle too, @SarahDeFiDev. Small world. I saw your recent thread about scaling issues in Ethereum. Are you guys still focusing on Layer 2 solutions at DigitalFin?\"\n" +
  //     "Person A:\"Yeah, we’re deep into Layer 2 development right now. It’s challenging, but we’re making some progress. What about you? ChainBridge has been all over the news with those Solana investments. How are things going on your end?\"\n" +
  //     "Person B:\"Busy, but exciting. Solana’s been a huge focus for us because of the speed and low fees. We’re also backing a few smaller projects in the NFT space. Honestly, between that and the VC rounds, there’s no shortage of action. How about you, are you guys getting into NFTs or sticking to DeFi?\"\n" +
  //     "Person A:\"We’re dabbling in NFTs, mostly from a utility perspective, but DeFi is our bread and butter. We’re building a staking platform that should roll out early next year. Are you guys still focused mostly on early-stage funding?\"\n" +
  //     "Person B:\"Yeah, early-stage investments are our core focus, especially in Web3 infrastructure. We recently backed a DAO-focused project that’s really promising. You should check them out. I’ll send you their info on Twitter.\"\n" +
  //     "Person A:\"That sounds great, I’d love to see what you’re working on. I’ve been exploring some DAO governance models myself. It’s fascinating how quickly things are evolving. What do you think about DAOs in general? You think they’ll reshape traditional corporate structures?\"\n" +
  //     "Person B:\"I think they have the potential to, especially for decentralized decision-making. It’s still early, but the projects that prioritize security and governance are standing out. We’ve been really selective about where we put our money, but DAOs definitely have a future. How do you manage staying up-to-date with all these trends? With DigitalFin scaling, you must be swamped.\"\n" +
  //     "Person A:\"Totally swamped! I’ve been splitting my time between leading the dev team and keeping up with research. I mostly rely on newsletters like Bankless and The Defiant. Also, I try to stay active on Clubhouse chats—there’s always someone discussing the latest trend in Web3. What about you?\"\n" +
  //     "Person B:\"Same here, I’m a regular on Clubhouse too. We should join a session together sometime. And I also get updates from Decrypt and Messari. Honestly, I just try to follow thought leaders like @punk6529 and @Cobie to keep it manageable.\"\n" +
  //     "Person A:\"That’s smart. I’ll check out those sources. We should definitely connect more. I’d love to learn more about what ChainBridge is up to and maybe share some insights from our side as well. Here’s my card.\"\n" +
  //     "Person B:\"Likewise! Let’s definitely keep in touch. I’ll DM you later with those DAO projects I mentioned. And who knows, maybe we’ll collaborate down the road!\"\n" +
  //     "Person A:\"I’d love that. Let’s stay connected. See you on Twitter!\"\n";
  return response.data.text as string;
};

interface SummaryResult {
  title: string;
  category: string;
  summary: string;
  metadata: Record<string, string>;
}

export const generateSummary = async (
  transcription: string,
): Promise<SummaryResult> => {
  const prompt = `
Based on the following transcription, generate a JSON object with the following structure:
{
  "title": "<A concise title>",
  "category": "<A category that fits the content>",
  "summary": "<A 2-paragraph summary>",
  "metadata": <a dictionary containing metadata from the transcription>
}
Metadata should include important information such as places, company names, project names, social media handles, ages, etc., extracted from the transcription.

**Important**: Provide *only* the JSON object as the output. Do not include any explanations, comments, or code block formatting.

Transcription:
"""${transcription}"""
`;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an assistant that generates summaries and metadata from transcriptions.",
          },
          { role: "user", content: prompt },
        ],
        max_tokens: 1000,
        temperature: 0.2, // Lower temperature for deterministic output
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      },
    );

    const assistantReply = response.data.choices[0].message.content.trim();

    // Extract and clean JSON
    let result: SummaryResult;
    try {
      const jsonString = extractJSONFromString(assistantReply);
      const cleanJsonString = cleanJSONString(jsonString);

      result = JSON.parse(cleanJsonString);
    } catch (error) {
      console.error("Failed to parse JSON:", error);
      console.error("Assistant Reply:", assistantReply);
      throw new Error("Could not parse the assistant's response as JSON.");
    }

    // Ensure metadata is an object
    if (typeof result.metadata !== "object" || result.metadata === null) {
      result.metadata = {};
    }

    return result;
  } catch (error) {
    console.error("Error generating summary:", error);
    throw new Error("An error occurred while generating the summary.");
  }
};
function extractJSONFromString(data: string): string {
  // Try to match the JSON object
  const jsonMatch = data.match(/{[\s\S]*}/);
  if (jsonMatch) {
    return jsonMatch[0];
  } else {
    throw new Error("No JSON object found in the response.");
  }
}
function cleanJSONString(jsonString: string): string {
  // Remove any backslash-escaped characters
  jsonString = jsonString.replace(/\\n/g, "");
  jsonString = jsonString.replace(/\\'/g, "'");
  jsonString = jsonString.replace(/\\"/g, '"');
  jsonString = jsonString.replace(/\\&/g, "&");
  jsonString = jsonString.replace(/\\r/g, "");
  jsonString = jsonString.replace(/\\t/g, "");
  jsonString = jsonString.replace(/\\b/g, "");
  jsonString = jsonString.replace(/\\f/g, "");

  // Remove any extra backslashes
  jsonString = jsonString.replace(/\\\\/g, "\\");

  // Remove any newline characters
  jsonString = jsonString.replace(/\n/g, "");

  // Remove any redundant commas (e.g., before closing braces)
  jsonString = jsonString.replace(/,(\s*[}\]])/g, "$1");

  return jsonString;
}
