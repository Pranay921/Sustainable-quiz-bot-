import os
from flask import Flask, request, jsonify, send_from_directory
import google.generativeai as genai
import json
import random

# This function will be called by chatbot.py
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

# Only run this if the file is executed directly (not imported)
if __name__ == '__main__':
    # Try to load environment variables from .env file, but handle errors gracefully
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("Environment variables loaded successfully")
    except Exception as e:
        print(f"Warning: Could not load .env file: {str(e)}")
        print("Continuing without .env file")

    # Get API key from environment variables
    api_key = os.getenv('GEMINI_API_KEY')
    if not api_key:
        print("Error: GEMINI_API_KEY environment variable not set")
        print("Please set the GEMINI_API_KEY environment variable and try again")
        exit(1)
    else:
        print("Using API key from environment variables")
      
    # Initialize Flask app with environment variable to disable dotenv loading
    os.environ["FLASK_SKIP_DOTENV"] = "1"
    app = Flask(__name__, static_folder='.')
    app.config['FLASK_SKIP_DOTENV'] = True
    
    # Configure the Gemini API
    genai.configure(api_key=api_key)
    
    @app.route('/')
    def index():
        return send_from_directory('.', 'quiz_game.html')
    
    @app.route('/<path:path>')
    def serve_static(path):
        return send_from_directory('.', path)
    
    # Set up quiz routes
    setup_quiz_routes(app)
    
    # Replace line 98-99 with:
    # Run the app with Render compatibility
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False)