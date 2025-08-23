import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { GoogleGenerativeAI } from 'https://esm.sh/@google/generative-ai@0.1.3';

// Define CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Define the rate limit
const RATE_LIMIT_PER_DAY = 5;

// Main function that handles the request
Deno.serve(async (req) => {
  // Handle preflight requests for CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Get User and Image Data
    // The image should be sent as a base64 encoded string in the request body
    const { imageBase64 } = await req.json();
    if (!imageBase64) {
      throw new Error("No image data provided.");
    }

    // 2. Create Supabase client with Authorization header
    const authHeader = req.headers.get('Authorization')!;
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    // 3. Get the current user from the session
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated.");
    }

    // 4. Implement Rate Limiting
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: usage, error: usageError } = await supabaseClient
      .from('api_usage')
      .select('id', { count: 'exact' })
      .eq('user_id', user.id)
      .gte('created_at', twentyFourHoursAgo);

    if (usageError) throw usageError;

    if (usage && usage.length >= RATE_LIMIT_PER_DAY) {
      return new Response(JSON.stringify({ error: `Rate limit exceeded. Please try again tomorrow.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 429,
      });
    }

    // 5. Call Gemini API
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error("GEMINI_API_KEY is not set in Supabase secrets.");
    }
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-pro-vision" });

    const prompt = `Analyze the attached image of food. Identify the primary food item and estimate its nutritional values (calories, protein, carbs, fat) for a standard portion size of about 100-150g. Please respond ONLY with a valid JSON object with the following keys and value types: "foodName" (string), "calories" (number), "protein" (number), "carbs" (number), "fat" (number). Example: {"foodName": "Spaghetti Bolognese", "calories": 250, "protein": 15, "carbs": 30, "fat": 8}`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg", // Assuming jpeg, could be passed from client
      },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();

    // Clean up the response to get only the JSON part
    const jsonString = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const nutritionData = JSON.parse(jsonString);

    // 6. Log the successful request
    await supabaseClient.from('api_usage').insert({ user_id: user.id });

    // 7. Return the result
    return new Response(JSON.stringify(nutritionData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
