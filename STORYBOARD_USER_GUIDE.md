# Storyboard Feature User Guide

## Overview

The Storyboard feature transforms OpenAvathar into a comprehensive content creation platform by allowing you to convert ideas or YouTube content into professional scripts and audio narrations. These can then be used with OpenAvathar's avatar generation to create engaging video content.

## Getting Started

### Step 1: Configure API Keys

Before using the Storyboard feature, you need to configure your API keys:

1. **Navigate to Settings**: Click on the Settings icon in the sidebar
2. **Scroll to Storyboard API Keys section**
3. **Add your API keys**:
   - **Google Gemini API Key**: Required for script generation
     - Get your free API key at [ai.google.dev](https://ai.google.dev)
     - Free tier includes generous usage limits
   - **ElevenLabs API Key**: Optional, for audio generation
     - Get your API key at [elevenlabs.io](https://elevenlabs.io)
     - Free tier includes 10,000 characters per month

**Security Note**: Your API keys are stored locally in your browser and are never sent to OpenAvathar's servers. They are used directly to communicate with Google and ElevenLabs APIs.

### Step 2: Access Storyboard

Click on **Storyboard** in the sidebar navigation. You'll see a "NEW" badge indicating this is a recent feature.

## Using Storyboard

### Input Modes

Storyboard offers two ways to create scripts:

#### 1. Idea Mode (💡)
Perfect for original content creation.

**How to use**:
1. Switch to "Idea" mode using the toggle at the top
2. Enter your content idea (minimum 50 characters)
3. Be specific about:
   - Your message or topic
   - Target audience
   - Desired outcome
4. Select a script tone (energetic, professional, casual, or persuasive)
5. Click "Generate Script"

**Example Input**:
```
Create a script about the benefits of morning routines for productivity. 
Target audience: young professionals aged 25-35. 
Tone: motivational and energetic. 
Include actionable tips they can implement immediately.
```

#### 2. YouTube Mode (📺)
Perfect for repurposing existing content.

**How to use**:
1. Switch to "YouTube" mode using the toggle at the top
2. Paste a YouTube video URL
3. The AI will analyze the video and create an engaging script
4. Best results with videos under 10 minutes
5. Click "Generate Script"

**Supported URL formats**:
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/embed/VIDEO_ID`

### Script Generation

Once you click "Generate Script", the AI will:
1. Analyze your input
2. Create an attention-grabbing hook (first 3-5 seconds)
3. Write a complete narration script optimized for engagement
4. Break it down into segments with visual hints

**What you'll get**:
- **Title**: Compelling title for your content
- **Hook**: Attention-grabbing opener to stop scrolling
- **Full Script**: Complete narration optimized for your chosen tone
- **Metadata**: Word count and estimated duration

### Editing Scripts

You can customize the generated script:

1. Click the **Edit** button (✏️) at the top of the script
2. Make your changes in the text area
3. Click "Save Changes" when done

### Script Actions

- **Copy** (📋): Copy the entire script to your clipboard
- **Download** (⬇️): Download the script as a text file
- **Edit** (✏️): Edit the generated script

### Generating Audio

If you've configured an ElevenLabs API key:

1. **Select a Voice**: Choose from available voices in the dropdown
   - Voices are categorized (e.g., male, female, narration, character)
   - Preview available for some voices
2. **Click "Generate Audio"**
3. Wait for the audio to be generated (usually 10-30 seconds)

**Audio Controls**:
- **Play/Pause** (▶️/⏸️): Listen to the generated audio
- **Restart** (↻): Restart playback from the beginning
- **Download** (⬇️): Download the audio as an MP3 file

### Quality Settings

**Draft Mode**: 
- Faster generation
- Good for testing and iterations
- Turbo v2 model

**Production Mode**:
- Higher quality audio
- Better for final output
- Multilingual v2 model

## Best Practices

### Writing Effective Ideas

1. **Be Specific**: Include concrete details about your topic
2. **Know Your Audience**: Mention who you're targeting
3. **Set the Tone**: Choose the appropriate tone for your content
4. **Include Context**: Provide background information if needed

### Script Optimization

1. **Review the Hook**: Make sure it's attention-grabbing
2. **Check Flow**: Ensure smooth transitions between segments
3. **Adjust Length**: Edit if the script is too long or short
4. **Add Personality**: Personalize the script to match your style

### Audio Generation Tips

1. **Test Voices**: Try different voices to find the best match
2. **Listen First**: Always listen to the audio before downloading
3. **Edit Script First**: Make all script edits before generating audio
4. **Consider Length**: Very long scripts may take longer to generate

## Integration with Avatar Generation

Once you have your script and audio:

1. **Save or Download**: Download your audio file
2. **Navigate to Studio**: Go to OpenAvathar's Studio page
3. **Upload Assets**:
   - Upload a face image
   - Upload your generated audio
4. **Generate Video**: Create your avatar video with the narration

## Workflow Example

**Creating a Product Explainer Video**:

1. **Write Your Idea**:
   ```
   Explain the benefits of our new AI writing tool for content creators.
   Highlight time-saving features, quality improvements, and ease of use.
   Target audience: bloggers and social media managers.
   Tone: professional yet friendly.
   ```

2. **Generate Script**: Click "Generate Script" and wait

3. **Review & Edit**: 
   - Check that key features are mentioned
   - Adjust tone if needed
   - Ensure call-to-action is clear

4. **Generate Audio**:
   - Select a professional, friendly voice
   - Generate and preview audio
   - Download if satisfied

5. **Create Avatar Video**:
   - Upload company representative photo
   - Upload generated audio
   - Generate in Studio

6. **Result**: Professional explainer video with synchronized narration

## Troubleshooting

### "API Key Required" Error
- Go to Settings and configure your Gemini API key
- Ensure the key is valid and has sufficient quota

### "Invalid YouTube URL" Error
- Check that the URL is properly formatted
- Ensure the video is publicly accessible
- Try a different video if the issue persists

### "Rate Limit Exceeded" Error
- You've exceeded your API quota
- Wait a few minutes before trying again
- Check your API usage in the respective dashboards

### "Generation Failed" Error
- Check your internet connection
- Verify your API keys are correct
- Try regenerating with simpler input
- Check API service status pages

### Audio Not Playing
- Check browser audio permissions
- Ensure audio was successfully generated
- Try regenerating the audio
- Download and play externally if needed

## API Usage & Costs

### Google Gemini API
- **Free Tier**: 60 requests per minute, 1500 per day
- **Cost**: First 2 million tokens free per month
- **Monitor Usage**: [Google AI Studio](https://ai.google.dev)

### ElevenLabs API
- **Free Tier**: 10,000 characters per month
- **Cost**: Paid plans start at $5/month
- **Monitor Usage**: [ElevenLabs Dashboard](https://elevenlabs.io/app)

## Privacy & Security

### What Data is Stored
- **Locally in Browser**:
  - API keys (with basic obfuscation)
  - Generated scripts and audio
  - User preferences (tone, voice selection)
  
- **Not Stored**:
  - Your content ideas are not stored by OpenAvathar
  - API requests go directly to Google and ElevenLabs

### Data Security
- API keys are stored with basic obfuscation in browser storage
- No sensitive data is transmitted to OpenAvathar servers
- All API communication is done client-side via HTTPS
- Clear your browser data to remove stored keys

### Best Practices
- Use API keys with domain restrictions when possible
- Don't share your API keys with others
- Regularly rotate your API keys for security
- Monitor your API usage to detect unusual activity

## Tips for Viral Content

### Hook Creation
- Start with a question or bold statement
- Create curiosity or urgency
- Use numbers or statistics
- Make it relatable

### Script Structure
- Follow the 3-act structure: Hook → Value → Call-to-Action
- Use short, punchy sentences
- Include pattern interrupts every 7-10 seconds
- End with a clear next step

### Audio Delivery
- Choose a voice that matches your brand
- Match energy level to content type
- Ensure clear pronunciation
- Test different voices for audience feedback

## Keyboard Shortcuts

Coming soon! We're working on keyboard shortcuts for faster workflow.

## FAQ

**Q: Can I use Storyboard without ElevenLabs API?**
A: Yes! You can generate scripts without audio. Audio generation is optional.

**Q: How long are generated scripts?**
A: Scripts are typically 30-60 seconds worth of narration (75-150 words), perfect for social media reels.

**Q: Can I edit the script after generating audio?**
A: Yes, but you'll need to regenerate the audio if you want it to match your edits.

**Q: Are there limits on script generation?**
A: Limits depend on your Gemini API tier. Free tier allows 60 requests per minute.

**Q: Can I save multiple scripts?**
A: Yes! Scripts are automatically saved to your browser's local storage. The last 50 scripts are kept.

**Q: Does this work offline?**
A: No, internet connection is required to communicate with the AI APIs.

**Q: Can I use my own voice?**
A: Not yet, but voice cloning is planned for a future update.

## Feature Roadmap

Planned enhancements:
- ✨ Voice cloning support
- 📚 Script template library
- 🌍 Multi-language support
- 🎬 Visual scene suggestions for avatar
- 📊 Content performance analytics
- 👥 Team collaboration features
- 📱 Mobile-optimized interface

## Support

If you encounter issues:
1. Check this documentation first
2. Review the Troubleshooting section
3. Verify your API keys are valid
4. Check the browser console for errors
5. Report issues on GitHub

## Credits

- **AI Models**: 
  - Google Gemini for script generation
  - ElevenLabs for text-to-speech
- **Built with**: React, TypeScript, Zustand
- **Part of**: OpenAvathar Project

---

**Happy Creating! 🎬✨**

For more information about OpenAvathar, visit the main documentation or check out our tutorials.
