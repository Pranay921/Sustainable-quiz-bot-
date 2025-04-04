import os
from flask import Flask, request, jsonify, send_from_directory, session
import google.generativeai as genai
import uuid
import json
import random

# Try to load environment variables from .env file, but handle errors gracefully
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("Environment variables loaded successfully")
except Exception as e:
    print(f"Warning: Could not load .env file: {str(e)}")
    print("Continuing without .env file")
    
    # Try to manually read the .env file with different encodings
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
    if os.path.exists(env_path):
        try:
            # Try different encodings
            for encoding in ['utf-8', 'utf-8-sig', 'latin-1', 'utf-16']:
                try:
                    with open(env_path, 'r', encoding=encoding) as f:
                        for line in f:
                            if line.strip() and not line.startswith('#'):
                                key, value = line.strip().split('=', 1)
                                os.environ[key] = value
                    print(f"Successfully loaded .env file with {encoding} encoding")
                    break
                except Exception as enc_error:
                    continue
        except Exception as manual_error:
            print(f"Failed to manually load .env file: {str(manual_error)}")

# Get API key from environment variables
api_key = os.getenv('GEMINI_API_KEY')
if not api_key:
    # Remove hardcoded API key and provide instructions instead
    print("Error: GEMINI_API_KEY not found in environment variables")
    print("Please create a .env file with your GEMINI_API_KEY or set it as an environment variable")
    print("Example .env file content: GEMINI_API_KEY=your_api_key_here")
    exit(1)  # Exit the program if no API key is found
else:
    print("Using API key from environment variables")

# Configure the Gemini API
genai.configure(api_key=api_key)

# Initialize Flask app with environment variable to disable dotenv loading
os.environ["FLASK_SKIP_DOTENV"] = "1"  # Set environment variable before creating app
app = Flask(__name__, static_folder='.')

# Configure session
app.secret_key = os.getenv('FLASK_SECRET_KEY', 'default-secret-key')

# Store chat history and sessions
chat_history = {}
chat_sessions = {}

# Define the quiz routes directly in chatbot.py to avoid import issues
def setup_quiz_routes(app):
    @app.route('/get_questions', methods=['GET'])
    def get_questions():
        try:
            # Create a generative model instance
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            # Define the prompt to generate 10 sustainability quiz questions
            prompt = """Generate 10 multiple-choice questions about environmental sustainability. 
            Each question should have 4 options (A, B, C, D) with only one correct answer.
            
            Format the response as a JSON array with the following structure for each question:
            {
                "question": "The question text",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correct_answer": "The correct option letter (A, B, C, or D)",
                "explanation": "Brief explanation of why the answer is correct"
            }
            
            Cover diverse sustainability topics such as climate change, renewable energy, biodiversity, 
            waste management, water conservation, sustainable agriculture, pollution, and eco-friendly practices.
            
            Make the questions educational, engaging, and varying in difficulty.
            
            IMPORTANT: Return ONLY the JSON array with no additional text or formatting.
            """
            
            # Generate the response
            response = model.generate_content(prompt)
            
            # Extract the JSON from the response
            response_text = response.text
            
            # Clean the response if it contains markdown code blocks
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
                
            # Parse the JSON
            questions = json.loads(response_text)
            
            # Shuffle the questions
            random.shuffle(questions)
            
            return jsonify(questions)
            
        except Exception as e:
            print(f"Error: {str(e)}")
            return jsonify({'error': f'Sorry, I encountered an error: {str(e)}'}), 500

