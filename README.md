# 🍽️ MagicMeal - A Better MyFitnessPal Alternative

A modern, AI-powered food tracking app built with React Native and Expo. Track your meals effortlessly with barcode scanning and AI photo recognition.

## ✨ Features

- **📊 Daily Food Logging** - Track calories, protein, carbs, and fat
- **📱 Barcode Scanner** - Scan food barcodes for instant nutrition lookup
- **🤖 AI Photo Recognition** - Take a photo of your meal and AI identifies the food
- **🔍 Food Database Search** - Search thousands of foods from Open Food Facts
- **📈 Progress Tracking** - Monitor your daily nutrition goals

## 🚀 Get Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI
- iOS Simulator (Mac) or Android Emulator

### Installation

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

3. Press `i` for iOS simulator or `a` for Android emulator

## 📸 AI Photo Recognition Setup

The app includes a **mock AI implementation** for meal photo recognition. To enable real AI analysis, integrate one of these services:

### Option 1: OpenAI Vision API (Recommended)
Best accuracy for food recognition.

```bash
npm install openai
```

Add to `app/photo-scanner.tsx`:
```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

const analyzeImage = async (imageUri: string) => {
  const response = await openai.chat.completions.create({
    model: "gpt-4-vision-preview",
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Analyze this meal and provide: food items, calories, protein, carbs, fat for each item. Return as JSON array." },
          { type: "image_url", image_url: { url: imageUri } }
        ],
      },
    ],
  });
  // Parse response...
};
```

### Option 2: Google Cloud Vision API
Good for general food detection.

```bash
npm install @google-cloud/vision
```

### Option 3: Clarifai Food Model
Specialized for food recognition.

```bash
npm install clarifai
```

### Option 4: Custom TensorFlow Lite Model
For offline, privacy-first recognition.

```bash
npm install @tensorflow/tfjs @tensorflow/tfjs-react-native
```

## 🗄️ Data Storage

Currently uses AsyncStorage for local data persistence. For production:

### Add Cloud Sync (Optional)
```bash
npm install @supabase/supabase-js
# or
npm install firebase
```

### Add SQLite for Better Performance
```bash
npx expo install expo-sqlite
```

## 🔑 API Keys Required

Add these to your `.env` file:

```env
# For AI Photo Recognition
EXPO_PUBLIC_OPENAI_API_KEY=your_key_here

# Optional: Premium food database
EXPO_PUBLIC_NUTRITIONIX_APP_ID=your_id_here
EXPO_PUBLIC_NUTRITIONIX_APP_KEY=your_key_here
```

## 📱 Features Roadmap

- [x] Daily calorie tracking
- [x] Barcode scanner
- [x] AI photo recognition (mock)
- [x] Food search
- [ ] Real AI integration
- [ ] Meal favorites & templates
- [ ] Weight tracking
- [ ] Progress charts
- [ ] Custom food entry
- [ ] Recipe builder
- [ ] Water tracking
- [ ] Exercise logging
- [ ] Social features
- [ ] Meal planning

## 🎨 Tech Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Routing**: Expo Router
- **Storage**: AsyncStorage
- **Camera**: expo-camera
- **Barcode**: Built-in barcode scanner
- **Image Picker**: expo-image-picker
- **Food Database**: Open Food Facts API (free)

## 🌟 Better than MyFitnessPal Because

1. **No Ads** - Clean, distraction-free experience
2. **AI Photo Recognition** - Just snap and log
3. **Privacy-First** - Your data stays on your device
4. **Free & Open Source** - No premium paywall
5. **Modern UI** - Clean, intuitive interface
6. **Fast** - Optimized for performance

## 📄 License

MIT

## 🤝 Contributing

Contributions welcome! This is an open-source project.

## 📞 Support

Open an issue on GitHub for bug reports or feature requests.