# Set up quiz routes
setup_quiz_routes(app)

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/quiz')
def quiz():
    return send_from_directory('.', 'quiz_game.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    user_message = data.get('message', '')
    session_id = request.cookies.get('session_id')
    
    if not session_id:
        session_id = str(uuid.uuid4())
    
    if not user_message:
        return jsonify({'response': 'Please provide a message', 'session_id': session_id}), 400
    
    try:
        # Define the system prompt for environmental sustainability focus
        system_prompt = """You are a Sustainability Expert Bot designed to educate users on all aspects of environmental sustainability. You have two main modes of interaction:

1. INFORMATION MODE: If the user asks any questions which is not related to environment then you should politely reject the questin and When users ask general questions about sustainability topics, provide clear, concise, and educational responses. Keep explanations brief (maximum 3-4 short paragraphs) and focus on the most important points. Topics include climate change, renewable energy, biodiversity, SDGs, waste management, water conservation, green technologies, sustainable agriculture, deforestation, pollution, environmental policies, circular economy, sustainable transportation, and eco-friendly lifestyles.

2. QUIZ MODE: When users specifically request a quiz or question (by using words like "quiz", "test me", "give me a question"), provide a brief quiz question. These should be structured as multiple-choice (A, B, C, D) or true/false questions, with concise explanations after the user responds.

COMPARISON FORMAT: When users ask about differences or comparisons between two or more concepts (e.g., "What's the difference between solar and wind energy?"), format your response as an HTML table with columns. Each column should have a header with the concept name, and the content should be in bullet points. For example:

<table class="comparison-table">
  <tr>
    <th>Solar Energy</th>
    <th>Wind Energy</th>
  </tr>
  <tr>
    <td>
      <ul>
        <li>Harvests energy from sunlight</li>
        <li>Works best in sunny areas</li>
        <li>No moving parts</li>
      </ul>
    </td>
    <td>
      <ul>
        <li>Harvests energy from wind</li>
        <li>Works best in windy areas</li>
        <li>Has moving turbine blades</li>
      </ul>
    </td>
  </tr>
</table>

IMPORTANT: Maintain context throughout the conversation. If you've just asked a quiz question and the user responds with an answer (like "A", "B", "C", "D", "True", or "False"), recognize it as an answer to your previous question and provide feedback on whether they were correct, along with a brief explanation.

Analyze each user message carefully to determine which mode is appropriate. If the message contains a direct question about sustainability, use INFORMATION MODE. If the message explicitly requests a quiz or question, use QUIZ MODE.

Your tone should be friendly and engaging. Prioritize brevity and clarity in all responses. Use bullet points when appropriate to organize information. Limit your responses to 150-200 words whenever possible."""

        # Get or create chat history for this session
        if session_id not in chat_history:
            chat_history[session_id] = []
            # Add system prompt as first message in history
            chat_history[session_id].append({"role": "user", "parts": [system_prompt]})
            chat_history[session_id].append({"role": "model", "parts": ["I understand. I'll act as a Sustainability Expert Bot with the capabilities you described."]})
        
        # Add user message to history
        chat_history[session_id].append({"role": "user", "parts": [user_message]})
        
        # Create a new model instance
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Generate a response using the chat history
        response = model.generate_content(chat_history[session_id])
        
        # Add model response to history
        chat_history[session_id].append({"role": "model", "parts": [response.text]})
        
        # Set cookie in response
        resp = jsonify({'response': response.text})
        resp.set_cookie('session_id', session_id, max_age=3600)  # 1 hour expiry
        return resp
        
    except Exception as e:
        print(f"Error: {str(e)}")
        return jsonify({'response': f'Sorry, I encountered an error: {str(e)}'}), 500

# Add this function after the setup_quiz_routes function

# Add this route to serve the Eco-Adventure game
@app.route('/eco-adventure')
def eco_adventure():
    return send_from_directory('.', 'eco_adventure.html')

@app.route('/get_scenarios', methods=['GET'])
def get_scenarios():
    try:
        # Create a generative model instance
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Define the prompt to generate eco-adventure scenarios
        prompt = """Generate 10 interactive scenarios for an environmental adventure game. 
        Each scenario should present an environmental dilemma with choices that have different ecological impacts.
        
        Format the response as a JSON array with the following structure for each scenario:
        {
            "id": 1,  // Scenario number (1-10)
            "description": "Detailed description of the environmental scenario",
            "environment": "forest", // One of: forest, ocean, urban, desert
            "hint": "An educational hint about the environmental issue",
            "choices": [
                {
                    "id": "1A",
                    "text": "First choice option",
                    "points": 15,  // Eco points awarded for this choice (can be negative)
                    "feedback": "Feedback about the impact of this choice",
                    "next": 2  // ID of the next scenario
                },
                // 2-4 choices per scenario
            ]
        }
        
        Make sure:
        1. Each scenario has 3-4 choices with varying environmental impacts
        2. Points range from -10 (harmful to environment) to +15 (very beneficial)
        3. Each choice leads to the next sequential scenario (choice.next = current scenario ID + 1)
        4. The final scenario (id: 10) should have choices that lead to scenario 11
        5. Include detailed, educational feedback for each choice
        6. Scenarios should cover diverse environmental issues (pollution, conservation, energy, etc.)
        7. Make descriptions and choices realistic and educational
        """
        
        # Generate the scenarios
        response = model.generate_content(prompt)
        
        # Parse the response
        scenarios_text = response.text
        
        # Extract the JSON part from the response
        import re
        import json
        
        # Try to find JSON in the response
        json_match = re.search(r'\[\s*\{.*\}\s*\]', scenarios_text, re.DOTALL)
        
        if json_match:
            scenarios_json = json_match.group(0)
            scenarios = json.loads(scenarios_json)
        else:
            # If no JSON array is found, try to parse the entire response
            try:
                scenarios = json.loads(scenarios_text)
            except:
                # Fallback to a simpler approach - look for the first [ and last ]
                start = scenarios_text.find('[')
                end = scenarios_text.rfind(']') + 1
                if start != -1 and end != 0:
                    try:
                        scenarios = json.loads(scenarios_text[start:end])
                    except:
                        # If all parsing attempts fail, return fallback scenarios
                        return jsonify(get_fallback_scenarios())
                else:
                    return jsonify(get_fallback_scenarios())
        
        # Validate and clean up the scenarios
        for scenario in scenarios:
            # Ensure all required fields are present
            if 'id' not in scenario or 'description' not in scenario or 'choices' not in scenario:
                continue
                
            # Ensure choices have all required fields
            for choice in scenario['choices']:
                if 'next' not in choice:
                    # Default to next scenario
                    choice['next'] = scenario['id'] + 1
                
                # Ensure points exist
                if 'points' not in choice:
                    choice['points'] = 0
        
        return jsonify(scenarios)
    
    except Exception as e:
        print(f"Error generating scenarios: {e}")
        return jsonify(get_fallback_scenarios())

def get_fallback_scenarios():
    # This function returns the same fallback scenarios as in your JavaScript
    # You can copy them from your getFallbackScenarios() function
    return [
        {
            "id": 1,
            "description": "<p>You are hiking in a forest when you find a turtle tangled in plastic waste. The turtle appears to be struggling and in distress.</p><p>What do you do?</p>",
            "environment": "forest",
            "hint": "Turtles can be injured by plastic waste. Consider both immediate help and long-term solutions.",
            "choices": [
                {
                    "id": "1A",
                    "text": "Remove the plastic carefully and release the turtle",
                    "points": 10,
                    "feedback": "You carefully remove the plastic without harming the turtle. It slowly moves away, free from the harmful debris. You feel good knowing you've directly helped a creature in need.",
                    "next": 2
                },
                {
                    "id": "1B",
                    "text": "Ignore it and keep walking",
                    "points": -5,
                    "feedback": "You continue your hike, leaving the turtle struggling. As you walk away, you can't help but feel a sense of guilt knowing you could have helped.",
                    "next": 2
                },
                {
                    "id": "1C",
                    "text": "Call a wildlife rescue team",
                    "points": 5,
                    "feedback": "You call a local wildlife rescue team. They thank you for reporting it and promise to send someone right away. You wait until they arrive to make sure the turtle gets help.",
                    "next": 2
                }
            ]
        },
        # Add the rest of your fallback scenarios here
        # For brevity, I've only included the first one
    ]

@app.route('/get_words', methods=['GET'])
def get_words():
    try:
        # Get parameters
        difficulty = request.args.get('difficulty', 'medium')
        game_mode = request.args.get('mode', 'hangman')
        
        # Create a generative model instance
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        # Define the prompt based on difficulty
        word_count = 10
        if difficulty == 'easy':
            max_length = 6
            prompt = f"Generate {word_count} sustainability-related words that are easy to guess (4-6 letters). "
        elif difficulty == 'hard':
            max_length = 12
            prompt = f"Generate {word_count} challenging sustainability-related words (8-12 letters). "
        else:  # medium
            max_length = 8
            prompt = f"Generate {word_count} sustainability-related words of medium difficulty (6-8 letters). "
        
        prompt += f"""Include technical terms related to environmental sustainability, conservation, renewable energy, etc.
        
        Format the response as a JSON array with the following structure:
        [
            {{"word": "RECYCLE", "hint": "Process of converting waste into reusable material"}},
            {{"word": "SOLAR", "hint": "Relating to energy from the sun"}},
            ...
        ]
        
        Make sure:
        1. All words are single words (no spaces or hyphens)
        2. Words are related to environmental sustainability
        3. Hints are clear but don't directly give away the answer
        4. Words are appropriate for a {difficulty} difficulty level
        5. All words are in UPPERCASE
        """
        
        # Generate the words
        response = model.generate_content(prompt)
        
        # Parse the response
        words_text = response.text
        
        # Extract the JSON part from the response
        import re
        import json
        
        # Try to find JSON in the response
        json_match = re.search(r'\[\s*\{.*\}\s*\]', words_text, re.DOTALL)
        
        if json_match:
            words_json = json_match.group(0)
            words = json.loads(words_json)
        else:
            # If no JSON array is found, try to parse the entire response
            try:
                words = json.loads(words_text)
            except:
                # Fallback to a simpler approach - look for the first [ and last ]
                start = words_text.find('[')
                end = words_text.rfind(']') + 1
                if start != -1 and end != 0:
                    try:
                        words = json.loads(words_text[start:end])
                    except:
                        # If all parsing attempts fail, return fallback words
                        return jsonify(get_fallback_words(difficulty))
                else:
                    return jsonify(get_fallback_words(difficulty))
        
        # Validate and clean up the words
        validated_words = []
        for word_obj in words:
            if 'word' not in word_obj or 'hint' not in word_obj:
                continue
                
            word = word_obj['word'].strip().upper()
            
            # Skip words that are too long or have spaces/special characters
            if len(word) > max_length or not word.isalpha():
                continue
                
            validated_words.append({
                'word': word,
                'hint': word_obj['hint']
            })
        
        # If we don't have enough valid words, add some from fallback
        if len(validated_words) < 5:
            fallback = get_fallback_words(difficulty)
            validated_words.extend(fallback[:10 - len(validated_words)])
        
        return jsonify(validated_words)
    
    except Exception as e:
        print(f"Error generating words: {e}")
        return jsonify(get_fallback_words(difficulty))

def get_fallback_words(difficulty='medium'):
    # Fallback word lists in case the API fails
    easy_words = [
        {"word": "RECYCLE", "hint": "Process of converting waste into reusable material"},
        {"word": "GREEN", "hint": "Color associated with environmental movements"},
        {"word": "EARTH", "hint": "Our home planet"},
        {"word": "WATER", "hint": "Essential resource for all life"},
        {"word": "SOLAR", "hint": "Relating to energy from the sun"},
        {"word": "PLANT", "hint": "Living organism that produces oxygen"},
        {"word": "CLEAN", "hint": "Free from pollution"},
        {"word": "WASTE", "hint": "Unwanted or unusable material"},
        {"word": "REUSE", "hint": "Use again or more than once"},
        {"word": "ECO", "hint": "Prefix relating to the environment"}
    ]
    
    medium_words = [
        {"word": "COMPOST", "hint": "Decayed organic material used as plant fertilizer"},
        {"word": "CLIMATE", "hint": "Long-term weather patterns in an area"},
        {"word": "ORGANIC", "hint": "Produced without artificial chemicals"},
        {"word": "ECOLOGY", "hint": "Study of interactions between organisms and environment"},
        {"word": "BIOFUEL", "hint": "Fuel derived from organic matter"},
        {"word": "CARBON", "hint": "Element that forms the basis of greenhouse gases"},
        {"word": "HABITAT", "hint": "Natural home of an animal or plant"},
        {"word": "WETLAND", "hint": "Land area saturated with water"},
        {"word": "OZONE", "hint": "Layer in the atmosphere that protects from UV radiation"},
        {"word": "FOREST", "hint": "Large area covered with trees"}
    ]
    
    hard_words = [
        {"word": "BIODIVERSITY", "hint": "Variety of plant and animal life in a habitat"},
        {"word": "SUSTAINABLE", "hint": "Able to be maintained at a certain rate or level"},
        {"word": "CONSERVATION", "hint": "Protection of natural resources"},
        {"word": "DEFORESTATION", "hint": "Clearing of forests on a large scale"},
        {"word": "PHOTOVOLTAIC", "hint": "Converting light into electricity"},
        {"word": "HYDROELECTRIC", "hint": "Generating electricity using flowing water"},
        {"word": "PERMACULTURE", "hint": "Agricultural ecosystem intended to be sustainable"},
        {"word": "DESERTIFICATION", "hint": "Process by which fertile land becomes desert"},
        {"word": "EUTROPHICATION", "hint": "Excessive richness of nutrients in a body of water"},
        {"word": "GEOTHERMAL", "hint": "Relating to heat from the earth's interior"}
    ]
    
    if difficulty == 'easy':
        return easy_words
    elif difficulty == 'hard':
        return hard_words
    else:
        return medium_words

# Add route to serve the Word Game HTML
@app.route('/word-game')
def word_game():
    return send_from_directory('.', 'word_game.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
    